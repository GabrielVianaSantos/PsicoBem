# Issue 02 — Restringir Odisséia do psicólogo ao modo leitura

**Fase:** 2 — Experiência do psicólogo  
**Prioridade:** 🔴 Alta  
**Arquivos principais:** `src/screens/registrosOdisseia.js`, `src/routes.js`, `src/services/odisseiaService.js` e serviços relacionados  
**Origem:** seção 3.1 de `SPEC_CORRECOES_ODISSEIA.md`

## Problema

A tela `RegistrosOdisseia` é compartilhada pelos fluxos de paciente e psicólogo. Por isso, o psicólogo visualiza a aba **Novo Registro**, o formulário e os atalhos de criação, embora sua função seja apenas consultar registros de pacientes.

## Objetivo

Oferecer ao psicólogo uma visão de leitura da Odisséia, sem qualquer ponto de entrada para criar, editar ou excluir registros.

## Escopo de implementação

- Identificar o perfil autenticado pela fonte de autenticação já usada no app.
- Para paciente, preservar a experiência atual de **Meus Registros** e **Novo Registro**.
- Para psicólogo, renderizar somente a listagem de registros disponíveis.
- Impedir que parâmetros de rota como `modo: 'novo'` habilitem o formulário para psicólogos.
- Carregar a lista do psicólogo pelo serviço de Odisséia apropriado, sem alterar o contrato da API.
- Ajustar título, subtítulo e estado vazio para deixar claro que a lista corresponde aos registros compartilhados pelos pacientes.

## Tarefas

- [ ] Revisar como `src/screens/registrosOdisseia.js` recebe o perfil do usuário e o parâmetro `modo` da rota.
- [ ] Adicionar uma condição única e clara para diferenciar o fluxo de paciente do fluxo de psicólogo.
- [ ] Ocultar a aba **Novo Registro** para o psicólogo.
- [ ] Não renderizar formulário, menu de seções, botão de salvar ou CTA de criação para o psicólogo.
- [ ] Garantir que o estado vazio do psicólogo não ofereça o botão **Criar primeiro registro**.
- [ ] Ignorar ou normalizar `modo: 'novo'` para lista quando o perfil for psicólogo.
- [ ] Usar `odisseiaService.getRegistrosOdisseia()` (ou uma abstração equivalente) para obter a lista do psicólogo.
- [ ] Verificar os pontos de entrada em `src/routes.js` e telas do psicólogo para que nenhum navegue com modo de criação.
- [ ] Manter intacto o fluxo de criação do paciente, incluindo validação e envio do formulário.

## Critérios de aceite

- ✅ O psicólogo abre **Registros de Odisséia** e vê somente a lista de registros compartilhados.
- ✅ Não há aba, botão, CTA ou formulário de **Novo Registro** no perfil de psicólogo.
- ✅ Forçar a rota com `modo: 'novo'` não exibe o formulário para psicólogo.
- ✅ O paciente mantém o fluxo atual para consultar e criar seus próprios registros.
- ✅ O estado vazio e os textos da visão de psicólogo não sugerem que ele deve criar um registro.

## Dependências

- Requer a conclusão da issue 01 para que a regra de somente leitura também esteja garantida pela API.
