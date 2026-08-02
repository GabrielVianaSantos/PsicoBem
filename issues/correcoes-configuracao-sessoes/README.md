# Issues — Correções na Configuração de Sessões

Data de geração: 2026-07-30  
Origem: [SPEC_CORRECOES_CONFIGURACAO_SESSOES.md](/Users/user/Documents/GitHub/PsicoBem/SPEC_CORRECOES_CONFIGURACAO_SESSOES.md)  
Escopo: normalização das modalidades de tipos de sessão e correção de legibilidade do formulário. Nenhuma alteração de código foi aplicada nesta entrega.

## Etapas

| Etapa | Issue | Foco | Prioridade |
|---|---|---|---|
| 1 | `01-normalizar-modalidades-legadas.md` | Migrar categorias antigas sem remover tipos ou sessões existentes. | 🔴 Alta |
| 2 | `02-restringir-contrato-backend.md` | Restringir choices, serializers, seeds e endpoints a Presencial/Online. | 🔴 Alta |
| 3 | `03-corrigir-formulario-modalidades.md` | Tornar labels legíveis e limitar o seletor no app. | 🟡 Média |
| 4 | `04-validar-fluxos-e-regressao.md` | Cobrir API, migração, cadastro, listagem e agendamento. | 🟡 Média |

## Ordem recomendada

1. [01-normalizar-modalidades-legadas.md](01-normalizar-modalidades-legadas.md)
2. [02-restringir-contrato-backend.md](02-restringir-contrato-backend.md)
3. [03-corrigir-formulario-modalidades.md](03-corrigir-formulario-modalidades.md)
4. [04-validar-fluxos-e-regressao.md](04-validar-fluxos-e-regressao.md)

## Dependências e regras que não podem regredir

- A issue 01 deve preceder a restrição definitiva do campo no modelo; nenhuma categoria legada pode permanecer após a migration.
- A issue 02 é obrigatória antes de considerar a mudança do frontend concluída: esconder opções no picker não substitui validação da API.
- Tipos existentes, nomes, valores, durações, descrições, status e vínculos com sessões devem ser preservados.
- A conversão definida pelo produto é: `presencial` permanece `presencial`; qualquer outra categoria legada vira `online`.
- O seletor e o contrato aceitam somente `presencial` e `online`.
