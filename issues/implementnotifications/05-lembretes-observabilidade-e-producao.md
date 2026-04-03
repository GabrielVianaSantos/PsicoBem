# Issue: Lembretes, observabilidade e producao

**Objetivo:** Completar a solucao com scheduler, monitoracao e regras de seguranca antes do deploy final.

**Tarefas:**
- [ ] Implementar scheduler de lembretes para 24h, 2h e 15min antes da sessao.
- [ ] Considerar timezone do destinatario e nunca agendar lembrete no passado.
- [ ] Bloquear lembrete para sessoes canceladas ou finalizadas antes da janela.
- [ ] Adicionar logs estruturados com `event_type`, `user_id`, `notification_id`, `device_id`, `provider` e `status`.
- [ ] Definir metricas de envio, receipts, latencia e taxa de opt-in.
- [ ] Preparar alertas para fila acumulada, erro de envio e queda de tokens ativos.
- [ ] Revisar segurança do payload para nunca expor dado clinico sensivel no push.
- [ ] Validar deploy real em Android e iOS fisicos antes de considerar a entrega pronta.

**Dependencias:**
- Pipeline de envio já em funcionamento.
- Base mobile e backend já registrando devices corretamente.

