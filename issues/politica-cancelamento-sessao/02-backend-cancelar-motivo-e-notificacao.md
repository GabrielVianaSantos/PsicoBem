# Issue 02 — Backend: cancelar() com motivo obrigatório/opcional e notificação enriquecida

**Fase:** 2 — Regra de negócio
**Prioridade:** 🔴 Alta
**Arquivos principais:** `psicoapp_backend/sessoes/views.py`
**Origem:** seções 3.3 e 3.4 de `SPEC_POLITICA_CANCELAMENTO_SESSAO.md`

## Problema

Com a issue 01, os campos e o cálculo existem, mas `cancelar()` ainda não os usa — o endpoint não sabe classificar o cancelamento nem aceitar um motivo.

## Objetivo

Persistir quem cancelou, se foi tardio e o motivo (quando houver), com a regra de obrigatoriedade assimétrica definida na SPEC.

## Escopo de implementação

Em `SessaoViewSet.cancelar()` (`sessoes/views.py`):

1. Aceitar corpo opcional `{ "motivo": "..." }` no `POST`.
2. Calcular `cancelamento_tardio` a partir de `sessao.cancelamento_seria_tardio` (issue 01), no momento da chamada.
3. Determinar `cancelado_por` a partir de quem faz a chamada — reaproveitar a checagem `hasattr(request.user, 'psicologo_profile')` já usada logo abaixo para decidir a quem notificar.
4. **Validação condicional:** se `cancelado_por == 'psicologo'` e `cancelamento_tardio` é `True` e `motivo` (após `.strip()`) está vazio → `400` com mensagem clara ("Informe o motivo do cancelamento tardio."). Em qualquer outro caso (paciente, ou psicólogo dentro do prazo), `motivo` é opcional.
5. Persistir os três campos junto da mudança de `status`/`status_pagamento` já existente (mesmo `save()`).
6. Notificação para a outra parte: quando houver `motivo`, incluir na mensagem (ex.: acrescentar `" Motivo: {motivo}"` ao final da mensagem já existente). Sem alterar `_routing_payload`.

### O que NÃO alterar

- `pode_ser_cancelada()` e a regra de elegibilidade para cancelar.
- A regra já existente de `status_pagamento` virar `'cancelado'` (issue anterior, já em produção).
- O `_routing_payload` da notificação (`screen="DetalhesSessao"`, `params={"sessaoId": ...}`).

## Tarefas

- [ ] Aceitar `motivo` no corpo da requisição.
- [ ] Calcular `cancelamento_tardio` e `cancelado_por` no momento da chamada.
- [ ] Implementar a validação condicional de motivo obrigatório (psicólogo + tardio).
- [ ] Persistir os três campos.
- [ ] Enriquecer a mensagem de notificação com o motivo, quando houver.
- [ ] Testes: cancelamento dentro do prazo (paciente e psicólogo) não marca tardio e não exige motivo; cancelamento tardio de paciente sem motivo é aceito (campo fica vazio); cancelamento tardio de psicólogo sem motivo retorna 400; cancelamento tardio de psicólogo com motivo é aceito e persistido; mensagem de notificação inclui o motivo quando presente; regra de `status_pagamento='cancelado'` continua funcionando idêntica.

## Critérios de aceite

- ✅ Cancelar com ≥24h de antecedência funciona exatamente como hoje, só com `cancelado_por` preenchido a mais.
- ✅ Psicólogo cancelando com <24h sem motivo recebe 400 com mensagem clara; com motivo, sessão é cancelada normalmente.
- ✅ Paciente cancelando com <24h nunca é bloqueado, com ou sem motivo.
- ✅ A outra parte recebe notificação com o motivo incluído, quando houver.
- ✅ Nenhuma mudança na regra de `status_pagamento` já existente.

## Dependências

- Depende da issue 01.
- É pré-requisito da issue 03 (o app precisa do endpoint já aceitando `motivo` antes de construir a confirmação).
