# SPEC - Sistema de Notificacoes Push Nativas (Paciente + Psicologo)

Data: 2026-04-02  
Status: pronto para implementacao  
Escopo: app mobile Expo + backend Django

## 1. Objetivo

Implementar notificacoes push nativas (popups do iOS/Android) para pacientes e psicologos, cobrindo:

- eventos transacionais do app (agendamento, cancelamento, novo registro, etc.)
- lembretes proximos de sessoes ativas/agendadas
- navegacao por toque na notificacao para a tela correta

Sem reescrita futura: desenhar arquitetura com baixo acoplamento ao provedor de push, pronta para producao/loja.

## 2. Diagnostico da base atual

O projeto ja possui:

- inbox in-app via `NotificacaoSistema` no Django
- endpoints de leitura (`/api/notificacoes/`, `nao-lidas`, `ler`, `ler-todas`)
- gatilhos basicos em `signals.py` para criar notificacoes in-app
- app Expo SDK 53 sem `expo-notifications` configurado
- `app.json` ainda sem plugin `expo-notifications` e sem chaves Android/iOS para push

Conclusao: existe base de dominio de notificacao, mas falta a camada de entrega push nativa e a esteira de confiabilidade para producao.

## 3. Decisoes de arquitetura (padrao alvo)

### 3.1 Padrao de notificacao unificada

Adotar pipeline unico:

1. Evento de dominio ocorre (ex.: sessao agendada).
2. Backend grava notificacao in-app (`NotificacaoSistema`) para historico/inbox.
3. Backend enfileira entrega push assincrona.
4. Worker envia push para dispositivos do destinatario.
5. Backend registra ticket/receipt e status de entrega.

Esse padrao evita duplicidade de regras e garante auditoria.

### 3.2 Estrategia de provedor (sem lock-in)

Implementar interface de provedor:

- `PushProvider` (contrato)
- `ExpoPushProvider` (fase 1)
- `FcmApnsProvider` (fase futura, sem quebrar dominio)

Em producao inicial, usar Expo Push Service pela velocidade de entrega e setup com EAS.  
Fase futura permite migracao gradual para FCM/APNs diretos mantendo os mesmos eventos e modelos internos.

### 3.3 Assincronia obrigatoria

Nao enviar push dentro de request HTTP nem em signal sincrono.

- usar Celery + Redis para envio
- usar scheduler (Celery Beat) para lembretes de sessoes
- garantir idempotencia para nao disparar push duplicado

## 4. Modelo de dados novo/ajustado (backend)

Criar app `notificacoes_push` (ou manter em `core` se quiser minimizar mudanca estrutural, mas com arquivos separados).

### 4.1 `DispositivoPush`

- `id`
- `user` (FK `CustomUser`)
- `provider` (`expo` | `fcm` | `apns`)
- `push_token` (unique parcial por provider)
- `platform` (`ios` | `android`)
- `app_version`
- `device_id` (id estavel do app no aparelho)
- `timezone` (ex.: `America/Sao_Paulo`)
- `ativo` (bool)
- `permissao_status` (`granted` | `denied` | `undetermined`)
- `last_seen_at`
- `created_at`, `updated_at`

Indices:

- `(user, ativo)`
- `(push_token, provider)`
- `(last_seen_at)`

### 4.2 `EntregaPush`

- `id`
- `notificacao` (FK opcional para `NotificacaoSistema`)
- `destinatario_user` (FK `CustomUser`)
- `dispositivo` (FK `DispositivoPush`)
- `provider`
- `status` (`queued`, `sent`, `receipt_ok`, `receipt_error`, `failed`, `device_unregistered`)
- `titulo`, `mensagem`, `payload_json`
- `provider_ticket_id`
- `provider_receipt_id`
- `provider_error_code`, `provider_error_detail`
- `tentativas`
- `next_retry_at`
- `sent_at`, `receipt_checked_at`
- `created_at`, `updated_at`

Indices:

