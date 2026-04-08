# Issue 02 — FIX: Migrar pagamento confirmado para `emit()`

**Fase:** 1 — Fixes críticos  
**Prioridade:** 🔴 Alta  
**Arquivo:** `psicoapp_backend/sessoes/models.py`  
**Tipo de notificação:** `sistema`

## Problema

O método `Sessao.confirmar_pagamento()` em `sessoes/models.py` cria a notificação de confirmação de pagamento usando `NotificacaoSistema.objects.create()` diretamente. O paciente recebe a notificação no inbox in-app, mas **nenhum push nativo é enviado**.

Além disso, a notificação atual não possui `dados_extras` com `screen`, fazendo com que o toque na notificação não navegue para lugar nenhum.

## Objetivo

Substituir o `objects.create()` direto por `NotificationDomainService.emit()` com roteamento para `DetalhesSessao`.

## Tarefas

- [ ] Localizar o método `confirmar_pagamento()` em `sessoes/models.py`.
- [ ] Identificar o bloco `NotificacaoSistema.objects.create(...)` de pagamento.
- [ ] Substituir pelo código abaixo:

```python
# sessoes/models.py — Sessao.confirmar_pagamento()
from core.services import NotificationDomainService

data = self.data_hora.strftime("%d/%m/%Y")
NotificationDomainService.emit(
    target=self.paciente.user,
    tipo='sistema',
    titulo='Pagamento Confirmado ✅',
    mensagem=f'Pagamento da sessão de {data} foi confirmado.',
    link_relacionado=f'/sessoes/{self.pk}',
    dados_extras=NotificationDomainService._routing_payload(
        screen='DetalhesSessao',
        params={'id': self.pk},
        event='pagamento_confirmado',
        session_id=self.pk,
    ),
)
```

- [ ] Verificar que o import de `NotificationDomainService` não cria import circular (mover para dentro da função se necessário).
- [ ] Testar: confirmar pagamento de uma sessão e verificar que o inbox é atualizado **e** que a task push é enfileirada.
- [ ] Validar que toque na notificação navega para `DetalhesSessao` com o ID correto.

## Critério de aceite

- ✅ Inbox do paciente atualizado após confirmar pagamento.
- ✅ Push agendado na fila Celery.
- ✅ `dados_extras` contém `screen: 'DetalhesSessao'` e `params.id` com o PK da sessão.
- ✅ Sem import circular no `models.py`.

## Dependências

- Nenhuma — pode ser implementado e testado localmente sem Celery Beat.
