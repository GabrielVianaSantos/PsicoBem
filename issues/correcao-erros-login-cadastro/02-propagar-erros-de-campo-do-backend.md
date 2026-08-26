# Issue 02 — Propagar o erro bruto do backend até as telas de cadastro

**Fase:** 2 — Dados de erro por campo
**Prioridade:** 🔴 Alta
**Arquivos principais:** `src/providers/AuthProvider.js`, `src/services/authService.js`
**Origem:** seções 2 e 3.2 de `SPEC_CORRECAO_ERROS_LOGIN_CADASTRO.md`

## Problema

`authService.js` já captura o payload bruto de erro do Django (`error.response.data`) e anexa em `errorToThrow.data` para `login`, `registerPaciente` e `registerPsicologo`. Porém `AuthProvider.js` só repassa `message` e `status` no objeto de retorno de falha (`{ success: false, message, status }`) — o campo `data` é descartado no caminho. Sem ele, nenhuma tela consegue saber qual campo específico (CPF, CRP, e-mail, confirmação de senha) causou o erro.

Além disso, `authService.handleError()` já trata `data.cpf`, `data.crp`, `data.user.email` e `data.user.username`, mas não trata:
- `data.user.non_field_errors` — caso em que `password_confirm` não bate com `password` (erro de validação em `UserRegistrationSerializer.validate()`, retornado aninhado sob `user`);
- `data.user.password` — validação de senha (ex.: tamanho mínimo) quando aninhada sob `user`, hoje só tratada quando aparece na raiz (`data.password`).

## Objetivo

Fazer o dado bruto de erro do backend chegar íntegro até as telas de cadastro (issues 03 e 04 consomem esse dado), e garantir que `handleError()` já produza uma mensagem legível para os dois casos aninhados listados acima.

## Escopo de implementação

- Em `src/providers/AuthProvider.js`:
  - No `catch` de `login()`, `registerPaciente()` e `registerPsicologo()`, incluir `data: error.data` no objeto de retorno de falha, ao lado de `message` e `status`.
  - Não alterar o formato de retorno de sucesso de nenhuma função.
- Em `src/services/authService.js`, dentro de `handleError()`:
  - Complementar o bloco que já trata `error.response.data.user` para também checar `userErrors.non_field_errors` (mensagem sugerida: usar o texto retornado pelo backend, ex. "As senhas não coincidem.") antes de cair no `else { message = 'Dados do usuário inválidos' }`.
  - Complementar o mesmo bloco para tratar `userErrors.password` isoladamente, com mensagem no padrão já usado para os demais campos (`Senha: <mensagem do backend>`).
  - Preservar a ordem de verificação já existente (`crp` → `cpf` → `user` → `email` raiz → `password` raiz → string → `detail` → `message` → `non_field_errors`) e não alterar nenhum outro ramo.
  - Manter `data: error.response.data` no retorno de `handleError()` (já existe; apenas confirmar que continua presente).

## Tarefas

- [ ] Adicionar `data: error.data` ao retorno de falha de `login()` em `AuthProvider.js`.
- [ ] Adicionar `data: error.data` ao retorno de falha de `registerPaciente()` em `AuthProvider.js`.
- [ ] Adicionar `data: error.data` ao retorno de falha de `registerPsicologo()` em `AuthProvider.js`.
- [ ] Tratar `userErrors.non_field_errors` dentro do bloco `error.response.data.user` em `authService.handleError()`.
- [ ] Tratar `userErrors.password` dentro do mesmo bloco.
- [ ] Confirmar, com uma chamada de teste manual ou log temporário, que `result.data` chega até o `catch` de `handleCadastro()` em `cadastroPacientes.js`/`cadastroPsicologos.js` com o formato esperado (`{ cpf: [...] }`, `{ crp: [...] }`, `{ user: { email: [...] } }`, `{ user: { non_field_errors: [...] } }`).

## Critérios de aceite

- ✅ `result.data` está presente e correto no retorno de falha de `login`, `registerPaciente` e `registerPsicologo`.
- ✅ Uma tentativa de cadastro com "Senha" e "Confirma Senha" diferentes produz uma mensagem legível (não mais o genérico "Dados do usuário inválidos").
- ✅ O formato de retorno de sucesso de `login`, `registerPaciente` e `registerPsicologo` não mudou.
- ✅ Nenhum outro ramo de `handleError()` teve seu comportamento alterado.
- ✅ Nenhum arquivo de `psicoapp_backend/` foi alterado.

## Dependências

- Não depende da issue 01, mas é pré-requisito das issues 03 e 04 — sem `data` chegando até a tela, não há campo para destacar em vermelho.