- `(status, next_retry_at)`
- `(destinatario_user, created_at)`
- `(provider_ticket_id)`

### 4.3 Idempotencia de lembrete de sessao

Para lembretes de sessao, criar controle por chave:

- `ReminderDispatch(session_id, reminder_type, destinatario_user, sent_at)`
- `unique(session_id, reminder_type, destinatario_user)`

Isso impede notificacao duplicada em reinicios do worker/scheduler.

## 5. Contratos de API novos

### 5.1 Registro/atualizacao de dispositivo

`POST /api/push/devices/register/`

Request:

- `push_token`
- `provider` (inicial: `expo`)
- `platform`
- `device_id`
- `timezone`
- `app_version`
- `permissao_status`

Comportamento:

- upsert por `(user, device_id, provider)`
- se token mudou, invalida token antigo do mesmo device

### 5.2 Desativacao no logout

`POST /api/push/devices/deactivate/`

Request:

- `device_id`

Comportamento:

- marca `ativo=false` para aquele device do usuario

### 5.3 Preferencias de notificacao (fase 2, recomendado)

`GET/PUT /api/push/preferences/`

Campos:

- `receber_sessao_agendada`
- `receber_sessao_cancelada`
- `receber_lembrete_24h`
- `receber_lembrete_2h`
- `receber_lembrete_15m`
- `quiet_hours_start`, `quiet_hours_end`

## 6. Matriz de gatilhos (paciente + psicologo)

### 6.1 Eventos imediatos

- `sessao_agendada`
  - paciente: "Sua sessao foi agendada..."
  - psicologo: "Nova sessao agendada com ..."
- `sessao_cancelada`
  - notificar ambos
- `sessao_remarcada`
  - notificar ambos com data anterior/nova
- `novo_registro_odisseia_compartilhado`
  - psicologo
- `novo_prontuario` (se aplicavel para paciente visualizar)
  - paciente
- `pagamento_confirmado`
  - paciente

### 6.2 Lembretes de sessao (scheduler)

Para sessoes com status em `agendada`, `confirmada`, `remarcada`:

- D-1 (24h antes)
- D-0 (2h antes)
- D-0 (15min antes)

Regras:

- se sessao for cancelada/finalizada antes da janela, nao envia
- considerar timezone do destinatario (fallback: timezone da sessao/app)
- nao enviar lembrete no passado

## 7. Fluxo mobile Expo (implementacao)

### 7.1 Dependencias

- `expo-notifications`
- `expo-device`
- `expo-constants`

### 7.2 Config do app

`app.json`:

- incluir plugin `expo-notifications`
- Android: `googleServicesFile`
- canais Android (`setNotificationChannelAsync`) no bootstrap do app

### 7.3 Servico de notificacao no frontend

Criar `src/services/notificationService.js`:

- solicitar permissao (`requestPermissionsAsync`)
- registrar token (`getExpoPushTokenAsync` com `projectId`)
- enviar token para backend (`/push/devices/register`)
- listeners:
  - `addNotificationReceivedListener`
  - `addNotificationResponseReceivedListener`
- rotear deep link ao tocar push (ex.: `Notificacoes`, `DetalhesSessao`, `RegistroCompleto`)

### 7.4 Pontos de integracao de ciclo de vida

- apos login bem-sucedido: registrar/atualizar dispositivo
- ao abrir app autenticado: refresh de permissao/token se necessario
- no logout: desativar dispositivo no backend

## 8. Fluxo backend de envio (implementacao)

### 8.1 Geracao de evento

Substituir `NotificacaoSistema.objects.create(...)` espalhado por:

- `NotificationDomainService.emit(event_type, actor, target, context)`

Responsabilidades:

- persistir `NotificacaoSistema`
- montar payload padrao de navegacao (`screen`, `params`, `event_id`)
- enfileirar `send_push_for_notification(notificacao_id)`

### 8.2 Worker de envio

Task Celery:

- busca dispositivos ativos do destinatario
- envia em lote por provider
- grava `EntregaPush` com ticket/status
- agenda task de consulta de receipts (janela de ~15 min)
- aplica retry com backoff exponencial em 429/5xx/rede

