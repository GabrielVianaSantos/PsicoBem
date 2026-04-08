# Issue 05 — NOVO: Notificação de comentário do psicólogo em registro

**Fase:** 1 — Fixes críticos  
**Prioridade:** 🔴 Alta  
**Arquivo:** `psicoapp_backend/core/signals.py`  
**Tipo de notificação:** `comentario_psicologo`

## Contexto

O tipo `comentario_psicologo` já existe em `NotificacaoSistema.TIPO_CHOICES`. O model `ComentarioPsicologo` existe em `engajamentos/models.py`, mas **nenhum signal ou trigger** dispara notificação quando o psicólogo comenta em um registro de odisseia do paciente.

## Objetivo

Adicionar um signal `post_save` em `ComentarioPsicologo` que notifica o paciente quando seu psicólogo deixa um comentário em seu registro de odisseia.

## Tarefas

- [ ] Confirmar em `engajamentos/models.py` a estrutura exata de `ComentarioPsicologo`, especialmente:
  - Como acessar o paciente: `instance.registro.paciente` ou equivalente.
  - Como acessar a data do registro: `instance.registro.data_registro`.
  - Como acessar o PK do registro: `instance.registro.pk`.
- [ ] Adicionar o novo signal em `core/signals.py`:

```python
# core/signals.py — novo signal
from engajamentos.models import ComentarioPsicologo

@receiver(post_save, sender=ComentarioPsicologo)
def notificar_paciente_comentario(sender, instance, created, **kwargs):
    """Notifica paciente quando psicólogo comenta em registro de odisseia."""
    if not created:
        return
    NotificationDomainService.emit(
        target=instance.registro.paciente.user,
        tipo='comentario_psicologo',
        titulo='Novo Comentário do Psicólogo 💬',
        mensagem=(
            f'Seu psicólogo comentou no seu registro de '
            f'{instance.registro.data_registro.strftime("%d/%m/%Y")}.'
        ),
        link_relacionado=f'/registros/{instance.registro.pk}',
        dados_extras=NotificationDomainService._routing_payload(
            screen='RegistroCompleto',
            params={'id': instance.registro.pk},
            event='comentario_psicologo',
            registro_id=instance.registro.pk,
        ),
    )
```

- [ ] Registrar o signal no `AppConfig.ready()` do app correspondente (verificar se `engajamentos/apps.py` ou `core/apps.py` já importa os signals).
- [ ] Garantir que o import de `ComentarioPsicologo` em `core/signals.py` não cria import circular (alternativa: importar dentro da função).
- [ ] Testar: criar um `ComentarioPsicologo` via admin ou API e verificar que o paciente recebe a notificação no inbox.
- [ ] Validar que o toque navega para `RegistroCompleto` com o ID correto.

## Critério de aceite

- ✅ Paciente recebe notificação no inbox ao ser comentado pelo psicólogo.
- ✅ Push agendado via Celery.
- ✅ `dados_extras` contém `screen: 'RegistroCompleto'` e `registro_id`.
- ✅ Nenhuma notificação extra disparada em updates do comentário (guard `if not created`).

## Dependências

- Nenhuma — pode ser implementado e testado localmente.
