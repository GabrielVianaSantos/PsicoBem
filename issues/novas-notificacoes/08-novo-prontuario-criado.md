# Issue 08 — NOVO: Notificação de prontuário criado para o paciente

**Fase:** 2 — Engajamento  
**Prioridade:** 🟡 Média  
**Arquivo:** `psicoapp_backend/core/signals.py`  
**Tipo de notificação:** `sistema`

## Contexto

Quando o psicólogo cria um `Prontuario` para um paciente, **o paciente não é notificado**. Informar o paciente da existência de um novo prontuário melhora a transparência do processo terapêutico.

> ⚠️ Antes de implementar, confirmar se a tela `MeusProntuarios` existe no frontend. Se não existir, ajustar `screen` para a tela mais adequada (ex: `MeuPsicologo` ou `HomePaciente`).

## Objetivo

Adicionar um signal `post_save` em `Prontuario` que notifica o paciente quando um novo prontuário é criado pelo psicólogo.

## Tarefas

- [ ] Confirmar a localização do model `Prontuario` — verificar se está em `core/models.py`, `sessoes/models.py` ou outro app.
- [ ] Confirmar como acessar o paciente a partir da instância: `instance.paciente` ou estrutura diferente.
- [ ] Confirmar se a tela `MeusProntuarios` existe no frontend (`src/screens/`). Ajustar `screen` se necessário.
- [ ] Adicionar o signal em `core/signals.py`:

```python
# core/signals.py — novo signal
from core.models import Prontuario  # ajustar import se modelo estiver em outro app

@receiver(post_save, sender=Prontuario)
def notificar_paciente_prontuario(sender, instance, created, **kwargs):
    """Notifica paciente quando psicólogo cria prontuário."""
    if not created:
        return
    NotificationDomainService.emit(
        target=instance.paciente.user,
        tipo='sistema',
        titulo='Novo Prontuário Disponível 📋',
        mensagem='Seu psicólogo adicionou um novo prontuário ao seu perfil.',
        link_relacionado=f'/prontuarios/{instance.pk}',
        dados_extras=NotificationDomainService._routing_payload(
            screen='MeusProntuarios',  # ← confirmar existência no frontend
            event='novo_prontuario',
        ),
    )
```

- [ ] Registrar o signal no `AppConfig.ready()` do app correspondente.
- [ ] Testar: criar um prontuário via admin ou API e verificar que o paciente recebe notificação no inbox.

## Critério de aceite

- ✅ Paciente recebe notificação no inbox quando um novo prontuário é criado.
- ✅ Push agendado via Celery.
- ✅ `screen` aponta para uma tela existente no frontend.
- ✅ Guard `if not created` garante que updates não disparam notificação extra.

## Dependências

- Confirmar existência da tela `MeusProntuarios` no frontend antes de definir o `screen`.
