# Issues — Recuperação de Senha para Contas Nativas

Data de geração: 2026-09-14
Origem: `SPEC_RECUPERACAO_SENHA_CONTAS_NATIVAS.md`
Escopo: corrigir a falha de segurança e o fluxo quebrado de "Esqueceu a senha?" (`RedefinirSenha`), passando a enviar um código de recuperação real por e-mail (SMTP) para contas nativas. Não altera login, cadastro ou login com Google além do necessário para bloquear reset de conta Google-only.

## Estrutura

| Etapa | Issue | Foco | Prioridade |
|---|---|---|---|
| 1 | `01-backend-configuracao-email.md` | Variáveis `EMAIL_*` e `PASSWORD_RESET_TOKEN_TTL` em `settings.py`, com fallback para console em dev. | 🔴 Alta |
| 2 | `02-backend-endpoints-reset-senha.md` | Reescrever os dois endpoints: token de propósito, bloqueio de conta Google-only, envio de e-mail, throttle. | 🔴 Alta |
| 3 | `03-app-authservice-reset-senha.md` | Ajustar `authService.js`: remover `uid`, propagar `code` do erro. | 🟡 Média |
| 4 | `04-app-tela-redefinir-senha.md` | Ajustar `redefinirSenha.js`: parar de exibir o token, tratar token expirado. | 🟡 Média |
| 5 | `05-testes-regressao-e2e.md` | Validação ponta a ponta e regressão de login/Google. | 🟡 Média |

## Ordem recomendada

1. [01-backend-configuracao-email.md](01-backend-configuracao-email.md)
2. [02-backend-endpoints-reset-senha.md](02-backend-endpoints-reset-senha.md)
3. [03-app-authservice-reset-senha.md](03-app-authservice-reset-senha.md)
4. [04-app-tela-redefinir-senha.md](04-app-tela-redefinir-senha.md)
5. [05-testes-regressao-e2e.md](05-testes-regressao-e2e.md)

## Dependências

- A issue 01 é pré-requisito da 02 (as variáveis precisam existir antes do envio de e-mail ser implementado).
- A issue 02 é pré-requisito das issues 03 e 04 (o novo contrato dos endpoints precisa existir antes de o app consumi-lo).
- As issues 03 e 04 podem ser feitas em paralelo depois da 02.
- A issue 05 é a última: valida o conjunto e a ausência de regressão.

## Regras que não podem regredir

- Login por e-mail e senha de contas nativas existentes permanece inalterado.
- Login com Google e a criação de senha via "Meu Perfil" (`password_change_view`) permanecem inalterados.
- Nenhuma conta Google-only pode ganhar uma senha nativa através do fluxo de "Esqueceu a senha?" — apenas autenticada, via "Meu Perfil".
- A resposta de `POST /auth/password/reset/` é sempre a mesma mensagem genérica, independentemente do resultado real (conta existe, não existe, ou é Google-only) — nenhuma enumeração de contas por essa via.
- Nenhum token ou código de recuperação é devolvido pela API ou exibido em tela — só chega ao usuário por e-mail.
- `git diff --check` sem apontamentos em cada issue.
