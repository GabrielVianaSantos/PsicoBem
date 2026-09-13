# Issue 01 — Backend: restringir edição/exclusão de Sementes do Cuidado ao dono

**Fase:** 1 — Segurança
**Prioridade:** 🔴 Alta
**Arquivos principais:** `psicoapp_backend/engajamentos/views.py`, `psicoapp_backend/engajamentos/tests.py`
**Origem:** seções 2.2 e 4 de `SPEC_CORRECAO_ERROS_SESSOES_SEMENTES.md`

## Problema

`SementeCuidadoViewSet` é um `ModelViewSet` registrado via `DefaultRouter`, que expõe automaticamente `PUT`/`PATCH`/`DELETE /sementes-cuidado/{id}/`. `get_queryset()` retorna, para o paciente, as sementes **do psicólogo vinculado** (não sementes próprias), e a viewset não sobrescreve `update`/`partial_update`/`destroy` nem adiciona uma checagem de dono na escrita. `perform_create` já bloqueia criação por paciente, mas não há proteção equivalente para editar/excluir.

Resultado: um paciente autenticado que descubra o `id` de uma semente do seu psicólogo pode, hoje, chamar `PATCH`/`DELETE /sementes-cuidado/{id}/` diretamente na API e alterar ou apagar conteúdo que não é seu.

## Objetivo

Garantir que somente o psicólogo dono de uma Semente do Cuidado possa editá-la ou excluí-la, fechando esse gap antes de a issue 04 expor os botões de editar/excluir no app.

## Escopo de implementação

### `psicoapp_backend/engajamentos/views.py`

Em `SementeCuidadoViewSet`, adicionar uma checagem de propriedade nas operações de escrita (`update`, `partial_update`, `destroy`). Pode ser implementada:

- sobrescrevendo `get_object()` para, quando a action for de escrita e o usuário não for o psicólogo dono, levantar `PermissionDenied`/`Http404`; **ou**
- adicionando uma `permission_classes` de objeto dedicada (`has_object_permission`) que verifique `obj.psicologo == request.user.psicologo_profile` para métodos de escrita, mantendo leitura (`GET`) como já funciona hoje.

Escolher a abordagem mais consistente com o restante do arquivo (`IsPacienteOdisseiaWritePermission` já é um exemplo de permissão customizada no mesmo módulo — usar como referência de estilo).

Não alterar `get_queryset()` (a visão de leitura do paciente sobre sementes do psicólogo vinculado deve continuar exatamente igual) nem `perform_create` (já correto).

## Tarefas

- [ ] Implementar a checagem de dono para `update`/`partial_update`/`destroy` em `SementeCuidadoViewSet`.
- [ ] Confirmar que `visualizar` e `curtir` (actions de paciente) continuam funcionando sem alteração.
- [ ] Escrever testes cobrindo: psicólogo dono edita/exclui com sucesso; psicólogo edita/exclui semente de outro psicólogo (já bloqueado pelo `get_queryset`, reconfirmar); paciente tenta `PATCH`/`DELETE` em semente do seu psicólogo vinculado (deve falhar); paciente tenta `PATCH`/`DELETE` em semente de psicólogo não vinculado (já bloqueado pelo `get_queryset`, reconfirmar).

## Critérios de aceite

- ✅ Psicólogo dono consegue `PATCH`/`DELETE` em semente própria.
- ✅ Paciente autenticado não consegue `PATCH`/`DELETE` em nenhuma semente, mesmo as do seu psicólogo vinculado que aparecem no seu `GET /sementes-cuidado/`.
- ✅ Psicólogo não consegue `PATCH`/`DELETE` em semente de outro psicólogo.
- ✅ `visualizar` e `curtir` continuam funcionando para o paciente, sem alteração.
- ✅ Nenhuma rota nova foi criada — apenas as rotas já existentes do `ModelViewSet` passam a ser corretamente restringidas.

## Dependências

- Nenhuma. Independente das demais issues deste backlog.
- É pré-requisito da issue 04 (interface de edição/exclusão no app).
