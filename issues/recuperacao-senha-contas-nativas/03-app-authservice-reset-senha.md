# Issue 03 — App: ajustar `authService.js` ao novo contrato

**Fase:** 2 — Frontend
**Prioridade:** 🟡 Média
**Arquivos principais:** `src/services/authService.js`
**Origem:** seção 3.6 de `SPEC_RECUPERACAO_SENHA_CONTAS_NATIVAS.md`

## Problema

`confirmPasswordReset(uid, token, newPassword)` envia `uid`, que deixou de existir no contrato da API (issue 02). O código de erro (`code`) não é propagado para essas duas chamadas, impedindo a tela de identificar `password_reset_token_expired`.

## Objetivo

Alinhar `authService.js` ao novo contrato dos endpoints.

## Escopo de implementação

### `src/services/authService.js`

- `confirmPasswordReset(token, newPassword)` — remove o parâmetro `uid`; corpo da requisição passa a ser `{ token, new_password: newPassword }`.
- `requestPasswordReset(email)` — assinatura inalterada.
- Ambos os métodos passam a propagar `code` no erro lançado (`errorToThrow.code = errorInfo.code`), no mesmo padrão já usado pelos métodos do login Google (`loginWithGoogle`, `linkGoogleAccount`, `completeGoogleRegistration`).

## Tarefas

- [ ] Remover `uid` da assinatura e do corpo de `confirmPasswordReset`.
- [ ] Adicionar `errorToThrow.code = errorInfo.code` em `requestPasswordReset` e `confirmPasswordReset`.
- [ ] Buscar em `src/` por outros consumidores de `confirmPasswordReset` além de `redefinirSenha.js` (issue 04) para confirmar que não há mais nenhum chamador com a assinatura antiga.

## Critérios de aceite

- ✅ `confirmPasswordReset(token, newPassword)` envia exatamente `{ token, new_password }`, sem `uid`.
- ✅ Um erro de `code: "password_reset_token_expired"` chega até quem chamou `confirmPasswordReset` via `error.code`.
- ✅ Nenhum outro método de `authService.js` foi alterado.

## Dependências

- Depende da issue 02 (contrato novo dos endpoints precisa existir).
- Independente da issue 04 (mas ambas são consumidas juntas por `redefinirSenha.js`).
