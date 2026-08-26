# Issues — Tela "Meu Perfil" para o Paciente

Data de geração: 2026-08-16
Origem: `SPEC_MEU_PERFIL_PACIENTE.md`
Escopo: nova tela de autoperfil do paciente (dados somente leitura + troca de senha), acessível pelo avatar em `HomePaciente`, mais um campo somente leitura adicionado ao `UserSerializer` do backend. Nenhuma correção foi aplicada nesta entrega.

## Estrutura

| Etapa | Issue | Foco | Prioridade |
|---|---|---|---|
| 1 | `01-expor-cpf-no-user-serializer.md` | Backend: adicionar `cpf` somente leitura ao `UserSerializer`, com hardening opcional de `email`. | 🔴 Alta |
| 2 | `02-criar-tela-meu-perfil.md` | Nova tela `src/screens/meuPerfil.js` com os dados somente leitura (nome, e-mail, CPF, psicólogo vinculado, tempo de tratamento). | 🔴 Alta |
| 3 | `03-secao-alterar-senha.md` | Seção de troca de senha em `MeuPerfil`, reaproveitando `authService.changePassword`. | 🟡 Média |
| 4 | `04-rota-e-avatar-clicavel.md` | Registrar a rota `MeuPerfil` e tornar o avatar de `HomePaciente` clicável. | 🟡 Média |
| 5 | `05-testes-de-regressao-meu-perfil.md` | Validar todos os cenários e confirmar ausência de regressão em `PerfilPaciente` e `PerfilPsicologo`. | 🟡 Média |

## Ordem recomendada

1. [01-expor-cpf-no-user-serializer.md](01-expor-cpf-no-user-serializer.md)
2. [02-criar-tela-meu-perfil.md](02-criar-tela-meu-perfil.md)
3. [03-secao-alterar-senha.md](03-secao-alterar-senha.md)
4. [04-rota-e-avatar-clicavel.md](04-rota-e-avatar-clicavel.md)
5. [05-testes-de-regressao-meu-perfil.md](05-testes-de-regressao-meu-perfil.md)

## Dependências

- A issue 01 é pré-requisito da issue 02: sem o campo `cpf` na resposta de `GET /auth/profile/`, a tela não tem como exibir o CPF.
- A issue 02 é pré-requisito das issues 03 e 04: a tela precisa existir antes de ganhar a seção de senha ou de virar destino de navegação.
- A issue 05 é a última: valida o conjunto de ponta a ponta e a ausência de regressão nas duas telas de perfil já existentes.

## Regras que não podem regredir

- `PerfilPaciente` (visão do psicólogo sobre um paciente específico, via `route.params.paciente`) continua funcionando exatamente como antes.
- `PerfilPsicologo` continua funcionando exatamente como antes.
- O avatar de `Home` (psicólogo) continua navegando para `PerfilPsicologo`, sem alteração.
- Nenhum campo de dado pessoal do paciente (nome, e-mail, CPF) fica editável na nova tela — a única ação é redefinir senha.
- O e-mail **não** se torna editável em nenhuma tela desta feature (decisão documentada na SPEC, seção 3.4).
- Um psicólogo autenticado que chama `GET /auth/profile/` não recebe CPF de ninguém (o campo só é preenchido quando existe `paciente_profile`).
- Nenhuma regra de autorização, autenticação ou vínculo é alterada.
