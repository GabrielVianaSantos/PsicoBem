# Issue 03 — Identificar o paciente nos cards de Odisséia do psicólogo

**Fase:** 3 — Contexto clínico na listagem  
**Prioridade:** 🟡 Média  
**Arquivos principais:** `src/screens/registrosOdisseia.js` e `psicoapp_backend/engajamentos/serializers.py`  
**Origem:** seção 3.2 de `SPEC_CORRECOES_ODISSEIA.md`

## Problema

O backend já disponibiliza o campo somente de leitura `paciente_nome` em `RegistroOdisseiaSerializer`, porém o card da tela não o utiliza. Assim, o psicólogo vê as informações emocionais do registro sem saber qual paciente o realizou.

## Objetivo

Exibir claramente o paciente autor em cada card apresentado para o psicólogo, preservando a visualização pessoal e sem redundância para o paciente.

## Escopo de implementação

- Confirmar a presença de `paciente_nome` nas respostas de lista e detalhe de registros acessíveis pelo psicólogo.
- Exibir no cabeçalho de cada card, na visão do psicólogo, o texto `Paciente: <nome>`.
- Manter emoji, humor e data já exibidos no card.
- Não exibir o próprio nome na visão do paciente.
- Garantir fallback visual seguro caso o nome não seja retornado em algum registro legado ou resposta incompleta.

## Tarefas

- [ ] Revisar `RegistroOdisseiaSerializer` em `psicoapp_backend/engajamentos/serializers.py` e confirmar que `paciente_nome` é somente leitura.
- [ ] Confirmar que o campo é retornado pelo endpoint de lista usado pelo psicólogo.
- [ ] Não aceitar `paciente` ou `paciente_nome` como dados graváveis enviados pelo cliente.
- [ ] Condicionar a identificação visual ao perfil de psicólogo em `src/screens/registrosOdisseia.js`.
- [ ] Posicionar o nome no cabeçalho do card, junto do contexto de humor e data, sem competir com os demais dados.
- [ ] Definir texto de fallback neutro para ausência de `paciente_nome`, sem quebrar a renderização.
- [ ] Conferir nomes longos em telas menores e ajustar estilos somente se necessário.

## Critérios de aceite

- ✅ Cada card visto pelo psicólogo mostra `Paciente: <nome>` usando o dado da API.
- ✅ O nome é exibido somente para psicólogos autorizados que já podem acessar aquele registro.
- ✅ O paciente não vê o próprio nome repetido em sua lista pessoal.
- ✅ A ausência do campo não interrompe a renderização dos cards.
- ✅ O serializer não permite atribuir ou alterar o paciente pelo payload do cliente.

## Dependências

- Depende da issue 01 para assegurar que somente psicólogos autorizados recebam os registros.
- Recomendada após a issue 02, pois utiliza a visão de listagem específica do psicólogo.
