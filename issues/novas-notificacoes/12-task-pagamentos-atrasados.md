# Issue 12 — NOVO: Task periódica — Pagamentos atrasados

**Fase:** 3 — Tasks periódicas (Celery Beat)  
**Prioridade:** 🟢 Baixa  
**Arquivo:** `psicoapp_backend/notificacoes_push/tasks.py` + `settings.py`  
**Tipo de notificação:** `pagamento_pendente`

## Contexto

O tipo `pagamento_pendente` já existe em `NotificacaoSistema.TIPO_CHOICES`. O model `Sessao` possui campos `status_pagamento` e `data_hora`. Porém, **nenhuma task verifica pagamentos atrasados** — sessões com status `'realizada'` e `status_pagamento='pendente'` há mais de 7 dias não geram alerta para o psicólogo.

> ⚠️ **Pré-requisito:** Celery Beat deve estar ativo na VPS. Esta issue pode ser codificada localmente, mas só funcionará em produção com o Beat em execução.

## Objetivo

Implementar a task `check_pagamentos_atrasados()` que roda 1x/dia às 10h, agrupa sessões por psicólogo e envia um único alerta resumido por psicólogo com dedupe diário.

## Tarefas

- [ ] Confirmar o campo `status_pagamento` no model `Sessao` — valores possíveis (`'pendente'`, `'confirmado'`, etc.).
- [ ] Confirmar se `NotificacaoSistema` suporta `psicologo=psicologo` como destinatário (verificar se o campo existe no model).
- [ ] Adicionar a task em `notificacoes_push/tasks.py`:

```python
# notificacoes_push/tasks.py — nova task
from collections import defaultdict

@shared_task
def check_pagamentos_atrasados():
    """Verifica sessões realizadas com pagamento pendente há mais de 7 dias. 1 alerta/dia/psicólogo."""
    from sessoes.models import Sessao
    from core.models import NotificacaoSistema
    from core.services import NotificationDomainService

    limite = timezone.now() - timedelta(days=7)
    sessoes = Sessao.objects.filter(
        status='realizada',
        status_pagamento='pendente',
        data_hora__lte=limite,
    ).select_related('paciente__user', 'psicologo__user')

    results = {"processed": 0, "notified": 0}
    por_psicologo = defaultdict(list)

    for sessao in sessoes:
        por_psicologo[sessao.psicologo].append(sessao)

    for psicologo, sessoes_list in por_psicologo.items():
        results["processed"] += len(sessoes_list)
        total = len(sessoes_list)

        # Dedupe: 1 notificação por dia por psicólogo
        ja_notificado = NotificacaoSistema.objects.filter(
            psicologo=psicologo,
            tipo='pagamento_pendente',
            created_at__gte=timezone.now() - timedelta(days=1),
        ).exists()
        if ja_notificado:
            continue

        NotificationDomainService.emit(
            target=psicologo.user,
            tipo='pagamento_pendente',
            titulo='Pagamentos Pendentes 💳',
            mensagem=f'Você tem {total} sessão(ões) realizada(s) com pagamento pendente há mais de 7 dias.',
            dados_extras=NotificationDomainService._routing_payload(
                screen='Sessoes',
                event='pagamento_pendente',
            ),
        )
        results["notified"] += 1

    return results
```

- [ ] Adicionar a entrada no `CELERY_BEAT_SCHEDULE` em `settings.py`:

```python
"check-pagamentos-atrasados": {
    "task": "notificacoes_push.tasks.check_pagamentos_atrasados",
    "schedule": crontab(hour=10, minute=0),  # 1x/dia às 10h
},
```

- [ ] Verificar se `NotificacaoSistema` aceita `psicologo=psicologo` no filtro de dedupe (o model pode não ter este campo — confirmar).
- [ ] Testar localmente: criar sessões com status atrasado e chamar `check_pagamentos_atrasados.delay()`.
- [ ] Verificar o dedupe: task chamada 2x no mesmo dia não envia segunda notificação.

## Critério de aceite

- ✅ Task agrupada por psicólogo (não spamma 1 notificação por sessão).
- ✅ Psicólogo recebe 1 notificação resumida com total de sessões pendentes.
- ✅ Dedupe diário por psicólogo funciona corretamente.
- ✅ Task retorna dict `{"processed": N, "notified": M}`.
- ✅ Entrada no `CELERY_BEAT_SCHEDULE` com schedule `crontab(hour=10, minute=0)`.

## Dependências

- Celery Beat ativo na VPS (pré-requisito operacional de produção).
- Confirmar suporte a `psicologo=` no `NotificacaoSistema.objects.filter()`.
