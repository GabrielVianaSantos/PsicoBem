# Issue 02 — Backend: campos de identidade e camada de serviços

**Fase:** 1 — Fundação do backend
**Prioridade:** 🔴 Alta
**Arquivos principais:** `psicoapp_backend/requirements.txt`, `psicoapp_backend/psicoapp_backend/settings.py`, `psicoapp_backend/authentication/models.py`, `psicoapp_backend/authentication/services.py` (novo), `psicoapp_backend/authentication/admin.py`
**Origem:** seções 3.4 e 3.6 de `SPEC_LOGIN_GOOGLE.md`

## Problema

O backend não tem como representar uma identidade Google nem como validar um `id_token`:

- `CustomUser` não possui nenhum campo para o `sub` do Google, nem para distinguir conta local de conta social.
- Não há dependência capaz de validar assinatura de `id_token` (`google-auth` ausente; `requests` existe apenas como transitivo no venv, sem estar declarado em `requirements.txt`).
- `username` é `UNIQUE` e `NOT NULL`, e o Google não fornece um. A geração usada hoje pelo app (`authService.js:36`, `email.split('@')[0]`) **já colide**: `joao@gmail.com` e `joao@outlook.com` produzem o mesmo valor.

## Objetivo

Criar a fundação sobre a qual os endpoints da issue 03 serão construídos: campos de identidade, migration e uma camada de serviços isolada e testável, sem ainda expor nenhuma rota nova.

## Escopo de implementação

### `requirements.txt`

Acrescentar `google-auth` e `requests`. As transitivas de `google-auth` (`cachetools`, `pyasn1-modules`, `rsa`) não devem ser pinadas; todas têm wheel para `python:3.13-slim`, sem necessidade de build tools.

### `authentication/models.py` — quatro campos em `CustomUser`

| campo | definição |
|---|---|
| `google_sub` | `CharField(max_length=255, unique=True, null=True, blank=True, default=None, db_index=True)` |
| `auth_provider` | `CharField(max_length=20, choices=(('local','Local'),('google','Google')), default='local')` |
| `email_verified` | `BooleanField(default=False)` |
| `avatar_url` | `URLField(max_length=500, blank=True, null=True)` |

Todos nullable ou com `default`, para a migration aplicar sem prompt interativo e sem downtime. Postgres aceita múltiplos `NULL` em coluna `UNIQUE`, então contas locais convivem sem conflito. Contas existentes recebem `auth_provider='local'` automaticamente.

Migration resultante: `authentication/migrations/0003_customuser_google_fields.py`.

### `authentication/services.py` (novo, seguindo a convenção de `core/services.py`)

```python
class GoogleAuthError(Exception)              # .code, .message, .http_status
def verify_google_id_token(raw) -> dict
def issue_purpose_token(typ, payload) -> tuple[str, int]
def decode_purpose_token(raw, expected_typ) -> dict
def generate_unique_username(email) -> str
```

- **`verify_google_id_token`**: usa `google.oauth2.id_token.verify_oauth2_token(raw, google_requests.Request(), audience=None, clock_skew_in_seconds=10)`, que já valida assinatura contra o JWKS do Google (com cache e rotação), `exp` e `iss`. O `audience` é `None` **de propósito**, e o `aud` é conferido manualmente contra `settings.GOOGLE_OAUTH_ALLOWED_AUDIENCES` — assim o client iOS entra depois por variável de ambiente, sem alterar código. Rejeitar quando `email_verified` não for `True`. Traduzir `ValueError` da biblioteca em `GoogleAuthError('invalid_google_token')`.
- **`issue_purpose_token` / `decode_purpose_token`**: JWT HS256 com `settings.SECRET_KEY` via PyJWT (já em `requirements.txt`), claims `{typ, iss:"psicobem", sub, email, exp, iat, jti}`. O decode deve exigir a presença de `exp`, `iat`, `typ`, `sub` e `email`, e validar `typ == expected_typ` e `iss == "psicobem"`. Esses tokens não são confundíveis com o access token do SimpleJWT (não têm `token_type` nem `user_id`, então `JWTAuthentication` os rejeita), e a checagem de `typ` impede o inverso.
- **`generate_unique_username`**: parte local do e-mail, `lower()`, apenas `[a-z0-9._-]`, truncada em 24 caracteres; vazia → `"user"`. Em colisão, sufixo aleatório de 4 caracteres alfanuméricos (até 10 tentativas); fallback final `user_<uuid4[:12]>`.

### `settings.py` — após o bloco `SIMPLE_JWT`

```python
GOOGLE_OAUTH_WEB_CLIENT_ID = os.getenv("GOOGLE_OAUTH_WEB_CLIENT_ID", "")
GOOGLE_OAUTH_ALLOWED_AUDIENCES = env_list("GOOGLE_OAUTH_ALLOWED_AUDIENCES", GOOGLE_OAUTH_WEB_CLIENT_ID)
GOOGLE_PURPOSE_TOKEN_TTL = int(os.getenv("GOOGLE_PURPOSE_TOKEN_TTL", "900"))
GOOGLE_AUTH_ENABLED = bool(GOOGLE_OAUTH_ALLOWED_AUDIENCES)
```

Reaproveitar o helper `env_list()` que **já existe** em `settings.py:17` — não escrever outro parser de lista.

### `authentication/admin.py`

Acrescentar `auth_provider` e `email_verified` ao fieldset "Informações Adicionais", `google_sub` em `readonly_fields`, e `auth_provider` em `list_filter`.

## Tarefas

- [ ] Adicionar `google-auth` e `requests` ao `requirements.txt`.
- [ ] Adicionar os quatro campos a `CustomUser`.
- [ ] Gerar a migration `0003` e confirmar que aplica sem prompt interativo.
- [ ] Criar `authentication/services.py` com as cinco funções e a exceção.
- [ ] Adicionar o bloco `GOOGLE_*` ao `settings.py`, reaproveitando `env_list()`.
- [ ] Atualizar `authentication/admin.py`.
- [ ] Escrever testes unitários de `generate_unique_username` (caminho feliz, colisão, e-mail sem parte local válida).
- [ ] Escrever testes unitários do par `issue_purpose_token` / `decode_purpose_token`: válido, expirado, `typ` divergente, assinatura adulterada, claim obrigatória ausente.

## Critérios de aceite

- ✅ `python manage.py check` passa sem erros.
- ✅ `python manage.py makemigrations --check` não acusa migration pendente após a `0003`.
- ✅ A migration aplica em base limpa e em base com dados, sem prompt interativo.
- ✅ Contas existentes ficam com `auth_provider='local'`, `google_sub=NULL`, `email_verified=False`.
- ✅ `generate_unique_username` nunca retorna valor já existente, inclusive sob colisão de parte local.
- ✅ `decode_purpose_token` recusa token expirado, com `typ` divergente e com assinatura adulterada.
- ✅ Nenhuma rota nova foi exposta nesta issue.

## Dependências

- Nenhuma. É a issue de base do backend.
- É pré-requisito das issues 03 e 04.
