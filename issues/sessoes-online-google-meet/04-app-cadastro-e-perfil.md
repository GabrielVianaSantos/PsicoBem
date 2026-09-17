# Issue 04 — App: campo do link no cadastro e no perfil do psicólogo

**Fase:** 4 — Interface de configuração
**Prioridade:** 🔴 Alta
**Arquivos principais:** `src/screens/cadastroPsicologos.js`, `src/screens/completarCadastroGoogle.js`, `src/screens/perfilPsicologo.js`
**Referência:** seções 4.1, 4.2 e 5 de `SPEC_SESSOES_ONLINE_GOOGLE_MEET.md`

## Problema

O backend (issues 02 e 03) já exige e já permite editar o link, mas nenhuma tela do app tem campo para isso ainda.

## Objetivo

Dar ao psicólogo um jeito claro de informar o link no cadastro e de editá-lo depois, com uma explicação curta de como conseguir esse link (a maioria não sabe que existe um link pessoal fixo do Meet).

## Escopo de implementação

### `src/screens/cadastroPsicologos.js`

- Novo `TextInputCustom` "Link da sua sala de vídeo", com `texto_placeholder` tipo "https://meet.google.com/xxx-xxxx-xxx".
- Texto de apoio abaixo do campo: algo como "Não tem um? Crie em meet.google.com/new e cole o link aqui."
- Validação client-side leve (mesma regra do backend: começa com `https://meet.google.com/`) antes de enviar, seguindo o padrão de validação já usado nesta tela (`validateForm`).

### `src/screens/completarCadastroGoogle.js`

- Mesmo campo e mesma explicação, no ramo de cadastro de psicólogo desta tela (ao lado de onde `crp`/`specialization` já são coletados).

### `src/screens/perfilPsicologo.js`

- Novo campo editável, no mesmo padrão de `especialidade` (estado local + `TextInputCustom` + envio via `PUT` de perfil).
- Deve aceitar receber um parâmetro de navegação (ex.: `route.params.focarCampo === 'linkSalaVideo'`) que leve o foco/scroll até este campo — usado pela issue 05 para o deep link do card do menu.

## Tarefas

- [ ] Adicionar o campo e a validação em `cadastroPsicologos.js`.
- [ ] Adicionar o campo e a validação em `completarCadastroGoogle.js` (ramo psicólogo).
- [ ] Adicionar o campo editável em `perfilPsicologo.js`, com salvamento via o mesmo fluxo de `especialidade`.
- [ ] Suportar o parâmetro de navegação que foca o campo, para uso da issue 05.
- [ ] Conferir que as telas de cadastro de paciente não são afetadas.
- [ ] Testar manualmente: cadastro nativo de psicólogo sem preencher o link é bloqueado com mensagem clara; cadastro via Google idem; edição do link no perfil salva e reflete no card da issue 05.

## Critérios de aceite

- ✅ Psicólogo não consegue avançar no cadastro (nativo ou Google) sem preencher um link no formato esperado.
- ✅ Mensagem de erro do backend (issue 02) aparece de forma legível na tela, seguindo o padrão de erro já usado nessas telas.
- ✅ Psicólogo consegue editar o link a qualquer momento pelo perfil.
- ✅ Navegar para o perfil com o parâmetro de foco leva direto ao campo do link.

## Dependências

- Depende das issues 02 e 03.
- É pré-requisito da issue 05.
