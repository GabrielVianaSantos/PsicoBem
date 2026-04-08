# Issue 10 — NOVO: Notificação ao paciente quando vínculo é alterado pelo psicólogo

**Fase:** 2 — Engajamento  
**Prioridade:** 🟡 Média  
**Arquivo:** `psicoapp_backend/core/views.py` (ou equivalente)  
**Tipo de notificação:** `sistema`

## Contexto

O psicólogo pode alterar o status de um vínculo com paciente (inativo, suspenso, finalizado, reativado) via `VinculoViewSet.alterar_status()`. Atualmente, **o paciente não recebe nenhuma notificação** dessa mudança — que pode ser de alto impacto emocional (especialmente "finalizado" ou "suspenso").

## Objetivo

Notificar o paciente com mensagem contextualizada de acordo com o novo status do vínculo.

## Tarefas

- [ ] Localizar o método `alterar_status()` no `VinculoViewSet` — confirmar se está em `core/views.py`, `authentication/views.py` ou outro arquivo.
- [ ] Confirmar os valores possíveis de status: `'inativo'`, `'suspenso'`, `'finalizado'`, `'ativo'` (ou outros).
- [ ] Identificar ponto após `vinculo.save()` para inserir a notificação.
- [ ] Implementar com mensagens contextualizadas por status:

```python
# views.py — VinculoViewSet.alterar_status(), após vinculo.save()
from core.services import NotificationDomainService

mensagens_status = {
    'inativo': 'Seu acompanhamento foi marcado como inativo pelo seu psicólogo.',
    'suspenso': 'Seu acompanhamento foi temporariamente suspenso pelo seu psicólogo.',
    'finalizado': 'Seu tratamento foi finalizado pelo seu psicólogo. Obrigado pela jornada!',
    'ativo': 'Seu acompanhamento foi reativado pelo seu psicólogo.',
}

NotificationDomainService.emit(
    target=vinculo.paciente.user,
    tipo='sistema',
    titulo='Atualização do Vínculo Terapêutico',
    mensagem=mensagens_status.get(
        novo_status,
        f'Status do seu vínculo foi alterado para {novo_status}.'
    ),
    dados_extras=NotificationDomainService._routing_payload(
        screen='MeuPsicologo',
        event='vinculo_alterado',
    ),
)
```

- [ ] Confirmar como `novo_status` e `vinculo` estão nomeados na view.
- [ ] Testar cada transição de status: inativo, suspenso, finalizado, reativo.
- [ ] Verificar que não é enviada notificação quando o status não muda.

## Critério de aceite

- ✅ Paciente recebe notificação no inbox para cada mudança de status do vínculo.
- ✅ Push agendado via Celery.
- ✅ Mensagem é contextualizada de acordo com o status (4 variações).
- ✅ `dados_extras` contém `screen: 'MeuPsicologo'` e `event: 'vinculo_alterado'`.
- ✅ Sem notificação duplicada em caso de status idêntico.

## Dependências

- Pode ser implementado e testado localmente após as issues da Fase 1.
