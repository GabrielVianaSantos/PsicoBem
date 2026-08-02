# SPEC — Correções na Odisséia: Visão do Psicólogo e Clareza dos Cards

Data: 2026-07-23  
Status: planejamento  
Escopo: aplicativo Expo + API Django de Registros de Odisséia

---

## 1. Objetivo

Corrigir a experiência da Odisséia para que cada perfil tenha apenas as ações compatíveis com sua função:

- o **paciente** registra e visualiza os próprios registros;
- o **psicólogo** apenas visualiza os registros compartilhados pelos pacientes com vínculo ativo;
- os cards tornam evidente quem registrou a Odisséia e apresentam os níveis emocionais com nomes compreensíveis, sem perder o layout compacto atual.

---

## 2. Estado atual identificado

| Tema | Estado atual | Impacto |
|---|---|---|
| Tela compartilhada | `src/screens/registrosOdisseia.js` é usada nos fluxos de paciente e psicólogo. | O psicólogo vê a aba e as ações de **Novo Registro**. |
| Criação no backend | `RegistroOdisseiaViewSet.perform_create()` já bloqueia `POST` para usuários que não sejam pacientes. | A interface apresenta uma ação que o psicólogo não pode concluir. |
| Leitura do psicólogo | O backend filtra registros compartilhados de pacientes com vínculo ativo. | A regra de visibilidade já existe e deve ser preservada. |
| Nome do paciente | `RegistroOdisseiaSerializer` já retorna `paciente_nome`. | A tela não utiliza esse campo no card, portanto o psicólogo não identifica o autor do registro. |
| Indicadores de nível | Os cards usam `Ans.`, `Str.` e `Ene.`. | As abreviações podem gerar dúvidas para usuários não familiarizados com elas. |

---

## 3. Requisitos funcionais

### 3.1 Psicólogo: acesso exclusivamente de leitura

#### Comportamento esperado

- Ao abrir **Registros de Odisséia** no perfil de psicólogo, a tela deve iniciar diretamente na lista de registros.
- O psicólogo **não deve visualizar** a aba, botão, estado vazio ou qualquer atalho para **Novo Registro** / criação de Odisséia.
- O psicólogo pode consultar somente registros que atendam simultaneamente aos critérios abaixo:
  - pertencem a um paciente com vínculo `ativo` com o psicólogo autenticado;
  - foram marcados pelo paciente como `compartilhar_psicologo=True`.
- O psicólogo não pode criar, editar ou excluir registros de Odisséia por interface ou API.
- O comportamento do paciente permanece inalterado: ele continua podendo registrar e consultar seus próprios registros.

#### Alterações previstas

**Frontend — `src/screens/registrosOdisseia.js`**

- Obter o tipo do usuário autenticado pelo contexto/hook de autenticação já adotado no app.
- Tornar a tela sensível ao perfil:
  - paciente: manter as abas **Meus Registros** e **Novo Registro**;
  - psicólogo: renderizar apenas a listagem e nunca inicializar ou navegar para o fluxo de formulário, mesmo que a rota receba `modo=novo`.
- Carregar registros do psicólogo por `odisseiaService.getRegistrosOdisseia()`; manter `pacienteService.getMeusRegistros()` para o paciente, ou consolidar a chamada em um serviço adequado sem alterar o contrato da API.
- Ajustar os textos da visão do psicólogo para indicar que se tratam de registros dos pacientes, inclusive no estado vazio.

**Navegação — `src/routes.js` e pontos de entrada**

- Manter a rota `RegistrosOdisseia` disponível para os dois perfis.
- Garantir que nenhum atalho do fluxo de psicólogo envie parâmetros de criação (`modo: 'novo'`).

**Backend — `psicoapp_backend/engajamentos/views.py`**

- Preservar a validação de vínculo ativo e de `compartilhar_psicologo=True` no `get_queryset()`.
- Declarar permissões por ação para garantir que psicólogos tenham somente `list` e `retrieve` no recurso.
- Retornar `403 Forbidden` para qualquer tentativa de `POST`, `PUT`, `PATCH` ou `DELETE` por um psicólogo, inclusive se a requisição for feita diretamente à API.
- Manter as operações permitidas ao paciente restritas aos registros pertencentes ao seu próprio perfil.

---

### 3.2 Identificação do paciente nos cards vistos pelo psicólogo

#### Comportamento esperado

- Em cada card exibido na visão do psicólogo, apresentar claramente o nome do paciente que criou aquele registro.
- A identificação deve ficar no cabeçalho do card, próxima à informação de humor e data, para ser lida antes dos detalhes emocionais.
- Na visão do paciente, não exibir o próprio nome de forma redundante.

#### Alterações previstas

**Backend — `psicoapp_backend/engajamentos/serializers.py`**

- Manter `paciente_nome` como campo somente de leitura na resposta de `RegistroOdisseiaSerializer`.
- Confirmar que o campo esteja disponível nas respostas de lista e detalhe para o psicólogo.
- Não aceitar `paciente` ou `paciente_nome` como campos graváveis pelo cliente.

**Frontend — `src/screens/registrosOdisseia.js`**

