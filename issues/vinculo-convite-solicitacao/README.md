# Issues — Vínculo por Convite e Solicitação (Fase 1)

Data de geração: 2026-09-18
Origem: `SPEC_VINCULO_CONVITE_E_SOLICITACAO.md` (a verificação de CRP tem SPEC própria: `SPEC_VERIFICACAO_CRP.md`)
Escopo: adicionar o **convite do psicólogo** (link, QR e código curto) como caminho amigável de vínculo, transformar o caminho por **CRP** em solicitação sujeita a aceite, e permitir que o paciente **encerre** um vínculo. Inclui duas correções de segurança pré-requisito no fluxo de vínculo já existente. Status: **planejado — nenhuma linha implementada**.

> **A fase 1 não inclui a vitrine/busca aberta de profissionais** — ela depende do selo de verificação e de campos que não existem hoje (`Psicologo` não tem cidade/UF, e `specialization` é texto livre, não filtrável). SPEC própria, mais adiante.

## Estrutura

| Etapa | Issue | Foco | Prioridade |
|---|---|---|---|
| 1 | [01-backend-trancar-rotas-vinculo.md](01-backend-trancar-rotas-vinculo.md) | `VinculoViewSet` → `ReadOnlyModelViewSet` e `status` read-only. Fecha o furo que permitiria ao paciente auto-aprovar a própria solicitação. | 🔴 Alta |
| 2 | [02-backend-constraint-um-vinculo-ativo.md](02-backend-constraint-um-vinculo-ativo.md) | Constraint de um vínculo ativo **por paciente** + migração de saneamento dos duplicados existentes. | 🔴 Alta |
| 3 | [03-backend-modelos-vinculo-e-convite.md](03-backend-modelos-vinculo-e-convite.md) | Status `pendente`/`recusado`/`expirado`, `origem`, `ConviteVinculo`, `slug`, `codigo_convite`, campos de verificação. | 🔴 Alta |
| 4 | [04-backend-servico-encerramento-vinculo.md](04-backend-servico-encerramento-vinculo.md) | Serviço transacional de encerramento (sessões + prontuários + notificação) e endpoint do paciente. | 🔴 Alta |
| 5 | [05-backend-endpoints-convite.md](05-backend-endpoints-convite.md) | Geração, listagem, revogação, resolução e resgate de convites. | 🔴 Alta |
| 6 | [06-backend-solicitacao-crp-aceite-recusa.md](06-backend-solicitacao-crp-aceite-recusa.md) | CRP vira `pendente`; aceite, recusa, mensagem neutra e expiração em 5 dias. | 🔴 Alta |
| 7 | [07-app-servicos-vinculo-e-convite.md](07-app-servicos-vinculo-e-convite.md) | `conviteService` novo + ampliação de `vinculoService`. | 🔴 Alta |
| 8 | [08-app-psicologo-convidar-paciente.md](08-app-psicologo-convidar-paciente.md) | Tela de convite: link, QR, código, compartilhar, uso único. | 🔴 Alta |
| 9 | [09-app-psicologo-solicitacoes-pendentes.md](09-app-psicologo-solicitacoes-pendentes.md) | Aba "Solicitações" com badge, aceitar e recusar. | 🔴 Alta |
| 10 | [10-app-paciente-hub-e-confirmacao.md](10-app-paciente-hub-e-confirmacao.md) | `conexaoTerapeutica` vira hub; nova tela de confirmação de vínculo. | 🔴 Alta |
| 11 | [11-app-paciente-pendente-e-encerrar.md](11-app-paciente-pendente-e-encerrar.md) | Card de solicitação pendente + encerrar vínculo avulso. | 🟡 Média |
| 12 | [12-deep-link-e-landing-page.md](12-deep-link-e-landing-page.md) | `scheme`, App Links, landing page, rebuild EAS. **Opcional.** | 🟢 Baixa |
| 13 | [13-testes-regressao-e-deploy-e2e.md](13-testes-regressao-e-deploy-e2e.md) | Regressões de segurança, migração em produção e validação em dispositivo. | 🔴 Alta |

## Ordem recomendada

Backend primeiro, segurança antes de tudo:

