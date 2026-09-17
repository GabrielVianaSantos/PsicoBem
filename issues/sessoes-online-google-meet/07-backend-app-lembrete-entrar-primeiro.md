# Issue 07 — Backend: lembrete "entre primeiro" para o psicólogo

**Fase:** 7 — Reforço do fluxo
**Prioridade:** 🟡 Média
**Arquivos principais:** `psicoapp_backend/notificacoes_push/tasks.py`, `psicoapp_backend/psicoapp_backend/settings.py`
**Referência:** seção 4.7 de `SPEC_SESSOES_ONLINE_GOOGLE_MEET.md`

## Problema

O problema original (paciente chega primeiro e fica esperando sem saber por quê) melhora com a tela de preparo (issue 06), mas o ideal é o psicólogo já estar na sala quando o paciente chegar.

## Objetivo

Provocar o psicólogo a entrar primeiro, com uma notificação exclusiva a ele, pouco antes do horário da sessão.

## Escopo de implementação

### Nova tarefa em `notificacoes_push/tasks.py`

`dispatch_pre_session_host_reminder()` (nome sugerido), espelhando a estrutura de `dispatch_session_reminders`/`dispatch_post_session_confirmations` (mesmo arquivo, usá-las como modelo):

- **Alvo:** `data_hora - 7 minutos`, janela de ±2 minutos (mesma tolerância dos demais lembretes).
- **Filtro:** `status ∈ {agendada, confirmada, remarcada}` **e** `tipo_sessao.tipo == 'online'` — sessão presencial não gera esse lembrete.
- **Destinatário:** **somente** `sessao.psicologo.user`. O paciente não recebe.
- **Idempotência:** `ReminderDispatch` com `reminder_type="entrar_primeiro"`, reaproveitando `unique_together` e a guarda por `IntegrityError` isolada em `transaction.atomic()` (mesmo padrão corrigido nas tarefas existentes).
- **Emissão:** `NotificationDomainService.emit()` com `tipo="sessao_lembrete"` (ou um tipo próprio, se fizer sentido diferenciar em relatórios — decidir na implementação), título e mensagem convidando a entrar primeiro, e `_routing_payload(screen="DetalhesSessao", params={"sessaoId": sessao.pk}, event="entrar_primeiro", entity_type="sessao", entity_id=sessao.pk)`.

### Agendamento

Em `CELERY_BEAT_SCHEDULE` (`settings.py`), nova entrada com `crontab(minute="*/5")`, mesma cadência das demais tarefas de sessão.

### Regra inviolável

**Nenhuma URL de sala no payload** — nem no corpo, nem no `data`. Mesma regra já validada para os lembretes existentes.

### Redação da mensagem

Mensagem sugerida: "Sua sessão online começa em breve. Entre primeiro para receber seu paciente." Sem nome de paciente, sem termo clínico.

## Tarefas

- [ ] Implementar `dispatch_pre_session_host_reminder` espelhando as tarefas existentes.
- [ ] Filtrar por `tipo_sessao.tipo == 'online'` e status pendente.
- [ ] Enviar apenas ao psicólogo.
- [ ] Usar `ReminderDispatch` com `reminder_type="entrar_primeiro"`, savepoint dedicado.
- [ ] Registrar a tarefa em `CELERY_BEAT_SCHEDULE`.
- [ ] Testes: dispara no alvo (~7min antes) apenas para sessão online; não dispara para presencial; não dispara para status resolvido; não envia ao paciente; não duplica em duas execuções na mesma janela; payload sem URL de sala.
- [ ] Teste de regressão: lembretes de 24h/2h/15min e confirmação pós-sessão continuam funcionando sem alteração.

## Critérios de aceite

- ✅ Psicólogo com sessão online recebe o lembrete 5–8 min antes do horário.
- ✅ Paciente nunca recebe esse lembrete.
- ✅ Sessão presencial nunca gera esse lembrete.
- ✅ Duas execuções do beat na mesma janela não duplicam o envio.
- ✅ Nenhuma URL de sala aparece no payload da notificação.
- ✅ Os demais lembretes e a confirmação pós-sessão continuam idênticos.

## Dependências

- Depende da issue 01.
- Independente das issues 04, 05 e 06.
