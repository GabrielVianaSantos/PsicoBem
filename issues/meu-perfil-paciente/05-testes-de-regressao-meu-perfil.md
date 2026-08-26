# Issue 05 — Testes de regressão da tela "Meu Perfil"

**Fase:** 5 — Fechamento
**Prioridade:** 🟡 Média
**Arquivos principais:** nenhum (validação sobre as issues 01–04)
**Origem:** seções 5 e 6 de `SPEC_MEU_PERFIL_PACIENTE.md`

## Problema

As issues 01–04 tocam em um serializer compartilhado (`UserSerializer`) e criam uma nova tela/rota no fluxo do paciente. É preciso validar o conjunto de ponta a ponta e confirmar que as duas telas de perfil já existentes (`PerfilPaciente`, vista pelo psicólogo, e `PerfilPsicologo`) não regrediram.

## Objetivo

Confirmar que a nova tela funciona em todos os cenários previstos na SPEC e que nada relacionado a perfil, no fluxo do paciente ou do psicólogo, foi quebrado.

## Escopo de implementação

Execução dos cenários de teste da seção 6 da SPEC. Nenhuma alteração de código é esperada nesta issue, exceto pequenos ajustes de correção caso algum cenário falhe.

## Tarefas

- [ ] Autenticar como paciente com psicólogo vinculado: conferir nome, e-mail, CPF, psicólogo atribuído e tempo de tratamento — tempo de tratamento batendo com a data de início do vínculo cadastrada.
- [ ] Autenticar como paciente sem psicólogo vinculado: conferir o estado vazio, sem erro.
- [ ] Trocar a senha com sucesso e fazer login novamente com a nova senha.
- [ ] Tentar trocar a senha com a senha atual errada: mensagem de erro, tela permanece no formulário.
- [ ] Tentar trocar a senha com "Nova Senha" e "Confirme a Nova Senha" diferentes: bloqueado antes de chamar a API.
- [ ] Confirmar que nenhum campo de dado pessoal (nome, e-mail, CPF) aceita edição.
- [ ] `GET /auth/profile/` autenticado como paciente: `cpf` presente e correto.
- [ ] `GET /auth/profile/` autenticado como psicólogo: sem erro, sem CPF de ninguém.
- [ ] Se o hardening de `email` (issue 01) foi aplicado: `PUT /auth/profile/update/` enviando um e-mail diferente não altera o e-mail do usuário.
- [ ] Reabrir `PerfilPaciente` a partir de `GuiasApoio`/`VinculosPacientes` (visão do psicólogo sobre um paciente específico) e confirmar que nada mudou.
- [ ] Reabrir `PerfilPsicologo` e confirmar que nada mudou, incluindo a própria troca de senha do psicólogo.
- [ ] Confirmar que o avatar de `Home` (psicólogo) continua navegando para `PerfilPsicologo`.
- [ ] `git diff --check` sem apontamentos no conjunto final das alterações.

## Critérios de aceite

- ✅ Todos os cenários acima passam.
- ✅ `PerfilPaciente` e `PerfilPsicologo` continuam funcionando exatamente como antes.
- ✅ `git diff --check` passa sem apontamentos.

## Dependências

- Depende de todas as issues anteriores (01–04).
