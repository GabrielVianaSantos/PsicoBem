# Issue 10 — App: hub de conexão e tela de confirmação (paciente)

**Fase:** 6 — Telas do paciente
**Prioridade:** 🔴 Alta
**Arquivos principais:** `src/screens/conexaoTerapeutica.js`, nova `src/screens/confirmarVinculo.js`, `src/routes.js`
**Origem:** seção 3.11 de `SPEC_VINCULO_CONVITE_E_SOLICITACAO.md`

## Problema

`conexaoTerapeutica.js` é hoje um input único de CRP — a barreira que originou esta feature. E não existe nenhuma tela que mostre ao paciente **com quem** ele está prestes a se vincular antes de o vínculo ser criado.

## Objetivo

Transformar a tela em um hub de caminhos, e criar uma tela de confirmação única, usada tanto pelo convite quanto pelo CRP.

## Escopo de implementação

### `conexaoTerapeutica.js` → hub

Dois caminhos, preservando a identidade visual atual da tela:

1. **"Tenho um convite"** — campo de código curto (normalizado: maiúsculas, hífen opcional). Quando a entrada vier por deep link (issue 12), este caminho é acionado automaticamente.
2. **"Informar o CRP do meu profissional"** — o fluxo atual, com a mesma máscara `00/000000`, **preservado integralmente**.

Reservar espaço visual para a terceira porta (busca de profissionais), que vem na SPEC futura — sem implementá-la.

### Nova `confirmarVinculo.js`

- Alimentada por `resolverConvite()` (convite) ou pelos dados do profissional (CRP) — **nada é criado no banco até o paciente confirmar**.
- Mostra nome, CRP e especialidade do profissional. (Foto está fora de escopo: exigiria expor `avatar_url` e só existiria para contas Google.)
- **Se já houver vínculo ativo**, exibe o aviso completo e explícito da troca, com o que será perdido:
  - as sessões futuras com o profissional atual serão canceladas;
  - **os prontuários daquele acompanhamento serão apagados**;
  - o profissional atual será notificado de que o tratamento foi encerrado.
  A confirmação precisa ser deliberada — é uma ação destrutiva e irreversível.
- Segue o padrão de `confirmarVinculoGoogle.js`.
- Desfecho:
  - convite → vínculo ativo, navega para `HomePaciente` com mensagem de sucesso;
  - CRP → solicitação enviada, navega para `HomePaciente`, que passa a exibir o estado pendente (issue 11).
- Erros de convite (expirado, usado, revogado, inexistente) exibidos de forma clara, sem distinguir inexistente de expirado.

## Tarefas

- [ ] Reescrever `conexaoTerapeutica.js` como hub, preservando o caminho de CRP.
- [ ] Criar `confirmarVinculo.js` e registrar em `src/routes.js`.
- [ ] Normalização do código no campo de entrada.
- [ ] Aviso completo de troca, com confirmação deliberada.
- [ ] Tratamento dos erros de convite.
- [ ] Mensagem neutra ("Profissional indisponível para tratamento") quando o backend bloquear a re-solicitação.
- [ ] Validar em dispositivo os dois caminhos, com e sem vínculo ativo prévio.

## Critérios de aceite

- ✅ A feature funciona ponta a ponta **apenas com o código digitado**, sem nenhum deep link.
- ✅ Nenhum vínculo é criado antes da confirmação explícita na tela.
- ✅ O aviso de perda (sessões + prontuários) aparece sempre que houver vínculo ativo.
- ✅ O caminho por CRP continua existindo e funcionando.

## Dependências

Depende da issue 07.
