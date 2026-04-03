# Issue 01 - Corrigir carregamento de perfil na home do psicologo

**Origem no SPEC:** Achado 1
**Severidade:** alta
**Objetivo:** fazer a home do psicologo consumir corretamente o retorno do perfil e exibir dados reais, sem depender de um contrato inexistente no service.

## Problema

A tela inicial do psicologo chama `authService.getUserProfile()` como se o retorno fosse `{ success, data }`, mas o service devolve o payload bruto da API. Com isso, `profileRes.success` fica `undefined`, o estado nao e carregado corretamente e a home cai em fallback generico.

## Impacto observado

- Nome do psicologo pode nao aparecer.
- CRP nao e exibido.
- O subtitulo mostra e-mail no lugar de informacao profissional.

## Escopo de implementacao

- Revisar o contrato entre `home.js` e `authService.getUserProfile()`.
- Definir o shape oficial de retorno consumido pela home.
- Garantir que a home use dados reais do perfil carregado.
- Decidir se o CRP vira responsabilidade do endpoint de perfil ou se sai da home enquanto nao houver dado confiavel.

## Tarefas

- [ ] Mapear o retorno atual de `/api/auth/profile/`.
- [ ] Ajustar service ou tela para um contrato unico e explicito.
- [ ] Corrigir o preenchimento do estado local da home.
- [ ] Revisar regra de exibicao de nome, subtitulo e CRP.
- [ ] Validar fallback apenas para erro real ou ausencia legitima de dados.

## Criterios de aceite

- [ ] A home do psicologo carrega o nome real do usuario autenticado.
- [ ] A tela nao depende mais de `profileRes.success` se esse campo nao fizer parte do contrato final.
- [ ] O subtitulo e as informacoes do card superior ficam coerentes com o papel `psicologo`.
- [ ] O comportamento de CRP fica definido: ou aparece corretamente, ou deixa de ser prometido pela UI.

## Dependencias

- Pode depender da Issue 03 caso o contrato final de perfil profissional inclua `crp` e `specialization`.
