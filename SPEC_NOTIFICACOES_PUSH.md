# SPEC — Notificações Push: Estado Atual e O Que Falta

Data: 2026-04-07  
Status: implementação parcial — faltam 5 passos para funcionar de ponta a ponta  
Escopo: app Expo SDK 53 + backend Django no Docker (VPS)

---

## 1. Resposta direta à sua dúvida sobre "Android"

Você **não precisa criar uma pasta `android/` no projeto** nem gerar um app nativo manualmente.

No Expo managed (que é o seu caso), o Android é gerado **na nuvem pelo EAS Build** automaticamente a partir do `app.json`. O `google-services.json` que você já colocou na raiz do projeto já está apontado corretamente no `app.json`:

```json
"android": {
  "package": "com.devianatech.psicoapp",
  "googleServicesFile": "./google-services.json"
}
```

O EAS lê esse arquivo e injeta as configurações do Firebase no APK durante o build. Você **não precisa editar Gradle manualmente**. A única coisa necessária é gerar uma **nova build** com essas configurações ativas.

---

## 2. O que já está implementado

### Frontend (Expo)

| Item | Status |
|------|--------|
| `expo-notifications` instalado (`~0.31.4`) | ✅ feito |
| `expo-device` e `expo-constants` instalados | ✅ feito |
| Plugin `expo-notifications` no `app.json` | ✅ feito |
| `googleServicesFile` configurado no `app.json` | ✅ feito |
| `projectId` do EAS no `app.json` | ✅ feito |
| `notificationService.js` criado com `registerDevice` / `deactivateDevice` | ✅ feito |
| Listener de toque na notificação (navega para tela correta) | ✅ feito |
| Registro do dispositivo no login | ✅ feito (`AuthProvider.js`) |
| Desativação do dispositivo no logout | ✅ feito (`AuthProvider.js`) |
| Setup do handler no `routes.js` | ✅ feito |

### Backend (Django)

| Item | Status |
|------|--------|
| App `notificacoes_push` criado | ✅ feito |
| Model `DispositivoPush` com migrações | ✅ feito |
| Model `EntregaPush` com migrações | ✅ feito |
| Model `ReminderDispatch` com migrações | ✅ feito |
| Endpoint `POST /api/push/devices/register/` | ✅ feito |
| Endpoint `POST /api/push/devices/deactivate/` | ✅ feito |
| `ExpoPushProvider` (envio HTTP para Expo API) | ✅ feito |
| Task Celery `enqueue_push_for_notification` | ✅ feito |
| Task Celery `dispatch_session_reminders` (24h/2h/15m) | ✅ feito |
| `NotificationDomainService.emit()` no `core/services.py` | ✅ feito |
| Celery + Redis + Worker + Beat no `docker-compose.yml` | ✅ feito |
| `celery`, `redis`, `django-celery-beat` no `requirements.txt` | ✅ feito |

---

## 3. O que FALTA fazer (os 5 passos)

### Passo 1 — Gerar nova build development Android (CRÍTICO)

**Por que é necessário:** A build development que você gerou anteriormente no EAS foi criada antes de:
- o plugin `expo-notifications` ser adicionado ao `app.json`
- o `google-services.json` ser configurado

Push nativo não funciona na build antiga. Permissões e integração FCM são **compiladas** no APK, não carregadas em tempo de execução.

**O que fazer:**

```bash
eas build --profile development --platform android
```

Depois de concluir, instale o novo APK no celular físico (não funciona no emulador) e teste.

> **Importante:** push nativo **não funciona no Expo Go**. Só na development build gerada pelo EAS.

---

### Passo 2 — Deploy do backend com os novos serviços (CRÍTICO)

**Por que é necessário:** O `docker-compose.yml` já tem `worker` (Celery) e `beat` (Celery Beat) configurados, mas eles precisam estar rodando na VPS. Sem o worker, as tasks de envio nunca executam — as notificações ficam presas na fila.

**O que fazer na VPS:**

```bash
# 1. Enviar o código atualizado
git pull

# 2. Subir todos os serviços
docker-compose up -d --build

# 3. Verificar se todos estão rodando
docker-compose ps

# Você deve ver: web, db, redis, worker, beat — todos Up
```

