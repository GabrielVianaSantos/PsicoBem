# Issue: Modelos de device e endpoints de registro

**Objetivo:** Persistir dispositivos autorizados e permitir upsert/ativacao/desativacao por usuario autenticado.

**Tarefas:**
- [ ] Criar o modelo `DispositivoPush` com `user`, `provider`, `push_token`, `platform`, `device_id`, `timezone`, `ativo`, `permissao_status`, `app_version` e timestamps.
- [ ] Criar o modelo `EntregaPush` para rastrear tickets, receipts, erros e status de entrega.
- [ ] Criar controle de idempotencia para lembretes de sessao com chave unica por sessao, tipo de lembrete e destinatario.
- [ ] Expor `POST /api/push/devices/register/` com upsert por usuario + device + provider.
- [ ] Expor `POST /api/push/devices/deactivate/` para logout ou revogacao manual do device.
- [ ] Validar indices e constraints para evitar token duplicado e escrita inconsistente.

**Dependencias:**
- Estrutura base da issue 01 concluida.
- Autenticacao JWT atual mantida como fonte de identidade do usuario.

