# Issues — Correção de Erros: Falta em Sessão, Edição de Sementes e Horário Divergente

Data de geração: 2026-09-12
Origem: `SPEC_CORRECAO_ERROS_SESSOES_SEMENTES.md`
Escopo: três correções independentes — status "faltou" para sessões, edição/exclusão de Sementes do Cuidado (com fechamento de um gap de permissão na API), e correção sistêmica do horário exibido para sessões (bug de fuso horário no backend). Nenhuma alteração em fluxo de autenticação.

## Estrutura

| Etapa | Issue | Foco | Prioridade |
|---|---|---|---|
| 1 | `01-backend-permissao-sementes-cuidado.md` | Segurança: restringir `update`/`destroy` de Sementes do Cuidado ao psicólogo dono. | 🔴 Alta |
| 2 | `02-backend-corrigir-horario-divergente.md` | Causa raiz: aplicar `timezone.localtime()` em todos os pontos que formatam `data_hora` diretamente. | 🔴 Alta |
| 3 | `03-backend-marcar-sessao-nao-realizada.md` | Novo endpoint para o psicólogo marcar sessão como "Paciente Faltou". | 🔴 Alta |
| 4 | `04-app-editar-excluir-sementes-cuidado.md` | Interface do psicólogo para editar e excluir sementes. | 🟡 Média |
| 5 | `05-app-marcar-sessao-nao-realizada.md` | Botão "Marcar como Não Realizada" em `DetalhesSessao` e novo status/filtro em `MinhasSessoes`. | 🟡 Média |
| 6 | `06-testes-regressao-e2e.md` | Validação ponta a ponta dos três fluxos e regressão geral. | 🟡 Média |

## Ordem recomendada

1. [01-backend-permissao-sementes-cuidado.md](01-backend-permissao-sementes-cuidado.md)
2. [02-backend-corrigir-horario-divergente.md](02-backend-corrigir-horario-divergente.md)
3. [03-backend-marcar-sessao-nao-realizada.md](03-backend-marcar-sessao-nao-realizada.md)
4. [04-app-editar-excluir-sementes-cuidado.md](04-app-editar-excluir-sementes-cuidado.md)
5. [05-app-marcar-sessao-nao-realizada.md](05-app-marcar-sessao-nao-realizada.md)
6. [06-testes-regressao-e2e.md](06-testes-regressao-e2e.md)

## Dependências

- A issue 01 é independente e deve vir primeiro: corrige uma falha de autorização real na API, sem relação com as outras duas correções.
- A issue 02 é independente das demais: fix mecânico e de baixo risco, mas colocado antes das issues 03/05 para não misturar validação de horário com validação do novo status na mesma rodada de testes manuais.
- A issue 03 é pré-requisito da issue 05 (o app só pode chamar um endpoint que já existe).
- A issue 04 depende da 01 (a UI de edição não deve ser publicada com o gap de permissão ainda aberto no backend).
- A issue 05 depende da 03.
- A issue 06 é a última: valida os três fluxos completos e a ausência de regressão.
- As issues 01, 02, 03 podem ser feitas em qualquer ordem entre si (todas de backend, sem dependência técnica real); a ordem acima é só a recomendada.

## Regras que não podem regredir

- Nenhuma alteração em fluxo de autenticação, login ou cadastro.
- `pode_ser_cancelada()`, `pode_ser_remarcada()` e `pode_ser_realizada()` continuam com as mesmas regras de elegibilidade.
- `status_pagamento` não é alterado automaticamente ao marcar uma sessão como `faltou` — decisão manual do psicólogo, como já ocorre ao cancelar.
- A visão do paciente em Sementes do Cuidado (`sementesPaciente.js`) permanece somente leitura + curtir/visualizar, sem nenhuma mudança visual ou funcional.
- Um psicólogo continua sem acesso a sementes de outro psicólogo (`get_queryset()` já garante isso e não muda).
- Nenhum campo bruto (`data_hora` ISO) muda de formato — a correção de horário afeta apenas os campos `_formatado` e as mensagens de notificação, nunca o valor cru consumido pelo app.
- `USE_TZ`, `TIME_ZONE` e os campos `DateField`/`TimeField` não timezone-aware (`data_registro`, `hora_registro`) não são alterados.
- `git diff --check` sem apontamentos em cada issue.
