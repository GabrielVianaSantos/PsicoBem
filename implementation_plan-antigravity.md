# Roteamento de Notificações — Plano de Implementação

## Visão geral

Implementar contrato canônico de roteamento de notificações no backend e frontend, seguindo as 5 issues da pasta `/issues/roteamento-notificacoes`.

---

## Issue 01 — Contrato canônico no backend

### [MODIFY] services.py
- `_routing_payload()`: garantir `event`, `entity_type`, `entity_id` em todos os chamadores.
- `emit_session_created()`: trocar `params={"id": sessao.pk}` → `params={"sessaoId": sessao.pk}`, remover `session_id` (substituído por `entity_id`).
- `emit_new_odisseia_record()`: trocar `params={"id": registro.pk}` → `params={"registroId": registro.pk}`, remover `registro_id`.
- Adicionar `entity_type` e `entity_id` canonicamente.

### [MODIFY] tasks.py (notificacoes_push)
- `_build_push_payload()`: copiar **todo** o contrato `dados_extras` para `data`, incluindo `entity_type`, `entity_id`.
- Remover campos legados redundantes (`session_id`, `registro_id`) do `data` separado.
- Garantir `notification_id`, `screen`, `params`, `event`, `entity_type`, `entity_id` no payload do push.

### [MODIFY] serializers.py
- Confirmar que `NotificacaoSerializer` já expõe `dados_extras` — já ok, apenas documentar.

---

## Issue 02 — Corrigir emissores e destinos

### [MODIFY] core/signals.py
- `notificar_paciente_comentario`: trocar `params={'id': ...}` → `params={'registroId': ...}`, adicionar `entity_type`, `entity_id`.
- `notificar_paciente_prontuario`: adicionar `params={'prontuarioId': ...}`, `entity_type`, `entity_id`.

### [MODIFY] core/views.py
- `realizar` (sessao): adicionar `params={'modo': 'novo'}` para `sessao_realizada` → `RegistrosOdisseia`.
- `alterar_status` (vinculo): já usa `MeuPsicologo` com `event='vinculo_alterado'` — adicionar `status`.
- `ProntuarioViewSet.perform_create`: adicionar `params={'prontuarioId': ...}`, `entity_type`.

### [MODIFY] sessoes/views.py
- `cancelar`: trocar `params={'id': ...}` → `params={'sessaoId': ...}`, adicionar `entity_type`, `entity_id`.

### [MODIFY] notificacoes_push/tasks.py (dispatch_session_reminders)
- Trocar `params={'id': ...}` → `params={'sessaoId': ...}` nos lembretes.

### [MODIFY] core/tasks.py
- `notificar_pacientes_inativos` (paciente): adicionar `params={'modo': 'novo'}` para `RegistrosOdisseia`.
- `notificar_pacientes_inativos` (psicólogo): adicionar `params={'pacienteId': paciente.id}`.

### [MODIFY] engajamentos/views.py
- `curtir`: trocar `screen='SementesPsicologo'` → `screen='SementesCuidado'`, `params={'sementeId': ...}`, `entity_type`, `entity_id`.

### [MODIFY] authentication/views.py
- `conecta_psicologo_view`: adicionar `pacienteId=paciente.id` nos params de `novo_vinculo`.

---

## Issue 03 — Dispatcher compartilhado (frontend)

### [MODIFY] src/services/notificationService.js
- Criar `resolveNotificationRoute(dados_extras, userType)`: valida rota, verifica rotas por perfil, retorna `{screen, params}` ou fallback `Notificacoes`.
- Criar `dispatchNotification(dados_extras, userType, navigationRef)`: resolve rota, aguarda `isReady()`, navega.
- Atualizar `setupNotificationListeners`: usar `dispatchNotification`, marcar como lida via `notification_id`, evitar navegação duplicada.
- Suporte a payload legado (campo `id` de sessão → `sessaoId`).

### [MODIFY] src/screens/notificacoes.js
- `renderItem`: ao tocar, marcar como lida E chamar dispatcher com `item.dados_extras`.
- Evitar duplo toque com `navigating` ref.
- Importar `navigationRef` e `notificationService.dispatchNotification`.

---

## Issue 04 — Adaptar telas de destino

### [MODIFY] src/screens/detalhesSessao.js
- Já usa `sessaoId` — confirmar e adicionar fallback amigável se parâmetro ausente.

### [MODIFY] src/screens/registroCompleto.js
- Aceitar `registroId` via `route.params`.
- Carregar registro via API usando `registroId`.
- Exibir fallback se `registroId` inválido ou ausente.

### [MODIFY] src/screens/sementesPaciente.js
- Aceitar `sementeId` via `route.params`.
- Se `sementeId` presente, rolar/destacar item ou exibir info.

### [MODIFY] src/screens/sementesCuidado.js
- Aceitar `sementeId` via `route.params` sem quebrar a listagem.

### [MODIFY] src/screens/meusProntuarios.js
- Aceitar `prontuarioId` via `route.params`, destacar/expandir prontuário quando ID presente.

### [MODIFY] src/screens/vinculosPacientes.js
- Aceitar `pacienteId` via `route.params`, destacar/localizar vínculo quando ID presente.

### [MODIFY] src/screens/meuPsicologo.js
- Aceitar `status` via `route.params` sem crash se ausente.

### [CONFIRM] src/routes.js
- Confirmar `DetalhesSessao` nos dois navigators (psicólogo + paciente como `MinhasSessoes` já redireciona).
- Confirmar `SementesCuidado` no navigator do psicólogo.
- Confirmar rotas por perfil.

---

## Issue 05 — Testes automatizados

### [NEW] psicoapp_backend/core/tests_routing.py
- Testes de contrato de `dados_extras` para cada emissor.
- Testes de `_build_push_payload` comparando `data` do push com `dados_extras` da inbox.
- Teste de fallback com payload nulo/vazio/legado.

### [NEW] psicoapp_backend/notificacoes_push/tests_routing.py
- Testes de `_build_push_payload()` com diferentes cenários.

---

## Verificação

- `python manage.py test core.tests_routing notificacoes_push.tests_routing` no backend.
- Lint: `git diff --check`.
