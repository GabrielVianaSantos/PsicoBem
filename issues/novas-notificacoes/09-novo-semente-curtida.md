# Issue 09 — NOVO: Notificação ao psicólogo quando paciente curte uma semente

**Fase:** 2 — Engajamento  
**Prioridade:** 🟡 Média  
**Arquivo:** `psicoapp_backend/engajamentos/views.py`  
**Tipo de notificação:** `sistema`

## Contexto

O psicólogo envia "Sementes do Cuidado" para seus pacientes. Quando o paciente curte uma semente (via `SementeCuidadoViewSet.curtir()`), **o psicólogo não recebe nenhum feedback**. Essa notificação fecha o loop de engajamento: o psicólogo sabe que sua mensagem foi bem recebida.

## Objetivo

Adicionar a chamada ao `NotificationDomainService.emit()` no método `curtir()` da view, após `msg.marcar_como_curtida()`, notificando o psicólogo da semente.

## Tarefas

- [ ] Localizar o método `curtir()` no `SementeCuidadoViewSet` em `engajamentos/views.py`.
- [ ] Identificar como acessar a semente e o psicólogo: `semente.psicologo` ou estrutura diferente.
- [ ] Confirmar o nome do método de curtida: `marcar_como_curtida()` ou diferente.
- [ ] Inserir após `msg.marcar_como_curtida()` (ou equivalente):

```python
# engajamentos/views.py — SementeCuidadoViewSet.curtir(), após registrar a curtida
from core.services import NotificationDomainService

NotificationDomainService.emit(
    target=semente.psicologo.user,
    tipo='sistema',
    titulo='Semente Curtida ❤️',
    mensagem=f'{request.user.first_name} curtiu sua semente "{semente.titulo}".',
    dados_extras=NotificationDomainService._routing_payload(
        screen='SementesCuidado',
        event='semente_curtida',
    ),
)
```

- [ ] Garantir que `semente.psicologo` está disponível na query (verificar `select_related`).
- [ ] Testar: paciente curte uma semente e verificar que psicólogo recebe notificação no inbox.
- [ ] Verificar que descurtir (se existir) **não** dispara notificação.

## Critério de aceite

- ✅ Psicólogo recebe notificação no inbox ao ter semente curtida.
- ✅ Push agendado via Celery.
- ✅ Mensagem inclui o nome do paciente e o título da semente.
- ✅ `dados_extras` contém `screen: 'SementesCuidado'` e `event: 'semente_curtida'`.

## Dependências

- Pode ser implementado e testado localmente após as issues da Fase 1.
