# Issue 06 - Corrigir fluxo de agendamento de sessao

**Origem no SPEC:** Achado 6
**Severidade:** critica
**Objetivo:** fazer o fluxo de agendamento usar a rota correta para tipos de sessao e enviar o ID real do paciente.

## Problema

O frontend consulta `/tipos-sessao/ativos/`, mas o backend publica a rota dentro de `/api/sessoes/`. Alem disso, a tela de agendamento usa uma lista de vinculos como se fosse uma lista de pacientes, o que pode enviar `paciente_id` incorreto.

## Impacto observado

- `404` na busca de tipos de sessao ativos.
- Selecao de paciente inconsistente.
- Criacao de sessao com ID invalido ou fluxo quebrado.

## Escopo de implementacao

- Ajustar o caminho do endpoint de tipos de sessao.
- Corrigir a origem do `paciente_id`.
- Validar todo o mapeamento entre item selecionado, label exibida e payload enviado.

## Tarefas

- [ ] Corrigir a rota usada por `sessaoService.js` para tipos de sessao ativos.
- [ ] Revisar a origem dos dados carregados em `agendarSessao.js`.
- [ ] Garantir que o seletor trabalhe com paciente real, nao com `id` de vinculo.
- [ ] Revisar validacoes, placeholders e payload final de criacao de sessao.

## Criterios de aceite

- [ ] A lista de tipos de sessao carrega sem `404`.
- [ ] O usuario seleciona pacientes com nome e ID corretos.
- [ ] O backend recebe `paciente_id` valido correspondente ao paciente vinculado.

## Dependencias

- Depende da Issue 05.
