# Issues — Login e Cadastro com Google

Data de geração: 2026-08-16
Origem: `SPEC_LOGIN_GOOGLE.md`
Escopo: autenticação via conta Google (login **e** cadastro completo) no aplicativo Android, com validação do `id_token` no backend Django. Nenhuma alteração foi aplicada nesta entrega.

O recorte é Android; o iOS fica documentado como extensão futura (o backend já nasce com allowlist de audiences para permitir isso sem alteração de código).

## Estrutura

| Etapa | Issue | Foco | Prioridade |
|---|---|---|---|
| 0 | `01-configuracao-google-cloud.md` | Manual: OAuth clients (Web + Android), SHA-1 por perfil, `google-services.json` regenerado. | 🔴 Alta |
| 1 | `02-backend-modelo-e-servicos.md` | Campos de identidade em `CustomUser`, migration, `services.py` (validação do `id_token`, tokens de propósito, username único). | 🔴 Alta |
| 2 | `03-backend-endpoints-google.md` | Os três endpoints: `/google/`, `/google/link/`, `/google/complete/`. | 🔴 Alta |
| 3 | `04-backend-senha-e-refresh.md` | Correção de `password_change_view`, mensagem do `UserLoginSerializer`, rota `token/refresh/`. | 🔴 Alta |
| 4 | `05-app-infraestrutura-login-google.md` | Biblioteca nativa, configuração, `googleAuth.js`, `AuthProvider`, botão do login, build EAS. | 🔴 Alta |
| 5 | `06-app-telas-complemento-e-vinculo.md` | Telas `CompletarCadastroGoogle` e `ConfirmarVinculoGoogle` + rotas. | 🔴 Alta |
| 6 | `07-app-refresh-automatico-e-senha.md` | Refresh automático no interceptor e `has_password` nas telas de perfil. | 🟡 Média |
| 7 | `08-deploy-e-validacao-e2e.md` | Deploy com rebuild da imagem e validação ponta a ponta no dispositivo. | 🟡 Média |

## Ordem recomendada

1. [01-configuracao-google-cloud.md](01-configuracao-google-cloud.md)
2. [02-backend-modelo-e-servicos.md](02-backend-modelo-e-servicos.md)
3. [03-backend-endpoints-google.md](03-backend-endpoints-google.md)
4. [04-backend-senha-e-refresh.md](04-backend-senha-e-refresh.md)
5. [05-app-infraestrutura-login-google.md](05-app-infraestrutura-login-google.md)
6. [06-app-telas-complemento-e-vinculo.md](06-app-telas-complemento-e-vinculo.md)
7. [07-app-refresh-automatico-e-senha.md](07-app-refresh-automatico-e-senha.md)
8. [08-deploy-e-validacao-e2e.md](08-deploy-e-validacao-e2e.md)

## Dependências

- A issue 01 é **manual** (Google Cloud Console / Firebase) e bloqueia apenas a issue 05. Pode ser feita em paralelo com 02, 03 e 04.
- A issue 02 é pré-requisito de 03 e 04 (ambas consomem `services.py` e os campos novos).
- A issue 05 depende de 01 e 03 — precisa dos endpoints no ar (ainda que respondendo `503`) e dos OAuth clients criados.
- A issue 06 depende de 05 (a infraestrutura de login precisa existir antes das telas).
- A issue 07 depende de 04 e 05.
- A issue 08 é a última e depende de todas.

As issues 02, 03 e 04 podem ser desenvolvidas e deployadas **antes** da configuração externa estar pronta: sem `GOOGLE_OAUTH_WEB_CLIENT_ID`, os endpoints respondem `503` de forma controlada, sem afetar nenhum fluxo existente.

## Regras que não podem regredir

- Login por e-mail e senha permanece **idêntico** para todas as contas existentes.
- Contas existentes permanecem com `auth_provider='local'`, `google_sub=NULL`, `email_verified=False` — nenhuma migração de dados as altera.
- Cadastro tradicional de paciente e de psicólogo continua funcionando sem alteração.
- **Nenhum usuário pode existir sem `user_type` e sem o profile correspondente.** É a invariante central da arquitetura escolhida.
- O `id_token` é sempre validado no backend contra o JWKS do Google; o aplicativo nunca é fonte de verdade sobre identidade.
- `google_sub` e `email` são lidos exclusivamente do payload assinado dos tokens de propósito — nunca do corpo da requisição.
- Contas só são criadas ou vinculadas com `email_verified: true`.
- `google_sub` nunca é exposto em nenhuma resposta de API.
- Campos novos do `UserSerializer` entram obrigatoriamente em `read_only_fields` (`user_update_view` usa o mesmo serializer com `partial=True`).
- Nenhuma regra de autorização existente é alterada.
