# Issue 11 — NOVO: Task periódica — Meta próxima do vencimento

**Fase:** 3 — Tasks periódicas (Celery Beat)  
**Prioridade:** 🟢 Baixa  
**Arquivo:** `psicoapp_backend/notificacoes_push/tasks.py` + `settings.py`  
**Tipo de notificação:** `meta_vencendo`

## Contexto

O tipo `meta_vencendo` já existe em `NotificacaoSistema.TIPO_CHOICES`. O model `MetaOdisseia` possui campos `data_prevista`, `dias_para_conclusao`, `progresso` e `status`. Porém, **nenhuma task existe** para verificar metas próximas do vencimento e notificar o paciente.

> ⚠️ **Pré-requisito:** Celery Beat deve estar ativo na VPS (ver `SPEC_NOTIFICACOES_PUSH.md`). Esta issue pode ser codificada localmente, mas só funcionará em produção com o Beat em execução.

## Objetivo

Implementar a task `check_metas_vencendo()` que roda 1x/dia às 9h e notifica pacientes com metas vencendo em ≤3 dias, com dedupe de 24h.

## Tarefas

- [ ] Confirmar os nomes exatos dos campos de `MetaOdisseia`: `status`, `data_prevista`, `dias_para_conclusao`, `progresso` — ajustar se diferentes.
- [ ] Adicionar a task em `notificacoes_push/tasks.py`:

```python
# notificacoes_push/tasks.py — nova task
from celery import shared_task
from django.utils import timezone
from datetime import date, timedelta

@shared_task
def check_metas_vencendo():
    """Verifica metas com prazo vencendo em ≤3 dias e notifica o paciente. Dedupe 24h."""
    from engajamentos.models import MetaOdisseia
    from core.models import NotificacaoSistema
    from core.services import NotificationDomainService

    limite = date.today() + timedelta(days=3)
    metas = MetaOdisseia.objects.filter(
        status='em_andamento',
        data_prevista__lte=limite,
        data_prevista__gte=date.today(),
    ).select_related('paciente__user')

    results = {"processed": 0, "notified": 0}

    for meta in metas:
        results["processed"] += 1
        # Dedupe: só notificar 1x por meta nas últimas 24h
        ja_notificado = NotificacaoSistema.objects.filter(
            paciente=meta.paciente,
            tipo='meta_vencendo',
            link_relacionado=f'/metas/{meta.pk}',
            created_at__gte=timezone.now() - timedelta(days=1),
        ).exists()
        if ja_notificado:
            continue

        dias = meta.dias_para_conclusao
        NotificationDomainService.emit(
            target=meta.paciente.user,
            tipo='meta_vencendo',
            titulo='Meta Vencendo ⏰',
            mensagem=f'Sua meta "{meta.titulo}" vence em {dias} dia(s). Progresso: {meta.progresso}%.',
            link_relacionado=f'/metas/{meta.pk}',
            dados_extras=NotificationDomainService._routing_payload(
                screen='Notificacoes',
                event='meta_vencendo',
            ),
        )
        results["notified"] += 1

    return results
```

- [ ] Adicionar a entrada no `CELERY_BEAT_SCHEDULE` em `settings.py`:

```python
"check-metas-vencendo": {
    "task": "notificacoes_push.tasks.check_metas_vencendo",
    "schedule": crontab(hour=9, minute=0),  # 1x/dia às 9h
},
```

- [ ] Confirmar que `crontab` está importado do `celery.schedules` no `settings.py`.
- [ ] Testar localmente chamando a task manualmente: `check_metas_vencendo.delay()`.
- [ ] Verificar o dedupe: chamar a task uma segunda vez e confirmar que a notificação **não** é duplicada.

## Critério de aceite

- ✅ Task registrada e executável via `celery worker`.
- ✅ Paciente recebe notificação de meta vencendo (≤3 dias).
- ✅ Dedupe de 24h funciona: tarefa chamada 2x no mesmo dia não duplica notificação.
- ✅ Task retorna dict `{"processed": N, "notified": M}` para observabilidade.
- ✅ Entrada no `CELERY_BEAT_SCHEDULE` com schedule `crontab(hour=9, minute=0)`.

## Dependências

- Celery Beat ativo na VPS (pré-requisito operacional de produção).
- `CELERY_BEAT_SCHEDULE` configurado no `settings.py`.