**Verificar que as migrações foram aplicadas:**
```bash
docker-compose exec web python manage.py showmigrations notificacoes_push
```
Deve mostrar `[X] 0001_initial` e `[X] 0002_reminderdispatch`.

---

### Passo 3 — Registrar o schedule do Celery Beat

**Por que é necessário:** As tasks periódicas (`dispatch_session_reminders`, `reconcile_push_receipts` e as 3 novas da `SPEC_NOVAS_NOTIFICACOES.md`) precisam ser agendadas. Sem isso, lembretes e verificações periódicas nunca disparam.

**O que fazer:** Adicionar o schedule completo no `settings.py` do backend:

```python
# psicoapp_backend/psicoapp_backend/settings.py
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    # Infraestrutura base (já implementadas)
    "dispatch-session-reminders": {
        "task": "notificacoes_push.tasks.dispatch_session_reminders",
        "schedule": 60.0,  # a cada 60 segundos
    },
    "reconcile-push-receipts": {
        "task": "notificacoes_push.tasks.reconcile_push_receipts",
        "schedule": 900.0,  # a cada 15 minutos
    },
    # Novas tasks (implementadas na Fase 3 da SPEC_NOVAS_NOTIFICACOES.md)
    "check-metas-vencendo": {
        "task": "notificacoes_push.tasks.check_metas_vencendo",
        "schedule": crontab(hour=9, minute=0),  # 1x/dia às 9h
    },
    "check-pagamentos-atrasados": {
        "task": "notificacoes_push.tasks.check_pagamentos_atrasados",
        "schedule": crontab(hour=10, minute=0),  # 1x/dia às 10h
    },
    "check-pacientes-inativos": {
        "task": "notificacoes_push.tasks.check_pacientes_inativos",
        "schedule": crontab(hour=11, minute=0, day_of_week="1"),  # toda segunda às 11h
    },
}
```

> **Atenção:** As 3 últimas entradas (`check_metas_vencendo`, `check_pagamentos_atrasados`, `check_pacientes_inativos`) só podem ser ativadas **depois** que as tasks forem implementadas na Fase 3 da `SPEC_NOVAS_NOTIFICACOES.md`. Adicione as 2 primeiras agora e as 3 últimas junto com a Fase 3.

Após adicionar, reiniciar o serviço `beat`:
```bash
docker-compose restart beat
```

---

### Passo 4 — Corrigir duplicação do `setupNotificationHandler` no `App.js`

**Por que é necessário:** Hoje o `setupNotificationHandler()` é chamado **duas vezes**:
- uma em `App.js` (linha 20, fora do render)
- outra em `routes.js` via `useEffect`

Isso não quebra o app, mas pode causar comportamento inesperado. A chamada no `App.js` acontece a cada re-render porque está fora do `useEffect`.

**O que fazer:** Remover a chamada avulsa em `App.js` (linha 20) e deixar apenas a do `routes.js`, que já está dentro de `useEffect` e tem cleanup correto.

---

### Passo 5 — Completar `reconcile_push_receipts` (necessário para produção)

**Por que é necessário:** Atualmente a task só conta as entregas pendentes sem processar de fato os receipts da Expo API. Sem isso, tokens inválidos (dispositivos desinstalados, etc.) nunca são marcados como inativos e continuam recebendo tentativas de envio.

**O que fazer:** Implementar a consulta à Expo Receipts API:

Endpoint da Expo: `POST https://exp.host/--/api/v2/push/getReceipts`

Request:
```json
{ "ids": ["ticket-id-1", "ticket-id-2", ...] }
```

Response:
```json
{
  "data": {
    "ticket-id-1": { "status": "ok" },
    "ticket-id-2": { "status": "error", "details": { "error": "DeviceNotRegistered" } }
  }
}
```

A task deve:
1. Buscar `EntregaPush` com status `sent` e `provider_ticket_id` preenchido
2. Consultar receipts em lotes de até 300 IDs (limite da Expo)
3. Atualizar `status` para `receipt_ok` ou `receipt_error`
4. Se `DeviceNotRegistered`, marcar `DispositivoPush.ativo = False`

---

## 4. Fluxo completo após os 5 passos

