# Issue 01 — Backend: trancar as rotas de escrita do vínculo

**Fase:** 1 — Segurança (pré-requisito)
**Prioridade:** 🔴 Alta
**Arquivos principais:** `psicoapp_backend/core/views.py`, `psicoapp_backend/core/serializers.py`, `psicoapp_backend/core/tests.py`
**Origem:** seções 2, 3.3 e 5 de `SPEC_VINCULO_CONVITE_E_SOLICITACAO.md`

## Problema

`VinculoViewSet` (`core/views.py:70`) é um `ModelViewSet` completo com `permission_classes = [IsAuthenticated]`, e o `get_queryset` devolve ao paciente os vínculos **dele**. A action `alterar-status` é protegida para psicólogo, mas as rotas genéricas do DRF (`PUT`, `PATCH`, `DELETE /api/vinculos/{id}/`) não são — e `status` é campo **gravável** no serializer (`core/serializers.py:73`, `read_only_fields` não inclui `status`).

Na prática, hoje um paciente já consegue alterar o status do próprio vínculo pela rota genérica. Quando a issue 03 introduzir o status `pendente`, ele poderia **auto-aprovar a própria solicitação**, tornando todo o fluxo de aceite (issue 06) contornável no dia um.

## Objetivo

Eliminar qualquer caminho de escrita sobre `VinculoPacientePsicologo` que não passe por uma action dedicada com verificação de perfil.

## Escopo de implementação

### Serializer (`core/serializers.py`)

- `VinculoPacientePsicologoSerializer.Meta.read_only_fields` passa a incluir **`status`** e `paciente`, além dos atuais (`id`, `psicologo`, `data_vinculo`, `created_at`, `updated_at`).
- Os campos novos da issue 03 (`origem`, `data_solicitacao`) entram como read-only quando forem criados.

### ViewSet (`core/views.py`)

- `VinculoViewSet` deixa de herdar `viewsets.ModelViewSet` e passa a `viewsets.ReadOnlyModelViewSet`.
- As actions existentes (`ativos`, `meu_psicologo`, `alterar_status`, `resumo`) são preservadas **sem alteração de comportamento**.
- Não existe caso de uso para criação/edição/remoção genérica de vínculo: toda criação e transição passa pelos fluxos desta feature.

## Tarefas

- [ ] Adicionar `status` e `paciente` a `read_only_fields` do `VinculoPacientePsicologoSerializer`.
- [ ] Converter `VinculoViewSet` para `ReadOnlyModelViewSet`, preservando as actions atuais.
- [ ] Teste: `PATCH /api/vinculos/{id}/ {"status": "ativo"}` com token de **paciente**, sobre um vínculo dele, não altera o status (`405`/`403`).
- [ ] Teste: `DELETE /api/vinculos/{id}/` com token de paciente não remove o vínculo.
- [ ] Teste: `PATCH` com token de **psicólogo** também é rejeitado (a única via é `alterar-status`).
- [ ] Teste: as actions `ativos`, `meu-psicologo`, `alterar-status` e `resumo` continuam funcionando exatamente como antes (regressão).

## Critérios de aceite

- ✅ Nenhuma rota permite gravar `status` fora das actions dedicadas.
- ✅ Nenhum comportamento existente do app quebra: as telas que hoje consomem `vinculoService` (`vinculosPacientes.js`, `meuPsicologo.js`) continuam funcionando sem alteração.
- ✅ `python manage.py test core` e a suíte completa passam localmente.

## Dependências

Nenhuma. **É o primeiro item a ser feito** — as issues 03 e 06 dependem desta barreira existir antes de o status `pendente` passar a existir.
