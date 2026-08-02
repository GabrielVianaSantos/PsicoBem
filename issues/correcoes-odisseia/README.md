# Issues — Correções na Odisséia (`SPEC_CORRECOES_ODISSEIA.md`)

Data de geração: 2026-07-23  
Origem: `SPEC_CORRECOES_ODISSEIA.md`  
Escopo: detalhamento do backlog para corrigir a visão de Odisséia do psicólogo e melhorar a clareza dos cards. Nenhuma alteração de código foi aplicada nesta entrega.

## Estrutura

| Etapa | Issue | Foco | Prioridade |
|---|---|---|---|
| 1 | `01-reforcar-autorizacao-api.md` | Impedir qualquer escrita do psicólogo pela API e cobrir a regra com testes. | 🔴 Alta |
| 2 | `02-modo-leitura-psicologo.md` | Remover o fluxo de criação da interface do psicólogo. | 🔴 Alta |
| 3 | `03-identificar-paciente-nos-cards.md` | Exibir o paciente autor em cada registro visto pelo psicólogo. | 🟡 Média |
| 4 | `04-niveis-emocionais-legiveis.md` | Exibir os níveis emocionais por extenso, mantendo os chips compactos. | 🟡 Média |

## Ordem recomendada

1. [01-reforcar-autorizacao-api.md](01-reforcar-autorizacao-api.md)
2. [02-modo-leitura-psicologo.md](02-modo-leitura-psicologo.md)
3. [03-identificar-paciente-nos-cards.md](03-identificar-paciente-nos-cards.md)
4. [04-niveis-emocionais-legiveis.md](04-niveis-emocionais-legiveis.md)

## Dependências

- A issue 01 é obrigatória antes das demais: a interface não deve ser a única barreira para impedir escrita indevida.
- As issues 02 e 03 podem ser implementadas após a issue 01 e usam a mesma tela de listagem.
- A issue 04 é independente da autorização, mas deve ser validada junto da issue 02 para cobrir os cards nos dois perfis.

## Regras que não podem regredir

- Pacientes continuam registrando e consultando apenas os próprios registros.
- Psicólogos consultam somente registros compartilhados por pacientes com vínculo ativo.
- O filtro de autorização permanece no backend; a interface apenas reflete a permissão concedida.
