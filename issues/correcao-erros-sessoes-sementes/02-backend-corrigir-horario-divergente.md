# Issue 02 — Backend: corrigir horário divergente (fuso horário em `.strftime()`)

**Fase:** 1 — Causa raiz
**Prioridade:** 🔴 Alta
**Arquivos principais:** `psicoapp_backend/sessoes/serializers.py`, `psicoapp_backend/sessoes/views.py`, `psicoapp_backend/sessoes/models.py`, `psicoapp_backend/sessoes/tasks.py`, `psicoapp_backend/authentication/views.py`, `psicoapp_backend/core/services.py`, `psicoapp_backend/notificacoes_push/tasks.py`
**Origem:** seções 2.3 e 3.3 de `SPEC_CORRECAO_ERROS_SESSOES_SEMENTES.md`

## Problema

`settings.py` tem `USE_TZ = True` e `TIME_ZONE = 'America/Sao_Paulo'`. Com `USE_TZ=True`, o Django mantém `Sessao.data_hora` internamente como datetime **timezone-aware em UTC**. Vários pontos do backend chamam `.strftime()` **diretamente** sobre esse valor, sem converter para o fuso local com `django.utils.timezone.localtime(...)` antes — o resultado é a hora em UTC (3h a menos que Brasília no horário padrão vigente), não a hora real da sessão.

Isso causa a divergência relatada pelo usuário (card "Próxima Sessão" mostrando hora diferente da lista de sessões abaixo, na tela `MinhasSessoes`) e o mesmo bug se repete silenciosamente em outras telas e em mensagens de notificação.

## Objetivo

Fazer toda formatação de `data_hora` no backend refletir o horário de Brasília, de forma consistente entre todos os pontos que exibem ou comunicam o horário de uma sessão.

## Escopo de implementação

Envolver com `timezone.localtime(...)` cada um dos pontos abaixo, antes do `.strftime(...)`:

1. **`psicoapp_backend/sessoes/serializers.py`** — `SessaoListSerializer.get_data_hora_formatada()` e `SessaoDetailSerializer.get_data_hora_formatada()`. Já importa `timezone`.
2. **`psicoapp_backend/authentication/views.py`** — `paciente_dashboard_view`, no campo `data_hora_formatada` de `proxima_data`. Já importa `timezone` localmente como `tz` dentro da função.
3. **`psicoapp_backend/core/services.py`** — `NotificationDomainService.emit_session_created()`. Este arquivo **ainda não importa** `timezone`; adicionar `from django.utils import timezone` no topo do arquivo.
4. **`psicoapp_backend/sessoes/views.py`** — action `cancelar` (mensagem "Sessão Cancelada"). Já importa `timezone`.
5. **`psicoapp_backend/sessoes/models.py`** — `Sessao.confirmar_pagamento()` (mensagem "Pagamento Confirmado"). Já importa `timezone`.
6. **`psicoapp_backend/sessoes/tasks.py`** — mensagem do lembrete de pagamento atrasado. Já importa `timezone`.
7. **`psicoapp_backend/notificacoes_push/tasks.py`** — `_build_reminder_message()` (lembretes push 24h/2h/15min). Já importa `timezone`.

**Não alterar:**
- `Sessao.__str__` (só aparece no Django Admin, fora do escopo do bug reportado);
- `RegistroOdisseia.__str__` e `RegistroOdisseia.data_hora_completa` (`engajamentos/models.py`) — usam `data_registro` (`DateField`) e `hora_registro` (`TimeField` ingênuo), não são datetime timezone-aware, não sofrem este bug;
- `core/signals.py:118` — mesmo caso, `data_registro` é `DateField`;
- comandos de seed (`popular_dados_completos.py`, `criar_sementes_exemplo.py`) — uso apenas em desenvolvimento;
- `USE_TZ`, `TIME_ZONE`, ou o formato ISO dos campos brutos (`data_hora`) consumidos pelo frontend.

## Tarefas

- [ ] Aplicar `timezone.localtime()` nos 7 pontos listados acima.
- [ ] Adicionar `from django.utils import timezone` em `core/services.py`.
- [ ] Escrever teste de serializer: criar uma sessão com `data_hora` explícita em UTC, comparar `data_hora_formatada` retornado pela API com `timezone.localtime(sessao.data_hora).strftime(...)` calculado manualmente no teste — devem ser idênticos, e diferentes do `strftime()` cru sobre o valor UTC.
- [ ] Escrever teste equivalente para o campo `data_hora_formatada` de `paciente_dashboard_view`.
- [ ] Escrever teste (ou verificação manual assistida por teste) de que as mensagens de notificação de "Sessão Agendada" e "Sessão Cancelada" contêm o horário local esperado, não o horário UTC.
- [ ] Rodar a suíte completa dos apps `sessoes`, `authentication`, `core` e `notificacoes_push` para confirmar ausência de regressão.

## Critérios de aceite

- ✅ `GET /sessoes/proxima/` e `GET /sessoes/{id}/` retornam `data_hora_formatada` em horário de Brasília, coincidindo com o horário derivado do campo bruto `data_hora` quando convertido no cliente.
- ✅ `GET /sessoes/` (listagem) tem a mesma correção.
- ✅ O dashboard do paciente (`paciente_dashboard_view`) retorna `data_hora_formatada` correto para `proxima_sessao`.
- ✅ A mensagem de notificação "Sessão Agendada" (inbox) contém o horário correto no momento da criação da sessão.
- ✅ A mensagem de notificação "Sessão Cancelada" contém o horário correto.
- ✅ A mensagem de "Pagamento Confirmado" contém a data correta.
- ✅ O lembrete de pagamento atrasado contém a data correta.
- ✅ Os lembretes push (24h/2h/15min) contêm o horário correto.
- ✅ Nenhum campo bruto (`data_hora` ISO) mudou de formato ou valor.
- ✅ `Sessao.__str__`, `RegistroOdisseia` e os comandos de seed permanecem inalterados.

## Dependências

- Nenhuma. Independente das demais issues deste backlog — fix mecânico, isolado por arquivo.
- Deve ser validada antes das issues 03/05 para não misturar, no teste manual do app, um horário incorreto com o novo status "faltou" sendo testado ao mesmo tempo.
