# Issues — Política de Cancelamento Tardio de Sessão

Data de geração: 2026-09-18
Origem: `SPEC_POLITICA_CANCELAMENTO_SESSAO.md`
Escopo: registrar e avisar quando uma sessão é cancelada com menos de 24h de antecedência, sem nenhuma cobrança automática (não há gateway de pagamento). Remarcação está explicitamente fora de escopo. Nenhuma alteração foi aplicada nesta entrega.

## Estrutura

| Etapa | Issue | Foco | Prioridade |
|---|---|---|---|
| 1 | `01-backend-campos-e-janela.md` | Campos novos em `Sessao`, migration, `cancelamento_seria_tardio`. | 🔴 Alta |
| 2 | `02-backend-cancelar-motivo-e-notificacao.md` | `cancelar()` com motivo obrigatório/opcional e notificação enriquecida. | 🔴 Alta |
| 3 | `03-app-aviso-previo-e-motivo.md` | Aviso diferenciado + campo de motivo na confirmação de cancelar. | 🔴 Alta |
| 4 | `04-app-exibicao-cancelamento-tardio.md` | Seção de exibição do cancelamento tardio/motivo em Detalhes da Sessão. | 🟡 Média |
| 5 | `05-deploy-e-validacao-e2e.md` | Deploy e validação ponta a ponta. | 🟡 Média |

## Ordem recomendada

1. [01-backend-campos-e-janela.md](01-backend-campos-e-janela.md)
2. [02-backend-cancelar-motivo-e-notificacao.md](02-backend-cancelar-motivo-e-notificacao.md)
3. [03-app-aviso-previo-e-motivo.md](03-app-aviso-previo-e-motivo.md)
4. [04-app-exibicao-cancelamento-tardio.md](04-app-exibicao-cancelamento-tardio.md)
5. [05-deploy-e-validacao-e2e.md](05-deploy-e-validacao-e2e.md)

## Dependências

- A issue 01 é a base: 02, 03 e 04 dependem dela.
- A issue 02 depende de 01; é pré-requisito da issue 03 (o app precisa do endpoint aceitando `motivo` antes de construir a confirmação).
- A issue 04 depende de 01 (campos expostos no serializer) e é independente de 03 — podem ser feitas em paralelo.
- A issue 05 é a última.

## Regras que não podem regredir

- **Cancelar nunca é bloqueado pela janela de 24h** — a política é de registro e aviso, nunca de impedimento.
- **Nenhuma cobrança automática em nenhum cenário** — o app não tem gateway de pagamento; qualquer "taxa" é decisão humana do psicólogo, fora do app.
- A regra já existente de `status_pagamento` virar `'cancelado'` ao cancelar (a menos que já `'pago'`) continua exatamente igual — esta política é ortogonal a ela.
- `pode_ser_cancelada()` e a janela de quem pode cancelar (`IsPacienteOrPsicologoOwner`) não mudam.
- Motivo é **opcional** para paciente e **obrigatório** para psicólogo, e só nos dois casos quando o cancelamento é tardio — fora da janela tardia, motivo nunca é exigido de ninguém.
- Os campos novos (`cancelado_por`, `cancelamento_tardio`, `motivo_cancelamento`) só valem para cancelamentos feitos a partir desta feature — sessões já canceladas antes ficam com os três campos vazios, sem backfill.
- Visibilidade dos campos novos é restrita aos participantes da própria sessão — mesma regra de autorização já usada para `sala_url`/`psicologo_contato_alternativo`.
- Remarcação não faz parte deste backlog — não criar nenhum endpoint ou tela de remarcação aqui.
