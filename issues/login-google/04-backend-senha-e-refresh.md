# Issue 04 — Backend: senha para conta sem senha e rota de refresh

**Fase:** 3 — Correções decorrentes
**Prioridade:** 🔴 Alta
**Arquivos principais:** `psicoapp_backend/authentication/views.py`, `psicoapp_backend/authentication/serializers.py`, `psicoapp_backend/authentication/urls.py`
**Origem:** seção 3.8 de `SPEC_LOGIN_GOOGLE.md`

## Problema

Dois problemas preexistentes que se tornam **bloqueadores** no momento em que passa a existir conta sem senha utilizável:

1. **`password_change_view` (`views.py:321-337`) fica sem saída para conta Google.** A linha 330 é:
   ```python
   if not authenticate(email=request.user.email, password=old_password):
       return Response({'old_password': 'Senha atual incorreta.'}, status=400)
   ```
   Com `set_unusable_password()`, `authenticate()` **sempre** retorna `None`. O usuário recebe "Senha atual incorreta" sem ter senha alguma para informar — e o caminho alternativo (reset por e-mail) não funciona, porque `password_reset_request_view` (`views.py:138`) apenas imprime o token no log do servidor, já que não há `EMAIL_BACKEND` configurado.

2. **A sessão cai em 60 minutos e não há como renovar.** `ACCESS_TOKEN_LIFETIME` é 60 min e `REFRESH_TOKEN_LIFETIME` é 7 dias, mas `TokenRefreshView` **não está registrada em lugar nenhum** — `@PsicoBem:refreshToken` é salvo pelo app e nunca usado. Isso já acontece hoje para todos os usuários, mas seria naturalmente atribuído ao login Google ("entrei com o Google e fui deslogado").

## Objetivo

Permitir que uma conta sem senha defina uma, orientar corretamente quem tentar login por senha numa conta Google, e viabilizar a renovação de sessão que a issue 07 vai consumir.

## Escopo de implementação

### `password_change_view` — ramificar por `has_usable_password()`

```python
if not request.user.has_usable_password():
    # modo "criar senha": exige apenas new_password (mínimo 6), ignora old_password
else:
    # fluxo atual, inalterado
```

No primeiro caso, a resposta de sucesso pode trazer `{'message': 'Senha criada com sucesso!'}` para a interface poder diferenciar. Preservar `set_password` + `save()` + `update_session_auth_hash` em ambos os ramos.

### `UserLoginSerializer` (`serializers.py:63`) — mensagem dedicada

Quando `authenticate()` falhar, verificar se existe `CustomUser` com aquele e-mail e `not has_usable_password()`. Nesse caso, retornar:

> "Esta conta foi criada com o Google. Use o botão \"Entre com o Google\"."

Sem essa mensagem, o usuário recebe "Credenciais inválidas" e não tem como descobrir o que fazer.

> **Trade-off registrado na SPEC (seção 4):** isso revela a existência da conta (enumeração leve). É o comportamento padrão em aplicações com login social; a alternativa (mensagem genérica) tornaria o fluxo incompreensível para o usuário legítimo.

### `urls.py` — rota de refresh

Registrar `TokenRefreshView` do SimpleJWT em `token/refresh/`.

> **Atenção:** `ROTATE_REFRESH_TOKENS=True` está ligado e o app `token_blacklist` **não** está instalado. Cada refresh devolve um refresh token novo, que o cliente **precisa persistir** (tratado na issue 07), e o token antigo permanece válido até expirar naturalmente. Dívida conhecida, registrada na seção 4 da SPEC e fora de escopo.

## Tarefas

- [ ] Ramificar `password_change_view` por `has_usable_password()`.
- [ ] Validar `new_password` com mínimo de 6 caracteres também no ramo "criar senha".
- [ ] Adicionar a mensagem dedicada ao `UserLoginSerializer`.
- [ ] Registrar `TokenRefreshView` em `token/refresh/`.
- [ ] Testes: conta sem senha define senha sem informar a atual; depois disso, passa a conseguir login por e-mail e senha.
- [ ] Testes: conta com senha continua exigindo a senha atual (regressão).
- [ ] Testes: login por senha em conta sem senha utilizável retorna a mensagem orientando o uso do Google.
- [ ] Teste: `POST token/refresh/` com refresh válido devolve novo par de tokens.

## Critérios de aceite

- ✅ Conta sem senha utilizável consegue definir uma senha sem informar "senha atual".
- ✅ Após definir a senha, essa conta passa a conseguir entrar também por e-mail e senha, **sem perder** o acesso via Google.
- ✅ Conta com senha continua exigindo a senha atual — comportamento atual preservado.
- ✅ Login por senha em conta criada via Google retorna mensagem orientando o uso do botão do Google.
- ✅ `POST /api/auth/token/refresh/` devolve novo par de tokens a partir de um refresh válido.
- ✅ Nenhuma outra view de autenticação teve seu comportamento alterado.

## Dependências

- Depende da issue 02 (precisa dos campos e do conceito de conta sem senha para ser testável de ponta a ponta).
- Independente da issue 03; podem ser feitas em paralelo.
- É pré-requisito da issue 07.
