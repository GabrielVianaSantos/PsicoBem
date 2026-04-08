# Issue 04 — NOVO: Notificação de sessão cancelada

**Fase:** 1 — Fixes críticos  
**Prioridade:** 🔴 Alta  
**Arquivo:** `psicoapp_backend/sessoes/views.py`  
**Tipo de notificação:** `sessao_cancelada`

## Contexto

O tipo `sessao_cancelada` já existe em `NotificacaoSistema.TIPO_CHOICES`, mas **nunca é disparado**. Quando uma sessão é cancelada via `SessaoViewSet.cancelar()`, nenhuma notificação é enviada para nenhuma das partes.

## Objetivo

Implementar a notificação de cancelamento de sessão com lógica bidirecional:
- Psicólogo cancela → notifica **paciente**
- Paciente cancela → notifica **psicólogo**

## Tarefas

- [ ] Localizar o método `cancelar()` no `SessaoViewSet` em `sessoes/views.py`.
- [ ] Identificar o ponto após `sessao.save()` (ou `sessao.status = 'cancelada'` + save) onde inserir o bloco de notificação.
- [ ] Implementar a lógica bidirecional:

```python
# sessoes/views.py — SessaoViewSet.cancelar(), após sessao.save()
from core.services import NotificationDomainService

data_formatada = sessao.data_hora.strftime("%d/%m/%Y às %H:%M")
route = NotificationDomainService._routing_payload(
    screen='DetalhesSessao',
    params={'id': sessao.pk},
    event='sessao_cancelada',
    session_id=sessao.pk,
)

if hasattr(request.user, 'psicologo_profile'):
    # Psicólogo cancelou → notifica paciente
    NotificationDomainService.emit(
        target=sessao.paciente.user,
        tipo='sessao_cancelada',
        titulo='Sessão Cancelada',
        mensagem=f'Sua sessão de {data_formatada} foi cancelada pelo psicólogo.',
        link_relacionado=f'/sessoes/{sessao.pk}',
        dados_extras=route,
    )
else:
    # Paciente cancelou → notifica psicólogo
    NotificationDomainService.emit(
        target=sessao.psicologo.user,
        tipo='sessao_cancelada',
        titulo='Sessão Cancelada',
        mensagem=f'{sessao.paciente.user.first_name} cancelou a sessão de {data_formatada}.',
        link_relacionado=f'/sessoes/{sessao.pk}',
        dados_extras=route,
    )
```

- [ ] Confirmar que `sessao.psicologo` e `sessao.paciente` são acessíveis no ponto de inserção (verificar se há `select_related` necessário).
- [ ] Testar como psicólogo: cancelar uma sessão e verificar que o paciente recebe notificação no inbox.
- [ ] Testar como paciente: cancelar uma sessão e verificar que o psicólogo recebe notificação no inbox.
- [ ] Validar que o toque na notificação navega para `DetalhesSessao` com o ID correto.

## Critério de aceite

- ✅ Psicólogo cancela → paciente recebe inbox + push agendado.
- ✅ Paciente cancela → psicólogo recebe inbox + push agendado.
- ✅ `dados_extras` contém `screen: 'DetalhesSessao'` e `session_id`.
- ✅ Mensagem contextualizada com data/hora da sessão.

## Dependências

- Nenhuma — pode ser implementado e testado localmente.
