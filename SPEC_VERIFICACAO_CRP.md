# SPEC — Serviço de Verificação de CRP (repositório separado)

Data: 2026-09-18
Status: planejado — não iniciado
Escopo: **serviço próprio, em repositório separado**, rodando em container na VPS, responsável por verificar se um CRP informado corresponde a um registro real e ativo no Conselho Federal de Psicologia. No `PsicoBem` esta SPEC cobre apenas as **costuras** (campos e ponto de chamada); a verificação em si não entra no caminho crítico do cadastro nesta fase.

Documento auto-contido de propósito: quando o serviço for desenvolvido, será em outro repositório, e este arquivo precisa bastar como ponto de partida.

---

## 1. Objetivo

Hoje qualquer pessoa pode se cadastrar no PsicoBem como psicólogo informando um CRP qualquer — o campo é apenas único e mascarado (`Psicologo.crp`, `CharField(max_length=15, unique=True)`), sem nenhuma validação contra a realidade.

Enquanto o vínculo depende de convite ou de o paciente já conhecer o profissional (fase 1 de `SPEC_VINCULO_CONVITE_E_SOLICITACAO.md`), o risco é baixo: a relação já existe fora do app, e o paciente sabe com quem está falando. O risco cresce no momento em que o app passar a **apresentar profissionais a pacientes** através de uma vitrine de busca — aí quem avaliza o profissional é o produto.

Daí o princípio que orienta esta SPEC:

> **A verificação não bloqueia o cadastro. Ela porteia a vitrine.**

Quem chega por convite ou CRP não depende do selo. Quem aparece numa busca aberta depende.

---

## 2. Realidade da fonte de dados

