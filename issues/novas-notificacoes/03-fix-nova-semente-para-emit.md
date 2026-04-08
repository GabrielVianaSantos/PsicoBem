# Issue 03 — FIX: Migrar nova semente do cuidado para `emit()`

**Fase:** 1 — Fixes críticos  
**Prioridade:** 🔴 Alta  
**Arquivo:** `psicoapp_backend/engajamentos/models.py`  
**Tipo de notificação:** `nova_semente`

## Problema

O método `SementeCuidado.enviar_para_pacientes()` em `engajamentos/models.py` itera sobre pacientes vinculados e cria notificações usando `NotificacaoSistema.objects.create()` diretamente. Os pacientes recebem a notificação no inbox in-app, mas:

1. **Nenhum push nativo é disparado** — o `emit()` não é chamado.
2. **Sem navegação** — a notificação não possui `dados_extras` com `screen`, logo o toque não leva a lugar nenhum.

## Objetivo

Substituir o `objects.create()` direto por `NotificationDomainService.emit()` com roteamento para `SementesPaciente`.

## Tarefas

- [ ] Localizar o método `enviar_para_pacientes()` em `engajamentos/models.py`.
- [ ] Identificar o loop que itera sobre pacientes e chama `NotificacaoSistema.objects.create(...)`.
- [ ] Substituir o `create()` de cada iteração pelo código abaixo:

```python
# engajamentos/models.py — SementeCuidado.enviar_para_pacientes()
from core.services import NotificationDomainService

for paciente in pacientes_vinculados:
    NotificationDomainService.emit(
        target=paciente.user,
        tipo='nova_semente',
        titulo='Nova Semente do Cuidado 🌱',
        mensagem=f'Você recebeu uma nova mensagem: "{self.titulo}"',
        link_relacionado=f'/sementes/{self.pk}',
        dados_extras=NotificationDomainService._routing_payload(
            screen='SementesPaciente',
            event='nova_semente',
        ),
    )
```

- [ ] Verificar que o import de `NotificationDomainService` não cria import circular (mover para dentro da função se necessário).
- [ ] Testar: enviar uma semente para pacientes vinculados e verificar que:
  - Inbox in-app atualizado para cada paciente.
  - Task push enfileirada no Celery para cada paciente com dispositivo ativo.
- [ ] Validar que toque na notificação navega para `SementesPaciente`.

## Critério de aceite

- ✅ Inbox de cada paciente vinculado atualizado.
- ✅ Push agendado para cada paciente com dispositivo ativo.
- ✅ `dados_extras` contém `screen: 'SementesPaciente'` e `event: 'nova_semente'`.
- ✅ Sem import circular em `engajamentos/models.py`.

## Dependências

- Nenhuma — pode ser implementado e testado localmente sem Celery Beat.
