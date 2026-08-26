# Issue 02 — Criar a tela "Meu Perfil" com os dados somente leitura

**Fase:** 2 — Tela principal
**Prioridade:** 🔴 Alta
**Arquivos principais:** `src/screens/meuPerfil.js` (novo)
**Origem:** seções 3.1 e 3.4 de `SPEC_MEU_PERFIL_PACIENTE.md`

## Problema

O paciente não tem nenhuma tela para ver os próprios dados (nome, e-mail, CPF, psicólogo vinculado, tempo de tratamento). A única tela de perfil relacionada a paciente hoje (`PerfilPaciente`) é usada pelo psicólogo para ver **outro** usuário, e não serve para o autoperfil.

## Objetivo

Criar `src/screens/meuPerfil.js`, seguindo a estrutura visual de `src/screens/perfilPsicologo.js`, exibindo os cinco dados pedidos, todos somente leitura, sem nenhuma ação de edição de dado pessoal.

## Escopo de implementação

- Estrutura visual seguindo `perfilPsicologo.js`: `<Topo back compact />`, cabeçalho com avatar grande (inicial do nome) e nome do usuário, blocos de informação no padrão `readOnlyBox`/`labelReadOnly`/`textReadOnly` (ou equivalente) para cada dado.
- Buscar nome completo e e-mail via `authService.getUserProfile()`, no mesmo padrão de `sincronizarPerfil()` já usado em `perfilPsicologo.js` (chamado em `useFocusEffect`, para refletir alterações feitas em outra sessão).
- Buscar CPF do mesmo `authService.getUserProfile()` (depende da issue 01 já ter incluído esse campo na resposta).
- Buscar psicólogo vinculado e tempo de tratamento via `pacienteService.getMeuPsicologo()` — mesma chamada já usada por `meuPsicologo.js`, nenhuma chamada nova.
- Tratar a ausência de vínculo ativo (`getMeuPsicologo()` retornando `success: false` por 404) como um estado válido do domínio: mensagem neutra tipo "Nenhum psicólogo vinculado no momento", sem `Alert` de erro.
- Não incluir nenhum campo editável, `TextInput` habilitado ou botão de "Salvar" para os dados pessoais — apenas exibição.
- Não criar a seção de troca de senha nesta issue (issue 03).
- Não alterar `perfilPsicologo.js`, `PerfilPaciente/index.js`, `meuPsicologo.js`, `authService.js` ou `pacienteService.js`.

## Tarefas

- [ ] Criar `src/screens/meuPerfil.js` com o cabeçalho (avatar + nome) no padrão de `perfilPsicologo.js`.
- [ ] Exibir Nome completo e E-mail (via `authService.getUserProfile()`).
- [ ] Exibir CPF (mesmo `getUserProfile()`, campo novo da issue 01).
- [ ] Exibir psicólogo vinculado (nome, e opcionalmente CRP/especialidade) via `pacienteService.getMeuPsicologo()`.
- [ ] Exibir tempo de tratamento em dias (`duracao_dias` da mesma resposta).
- [ ] Implementar o estado "sem psicólogo vinculado" sem exibir `Alert` de erro.
- [ ] Confirmar visualmente/por leitura de código que nenhum campo de dado pessoal é editável.

## Critérios de aceite

- ✅ A tela exibe Nome completo, E-mail e CPF do paciente autenticado, todos somente leitura.
- ✅ A tela exibe o nome do psicólogo vinculado ativo e o tempo de tratamento em dias, quando houver vínculo.
- ✅ Um paciente sem psicólogo vinculado vê uma mensagem neutra, sem erro nem tela quebrada.
- ✅ Nenhum campo de dado pessoal tem input editável ou botão de salvar.
- ✅ Nenhuma chamada de API nova é criada — reaproveita `authService.getUserProfile()` e `pacienteService.getMeuPsicologo()`.

## Dependências

- Depende da issue 01 (campo `cpf` precisa estar disponível em `GET /auth/profile/`).
- É pré-requisito das issues 03 e 04.
