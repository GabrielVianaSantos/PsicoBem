# Issue 04 — App: exibição do cancelamento tardio e motivo em Detalhes da Sessão

**Fase:** 4 — Transparência
**Prioridade:** 🟡 Média
**Arquivos principais:** `src/screens/detalhesSessao.js`
**Origem:** seção 3.6 de `SPEC_POLITICA_CANCELAMENTO_SESSAO.md`

## Problema

Com as issues 01 e 02, os dados de cancelamento tardio já existem e são persistidos, mas nenhuma tela mostra essa informação — nem para o paciente, nem para o psicólogo.

## Objetivo

Dar visibilidade total (ambos os lados) a quem cancelou, se foi tardio, e o motivo, quando houver.

## Escopo de implementação

Em `detalhesSessao.js`, para sessões com `status === 'cancelada'` e `cancelado_por` preenchido, adicionar uma seção (mesmo padrão visual das seções já existentes — `estilos.section`/`estilos.sectionTitle`) mostrando:

- Quem cancelou (`cancelado_por_display`).
- Se foi tardio (`cancelamento_tardio`) — um aviso textual, não precisa de tag/badge nova.
- O motivo (`motivo_cancelamento`), quando presente.

Visível para os dois participantes, sem checagem de papel — a mesma sessão já é restrita a paciente/psicólogo dela pela autorização existente.

Se `cancelado_por` for `null` (sessão cancelada antes desta feature, ou nunca cancelada), não renderizar nada dessa seção.

## Tarefas

- [ ] Adicionar a seção de cancelamento, condicionada a `status === 'cancelada' && cancelado_por`.
- [ ] Exibir quem cancelou, se foi tardio e o motivo (quando houver).
- [ ] Não exibir nada quando `cancelado_por` for `null`.
- [ ] Testar manualmente com sessões canceladas dentro e fora do prazo, com e sem motivo, pelos dois papéis.

## Critérios de aceite

- ✅ Sessão cancelada tardiamente mostra a seção completa (quem, se foi tardio, motivo) para os dois participantes.
- ✅ Sessão cancelada dentro do prazo mostra só "cancelada por X", sem indicação de tardio.
- ✅ Sessão cancelada antes desta feature (campos `null`) não mostra nenhuma seção nova.
- ✅ Nenhum terceiro consegue ver essa informação (herda a autorização já existente da sessão).

## Dependências

- Depende da issue 01.
- Independente da issue 03 — podem ser feitas em paralelo.
