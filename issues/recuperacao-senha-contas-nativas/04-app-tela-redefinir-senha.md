# Issue 04 — App: parar de exibir o token e tratar código expirado

**Fase:** 2 — Frontend
**Prioridade:** 🟡 Média
**Arquivos principais:** `src/screens/redefinirSenha.js`
**Origem:** seções 3.1 e 3.5 de `SPEC_RECUPERACAO_SENHA_CONTAS_NATIVAS.md`

## Problema

`handleRequestReset()` pega `result.token` da resposta da API e o exibe num `Alert` ("Para fins de teste agora, use o código..."). A tela também guarda `uid` em estado, que deixou de existir no contrato da API (issue 02).

## Objetivo

Fazer a tela funcionar com o novo contrato, sem nunca exibir nenhum token/código — o usuário só o obtém pelo e-mail.

## Escopo de implementação

### `src/screens/redefinirSenha.js`

- Remover o estado `uid` e toda a lógica que dependia dele.
- `handleRequestReset()`: sempre mostrar a mesma mensagem de sucesso genérica (ex.: "Se o e-mail estiver cadastrado, você receberá um código em instantes.") e avançar para o passo 2 — nunca ler `result.token`.
- Atualizar o texto do passo 1 (`screenSubtitle`) para deixar claro que um e-mail real será enviado (remover qualquer menção a "no futuro").
- `handleConfirmReset()`: chamar `authService.confirmPasswordReset(token, newPassword)` (sem `uid`).
- Tratar `error.code === 'password_reset_token_expired'`: mostrar mensagem explicando que o código expirou e sugerindo solicitar um novo (pode voltar ao passo 1 automaticamente ou deixar o usuário decidir, a critério da implementação — manter simples).

## Tarefas

- [ ] Remover o estado `uid` e seu uso.
- [ ] Ajustar `handleRequestReset()` para nunca ler/exibir `result.token`.
- [ ] Atualizar o texto do passo 1.
- [ ] Ajustar `handleConfirmReset()` para a nova assinatura de `confirmPasswordReset`.
- [ ] Tratar especificamente `code === 'password_reset_token_expired'` com mensagem própria.
- [ ] Testar manualmente o fluxo completo (ver critérios abaixo).

## Critérios de aceite

- ✅ Nenhum token/código aparece em nenhum `Alert` ou tela — o único lugar onde ele aparece é no e-mail.
- ✅ Solicitar recuperação sempre mostra a mesma mensagem, avança para o passo 2.
- ✅ Colar um token válido (copiado do e-mail) e uma senha de 6+ caracteres altera a senha com sucesso.
- ✅ Colar um token expirado/inválido mostra mensagem compreensível, sem crash, sem exibir detalhes internos.
- ✅ Após alterar a senha, login com a nova senha funciona.

## Dependências

- Depende da issue 02 (contrato novo) e da issue 03 (`authService.js` ajustado).
