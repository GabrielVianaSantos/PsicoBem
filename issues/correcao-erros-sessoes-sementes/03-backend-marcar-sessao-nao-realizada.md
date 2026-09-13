# Issue 03 — Backend: endpoint para marcar sessão como "Não Realizada"

**Fase:** 2 — Novo endpoint
**Prioridade:** 🔴 Alta
**Arquivos principais:** `psicoapp_backend/sessoes/models.py`, `psicoapp_backend/sessoes/views.py`, `psicoapp_backend/sessoes/serializers.py`, `psicoapp_backend/sessoes/tests.py`
**Origem:** seções 2.1, 3.1 e 4 de `SPEC_CORRECAO_ERROS_SESSOES_SEMENTES.md`

## Problema

`Sessao.STATUS_CHOICES` já inclui `('faltou', 'Paciente Faltou')`, mas nenhum caminho no código grava esse status. `pode_ser_cancelada()` exige `data_hora > timezone.now()`, então uma sessão cujo horário já passou não pode mais ser cancelada — sobra apenas "Marcar como Realizada" (`pode_ser_realizada()`, sem restrição de tempo), forçando o psicólogo a registrar como realizada uma sessão que na verdade foi uma falta do paciente.

## Objetivo

Expor uma transição de status dedicada para o psicólogo marcar uma sessão como "Paciente Faltou", sem mexer nas regras de cancelamento/realização existentes.

## Escopo de implementação

### `psicoapp_backend/sessoes/models.py`

Adicionar `Sessao.pode_ser_marcada_falta()`, com a mesma regra de `pode_ser_realizada()`: `self.status in ['agendada', 'confirmada', 'remarcada']`.

### `psicoapp_backend/sessoes/views.py`

Nova action em `SessaoViewSet`:

```python
@action(detail=True, methods=['post'], url_path='nao-realizada')
def nao_realizada(self, request, pk=None):
    ...
```

- Restrita a psicólogo: `if not hasattr(request.user, 'psicologo_profile')` → `403`, mesmo padrão de `confirmar_pagamento`.
- Usa `self.get_object()` (aplica `IsPacienteOrPsicologoOwner`, garantindo que só o psicólogo dono da sessão a alcance).
- Valida `pode_ser_marcada_falta()`; se `False`, retorna `400` com mensagem explicativa.
- Grava `status = 'faltou'`. **Não altera `status_pagamento`** — permanece com o valor atual, mesmo padrão da action `cancelar`.
- Emite notificação para o paciente via `NotificationDomainService.emit`, reaproveitando o formato de `_routing_payload` já usado em `cancelar` (`screen='DetalhesSessao'`, `params={'sessaoId': sessao.pk}`, `event='sessao_nao_realizada'`, `entity_type='sessao'`, `entity_id=sessao.pk`), com mensagem do tipo "Sua sessão de {data_formatada} foi marcada como não realizada." — usar `timezone.localtime()` ao formatar a data (já corrigido na issue 02; se esta issue for implementada antes, aplicar a formatação correta desde já).
- Retorna a sessão serializada, no mesmo formato de resposta de `cancelar`/`realizar` (`{'message': ..., 'sessao': serializer.data}`).

### `psicoapp_backend/sessoes/serializers.py`

Adicionar `pode_marcar_falta` (`SerializerMethodField`, chamando `obj.pode_ser_marcada_falta()`) em `SessaoListSerializer` e `SessaoDetailSerializer`, incluindo o campo em `Meta.fields` de ambos.

## Tarefas

- [ ] Adicionar `pode_ser_marcada_falta()` ao modelo `Sessao`.
- [ ] Implementar a action `nao_realizada` em `SessaoViewSet`, com a checagem de papel, validação de elegibilidade e notificação.
- [ ] Adicionar `pode_marcar_falta` a `SessaoListSerializer` e `SessaoDetailSerializer`.
- [ ] Testes: sucesso (muda status, preserva `status_pagamento`, dispara notificação); rejeição para não-psicólogo (403); rejeição para sessão de outro psicólogo (404, via `IsPacienteOrPsicologoOwner`); rejeição para status inelegível (`realizada`/`cancelada`, 400); `pode_marcar_falta` retorna `True`/`False` corretamente para cada status.

## Critérios de aceite

- ✅ `POST /sessoes/{id}/nao-realizada/` muda o status para `faltou` quando a sessão está em `agendada`/`confirmada`/`remarcada`.
- ✅ `status_pagamento` não é alterado pela action.
- ✅ Paciente recebe notificação da mudança.
- ✅ Requisição de usuário sem `psicologo_profile` retorna `403`.
- ✅ Requisição para sessão de outro psicólogo retorna `404`.
- ✅ Requisição para sessão já `realizada`/`cancelada` retorna `400`.
- ✅ `pode_marcar_falta` aparece corretamente em `GET /sessoes/` e `GET /sessoes/{id}/`.
- ✅ Nenhuma alteração em `pode_ser_cancelada()`, `pode_ser_remarcada()` ou `pode_ser_realizada()`.

## Dependências

- Nenhuma tecnicamente, mas recomenda-se implementar depois da issue 02 (horário correto nas notificações) para não precisar revisar a mensagem de notificação duas vezes.
- É pré-requisito da issue 05 (o app só pode chamar um endpoint que já existe).