- Quando o usuário autenticado for psicólogo, renderizar uma identificação explícita, por exemplo: `Paciente: Maria Silva`.
- Usar `paciente_nome` retornado pela API; caso esteja ausente, exibir uma mensagem neutra de fallback, sem impedir a leitura dos demais dados.
- Preservar o emoji, humor e data já existentes no cabeçalho do card.

> Decisão de privacidade: o nome deve ser exibido somente dentro da sessão autenticada do psicólogo vinculado ao paciente. Não deve ser adicionado a notificações, logs ou telas públicas.

---

### 3.3 Níveis emocionais legíveis mantendo o design compacto

#### Problema

Os chips atuais exibem `Ans.`, `Str.` e `Ene.`, abreviações que tornam a leitura menos imediata.

#### Comportamento esperado

- Substituir as abreviações por rótulos completos: **Ansiedade**, **Estresse** e **Energia**.
- Manter a apresentação em chips compactos, com o valor numérico (`0–10`) e as cores atuais.
- Preservar a ordem visual: Ansiedade, Estresse e Energia.
- Permitir quebra de linha ou ajuste responsivo quando necessário, sem sobreposição, corte de texto ou redução prejudicial de legibilidade em telas menores.

#### Alterações previstas

**Componente de UI — `src/components/common/NivelChip.js`**

- Validar que o componente comporte rótulos completos com o valor sem perda de legibilidade.
- Ajustar somente os estilos necessários para manter os chips visualmente equilibrados e acessíveis.

**Cards — `src/screens/registrosOdisseia.js`**

- Alterar as chamadas do componente para `label="Ansiedade"`, `label="Estresse"` e `label="Energia"`.
- Manter a cor diferenciada de Energia e as demais referências visuais existentes.

---

## 4. Regras de autorização e privacidade

| Perfil | Listar | Ver detalhe | Criar | Editar | Excluir |
|---|---:|---:|---:|---:|---:|
| Paciente | Somente próprios | Somente próprio | Sim | Somente próprio | Somente próprio |
| Psicólogo | Somente compartilhados de pacientes vinculados ativos | Mesma regra | Não | Não | Não |
| Sem perfil válido | Não | Não | Não | Não | Não |

O filtro por vínculo e compartilhamento deve ser aplicado no backend. A ocultação de ações no aplicativo é complementar e não substitui a autorização da API.

---

## 5. Critérios de aceite

### Visão do psicólogo

- [ ] O psicólogo abre `RegistrosOdisseia` e vê apenas a lista de registros disponíveis.
- [ ] A aba, botão e fluxo de **Novo Registro** não aparecem para o psicólogo.
- [ ] Uma tentativa de abrir a rota com `modo: 'novo'` como psicólogo não exibe o formulário.
- [ ] `POST`, `PUT`, `PATCH` e `DELETE` em `/api/registros-odisseia/` são recusados com `403` para o psicólogo.
- [ ] O psicólogo visualiza registros apenas de pacientes com vínculo ativo e que optaram por compartilhar o registro.
- [ ] Registros privados, não compartilhados, de pacientes sem vínculo ou vinculados a outro psicólogo não são retornados.

### Identificação do paciente

- [ ] Todo card da visão do psicólogo mostra `Paciente: <nome>` usando o campo retornado pela API.
- [ ] O nome do paciente não é mostrado na lista pessoal do paciente.
- [ ] A ausência pontual de `paciente_nome` não quebra a renderização do card.

### Indicadores de níveis

- [ ] Os cards exibem **Ansiedade**, **Estresse** e **Energia** por extenso.
- [ ] Cada nível continua mostrando o valor de `0` a `10`.
- [ ] Em dispositivos menores, os chips permanecem legíveis e não se sobrepõem.
- [ ] Cores, humor, data e estrutura geral dos cards são preservados.

---

## 6. Testes e validação

### Backend

- Criar ou atualizar testes do `RegistroOdisseiaViewSet` cobrindo os três perfis: paciente, psicólogo vinculado e psicólogo sem vínculo.
- Validar a lista com registros compartilhados e não compartilhados.
- Validar que todas as operações de escrita do psicólogo retornam `403`.
- Validar que o paciente não acessa registros de outro paciente.

### Frontend

- Testar a tela autenticada como paciente e confirmar que os dois fluxos atuais permanecem disponíveis.
- Testar a tela autenticada como psicólogo e confirmar a ausência completa de ações de criação.
- Conferir visualmente os cards em largura reduzida, com nomes longos de pacientes e com os três chips de nível preenchidos.

---

## 7. Fora de escopo

- Criação de novos tipos de Odisséia, campos clínicos ou relatórios.
- Alteração da lógica de preenchimento dos sliders e escalas de `0–10`.
- Mudanças na política escolhida pelo paciente para compartilhar um registro, além de respeitá-la na visão do psicólogo.
- Criação das issues de implementação nesta etapa; elas serão derivadas desta SPEC posteriormente.

---

## 8. Ordem sugerida de implementação

1. Reforçar permissões de escrita no `RegistroOdisseiaViewSet` e cobrir a regra com testes.
2. Adaptar a tela compartilhada para diferenciar paciente e psicólogo.
3. Exibir `paciente_nome` nos cards do psicólogo.
4. Substituir os rótulos abreviados dos chips e validar a responsividade.
5. Executar testes de autorização e revisão visual nos dois perfis.
