# Issue 07 — NOVO: Notificação de sessão realizada para o paciente

**Fase:** 2 — Engajamento  
**Prioridade:** 🟡 Média  
**Arquivo:** `psicoapp_backend/sessoes/views.py`  
**Tipo de notificação:** `sistema`

## Contexto

Quando o psicólogo marca uma sessão como "realizada" via `SessaoViewSet.realizar()`, o status da sessão é atualizado, mas **o paciente não recebe nenhuma notificação**. Esta confirmação é útil como registro e como prompt para o paciente avaliar a sessão ou fazer anotações no diário de odisseia.

## Objetivo

Notificar o paciente quando sua sessão for marcada como realizada, com navegação para `MinhasSessoes`.

## Tarefas

- [ ] Localizar o método `realizar()` no `SessaoViewSet` em `sessoes/views.py`.
- [ ] Identificar o ponto após `sessao.save()` (quando `status='realizada'`).
- [ ] Inserir o bloco de notificação:

```python
# sessoes/views.py — SessaoViewSet.realizar(), após sessao.save()
from core.services import NotificationDomainService

data_formatada = sessao.data_hora.strftime("%d/%m/%Y")
NotificationDomainService.emit(
    target=sessao.paciente.user,
    tipo='sistema',
    titulo='Sessão Realizada ✅',
    mensagem=f'Sua sessão de {data_formatada} foi marcada como realizada.',
    link_relacionado=f'/sessoes/{sessao.pk}',
    dados_extras=NotificationDomainService._routing_payload(
        screen='MinhasSessoes',
        event='sessao_realizada',
        session_id=sessao.pk,
    ),
)
```

- [ ] Confirmar que `sessao.paciente` possui `select_related` necessário na query.
- [ ] Testar: marcar uma sessão como realizada e verificar que o paciente recebe a notificação no inbox.

## Critério de aceite

- ✅ Paciente recebe notificação no inbox quando sessão é marcada como realizada.
- ✅ Push agendado via Celery.
- ✅ `dados_extras` contém `screen: 'MinhasSessoes'` e `session_id`.
- ✅ Mensagem inclui a data da sessão no formato correto.

## Dependências

- Pode ser implementado e testado localmente após as issues da Fase 1.
