# Issues — Badges de Novidade, Correção de Visualizações e Alertas Customizados

Data de geração: 2026-09-13
Origem: `SPEC_BADGES_NOVIDADES_E_ALERTAS_CUSTOMIZADOS.md`
Escopo: três frentes independentes — indicador visual de "algo novo" nos cards de menu das Home, correção da contagem de visualizações de Sementes do Cuidado, e substituição do `Alert.alert` nativo por um componente com identidade visual do PsicoBem.

## Estrutura

| Etapa | Issue | Foco | Prioridade |
|---|---|---|---|
| 1 | `01-backend-corrigir-bug-visualizacoes.md` | Corrigir `marcar_como_curtida()`: `total_visualizacoes` nunca incrementa. | 🔴 Alta |
| 2 | `02-backend-resumo-e-marcar-categoria.md` | Endpoints `resumo-por-categoria` e `marcar-categoria-lida`. | 🔴 Alta |
| 3 | `03-app-componente-custom-alert.md` | Criar `CustomAlert.js` com a mesma assinatura de `Alert.alert`. | 🟡 Média |
| 4 | `04-app-migrar-telas-para-custom-alert.md` | Trocar o import de `Alert` nos 19 arquivos que hoje usam o nativo. | 🟡 Média |
| 5 | `05-app-badges-nas-home.md` | Badges nos cards de menu das duas Home + limpar badge ao focar a tela de destino. | 🔴 Alta |
| 6 | `06-app-wireup-visualizar-semente.md` | Chamar `visualizarSemente()` de fato em `sementesPaciente.js`. | 🔴 Alta |
| 7 | `07-testes-regressao-e2e.md` | Validação ponta a ponta dos três itens e regressão geral. | 🟡 Média |

## Ordem recomendada

1. [01-backend-corrigir-bug-visualizacoes.md](01-backend-corrigir-bug-visualizacoes.md)
2. [02-backend-resumo-e-marcar-categoria.md](02-backend-resumo-e-marcar-categoria.md)
3. [03-app-componente-custom-alert.md](03-app-componente-custom-alert.md)
4. [04-app-migrar-telas-para-custom-alert.md](04-app-migrar-telas-para-custom-alert.md)
5. [05-app-badges-nas-home.md](05-app-badges-nas-home.md)
6. [06-app-wireup-visualizar-semente.md](06-app-wireup-visualizar-semente.md)
7. [07-testes-regressao-e2e.md](07-testes-regressao-e2e.md)

## Dependências

- As issues 01 e 02 são de backend, independentes entre si e das demais — podem ser feitas em qualquer ordem entre elas.
- A issue 03 é pré-requisito da 04 (o componente precisa existir antes de qualquer tela importar dele).
- A issue 05 depende da 02 (endpoints precisam existir) — pode ser feita em paralelo com 03/04.
- A issue 06 depende da issue 01 do backlog anterior (`SPEC_CORRECAO_ERROS_SESSOES_SEMENTES.md`, campo `ja_visualizada` no serializer) já entregue — sem dependência nova aqui.
- A issue 07 é a última: valida os três itens juntos e a ausência de regressão.

## Regras que não podem regredir

- O sininho de notificações e a tela de Notificações continuam funcionando exatamente como hoje (contagem geral, marcar individual, "ler todas").
- Nenhuma notificação fora das categorias Sementes/Sessões/Odisseia passa a acender badge algum.
- `sessao_lembrete` nunca acende o badge de Sessões.
- `total_curtidas` de sementes continua contando exatamente como corrigido em `SPEC_CORRECAO_ERROS_SESSOES_SEMENTES.md` — nenhuma segunda curtida do mesmo paciente incrementa de novo.
- Nenhuma chamada de `Alert.alert`/`Alert.prompt` nativo permanece em `src/` ao final da issue 04.
- Nenhum fluxo que dependia do `onPress` de um botão de alerta (confirmação, exclusão, navegação pós-sucesso) muda de comportamento.
- `git diff --check` sem apontamentos em cada issue.
