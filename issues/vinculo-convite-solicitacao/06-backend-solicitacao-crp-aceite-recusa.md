# Issue 06 — Backend: CRP vira solicitação pendente, com aceite, recusa e expiração

**Fase:** 3 — Caminho do CRP
**Prioridade:** 🔴 Alta
**Arquivos principais:** `psicoapp_backend/authentication/views.py`, `psicoapp_backend/core/views.py`, `psicoapp_backend/notificacoes_push/tasks.py`, testes dos três apps
**Origem:** seções 3.8 e 3.9 de `SPEC_VINCULO_CONVITE_E_SOLICITACAO.md`

## Problema

`conecta_psicologo_view` (`authentication/views.py:203`) cria o vínculo **já ativo** a partir de um CRP e notifica o psicólogo depois do fato consumado. Como CRP é dado público (consultável no Cadastro Nacional do CFP e divulgado pelos próprios profissionais), qualquer pessoa que digite um CRP válido entra na lista de pacientes ativos daquele profissional, sem nenhum aceite.

## Objetivo

Transformar o caminho por CRP em uma **solicitação** que o psicólogo aceita ou recusa, preservando a tela e o endpoint que já existem.

## Escopo de implementação

### `conecta_psicologo_view` (`authentication/views.py`)

- Passa a criar o vínculo com `status='pendente'`, `origem='crp'`, `data_solicitacao=timezone.now()`.
- **Deixa de escrever em `paciente.psicologo`** — o FK legado só é atualizado quando o vínculo de fato se torna ativo.
- Solicitação `pendente` já existente para o mesmo par: `200` idempotente, sem duplicar.
- Existe `recusado` para esse par há menos de **30 dias**: responde com a mensagem neutra (abaixo), sem criar nova solicitação.
- A notificação ao psicólogo muda de "novo paciente conectado" para "nova solicitação de vínculo", roteando para a aba de pendentes de `VinculosPacientes`.

### Aceite e recusa (`core/views.py`)

- `POST /api/vinculos/{id}/aceitar/` — só psicólogo, só sobre `pendente` dele. Transição para `ativo` e atualização de `paciente.psicologo`. Se o paciente tiver adquirido outro vínculo ativo nesse meio-tempo, chama `encerrar_vinculo_por_paciente` (issue 04) na mesma transação. Notifica o paciente.
- `POST /api/vinculos/{id}/recusar/` — só psicólogo, só sobre `pendente` dele. Transição para `recusado`.

### Mensagem neutra

Recusa e expiração são **indistinguíveis** para o paciente. Em ambos os casos ele vê exatamente:

> **"Profissional indisponível para tratamento"**

Nunca "recusou". Decisão de produto: não transformar a recusa em evento constrangedor nem em canal de insistência sobre o profissional.

### Expiração (5 dias)

- Task periódica no worker existente (`notificacoes_push/tasks.py`): solicitações `pendente` com `data_solicitacao` anterior a 5 dias viram `expirado`.
- **Verificação defensiva na leitura**: uma solicitação vencida nunca aparece como pendente, mesmo que a task tenha falhado.
- Ao expirar, o paciente é notificado com a mensagem neutra; o psicólogo **não** é notificado.

## Tarefas

- [ ] Alterar `conecta_psicologo_view` para criar `pendente` e não tocar em `paciente.psicologo`.
- [ ] Idempotência de solicitação repetida + bloqueio de 30 dias após recusa.
- [ ] Actions `aceitar` e `recusar`.
- [ ] Endpoint/filtro de solicitações pendentes para o psicólogo (consumido pela issue 09), com a verificação defensiva de expiração.
- [ ] Task periódica de expiração.
- [ ] Teste: CRP cria `pendente`; o vínculo não fica ativo e `paciente.psicologo` não muda.
- [ ] Teste: aceite ativa o vínculo, atualiza `paciente.psicologo` e notifica o paciente.
- [ ] Teste: recusa e expiração produzem **exatamente a mesma mensagem** para o paciente.
- [ ] Teste: solicitação com mais de 5 dias não aparece como pendente mesmo sem a task ter rodado.
- [ ] Teste: nova solicitação após recusa recente (< 30 dias) não é criada.
- [ ] Teste: psicólogo não aceita nem recusa solicitação de outro psicólogo (`403`).
- [ ] Teste: aceitar solicitação de paciente que já arrumou outro vínculo executa o encerramento da issue 04.
- [ ] Teste de regressão: `PATCH` genérico continua não permitindo que o paciente mude o próprio `pendente` para `ativo` (issue 01).

## Critérios de aceite

- ✅ Nenhum vínculo nasce ativo a partir de CRP.
- ✅ O paciente nunca consegue distinguir recusa de expiração.
- ✅ Suíte completa passa localmente.

## Dependências

Depende das issues 01, 03 e 04. **Deve ir ao ar no mesmo ciclo da issue 02** — ver a nota de deploy naquela issue.
