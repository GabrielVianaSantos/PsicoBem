# Issue 04 — Backend: serviço de encerramento de vínculo + endpoint do paciente

**Fase:** 2 — Fundação de comportamento
**Prioridade:** 🔴 Alta
**Arquivos principais:** `psicoapp_backend/core/services.py`, `psicoapp_backend/core/views.py`, `psicoapp_backend/core/tests.py`
**Origem:** seção 3.10 e nota de decisão de `SPEC_VINCULO_CONVITE_E_SOLICITACAO.md`

## Problema

O encerramento de vínculo iniciado pelo paciente acontece em três pontos de entrada diferentes (encerramento avulso, troca por convite aceito, e aceite de solicitação quando o paciente já adquiriu outro vínculo). O efeito precisa ser idêntico e atômico nos três — portanto precisa ser **um serviço só**, não lógica duplicada nas views.

Além disso, o paciente hoje não tem nenhuma forma de encerrar um vínculo: `alterar-status` é explicitamente bloqueado para ele, e `meuPsicologo.js` só oferece "Conectar outro profissional".

## Objetivo

Um serviço transacional de encerramento, e o endpoint que o expõe ao paciente.

## Escopo de implementação

### Serviço (`core/services.py`)

`encerrar_vinculo_por_paciente(vinculo, *, novo_psicologo=None)`, dentro de uma única `transaction.atomic()`:

1. `vinculo.status = 'finalizado'`, `data_fim_tratamento = date.today()`.
2. `paciente.psicologo` limpo (ou apontado para `novo_psicologo`, no caso de troca).
3. **Sessões futuras canceladas**: `data_hora > agora` e `status='agendada'` daquele par → `status='cancelada'`, `cancelado_por='paciente'`, `motivo_cancelamento` indicando encerramento de vínculo. **`cancelamento_tardio` permanece `False`** — não é cancelamento de sessão avulsa e a política de cancelamento tardio não se aplica.
4. **Prontuários daquele par paciente-psicólogo são apagados.**
5. Notificação ao psicólogo via `NotificationDomainService.emit` (push + in-app já saem juntos): o paciente optou por encerrar o tratamento. A mensagem **não** diferencia "encerrou" de "trocou de profissional".

> **Regra que não pode regredir:** este serviço é chamado **exclusivamente** a partir de ações iniciadas pelo paciente. A action `alterar-status` do psicólogo — inclusive para `finalizado` — **não** o chama e **não** apaga prontuário nenhum. Decisão confirmada pelo usuário em 2026-09-18 (seção 10 da SPEC).

### Endpoint (`core/views.py`)

- `POST /api/vinculos/{id}/encerrar/` — action no `VinculoViewSet`.
- Só paciente, só sobre vínculo `ativo` **dele** (`403` caso contrário).
- Exige `confirmar: true` no corpo; sem isso, `400` com o resumo do que será perdido (quantidade de sessões futuras e de prontuários).

## Tarefas

- [ ] Implementar `encerrar_vinculo_por_paciente` com a transação completa.
- [ ] Implementar a action `encerrar`.
- [ ] Teste: encerramento finaliza o vínculo, limpa `paciente.psicologo`, cancela as sessões futuras com `cancelado_por='paciente'` e apaga os prontuários daquele par.
- [ ] Teste: sessões **passadas** e sessões já `cancelada`/`realizada` não são tocadas.
- [ ] Teste: prontuários de **outros** pares (mesmo paciente com outro psicólogo, ou mesmo psicólogo com outro paciente) não são afetados.
- [ ] Teste: `cancelamento_tardio` continua `False` nas sessões canceladas por encerramento.
- [ ] Teste: notificação é emitida para o psicólogo.
- [ ] Teste de atomicidade: falha simulada na etapa 4 faz rollback de tudo (vínculo continua ativo, sessões continuam agendadas).
- [ ] Teste: psicólogo chamando `alterar-status` para `finalizado` **não** apaga prontuário e **não** cancela sessões (regressão da regra acima).
- [ ] Teste: paciente tentando encerrar vínculo de outro paciente recebe `403`.
- [ ] Teste: sem `confirmar: true`, responde `400` e nada é alterado.

## Critérios de aceite

- ✅ O encerramento é tudo-ou-nada.
- ✅ Nenhum caminho iniciado pelo psicólogo apaga prontuário.
- ✅ Suíte completa passa localmente.

## Dependências

Depende da issue 03 (status e campos novos). É dependência das issues 05 e 06, que reutilizam este serviço — **não duplicar a lógica lá**.