1. [01](01-backend-trancar-rotas-vinculo.md) e [02](02-backend-constraint-um-vinculo-ativo.md) — os dois pré-requisitos, juntos.
2. [03](03-backend-modelos-vinculo-e-convite.md) — modelos e migrações.
3. [04](04-backend-servico-encerramento-vinculo.md) — serviço de encerramento (reutilizado por 05 e 06).
4. [05](05-backend-endpoints-convite.md) e [06](06-backend-solicitacao-crp-aceite-recusa.md) — os dois caminhos de entrada.
5. [07](07-app-servicos-vinculo-e-convite.md) — serviços do app.
6. [08](08-app-psicologo-convidar-paciente.md) e [09](09-app-psicologo-solicitacoes-pendentes.md) — telas do psicólogo (é ele quem precisa poder convidar antes de o paciente ter o que resgatar).
7. [10](10-app-paciente-hub-e-confirmacao.md) e [11](11-app-paciente-pendente-e-encerrar.md) — telas do paciente.
8. [13](13-testes-regressao-e-deploy-e2e.md) — fechamento.
9. [12](12-deep-link-e-landing-page.md) — depois, quando quiser. Não bloqueia lançamento.

## Dependências

- **01 e 02 vêm antes de tudo.** Sem 01, o paciente auto-aprova a própria solicitação pela rota genérica do DRF e o fluxo de aceite de 06 vira decorativo. Sem 02, a troca de profissional continua deixando o psicólogo anterior com acesso ao prontuário.
- **01–06 devem ir ao ar no mesmo ciclo de deploy.** Entre a aplicação do constraint (02) e a mudança do CRP (06) existe uma janela em que a troca por CRP falharia com `IntegrityError`. Não separar em deploys distantes.
- 03 depende de 01 e 02; 04 depende de 03; 05 e 06 dependem de 04.
- 07 depende de 05 e 06. As telas (08–11) dependem de 07 — **nenhuma tela chama `api` diretamente**.
- 09 depende de 08 (a entrada para a tela de convite sai de lá).
- 11 depende de 10. 12 depende de 10. 13 depende de todas, exceto 12.
- **04 é a única dona da lógica de encerramento.** 05 (troca por convite) e 06 (aceite com vínculo concorrente) a reutilizam — não duplicar.

## Regras que não podem regredir

- **Nenhum vínculo nasce `ativo` a partir de CRP.** O CRP é dado público (consultável no Cadastro Nacional do CFP e divulgado pelos próprios profissionais) — ele identifica, não autoriza. Só o convite autoriza sozinho, porque é o próprio profissional que o emite.
- **Nenhuma rota permite gravar `status` fora das actions dedicadas.** Se alguém reintroduzir `ModelViewSet` ou tirar `status` de `read_only_fields`, todo o fluxo de aceite volta a ser contornável.
- **Um vínculo ativo por paciente, garantido no banco** — não só na aplicação. O constraint é por `paciente`, não pelo par `paciente+psicologo`.
- **Encerramento é atômico**: status + sessões canceladas + prontuários apagados + notificação, tudo em uma transação. Falhou qualquer etapa, nada acontece.
- **Só o paciente dispara a exclusão de prontuários.** Nenhuma ação do psicólogo — incluindo `alterar-status` para `finalizado`, que é o desfecho normal de uma terapia concluída — apaga prontuário ou cancela sessões. Decisão confirmada pelo usuário em 2026-09-18 (seção 10 da SPEC).
- **A recusa é opaca para o paciente.** Recusa e expiração mostram exatamente a mesma mensagem: "Profissional indisponível para tratamento". Nunca "recusou" — não transformar a recusa em evento constrangedor nem em canal de insistência sobre o profissional.
- **O código curto é o caminho garantido.** A feature inteira precisa funcionar só com o código digitado. Deep link e landing page são conveniência — o app não tem `scheme` hoje e qualquer link exige rebuild nativo.
- **Nenhum selo de verificação aparece no app nesta fase** — nem "verificado" nem "não verificado". Badge de "não verificado" em todo mundo só gera desconfiança sem informar nada.
- **`resolver` de convite nunca expõe dado de paciente**, nem e-mail/telefone do profissional — só o que ele já divulga publicamente: nome, CRP, especialidade e biografia.
