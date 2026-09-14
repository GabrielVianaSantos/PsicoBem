# Issue 01 — Backend: configuração de e-mail e TTL do token de recuperação

**Fase:** 1 — Configuração
**Prioridade:** 🔴 Alta
**Arquivos principais:** `psicoapp_backend/psicoapp_backend/settings.py`
**Origem:** seções 2, 3.3 e 3.4 de `SPEC_RECUPERACAO_SENHA_CONTAS_NATIVAS.md`

## Problema

Não existe nenhuma configuração de e-mail no projeto (`EMAIL_BACKEND`, `EMAIL_HOST` etc. ausentes de `settings.py`). Sem isso, não há como enviar o e-mail de recuperação de senha.

## Objetivo

Deixar o backend pronto para enviar e-mail via SMTP em produção, com um bloco de configuração 100% dependente de variáveis de ambiente (nenhum provedor específico acoplado no código), e sem quebrar o ambiente de desenvolvimento local (que não tem credenciais SMTP).

## Escopo de implementação

### `settings.py`

Adicionar, próximo ao bloco `GOOGLE_*` já existente:

```python
# E-mail (recuperação de senha)
EMAIL_HOST = os.getenv("EMAIL_HOST", "")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = env_bool("EMAIL_USE_TLS", "True")
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "PsicoBem <naoresponda@psicobem.app>")

if EMAIL_HOST:
    EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend"
else:
    # Sem credenciais configuradas (ex.: dev local): usar o backend de console,
    # que imprime o e-mail no terminal em vez de tentar enviar de verdade.
    EMAIL_BACKEND = "django.core.mail.backends.console.EmailBackend"

# TTL do token de recuperação de senha (reaproveita issue_purpose_token)
PASSWORD_RESET_TOKEN_TTL = int(os.getenv("PASSWORD_RESET_TOKEN_TTL", "900"))
```

Reaproveitar `env_bool()`, já existente em `settings.py` (mesmo helper usado por `DEBUG`).

## Tarefas

- [ ] Adicionar o bloco `EMAIL_*` com fallback para o backend de console quando `EMAIL_HOST` estiver vazio.
- [ ] Adicionar `PASSWORD_RESET_TOKEN_TTL`.
- [ ] Confirmar que `python manage.py check` passa sem exigir nenhuma variável nova em ambiente local (sem `.env` de e-mail).

## Critérios de aceite

- ✅ Ambiente local sem `EMAIL_HOST` definido usa o backend de console automaticamente — nenhum erro, nenhuma tentativa de conexão SMTP real.
- ✅ Definir `EMAIL_HOST` (e demais variáveis) no ambiente ativa o backend SMTP automaticamente, sem mudança de código.
- ✅ `manage.py check` continua passando sem erros.

## Dependências

- Nenhuma.
- É pré-requisito da issue 02.