### 8.3 Leitura de receipts

Task Celery:

- consulta receipts pelos `provider_ticket_id`
- atualiza status final
- se `DeviceNotRegistered`, marca dispositivo como inativo

## 9. Observabilidade e operacao

### 9.1 Logs estruturados

Campos minimos:

- `event_type`
- `user_id`
- `notification_id`
- `device_id`
- `provider`
- `ticket_id`
- `status`
- `error_code`

### 9.2 Metricas

- taxa de envio (`sent/queued`)
- taxa de receipt ok
- taxa de erro por codigo
- latencia evento -> popup
- opt-in de permissao por plataforma

### 9.3 Alertas

- falha de envio > X% em 5 min
- fila acumulada acima de limite
- queda abrupta de tokens ativos

## 10. Segurança e privacidade

- nunca enviar dado clinico sensivel no texto push
- payload push com identificadores tecnicos e roteamento minimo
- conteudo detalhado fica no app apos autenticacao
- rotacionar/remover tokens inativos
- respeitar revogacao de permissao

## 11. Rollout em fases (recomendado)

### Fase A - Fundacao tecnica

- models/migrations de `DispositivoPush` e `EntregaPush`
- endpoint register/deactivate
- `notificationService` no app
- plugin/config Expo + build de dev

### Fase B - Pipeline de envio

- `PushProvider` + `ExpoPushProvider`
- Celery/Redis + tasks de send/receipt
- integracao com eventos principais (sessao agendada/cancelada/remarcada)

### Fase C - Lembretes de sessao

- scheduler + idempotencia de reminders
- janelas 24h/2h/15m
- validacoes de status/timezone

### Fase D - Producao e loja

- credenciais EAS (FCM v1 + APNs key)
- monitoracao/alertas
- hardening de retries e limpeza de tokens
- testes reais iOS/Android (device fisico)

## 12. Criterios de aceite

- paciente e psicologo recebem push nativo nos eventos definidos
- lembretes de sessao chegam nas janelas configuradas sem duplicidade
- tocar na notificacao abre tela correta no app
- logout desativa device e evita envio indevido
- receipts processados e tokens invalidos removidos automaticamente
- sem regressao da inbox in-app existente

## 13. Impacto em arquivos (guia de implementacao)

Backend:

- `psicoapp_backend/requirements.txt` (celery, redis client, sdk push)
- `psicoapp_backend/psicoapp_backend/settings.py` (broker/result backend, flags)
- novo app `notificacoes_push/` (`models.py`, `views.py`, `services.py`, `tasks.py`, `urls.py`, `admin.py`)
- `psicoapp_backend/core/signals.py` e pontos de criacao de notificacao (migrar para domain service)
- `psicoapp_backend/psicoapp_backend/urls.py` (rotas push)
- `psicoapp_backend/docker-compose.yml` (servicos `redis`, `worker`, `beat`)

Frontend:

- `package.json` (deps Expo notifications)
- `app.json` (plugin/config push)
- `src/services/notificationService.js` (novo)
- `src/providers/AuthProvider.js` (hook login/logout para register/deactivate device)
- `src/routes.js` ou container raiz (listeners de resposta e deep link)

## 14. Referencias oficiais usadas

- Expo setup push notifications: https://docs.expo.dev/push-notifications/push-notifications-setup  
- Expo Notifications SDK: https://docs.expo.dev/versions/latest/sdk/notifications  
- Expo Push Service (tickets, receipts, limites/retry): https://docs.expo.dev/push-notifications/sending-notifications/  
- Expo FAQ (limite por projeto e opcao sem Expo service): https://docs.expo.dev/push-notifications/faq  
- FCM v1 credentials no EAS: https://docs.expo.dev/push-notifications/fcm-credentials/  
- Celery periodic tasks (scheduler em producao): https://docs.celeryq.dev/en/main/userguide/periodic-tasks.html

