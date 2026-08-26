# Issues — Correção de Erros de Login e Cadastro Redirecionando para "Início"

Data de geração: 2026-08-16
Origem: `SPEC_CORRECAO_ERROS_LOGIN_CADASTRO.md`
Escopo: correção de bug no fluxo de autenticação (`Login`, `CadastroPacientes`, `CadastroPsicologos`) e nos arquivos que ele compartilha (`AuthProvider`, `authService`, `routes.js`). Nenhuma correção foi aplicada nesta entrega.

Este backlog não altera nenhum arquivo de `psicoapp_backend/`, nem o contrato dos endpoints de autenticação.

## Estrutura

| Etapa | Issue | Foco | Prioridade |
|---|---|---|---|
| 1 | `01-corrigir-flag-de-loading-do-auth-provider.md` | Causa raiz: separar o flag de bootstrap do flag usado por login/cadastro/atualização de perfil, parando o redirecionamento para "Início". | 🔴 Alta |
| 2 | `02-propagar-erros-de-campo-do-backend.md` | Propagar o erro bruto do backend (`data`) do `AuthProvider` até as telas, e completar o parsing de erros aninhados em `authService`. | 🔴 Alta |
| 3 | `03-destacar-erros-cadastro-pacientes.md` | Contornar em vermelho CPF, E-mail e Confirma Senha em `CadastroPacientes` quando o erro vier do servidor. | 🟡 Média |
| 4 | `04-destacar-erros-cadastro-psicologos.md` | Contornar em vermelho CRP, E-mail e Confirma Senha em `CadastroPsicologos` quando o erro vier do servidor. | 🟡 Média |
| 5 | `05-testes-de-regressao-login-cadastro.md` | Validar todos os cenários de erro e sucesso do fluxo, sem regressão. | 🟡 Média |

## Ordem recomendada

1. [01-corrigir-flag-de-loading-do-auth-provider.md](01-corrigir-flag-de-loading-do-auth-provider.md)
2. [02-propagar-erros-de-campo-do-backend.md](02-propagar-erros-de-campo-do-backend.md)
3. [03-destacar-erros-cadastro-pacientes.md](03-destacar-erros-cadastro-pacientes.md)
4. [04-destacar-erros-cadastro-psicologos.md](04-destacar-erros-cadastro-psicologos.md)
5. [05-testes-de-regressao-login-cadastro.md](05-testes-de-regressao-login-cadastro.md)

## Dependências

- A issue 01 é independente e deve vir primeiro: ela já corrige sozinha o sintoma mais grave (redirecionamento para "Início" em login e cadastro), incluindo o efeito colateral em `updateProfile()`.
- A issue 02 é pré-requisito das issues 03 e 04: sem o `data` do erro chegando até a tela, não há campo para destacar.
- As issues 03 e 04 são independentes entre si e podem ser feitas em paralelo depois da 02.
- A issue 05 é a última: valida o conjunto (navegação + destaque de campo) de ponta a ponta.

## Regras que não podem regredir

- Nenhum arquivo de `psicoapp_backend/` é alterado.
- O contrato de `login`, `registerPaciente`, `registerPsicologo` (parâmetros de entrada e formato de sucesso) permanece o mesmo — só o retorno de falha ganha o campo `data`.
- A mensagem de erro de login continua genérica ("Credenciais inválidas"), sem indicar qual campo está incorreto.
- A validação local já existente (formato de e-mail, CPF, CRP, senha curta) continua funcionando sem alteração de comportamento.
- O carregamento inicial do app (splash enquanto lê o `AsyncStorage`) continua funcionando normalmente.
- `RedefinirSenha.js` e `TipoCadastro.js` não são tocadas — confirmado na SPEC que não sofrem da mesma causa raiz.
- Nenhuma tela fora de `Login`, `CadastroPacientes`, `CadastroPsicologos`, `AuthProvider.js`, `authService.js` e `routes.js` tem sua árvore de componentes ou lógica alterada.
