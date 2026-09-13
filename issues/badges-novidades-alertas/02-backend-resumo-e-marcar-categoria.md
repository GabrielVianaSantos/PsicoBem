# Issue 02 — Backend: endpoints de resumo por categoria e marcar categoria como lida

**Fase:** 1 — Infraestrutura de badges
**Prioridade:** 🔴 Alta
**Arquivos principais:** `psicoapp_backend/core/views.py`, `psicoapp_backend/core/tests.py`
**Origem:** seções 2.1 e 3.1 de `SPEC_BADGES_NOVIDADES_E_ALERTAS_CUSTOMIZADOS.md`

## Problema

`NotificacaoViewSet.nao_lidas()` só retorna um número agregado de todas as notificações não lidas, sem discriminar por assunto (sementes, sessões, odisseia). Não há como o frontend saber qual card de menu deve acender sem essa discriminação.

## Objetivo

Expor um resumo por categoria e uma forma de marcar como lidas as notificações de uma categoria específica, reaproveitando o campo `lida` já existente (sem estado novo).

## Escopo de implementação

### `psicoapp_backend/core/views.py` — `NotificacaoViewSet`

Definir o mapeamento de categoria (módulo-level ou método estático da view):

```python
CATEGORIA_FILTROS = {
    'sementes': Q(tipo='nova_semente') | Q(dados_extras__event='semente_curtida'),
    'sessoes': Q(tipo__in=['sessao_agendada', 'sessao_cancelada']) | Q(dados_extras__event__in=['sessao_realizada', 'sessao_nao_realizada']),
    'odisseia': Q(tipo__in=['novo_registro', 'comentario_psicologo']),
}
```

Novas actions:

```python
@action(detail=False, methods=['get'], url_path='resumo-por-categoria')
def resumo_por_categoria(self, request):
    base = self.get_queryset().filter(lida=False)
    return Response({
        categoria: base.filter(filtro).exists()
        for categoria, filtro in CATEGORIA_FILTROS.items()
    })

@action(detail=False, methods=['post'], url_path='marcar-categoria-lida')
def marcar_categoria_lida(self, request):
    categoria = request.data.get('categoria')
    filtro = CATEGORIA_FILTROS.get(categoria)
    if filtro is None:
        return Response({'error': 'Categoria inválida.'}, status=status.HTTP_400_BAD_REQUEST)
    self.get_queryset().filter(lida=False).filter(filtro).update(lida=True, data_leitura=timezone.now())
    return Response(status=status.HTTP_204_NO_CONTENT)
```

Não alterar `nao_lidas()`, `ler()` nem `ler_todas()` — continuam exatamente como estão.

## Tarefas

- [ ] Adicionar `CATEGORIA_FILTROS` (ou equivalente) e as duas novas actions.
- [ ] Teste: criar notificações de cada tipo/evento mapeado (inclusive as combinações via `dados_extras.event`) e confirmar que `resumo-por-categoria` acerta cada categoria — e só ela.
- [ ] Teste: `sessao_lembrete` não aparece em nenhuma categoria.
- [ ] Teste: `marcar-categoria-lida` marca como lidas apenas as notificações daquela categoria, sem tocar nas demais nem nas de outro usuário.
- [ ] Teste: categoria inválida retorna `400`.
- [ ] Teste: `nao_lidas()`, `ler()` e `ler_todas()` continuam funcionando sem alteração (regressão).

## Critérios de aceite

- ✅ `GET /notificacoes/resumo-por-categoria/` retorna `{sementes, sessoes, odisseia}` corretos para o usuário logado.
- ✅ `POST /notificacoes/marcar-categoria-lida/` com `{"categoria": "sementes"}` marca só as de sementes.
- ✅ Ambas as actions respeitam o isolamento por usuário já garantido por `get_queryset()`.
- ✅ Nenhuma rota existente de notificações mudou de comportamento.

## Dependências

- Nenhuma. Independente das demais issues do backlog.
- É pré-requisito da issue 05.
