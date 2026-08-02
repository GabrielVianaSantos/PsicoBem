# Issue 01 — Definir contrato canônico de roteamento no backend

**Fase:** 1 — Contrato e payload  
**Prioridade:** 🔴 Alta  
**Origem:** [SPEC_ROTEAMENTO_NOTIFICACOES.md](/Users/user/Documents/GitHub/PsicoBem/SPEC_ROTEAMENTO_NOTIFICACOES.md)  
**Arquivos principais:** `psicoapp_backend/core/services.py`, `psicoapp_backend/core/serializers.py`, `psicoapp_backend/notificacoes_push/tasks.py`

## Problema e objetivo

As notificações já carregam dados de rota, mas sem um contrato uniforme. O push e a inbox precisam receber a mesma tela, evento, entidade e parâmetros canônicos.

## Escopo de implementação

Centralizar a construção da rota em `NotificationDomainService`, preservar `dados_extras` na API e copiar o contrato completo para `data` do payload Expo. Definir fallback para notificações sem rota.

## Tarefas

- [ ] Padronizar `screen`, `params`, `event`, `entity_type` e `entity_id`.
- [ ] Padronizar parâmetros `sessaoId`, `registroId`, `prontuarioId`, `sementeId` e `pacienteId`.
- [ ] Garantir que o serializer da inbox retorne `dados_extras` completo.
- [ ] Fazer `_build_push_payload()` transportar o mesmo contrato sem perder `notification_id`.
- [ ] Definir comportamento para `dados_extras` nulo, vazio ou legado.
- [ ] Manter `link_relacionado` apenas como metadado/fallback, sem fazer o app interpretar texto.

## Critérios de aceite

- [ ] Uma notificação criada pelo backend e seu push correspondente possuem a mesma rota e parâmetros.
- [ ] Sessões usam `params.sessaoId`, nunca apenas `params.id`.
- [ ] Eventos genéricos continuam distinguíveis pelo campo `event`.
- [ ] Payload sem rota não causa erro no worker e resulta em fallback `Notificacoes`.

## Dependências

- Nenhuma dependência de implementação.
- Deve ser concluída antes das Issues 02 e 03.
