# Issue 03 — Backend: os três endpoints de autenticação Google

**Fase:** 2 — Endpoints
**Prioridade:** 🔴 Alta
**Arquivos principais:** `psicoapp_backend/authentication/serializers.py`, `psicoapp_backend/authentication/views.py`, `psicoapp_backend/authentication/urls.py`, `psicoapp_backend/authentication/tests.py`
**Origem:** seções 3.1, 3.2, 3.3 e 3.5 de `SPEC_LOGIN_GOOGLE.md`

## Problema

Com a fundação da issue 02 pronta, ainda não existe nenhuma rota que receba o `id_token` do Google, decida entre login / vínculo / cadastro, e emita os tokens JWT da aplicação.

## Objetivo

Expor os três endpoints, garantindo a invariante central: **nenhum usuário é criado enquanto faltarem `user_type` e `cpf`/`crp`**.

## Escopo de implementação

### `serializers.py`

- **`GoogleCompleteRegistrationSerializer`** — `validate()` condicional por `user_type`: paciente exige `cpf` (`^\d{3}\.\d{3}\.\d{3}-\d{2}$`) e `gender` ∈ `{M,F,O}`; psicólogo exige `crp` (`^\d{2}/\d{4,6}$`). São os mesmos regexes já usados em `src/screens/cadastroPacientes.js` e `src/screens/cadastroPsicologos.js` — manter idênticos para não divergir a validação entre cliente e servidor.
- **`UserSerializer`** — acrescentar `auth_provider`, `email_verified`, `avatar_url` e `has_password` (`SerializerMethodField` sobre `obj.has_usable_password()`).
  **Todos os quatro precisam entrar em `read_only_fields`.** `user_update_view` usa este mesmo serializer com `partial=True`; qualquer campo gravável passa a ser editável pelo cliente. `google_sub` **não** entra no serializer em hipótese alguma.

### `views.py`

Extrair primeiro um helper `_auth_success_response(user, message, http_status=200)` — o bloco `RefreshToken.for_user(user)` está hoje **triplicado** em `views.py:86-93`, `:36-43` e `:63-70`. Reaproveitá-lo nas três views novas e, se possível, também nas três existentes.

**`POST /api/auth/google/`** — entrada `{"id_token"}`:

| cenário | HTTP | resposta |
|---|---|---|
| `google_sub` conhecido | 200 | `{status:"authenticated", message, user, tokens}` |
| e-mail existe, **sem** senha utilizável | 200 | `{status:"authenticated", ...}` — vincula direto, não há senha a confirmar |
| e-mail existe, **com** senha utilizável | 200 | `{status:"link_confirmation_required", link_token, expires_in, email}` |
| e-mail desconhecido | 200 | `{status:"registration_required", registration_token, expires_in, prefill:{email, first_name, last_name, picture}}` |
| token inválido / `aud` divergente | 400 | `{detail, code:"invalid_google_token"}` |
| `email_verified` falso | 403 | `{detail, code:"email_not_verified"}` |
| `is_active` falso | 401 | `{detail, code:"account_disabled"}` |
| `GOOGLE_AUTH_ENABLED` falso | 503 | `{detail, code:"google_auth_not_configured"}` |

**`POST /api/auth/google/link/`** — entrada `{"link_token", "password"}`:

| cenário | HTTP | resposta |
|---|---|---|
| senha correta | 200 | `{status:"authenticated", ...}` — grava `google_sub`, `email_verified=True` e `avatar_url` se estiver vazio |
| senha incorreta | 400 | `{password:["Senha incorreta."], code:"invalid_password"}` |
| token expirado/inválido | 401 | `{detail, code:"link_token_expired"}` |

**`POST /api/auth/google/complete/`** — entrada `{"registration_token", "user_type", "first_name", "last_name", "phone"}` mais `("cpf","gender")` ou `("crp","specialization")`:

| cenário | HTTP | resposta |
|---|---|---|
| criado | 201 | `{status:"authenticated", ...}` |
| mesmo `google_sub` já criado | 200 | `{status:"authenticated", ...}` — idempotente, cobre duplo submit e retry de rede |
| campos inválidos | 400 | erros **na raiz**: `{"cpf":[...]}`, `{"crp":[...]}`, `{"user_type":[...]}`, `{"gender":[...]}` |
| token expirado/inválido | 401 | `{detail, code:"registration_token_expired"}` |
| e-mail tomado nesse meio-tempo | 409 | `{detail, code:"email_taken"}` |

Regras invioláveis de `/complete/`:
1. `email` e `google_sub` vêm **exclusivamente do token assinado**. Qualquer `email` no corpo é ignorado (ou rejeitado com 400 se divergir).
2. Roda em `transaction.atomic()` e recheca `Q(email=...) | Q(google_sub=...)` **dentro** da transação antes de criar.
3. Criação: `create_user(...)` + `set_unusable_password()` explícito + `google_sub` + `email_verified=True` + `auth_provider='google'` + `avatar_url`, e em seguida `Paciente(cpf, gender)` ou `Psicologo(crp, specialization)`.
4. Username via `generate_unique_username()`, com retry único em `IntegrityError`.

> Os erros de campo saem **na raiz**, não aninhados em `user`, porque é esse o formato que o `handleError` de `src/services/authService.js:184-208` **já** traduz para "CPF já cadastrado." / "CRP já cadastrado.". Aninhar quebraria a tradução sem necessidade.

### `urls.py`

Acrescentar `google/`, `google/link/` e `google/complete/`.

## Tarefas

- [ ] Criar `GoogleCompleteRegistrationSerializer` com validação condicional por `user_type`.
- [ ] Acrescentar os quatro campos ao `UserSerializer`, **todos em `read_only_fields`**.
- [ ] Extrair `_auth_success_response()` e reaproveitar nas views existentes.
- [ ] Implementar `google_auth_view` com os oito cenários.
- [ ] Implementar `google_link_view` com verificação de senha via `check_password`.
- [ ] Implementar `google_complete_registration_view`, com `transaction.atomic()` e a recheca dentro da transação.
- [ ] Registrar as três rotas em `urls.py`.
- [ ] Escrever os testes de `tests.py` (ver critérios abaixo), com `@patch('authentication.services.verify_google_id_token')` para não depender de rede.

## Critérios de aceite

Todos verificáveis por teste automatizado:

- ✅ Usuário desconhecido → `registration_required`; `/complete/` → `201` com `CustomUser` + profile criados e consistentes.
- ✅ Segundo login da mesma conta → `authenticated`, sem criar duplicata.
- ✅ E-mail existente com senha → `link_confirmation_required`; `/link/` com senha correta → `200`; com senha incorreta → `400`.
- ✅ E-mail existente sem senha utilizável → vínculo direto, sem passar por confirmação.
- ✅ `email_verified` falso → `403`. `aud` divergente → `400`.
- ✅ Token de propósito expirado → `401`; com `typ` trocado → rejeitado.
- ✅ Corpo tentando sobrescrever o e-mail → prevalece o e-mail do token.
- ✅ CPF e CRP duplicados → `400` **na raiz**.
- ✅ Duplo submit de `/complete/` → segunda chamada responde `200`, sem erro e sem duplicar registros.
- ✅ Com `GOOGLE_AUTH_ENABLED` falso, os três endpoints retornam `503` sem afetar nenhuma outra rota da API.
- ✅ Nenhuma resposta de API expõe `google_sub`.

## Dependências

- Depende da issue 02 (`services.py` e os campos de identidade).
- É pré-requisito da issue 05.
