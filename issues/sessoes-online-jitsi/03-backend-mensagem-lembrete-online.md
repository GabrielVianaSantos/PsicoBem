# Issue 03 — Backend: mensagem do lembrete de 15 minutos para sessão online

**Fase:** 3 — Conteúdo do lembrete
**Prioridade:** 🔴 Alta
**Arquivos principais:** `psicoapp_backend/notificacoes_push/tasks.py`
**Origem:** seção 3.3 de `SPEC_SESSOES_ONLINE_JITSI.md`

## Problema

A infraestrutura de lembrete **já está pronta e ociosa**: `_reminder_minutes_to_types()` (`notificacoes_push/tasks.py:264`) já mapeia a janela de 15 minutos para `lembrete_15m`, e `dispatch_session_reminders` já a processa a cada 5 minutos, com dedupe garantido por `ReminderDispatch`.

Só que a mensagem é genérica — `"Sua sessão começa em 15 minutos: <data>"` — e não convida a entrar na sala, nem distingue sessão online de presencial.

## Objetivo

Aproveitar um gatilho que já dispara, dando a ele o conteúdo certo para sessão online.

## Escopo de implementação

Em `_build_reminder_message(sessao, reminder_type, minutes)`, diferenciar a mensagem de `lembrete_15m` quando `sessao.tipo_sessao` existir e `tipo == 'online'`.

Sugestão: `"Sua sessão online começa em 15 minutos. Toque para entrar."`

Sessão presencial mantém exatamente a mensagem atual.

### O que NÃO alterar

- `_reminder_minutes_to_types()`, as três janelas, a cadência do beat, a janela de ±2 minutos.
- A estrutura de `ReminderDispatch`.
- O `_routing_payload`, que deve continuar com `screen="DetalhesSessao"` e `params={"sessaoId": sessao.pk}`.
- As mensagens de `lembrete_24h` e `lembrete_2h`.

### Regra inviolável

**O link da sala não pode entrar no payload.** Nem no corpo da mensagem (aparece na tela de bloqueio junto ao contexto da sessão), nem no `data` do push (transita por servidores da Expo e do FCM/APNs). O aplicativo abre `DetalhesSessao` e obtém o link pela API autenticada da issue 02.

Pode-se acrescentar `modalidade: "online"` como metadado em `_routing_payload`, se for útil ao cliente.

## Tarefas

- [ ] Diferenciar a mensagem de `lembrete_15m` para sessão online.
- [ ] Manter a mensagem de presencial e as demais janelas inalteradas.
- [ ] Confirmar por leitura de código que nenhum caminho insere a URL no payload.
- [ ] Teste: sessão online no `lembrete_15m` produz a mensagem nova.
- [ ] Teste: sessão presencial produz a mensagem atual.
- [ ] Teste: `lembrete_24h` e `lembrete_2h` inalterados (regressão).
- [ ] Teste: o payload emitido não contém a URL da sala em nenhum campo.

## Critérios de aceite

- ✅ O lembrete de 15 min de sessão online convida a entrar.
- ✅ Sessão presencial mantém a mensagem original.
- ✅ Nenhuma URL de sala aparece no corpo ou no `data` da notificação.
- ✅ As janelas de 24h e 2h continuam idênticas.
- ✅ A idempotência via `ReminderDispatch` continua válida.

## Dependências

- Depende da issue 01 (precisa do conceito de sessão com sala para diferenciar a mensagem).
- É pré-requisito da issue 04.
