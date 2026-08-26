# Issue 07 — App: renovação automática de sessão e senha para conta Google

**Fase:** 6 — Ajustes decorrentes no aplicativo
**Prioridade:** 🟡 Média
**Arquivos principais:** `src/services/api.js`, `src/screens/meuPerfil.js`, `src/screens/perfilPsicologo.js`
**Origem:** seção 3.8 de `SPEC_LOGIN_GOOGLE.md`

## Problema

1. **A sessão cai em 60 minutos.** O interceptor de resposta em `src/services/api.js:41-45` apaga `@PsicoBem:token` e `@PsicoBem:user` em **qualquer** 401, sem tentar renovar — mesmo com `@PsicoBem:refreshToken` salvo e válido por 7 dias. Além disso, deixa `@PsicoBem:refreshToken` e `@PsicoBem:userType` órfãos no storage, e não avisa o `AuthProvider` (o estado React só muda no próximo boot). Isso já acontece hoje, mas passaria a ser atribuído ao login Google.

2. **Usuário Google não consegue definir senha pela interface.** `src/screens/meuPerfil.js:82` e `src/screens/perfilPsicologo.js:92` sempre exigem o campo "senha atual" antes de chamar `authService.changePassword(senhaAtual, novaSenha)`. Para quem entrou pelo Google não existe senha atual — mesmo com o backend já corrigido na issue 04, a interface continuaria bloqueando.

## Objetivo

Fazer a sessão sobreviver além de 60 minutos e permitir que uma conta criada via Google defina sua própria senha.

## Escopo de implementação

### `src/services/api.js` — refresh no interceptor

Substituir o tratamento atual de 401 por:

1. Ler `@PsicoBem:refreshToken`. Se não houver, limpar tudo e sair.
2. Chamar `POST /auth/token/refresh/` (rota criada na issue 04).
3. **Persistir o refresh token novo** — `ROTATE_REFRESH_TOKENS` está ligado, então cada renovação devolve um refresh diferente; não persistir faz a sessão morrer na renovação seguinte.
4. Persistir o novo access token e **refazer a requisição original**.
5. Se o refresh falhar, limpar as **quatro** chaves (`user`, `token`, `refreshToken`, `userType`) — não apenas duas, como hoje.

Usar uma flag/fila para não disparar N renovações em paralelo quando várias requisições recebem 401 ao mesmo tempo: a primeira renova, as demais aguardam o resultado e são refeitas.

Cuidado obrigatório: a própria chamada a `token/refresh/` **não** pode entrar no laço do interceptor, sob risco de recursão infinita.

### `src/screens/meuPerfil.js` e `src/screens/perfilPsicologo.js`

Quando `user.has_password === false` (campo novo do `UserSerializer`, issue 03):

- ocultar o campo "Senha Atual";
- trocar o título da seção para algo como "Criar sua senha";
- chamar `changePassword(null, novaSenha)`.

Quando `has_password` for `true`, o comportamento atual permanece **exatamente** como está.

## Tarefas

- [ ] Implementar a renovação no interceptor de `api.js`, com persistência do refresh rotacionado.
- [ ] Implementar a fila/flag que evita renovações paralelas.
- [ ] Garantir que a chamada de refresh não seja interceptada por ela mesma.
- [ ] Limpar as quatro chaves quando o refresh falhar.
- [ ] Ocultar "senha atual" em `meuPerfil.js` quando `has_password === false`.
- [ ] Ocultar "senha atual" em `perfilPsicologo.js` quando `has_password === false`.
- [ ] Ajustar o texto da seção para o modo "criar senha".

## Critérios de aceite

- ✅ A sessão sobrevive a mais de 60 minutos de uso, renovando o token de forma transparente.
- ✅ Após uma renovação, a sessão continua funcionando na renovação seguinte (o refresh rotacionado foi persistido).
- ✅ Várias requisições simultâneas recebendo 401 disparam **uma única** renovação.
- ✅ Falha no refresh limpa as **quatro** chaves do `AsyncStorage`, sem deixar resíduo.
- ✅ Usuário criado via Google consegue definir uma senha sem que lhe seja pedida a "senha atual".
- ✅ Após definir a senha, esse usuário passa a conseguir entrar também por e-mail e senha.
- ✅ Usuário com senha continua vendo o campo "senha atual" e o fluxo inalterado (regressão).

## Dependências

- Depende da issue 04 (rota `token/refresh/` e o modo "criar senha" no backend).
- Depende da issue 05 (`has_password` chegando no objeto `user` persistido).