```
Usuário faz login no app (nova build)
   └─► notificationService.registerDevice()
         ├─► solicita permissão ao usuário
         ├─► obtém ExpoPushToken (ex: ExponentPushToken[abc123])
         └─► POST /api/push/devices/register/ → salva no banco

Evento ocorre no backend (ex: sessão agendada)
   └─► NotificationDomainService.emit(...)
         ├─► cria NotificacaoSistema (inbox in-app)
         └─► on_commit → enqueue_push_for_notification.delay(id)

Worker Celery executa a task
   └─► busca dispositivos ativos do usuário
         └─► ExpoPushProvider.send([...mensagens...])
               └─► POST https://exp.host/--/api/v2/push/send
                     └─► retorna ticket_id → salva em EntregaPush

Celery Beat (a cada 60s)
   └─► dispatch_session_reminders()
         └─► para sessões nas janelas 24h/2h/15m
               └─► emite notificação via NotificationDomainService

Celery Beat (a cada 15min)
   └─► reconcile_push_receipts()
         └─► verifica status de entregas pendentes
               └─► marca tokens inválidos como inativos

Push chega no celular
   └─► usuário toca na notificação
         └─► addNotificationResponseReceivedListener
               └─► navega para tela correta (DetalhesSessao, Notificacoes, etc.)
```

---

## 5. Como testar após os passos 1 e 2

1. Instale a nova build development no celular físico
2. Faça login no app
3. Aceite a permissão de notificação quando solicitada
4. Verifique no backend se o token foi salvo:
   ```bash
   docker-compose exec web python manage.py shell -c "
   from notificacoes_push.models import DispositivoPush
   print(DispositivoPush.objects.all().values('user__email', 'push_token', 'ativo'))
   "
   ```
5. Envie um push de teste manualmente:
   ```bash
   curl -H "Content-Type: application/json" -X POST https://exp.host/--/api/v2/push/send \
   -d '{"to": "ExponentPushToken[SEU_TOKEN]", "title": "Teste", "body": "Push funcionando"}'
   ```

---

## 6. Relação com SPEC_NOVAS_NOTIFICACOES.md

Esta SPEC cobre apenas a **infraestrutura operacional** — o que precisa funcionar para qualquer push chegar ao celular. Ela é **pré-requisito** para tudo que está na `SPEC_NOVAS_NOTIFICACOES.md`.

Sequência completa:

```
SPEC_NOTIFICACOES_PUSH.md (esta)
  └─► 5 passos de infraestrutura (build + deploy + beat + fixes)
        └─► SPEC_NOVAS_NOTIFICACOES.md
              ├─► Fase 1: Fixes — migrar 3 notificações para emit() + 3 novas (issues 01–06)
              ├─► Fase 2: Engajamento — 4 novas notificações de eventos (issues 07–10)
              ├─► Fase 3: Tasks periódicas — 3 tasks Celery + expandir CELERY_BEAT_SCHEDULE (issues 11–13)
              └─► Fase 4: Polish — ícone Android + badge counter (issues 14–15)
```

As Fases 1 e 2 da `SPEC_NOVAS_NOTIFICACOES.md` podem ser **implementadas em paralelo** com os passos desta SPEC — o código pode ser escrito e testado via inbox in-app mesmo sem a nova build ou o worker rodando. O push nativo só funciona após os passos 1 e 2 desta SPEC estarem concluídos.

---

## 7. Resumo de prioridade

| # | Passo | Impacto | Onde fazer |
|---|-------|---------|------------|
| 1 | Nova build EAS development | Push não funciona sem ela | Terminal local |
| 2 | Deploy docker-compose na VPS com worker+beat | Tasks nunca executam sem o worker | VPS via SSH |
| 3 | CELERY_BEAT_SCHEDULE no settings.py (2 tasks agora + 3 após Fase 3 da SPEC_NOVAS) | Lembretes e checks periódicos nunca disparam | `settings.py` + deploy |
| 4 | Remover duplicação no App.js | Boa prática, não é bloqueador | `App.js` |
| 5 | Completar reconcile_push_receipts | Necessário para produção robusta | `tasks.py` |

Após concluir estes 5 passos, siga a `SPEC_NOVAS_NOTIFICACOES.md` para implementar as 13 novas notificações e melhorias visuais (issues 01–15).
