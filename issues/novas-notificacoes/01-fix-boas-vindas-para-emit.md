# Issue 01 — FIX: Migrar boas-vindas do paciente para `emit()`

**Fase:** 1 — Fixes críticos  
**Prioridade:** 🔴 Alta  
**Arquivo:** `psicoapp_backend/core/signals.py`  
**Tipo de notificação:** `sistema`

## Problema

O signal `post_save` em `Paciente` (quando `created=True`) cria a notificação de boas-vindas usando `NotificacaoSistema.objects.create()` diretamente, ignorando o pipeline do `NotificationDomainService.emit()`. Resultado: o inbox in-app é criado, mas **nenhum push nativo é disparado**.

## Objetivo

Substituir o `objects.create()` direto por `NotificationDomainService.emit()` para que o push seja agendado via Celery no commit.

## Tarefas

- [ ] Localizar o signal `emit_session_created` ou equivalente que trata o `post_save` de `Paciente` em `core/signals.py`.
- [ ] Identificar o bloco `NotificacaoSistema.objects.create(...)` que gera a boas-vindas.
- [ ] Substituir pelo código abaixo, garantindo o import de `NotificationDomainService`:

```python
# core/signals.py — signal post_save em Paciente (created=True)
NotificationDomainService.emit(
    target=instance.user,
    tipo='sistema',
    titulo='Bem-vindo ao PsicoBem! 🌱',
    mensagem=(
        'Seja bem-vindo! Estamos aqui para apoiar sua jornada de bem-estar. '
        'Explore as funcionalidades e conecte-se com seu psicólogo.'
    ),
    dados_extras=NotificationDomainService._routing_payload(
        screen='HomePaciente',
        event='boas_vindas',
    ),
)
```

- [ ] Verificar que `NotificationDomainService` está importado no topo do arquivo.
- [ ] Testar manualmente: criar um novo `Paciente` e verificar que a notificação aparece no inbox **e** que a task push é enfileirada no Celery (checar `celery worker` logs).

## Critério de aceite

- ✅ Notificação de boas-vindas aparece no inbox do paciente.
- ✅ Push é agendado na fila Celery após criação do paciente (verificável em logs do worker).
- ✅ `dados_extras` contém `screen: 'HomePaciente'` e `event: 'boas_vindas'`.

## Dependências

- Nenhuma — pode ser implementado e testado localmente sem Celery Beat.
