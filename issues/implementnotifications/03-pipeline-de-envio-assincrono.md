# Issue: Pipeline assíncrono de envio e receipts

**Objetivo:** Fazer o backend criar, enfileirar, enviar e reconciliar notificacoes sem depender do request HTTP.

**Tarefas:**
- [ ] Criar um `NotificationDomainService` para centralizar a emissao de eventos de notificacao.
- [ ] Migrar os pontos atuais de `NotificacaoSistema.objects.create(...)` para o service de dominio.
- [ ] Implementar task Celery para envio de push a partir de uma notificacao persistida.
- [ ] Consultar dispositivos ativos do destinatario e enviar em lote por provider.
- [ ] Persistir `EntregaPush` com status inicial, ticket do provedor e timestamps.
- [ ] Implementar task de leitura de receipts para atualizar status final e invalidar tokens nao registrados.
- [ ] Adicionar retry com backoff para falhas temporarias de rede ou limite do provedor.

**Dependencias:**
- Modelos e endpoints de device prontos.
- Redis e Celery operacionais na VPS ou em ambiente equivalente.

