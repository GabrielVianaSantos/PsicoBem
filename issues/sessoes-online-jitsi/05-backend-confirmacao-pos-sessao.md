# Issue 05 — Backend: notificação de confirmação pós-sessão

**Fase:** 5 — Fecha o ciclo de registro
**Prioridade:** 🟡 Média
**Arquivos principais:** `psicoapp_backend/notificacoes_push/tasks.py`, `psicoapp_backend/psicoapp_backend/settings.py`
**Origem:** seção 3.6 de `SPEC_SESSOES_ONLINE_JITSI.md`

## Problema

Hoje o psicólogo precisa **lembrar sozinho** de abrir o aplicativo para registrar se a sessão aconteceu. Foi essa a dor que originou toda esta SPEC. Enquanto ele não registra, `Sessao.status` fica em `agendada` e o faturamento (`status_pagamento`) não avança.

A boa notícia: `src/screens/detalhesSessao.js` **já tem** `confirmarRealizacao()` e `marcarNaoRealizada()`, controlados por `pode_realizar` / `pode_marcar_falta` do serializer. Não falta tela — falta chegar nela no momento certo.

## Objetivo

Provocar a decisão do psicólogo logo após o horário previsto, sem nenhuma tela nova.

## Escopo de implementação

### Nova tarefa em `notificacoes_push/tasks.py`

`dispatch_post_session_confirmations()`, espelhando a estrutura de `dispatch_session_reminders` (mesmo arquivo, use-a como modelo):

- **Alvo:** `data_hora + duracao_minutos + 15 minutos`, com a mesma janela de ±2 minutos já usada nos lembretes. Fallback de 60 minutos quando `tipo_sessao.duracao_minutos` estiver ausente (`tipo_sessao` é `null=True`).
- **Filtro:** apenas `status ∈ {agendada, confirmada, remarcada}` — sessão já resolvida (`realizada`, `cancelada`, `faltou`) não gera nada.
- **Destinatário:** **somente** `sessao.psicologo.user`. O paciente não recebe.
- **Idempotência:** reaproveitar `ReminderDispatch` com `reminder_type = "pos_sessao"`, herdando o `unique_together = ("session_id", "reminder_type", "destinatario_user")` e a guarda por `IntegrityError` que já existem.
- **Emissão:** `NotificationDomainService.emit()` com `tipo="sessao_confirmacao"`, título e mensagem perguntando o desfecho, e `_routing_payload(screen="DetalhesSessao", params={"sessaoId": sessao.pk}, event="pos_sessao", entity_type="sessao", entity_id=sessao.pk)`.

### Agendamento

Em `CELERY_BEAT_SCHEDULE` (`settings.py:232`), acrescentar entrada com `crontab(minute="*/5")`, mesma cadência de `disparar_lembretes_sessao_periodico`.

### Regra inviolável

**Nenhum desfecho é marcado automaticamente.** Não existe sinal técnico confiável de que a sessão ocorreu — e marcar `realizada` significa decidir cobrar (`Sessao.valor`, `status_pagamento`). A notificação **provoca** a decisão do psicólogo; jamais a substitui.

### Cuidado com a redação

A mensagem aparece na tela de bloqueio. Não deve conter nome do paciente nem revelar a natureza clínica do compromisso.

## Tarefas

- [ ] Implementar `dispatch_post_session_confirmations` espelhando `dispatch_session_reminders`.
- [ ] Calcular o alvo com `duracao_minutos` e fallback de 60 min.
- [ ] Filtrar por status ainda pendente de desfecho.
- [ ] Enviar apenas ao psicólogo.
- [ ] Usar `ReminderDispatch` com `reminder_type="pos_sessao"`.
- [ ] Registrar a tarefa no `CELERY_BEAT_SCHEDULE`.
- [ ] Redigir mensagem que não exponha paciente nem natureza clínica.
- [ ] Testes: dispara no alvo; não dispara para status resolvido; não duplica em duas execuções na mesma janela; não envia ao paciente; usa o fallback de duração quando `tipo_sessao` é `null`.

## Critérios de aceite

- ✅ Passado o fim previsto mais a margem, **apenas o psicólogo** recebe a notificação.
- ✅ Sessão `realizada`, `cancelada` ou `faltou` não gera notificação.
- ✅ Duas execuções do beat na mesma janela não duplicam o envio.
- ✅ Tocar leva a `DetalhesSessao` com os botões de desfecho disponíveis.
- ✅ Nenhum status é alterado automaticamente pelo sistema.
- ✅ Os lembretes pré-sessão continuam funcionando sem alteração.

## Dependências

- Depende da issue 01.
- Independente da Parte A; pode ser feita em paralelo com 03 e 04.
