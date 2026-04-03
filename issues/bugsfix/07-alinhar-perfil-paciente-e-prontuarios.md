# Issue 07 - Padronizar objeto de paciente em PerfilPaciente e Prontuarios

**Origem no SPEC:** Achado 7
**Severidade:** alta
**Objetivo:** garantir que o fluxo iniciado em `GuiasApoio` navegue sempre com um objeto de paciente no shape esperado pelas telas seguintes.

## Problema

`GuiasApoio` repassa um objeto derivado de vinculo, enquanto `PerfilPaciente` e `Prontuarios` esperam um objeto `Paciente` com campos especificos. Isso pode gerar dados vazios e filtros com o ID errado.

## Impacto observado

- Perfil do paciente com `N/A` em campos importantes.
- Prontuarios consultados com `paciente_id` incorreto.
- Quebra de consistencia entre telas encadeadas.

## Escopo de implementacao

- Definir shape padrao do objeto `Paciente` usado na navegacao.
- Ajustar normalizacao antes de navegar ou adaptar telas para consumir o shape oficial.

## Tarefas

- [ ] Revisar o objeto enviado por `GuiasApoio`.
- [ ] Revisar o contrato esperado por `PerfilPaciente`.
- [ ] Revisar o contrato esperado por `Prontuarios`.
- [ ] Unificar o uso de `paciente.id` para sempre representar o ID real do paciente.

## Criterios de aceite

- [ ] `PerfilPaciente` recebe dados suficientes para preencher os campos exibidos.
- [ ] `Prontuarios` usa o ID correto do paciente.
- [ ] A navegacao entre as telas usa um shape unico e previsivel.

## Dependencias

- Depende da Issue 05.
