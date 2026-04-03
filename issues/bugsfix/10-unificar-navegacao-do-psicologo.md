# Issue 10 - Unificar contratos de navegacao no fluxo do psicologo

**Origem no SPEC:** Achado 10
**Severidade:** media
**Objetivo:** reduzir fragilidade de navegacao causada pela mistura de stack e tab com nomes de rota divergentes.

## Problema

O fluxo do psicologo mistura rotas do stack e do tab navigator com nomes diferentes para destinos parecidos, como `Sessoes` e `Sessões`. Isso funciona de forma oportunista em alguns contextos, mas aumenta muito a chance de erro de navegacao.

## Impacto observado

- Fluxo dependente do contexto em que a tela foi aberta.
- Maior risco de rota inexistente, duplicada ou inconsistente.

## Escopo de implementacao

- Revisar a arquitetura de navegacao do psicologo.
- Padronizar nomes de rota entre stack e tabs.
- Reduzir duplicidade e ambiguidade no fluxo autenticado.

## Tarefas

- [ ] Mapear todas as rotas do fluxo do psicologo.
- [ ] Identificar duplicidades entre stack e tab.
- [ ] Definir convencao unica de nomes.
- [ ] Ajustar chamadas de `navigate()` para a convencao final.

## Criterios de aceite

- [ ] O fluxo do psicologo usa nomes de rota consistentes.
- [ ] Nao ha dependencia acidental entre contexto de tab e stack para navegar.
- [ ] As rotas principais do psicologo ficam previsiveis e documentadas.

## Dependencias

- Recomendado apos estabilizar os contratos de dados das telas principais.
