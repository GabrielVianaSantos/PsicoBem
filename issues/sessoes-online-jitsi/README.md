# Issues — Sessões Online com Jitsi, Lembrete de Entrada e Agenda do Dispositivo

Data de geração: 2026-09-14
Origem: `SPEC_SESSOES_ONLINE_JITSI.md`
Escopo: sala de videoconferência própria para sessões online, lembrete push com ação de entrar, evento na agenda do dispositivo e confirmação pós-sessão. Sem OAuth, sem API de terceiros, sem provedor de e-mail. Nenhuma alteração foi aplicada nesta entrega.

## Estrutura

| Etapa | Issue | Foco | Prioridade |
|---|---|---|---|
| 1 | `01-backend-sala-e-configuracao.md` | Campo `sala_uuid`, migration, `JITSI_BASE_URL`, geração e regeneração. | 🔴 Alta |
| 2 | `02-backend-exposicao-e-autorizacao.md` | `sala_url` / `pode_entrar_sala` no serializer, janela de entrada, restrição a participantes. | 🔴 Alta |
| 3 | `03-backend-mensagem-lembrete-online.md` | Mensagem do `lembrete_15m` diferenciada para sessão online. | 🔴 Alta |
| 4 | `04-app-botao-entrar-na-sessao.md` | Botão "Entrar na sessão" em `DetalhesSessao`. **Fecha a Parte A.** | 🔴 Alta |
| 5 | `05-backend-confirmacao-pos-sessao.md` | Tarefa `dispatch_post_session_confirmations` e agendamento no beat. | 🟡 Média |
| 6 | `06-app-agenda-do-dispositivo.md` | `expo-calendar`, permissão, sincronização. **Parte B.** Exige rebuild EAS. | 🟡 Média |
| 7 | `07-ics-opcional.md` | Endpoint `.ics` e compartilhamento. **Parte C — opcional.** | 🟢 Baixa |
| 8 | `08-deploy-e-validacao-e2e.md` | Deploy e validação ponta a ponta no dispositivo. | 🟡 Média |

## Ordem recomendada

1. [01-backend-sala-e-configuracao.md](01-backend-sala-e-configuracao.md)
2. [02-backend-exposicao-e-autorizacao.md](02-backend-exposicao-e-autorizacao.md)
3. [03-backend-mensagem-lembrete-online.md](03-backend-mensagem-lembrete-online.md)
4. [04-app-botao-entrar-na-sessao.md](04-app-botao-entrar-na-sessao.md)
5. [05-backend-confirmacao-pos-sessao.md](05-backend-confirmacao-pos-sessao.md)
6. [06-app-agenda-do-dispositivo.md](06-app-agenda-do-dispositivo.md)
7. [07-ics-opcional.md](07-ics-opcional.md)
8. [08-deploy-e-validacao-e2e.md](08-deploy-e-validacao-e2e.md)

## Dependências

- A issue 01 é a base: 02, 03 e 05 dependem dela.
- A issue 04 depende de 02 e 03 — e **conclui sozinha o mecanismo principal (Parte A)**, de ponta a ponta.
- A issue 05 depende apenas de 01 e é independente da Parte A; pode ser feita em paralelo com 03 e 04.
- As issues 06 e 07 dependem de 02 e são incrementos de conveniência.
- A issue 08 é a última.

As issues 01, 02, 03 e 05 são exclusivamente de backend e podem ser deployadas isoladamente: com `JITSI_ENABLED=False`, nada muda para o usuário final.

## Regras que não podem regredir

- **O link da sala nunca trafega em notificação push** — nem no corpo (aparece na tela de bloqueio) nem no `data` (transita por servidores da Expo e do FCM/APNs). O push carrega apenas `screen` e `params.sessaoId`.
- **`sala_url` só é retornada ao paciente e ao psicólogo daquela sessão.** Nenhum outro usuário, em nenhum endpoint.
- **`sala_uuid` nunca é exposto em resposta de API** — apenas a URL derivada dele.
- **Nenhum desfecho de sessão é marcado automaticamente.** Marcar `realizada` implica cobrança (`Sessao.valor`, `status_pagamento`) e é decisão do psicólogo.
- **O título do evento de agenda não identifica participante nem natureza clínica** — ele sincroniza para a conta Google do aparelho no Android.
- **Nada é gravado**: nenhum áudio, vídeo ou transcrição.
- Sessões `presencial` não ganham sala nem qualquer interface relacionada.
- Os lembretes de 24h e 2h, a cadência do beat e o modelo `ReminderDispatch` permanecem funcionando como hoje.
- Nenhuma regra de autorização existente é alterada.