O CFP mantém o [Cadastro Nacional de Profissionais de Psicologia](https://cadastro.cfp.org.br/), com consulta pública por nome, CRP ou CPF, indicando se o registro está **Ativo**, **Cancelado** ou **Transferido**. **Não há API pública oficial documentada** (levantamento de 2026-09-18).

| Fonte | Como funciona | Prós | Contras |
|---|---|---|---|
| **Manual** | Psicólogo envia foto da carteira/CIP; alguém confere e libera o selo. | Custo zero de integração; funciona desde o dia um. | Custo humano recorrente; não escala além de algumas centenas. |
| **Provedor pago** | Serviços como a [Infosimples](https://infosimples.com/consultas/cfp-cadastro/) expõem a consulta ao CFP como web service JSON. | Automático, imediato, sem manutenção de parsing. | Custo por consulta; dependência de fornecedor (preço, disponibilidade, descontinuação). |
| **Raspagem do CNP** | O serviço consulta o site público e extrai o resultado. | Sem custo por consulta; controle total. | Frágil (quebra a cada mudança de HTML); provável conflito com os termos de uso; um IP só pode ser bloqueado. |
| **Base oficial** | Dados abertos do CFP, ou obtenção via pedido de LAI (o CFP é autarquia federal). | Melhor de todos, se existir: sem parsing frágil e sem custo por consulta. | **Não verificado se existe.** Vale investigar antes de escrever código — pode economizar semanas. |

**Decisão:** o serviço não escolhe uma fonte. Ele define uma **interface** e trata a fonte como plugável, começando pela manual.

---

## 3. Por que um serviço separado

O ganho não é performance — é conter a fragilidade:

- **Isolamento da peça que quebra.** Se o CNP muda o HTML, isso estoura dentro do serviço, não no meio do cadastro do Django.
- **Cache torna a fragilidade sobrevivível.** A consulta é *uma por psicólogo, na vida* — nunca chamada de runtime. Com o resultado guardado, uma quebra de parsing não afeta nenhum profissional já verificado: afeta apenas cadastros novos, que caem na fila manual até o conserto. Degrada, em vez de derrubar.
- **Fonte trocável sem tocar no PsicoBem.** Manual hoje, provedor ou raspagem amanhã, os dois em cascata depois.
- **Deploy desacoplado.** A VPS já roda Docker com reverse-proxy; é mais um container.
- **Trabalho em lote tem onde morar.** A revalidação periódica (seção 7) é natural num serviço próprio e desconfortável dentro do app Django.

---

## 4. Arquitetura

```
App Expo ──✗ (nunca)
                    ┌──────────────────────────┐
psicoapp_backend ──►│ verificacao-crp          │──► fonte plugável
   (server-to-       │  cache + fila + política │     (manual | provedor | CNP)
    server, rede     └──────────────────────────┘
    interna)
```

**Regra inegociável: o app nunca fala com este serviço.** Se o app chamasse direto, o token de autenticação viajaria dentro do bundle — e bundle é extraível. O resultado seria um proxy gratuito de consulta ao CFP rodando na VPS do usuário, com o IP dele levando o bloqueio.

A verificação é assunto de servidor. O Django chama, grava o resultado no `Psicologo`, e o app apenas lê esse campo como lê qualquer outro.

- Container **não exposto** no reverse-proxy: acessível somente pela rede Docker interna.
- Autenticação por token de serviço em variável de ambiente, mesmo na rede interna.

---

## 5. Contrato da API

### `POST /v1/verificar`

```json
{ "crp": "06/123456", "nome": "Ana Silva", "cpf": null }
```

Resposta:

```json
{
  "status": "ativo",
  "encontrado": true,
  "nome_registro": "ANA SILVA",
  "uf": "SP",
  "data_registro": "2015-03-10",
  "fonte": "manual",
  "consultado_em": "2026-09-18T12:00:00Z",
  "cache": false
}
```

- `status`: `ativo` | `cancelado` | `transferido` | `nao_encontrado` | `indisponivel`.
- **`indisponivel` é um estado de primeira classe**, não um erro. Significa "nenhuma fonte conseguiu responder" e é o que empurra o registro para a fila manual. Quem consome nunca deve tratá-lo como reprovação.
- A comparação de nome é **tolerante** (acentos, caixa, nomes do meio, sobrenome de casada). Divergência de nome não reprova automaticamente: marca para conferência humana.

### `GET /v1/verificar/{crp}`

Consulta o cache sem acionar a fonte. `204` se nunca consultado.

### `GET /v1/pendentes` · `POST /v1/pendentes/{id}/decidir`

Fila manual: lista o que precisa de olho humano e registra a decisão (`aprovado`/`reprovado` + quem decidiu).

### `GET /health`

Estado do serviço e **da fonte ativa** — é este endpoint que denuncia um parser quebrado antes do usuário.

---

## 6. Cache e evidência

- Todo resultado é persistido: `crp`, `status`, `nome_registro`, `uf`, `fonte`, `consultado_em` e o **payload bruto** devolvido pela fonte.
- Guardar o bruto importa: se um profissional questionar a reprovação, ou se um registro virar `cancelado` depois, a evidência do que a fonte respondeu e quando existe.
- Cache não expira por tempo — expira por **revalidação** (seção 7).

---

## 7. Revalidação periódica

Verificação **vence**. Um registro ativo hoje pode virar `cancelado` ou `transferido` depois. Verificar uma vez e guardar para sempre significa, dois anos depois, exibir com selo alguém que não tem mais registro ativo.

- Job em lote, semestral, fora do horário de pico, com ritmo controlado para não parecer varredura.
- Mudança de `ativo` para qualquer outro estado **não revoga nada sozinha**: abre um item na fila manual e avisa o operador. Nenhum profissional perde o selo por decisão automática de um parser.

---

## 8. Integração no PsicoBem

Nesta fase, **apenas as costuras** (já previstas em `SPEC_VINCULO_CONVITE_E_SOLICITACAO.md`, seção 3.13):

| Campo em `Psicologo` | Uso |
|---|---|
| `verificado` | `BooleanField(default=False)` |
| `verificado_em` | `DateTimeField`, null |
| `verificacao_fonte` | `CharField`, null — `manual`, `cnp`, `provedor` |

- O cadastro de psicólogo **não muda**: segue direto, sem consulta e sem bloqueio.
- **Nenhum selo é exibido no app** enquanto a verificação não existir — nem "verificado" nem "não verificado". Badge de "não verificado" em todo mundo só gera desconfiança sem informar nada.
- O ponto de chamada futuro fica isolado atrás de uma interface no Django (algo como `services/verificacao.py` com uma implementação nula por enquanto), para que ligar o serviço seja trocar a implementação, não refatorar o cadastro.
- Quando a vitrine existir, o critério de aparecer na busca será: `verificado=True` **e** opt-in explícito **e** perfil mínimo preenchido.

---

## 9. Operação e segurança

- **Detecção de quebra:** testes com fixtures (HTML/JSON salvos da fonte) e alerta quando o parsing falhar. Sem isso, o serviço morre em silêncio e a descoberta vem por reclamação de psicólogo.
- **Ritmo de saída:** limitar as consultas à fonte. Com cache e volume de uma-por-cadastro é irrelevante, mas precisa ser deliberado, não acidental.
- **Sem dados de paciente.** O serviço nunca recebe, guarda ou vê qualquer dado de paciente. Só CRP, nome e — se a fonte exigir — CPF do profissional.
- **LGPD:** ao guardar nome, CRP e status de profissionais, o serviço passa a tratar dado pessoal. Origem pública ajuda na base legal, mas não isenta: definir retenção, finalidade e quem tem acesso ao painel da fila manual.
- Segredos (token de serviço, credenciais de provedor) só por variável de ambiente, nunca no repositório.

---

## 10. Itens fora de escopo

- Verificação no cadastro como **bloqueio** — decisão explícita: o cadastro segue direto nesta fase.
- Exibição de selo no app.
- Vitrine/busca de profissionais (SPEC própria).
- Verificação de identidade do profissional (que a pessoa **é** quem diz ser, além de o registro existir) — biometria, documento com foto, prova de vida.
- Verificação de CRP de psicólogos estrangeiros ou de outras categorias profissionais.
- Painel administrativo completo da fila manual — na primeira versão, endpoints bastam.

---

## 11. Ordem recomendada

1. **Investigar se existe base oficial** (dados abertos do CFP ou via LAI) antes de escrever qualquer linha. Uma tarde aqui pode eliminar a necessidade de raspagem e de provedor pago.
2. Criar as costuras no PsicoBem (campos + interface nula). Entra junto da fase 1 do vínculo.
3. Repositório e container do serviço, com a **fonte manual** e o contrato da seção 5 completo.
4. Ligar o Django ao serviço, ainda sem bloquear cadastro: verificação assíncrona que apenas preenche os campos.
5. Fonte automática (provedor pago ou raspagem, conforme o passo 1), atrás da mesma interface, com fallback para a fila manual.
6. Revalidação periódica (seção 7).
7. Só então: ligar o selo no app, junto com a SPEC da vitrine.
