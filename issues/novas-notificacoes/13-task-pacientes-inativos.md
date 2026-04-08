# Issue 13 — NOVO: Task periódica — Pacientes inativos sem registro

**Fase:** 3 — Tasks periódicas (Celery Beat)  
**Prioridade:** 🟢 Baixa  
**Arquivo:** `psicoapp_backend/notificacoes_push/tasks.py` + `settings.py`  
**Tipo de notificação:** `sistema`

## Contexto

Psicólogos não têm visibilidade sobre quais pacientes estão desengajados da plataforma (sem registrar humor/odisseia). Implementar uma task semanal que alerta o psicólogo sobre pacientes vinculados que não registram nada há 7+ dias permite ação proativa.

> ⚠️ **Pré-requisito:** Celery Beat deve estar ativo na VPS. Esta issue pode ser codificada localmente, mas só funcionará em produção com o Beat em execução.

## Objetivo

Implementar a task `check_pacientes_inativos()` que roda toda segunda-feira às 11h, identifica pacientes ativos sem registro de odisseia nos últimos 7 dias e envia um alerta resumido para o psicólogo (com dedupe semanal).

## Tarefas

- [ ] Confirmar a estrutura de `VinculoPacientePsicologo`: campos `status`, `paciente`, `psicologo`.
- [ ] Confirmar o campo de data em `RegistroOdisseia`: `data_registro` ou `created_at`.
- [ ] Confirmar campo de filtro de dedupe: `dados_extras__event` suportado pelo model (JSONField).
- [ ] Adicionar a task em `notificacoes_push/tasks.py`:

```python
# notificacoes_push/tasks.py — nova task
from collections import defaultdict

@shared_task
def check_pacientes_inativos():
    """Notifica psicólogos sobre pacientes que não registraram em 7+ dias. Dedupe semanal."""
    from engajamentos.models import RegistroOdisseia
    from core.models import VinculoPacientePsicologo, NotificacaoSistema
    from core.services import NotificationDomainService
    from django.db.models import Max
    from datetime import date

    limite = date.today() - timedelta(days=7)
    vinculos = VinculoPacientePsicologo.objects.filter(
        status='ativo',
    ).select_related('paciente__user', 'psicologo__user')

    results = {"checked": 0, "notified": 0}
    alertas_por_psicologo = defaultdict(list)

    for vinculo in vinculos:
        results["checked"] += 1
        ultimo = RegistroOdisseia.objects.filter(
            paciente=vinculo.paciente
        ).aggregate(Max('data_registro'))['data_registro__max']

        if ultimo is None or ultimo < limite:
            alertas_por_psicologo[vinculo.psicologo].append(vinculo.paciente)

    for psicologo, pacientes in alertas_por_psicologo.items():
        # Dedupe semanal por psicólogo
        ja_notificado = NotificacaoSistema.objects.filter(
            psicologo=psicologo,
            tipo='sistema',
            dados_extras__event='pacientes_inativos',
            created_at__gte=timezone.now() - timedelta(days=7),
        ).exists()
        if ja_notificado:
            continue

        nomes = ', '.join([p.user.first_name for p in pacientes[:3]])
        extra = f' e mais {len(pacientes)-3}' if len(pacientes) > 3 else ''

        NotificationDomainService.emit(
            target=psicologo.user,
            tipo='sistema',
            titulo='Pacientes sem Registro Recente 📊',
            mensagem=f'{nomes}{extra} não registra(m) humor há mais de 7 dias.',
            dados_extras=NotificationDomainService._routing_payload(
                screen='VinculosPacientes',
                event='pacientes_inativos',
            ),
        )
        results["notified"] += 1

    return results
```

- [ ] Adicionar a entrada no `CELERY_BEAT_SCHEDULE` em `settings.py`:

```python
"check-pacientes-inativos": {
    "task": "notificacoes_push.tasks.check_pacientes_inativos",
    "schedule": crontab(hour=11, minute=0, day_of_week='1'),  # toda segunda às 11h
},
```

- [ ] Verificar se o filtro `dados_extras__event='pacientes_inativos'` é suportado (requer `dados_extras` como `JSONField`).
- [ ] Verificar suporte a `psicologo=psicologo` no `NotificacaoSistema.objects.filter()`.
- [ ] Testar localmente: simular pacientes sem registro e chamar `check_pacientes_inativos.delay()`.
- [ ] Verificar truncagem de nomes: lista de 5 pacientes deve mostrar 3 nomes + "e mais 2".

## Critério de aceite

- ✅ Task identifica corretamente pacientes sem registro nos últimos 7 dias.
- ✅ Alerta agrupado por psicólogo (1 notificação, não 1 por paciente).
- ✅ Dedupe semanal funciona: segunda execução na mesma semana não duplica.
- ✅ Truncagem de nomes funciona para listas grandes (máx 3 + "e mais N").
- ✅ Task retorna dict `{"checked": N, "notified": M}`.
- ✅ Entrada no `CELERY_BEAT_SCHEDULE` com schedule semanal (segunda às 11h).

## Dependências

- Celery Beat ativo na VPS (pré-requisito operacional de produção).
- `dados_extras` no `NotificacaoSistema` deve ser um `JSONField` (para o filtro de dedupe).
- Confirmar suporte a `psicologo=` no model `NotificacaoSistema`.
