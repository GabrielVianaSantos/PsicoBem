# Issue 02 — Restringir contrato de modalidades no backend

**Fase:** 2 — Domínio e API  
**Prioridade:** 🔴 Alta  
**Origem:** [SPEC_CORRECOES_CONFIGURACAO_SESSOES.md](/Users/user/Documents/GitHub/PsicoBem/SPEC_CORRECOES_CONFIGURACAO_SESSOES.md)  
**Arquivos principais:** `psicoapp_backend/sessoes/models.py`, `psicoapp_backend/sessoes/serializers.py`, `psicoapp_backend/sessoes/views.py`, seeds e testes de `sessoes`

## Problema e objetivo

Mesmo que o aplicativo remova as opções antigas, o modelo e a API atualmente permitem categorias fora de modalidade. O backend deve ser a fonte de verdade e aceitar apenas Presencial/Online.

## Escopo de implementação

Reduzir `TIPO_CHOICES` a `presencial` e `online`, ajustar o default para uma modalidade válida e garantir rejeição de valores antigos ou arbitrários em criação e edição. Preservar permissões, isolamento por psicólogo e o formato atual de resposta.

## Tarefas

- [ ] Atualizar `TIPO_CHOICES` e default no modelo.
- [ ] Confirmar validação do campo em `TipoSessaoCreateSerializer` e no serializer usado em update.
- [ ] Garantir resposta de erro para `primeira`, `urgencia`, `avulsa`, `pacote`, `retorno` e valores desconhecidos.
- [ ] Manter `TipoSessaoViewSet` limitado aos tipos do psicólogo autenticado.
- [ ] Atualizar seeds, signals, comandos e documentação de teste que criam categorias removidas.
- [ ] Não alterar relacionamentos, valores, durações ou regras de exclusão.

## Critérios de aceite

- [ ] POST e PUT/PATCH aceitam somente `presencial` e `online`.
- [ ] Requisições com categorias antigas retornam erro de validação sem gravar alterações parciais.
- [ ] O default do modelo é uma modalidade válida.
- [ ] A listagem e o endpoint de tipos ativos continuam respondendo no contrato existente.
- [ ] O isolamento por psicólogo permanece funcionando.

## Dependências

- Depende da Issue 01.
- Deve preceder a conclusão da Issue 03.
