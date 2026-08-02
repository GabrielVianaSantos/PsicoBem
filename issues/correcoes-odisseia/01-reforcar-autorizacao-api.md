# Issue 01 — Reforçar autorização da API de Registros de Odisséia

**Fase:** 1 — Segurança e regra de acesso  
**Prioridade:** 🔴 Alta  
**Arquivos principais:** `psicoapp_backend/engajamentos/views.py` e testes do app `engajamentos`  
**Origem:** seção 3.1 e seção 4 de `SPEC_CORRECOES_ODISSEIA.md`

## Problema

O `RegistroOdisseiaViewSet` já impede que o psicólogo crie um registro em `perform_create()`, mas o viewset ainda expõe as ações padrão de edição e exclusão. Como o psicólogo recebe registros no `get_queryset()`, uma chamada direta à API pode tentar alterar ou excluir registros fora do comportamento esperado de consulta.

## Objetivo

Garantir no backend que o psicólogo tenha acesso exclusivamente de leitura aos registros compartilhados de seus pacientes vinculados ativos.

## Escopo de implementação

- Manter a regra atual de listagem para psicólogos:
  - vínculo `ativo` entre psicólogo e paciente;
  - registro com `compartilhar_psicologo=True`.
- Permitir ao psicólogo apenas as ações `list` e `retrieve`.
- Recusar com `403 Forbidden` as ações `create`, `update`, `partial_update` e `destroy` realizadas por psicólogo.
- Manter o paciente restrito aos próprios registros em todas as ações permitidas.
- Manter o bloqueio de qualquer usuário sem perfil de paciente ou psicólogo.

## Tarefas

- [ ] Revisar `RegistroOdisseiaViewSet.get_queryset()` em `psicoapp_backend/engajamentos/views.py`.
- [ ] Confirmar que registros de pacientes sem vínculo ativo, de outros psicólogos ou não compartilhados não são retornados ao psicólogo.
- [ ] Implementar uma regra explícita por ação/perfil para impedir escrita pelo psicólogo, sem depender apenas da interface.
- [ ] Confirmar que `POST` por psicólogo continua retornando `403`.
- [ ] Bloquear também `PUT`, `PATCH` e `DELETE` por psicólogo com `403`.
- [ ] Conferir que o paciente não consiga acessar, editar ou excluir registros de outro paciente por ID.
- [ ] Criar ou atualizar testes automatizados do viewset para os cenários descritos abaixo.

## Cenários de teste

- [ ] Paciente autenticado lista apenas os próprios registros.
- [ ] Paciente autenticado cria um registro com o próprio perfil, sem poder escolher outro paciente.
- [ ] Psicólogo vinculado ativamente lista somente registros compartilhados daquele paciente.
- [ ] Psicólogo não recebe registros não compartilhados, de paciente sem vínculo ou de vínculo inativo.
- [ ] Psicólogo consegue consultar o detalhe de um registro elegível.
- [ ] Psicólogo recebe `403` em `POST`, `PUT`, `PATCH` e `DELETE`.
- [ ] Usuário sem perfil válido não recebe registros nem permissões de escrita.

## Critérios de aceite

- ✅ A API impõe a matriz de acesso prevista na SPEC, mesmo com requisições diretas fora do app.
- ✅ Psicólogos podem somente listar e consultar detalhes de registros elegíveis.
- ✅ Todas as operações de escrita do psicólogo retornam `403`.
- ✅ Os testes cobrem vínculo ativo, compartilhamento e isolamento entre pacientes.

## Dependências

- Nenhuma. Esta issue deve ser concluída antes da adaptação visual do fluxo do psicólogo.
