# Issue 01 — Normalizar modalidades legadas

**Fase:** 1 — Dados e migração  
**Prioridade:** 🔴 Alta  
**Origem:** [SPEC_CORRECOES_CONFIGURACAO_SESSOES.md](/Users/user/Documents/GitHub/PsicoBem/SPEC_CORRECOES_CONFIGURACAO_SESSOES.md)  
**Arquivos principais:** `psicoapp_backend/sessoes/migrations/`, `psicoapp_backend/sessoes/models.py`

## Problema e objetivo

`TipoSessao.tipo` contém categorias que misturam modalidade, finalidade e pacote. Antes de restringir o domínio, os dados existentes precisam ficar válidos sem remover tipos ou quebrar sessões vinculadas.

## Escopo de implementação

Criar uma nova migration de dados que mantenha `presencial` e converta qualquer outro valor existente (`primeira`, `urgencia`, `avulsa`, `pacote`, `retorno` ou valor inesperado) para `online`. A migration deve ser segura para banco com zero, poucos ou muitos registros e não deve editar migrations históricas.

## Tarefas

- [ ] Inventariar as categorias presentes antes da migration.
- [ ] Criar migration reversível ou documentar claramente a estratégia de reversão por backup/restauração.
- [ ] Converter somente o campo `tipo` de `TipoSessao`.
- [ ] Confirmar que nomes, valores, durações, descrições, status e contagens permanecem iguais.
- [ ] Confirmar que `Sessao.tipo_sessao_id` não é alterado.
- [ ] Atualizar seeds/comandos de exemplo que ainda gerem categorias removidas.

## Critérios de aceite

- [ ] Após a migration, todos os tipos possuem `tipo` igual a `presencial` ou `online`.
- [ ] Tipos classificados como `presencial` permanecem presenciais; todos os demais ficam online.
- [ ] Nenhum tipo ou sessão é excluído ou desvinculado.
- [ ] A migration pode ser executada em banco já populado sem erro.
- [ ] O resultado pré e pós-migration é validado por testes ou comando de conferência.

## Dependências

- Nenhuma dependência de implementação.
- Deve ser concluída antes da Issue 02.
