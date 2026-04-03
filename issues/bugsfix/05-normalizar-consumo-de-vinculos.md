# Issue 05 - Normalizar consumo de vinculos ativos no frontend

**Origem no SPEC:** Achado 5
**Severidade:** alta
**Objetivo:** impedir que telas tratem a lista de vinculos ativos como se fosse uma lista direta de pacientes.

## Problema

`getVinculosAtivos()` retorna objetos no formato de vinculo, com `paciente` aninhado. Algumas telas consomem esse retorno como se cada item ja fosse um paciente, usando nomes e IDs no nivel errado.

## Impacto observado

- Nomes em branco.
- IDs incorretos em navegao e formularios.
- Telas operando com payload diferente do que a API entrega.

## Escopo de implementacao

- Definir se o service deve normalizar o retorno para uma lista de pacientes ou se a UI deve consumir `vinculo.paciente`.
- Aplicar a decisao nas telas que usam `getVinculosAtivos()`.

## Tarefas

- [ ] Levantar todas as telas que usam `getVinculosAtivos()`.
- [ ] Escolher contrato padrao para o service.
- [ ] Remover acessos a campos de paciente no nivel errado.
- [ ] Revisar uso de `id` em navegacao, cards e formularios.

## Criterios de aceite

- [ ] Nenhuma tela trata objeto de vinculo como paciente puro por acidente.
- [ ] Labels, IDs e selecoes usam o shape oficial definido.
- [ ] O contrato de `getVinculosAtivos()` fica documentado no proprio service.

## Dependencias

- Depende conceitualmente da Issue 04.
- Bloqueia a Issue 06 e impacta a Issue 07.
