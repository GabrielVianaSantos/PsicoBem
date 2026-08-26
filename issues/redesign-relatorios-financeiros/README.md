# Issues — Redesign da Tela de Relatórios Financeiros (`SPEC_REDESIGN_RELATORIOS_FINANCEIROS.md`)

Data de geração: 2026-08-09  
Origem: `SPEC_REDESIGN_RELATORIOS_FINANCEIROS.md`  
Escopo: detalhamento do backlog para redesenhar `src/screens/relatorios.js` na linguagem visual de `src/screens/home.js`, preservando integralmente os cinco indicadores existentes. Nenhuma alteração de código foi aplicada nesta entrega.

Este backlog é **exclusivamente de apresentação**. Nenhuma issue altera arquivos de backend, o contrato de `GET /api/sessoes/estatisticas/` ou as regras de cálculo das métricas.

## Estrutura

| Etapa | Issue | Foco | Prioridade |
|---|---|---|---|
| 1 | `01-fundacao-de-estilos.md` | Criar o vocabulário de estilos espelhado de `home.js`, consumido por todas as demais issues. | 🔴 Alta |
| 2 | `02-cabecalho-e-periodo.md` | Topo compacto, título, mês de referência por extenso e divisor. | 🔴 Alta |
| 3 | `03-secao-resumo-financeiro.md` | Lucros recebidos como card de destaque e pagamentos pendentes como card secundário. | 🔴 Alta |
| 4 | `04-secao-fluxo-de-sessoes.md` | Total do mês como destaque e grid de realizadas e canceladas. | 🔴 Alta |
| 5 | `05-estados-carregamento-erro-refresh.md` | Carregamento inline, bloco de erro e refresh na cor do app. | 🟡 Média |
| 6 | `06-limpeza-e-paridade-visual.md` | Remover estilos órfãos e validar paridade dos valores com a tela anterior. | 🟡 Média |

## Ordem recomendada

1. [01-fundacao-de-estilos.md](01-fundacao-de-estilos.md)
2. [02-cabecalho-e-periodo.md](02-cabecalho-e-periodo.md)
3. [03-secao-resumo-financeiro.md](03-secao-resumo-financeiro.md)
4. [04-secao-fluxo-de-sessoes.md](04-secao-fluxo-de-sessoes.md)
5. [05-estados-carregamento-erro-refresh.md](05-estados-carregamento-erro-refresh.md)
6. [06-limpeza-e-paridade-visual.md](06-limpeza-e-paridade-visual.md)

### Ajuste em relação à seção 10 da SPEC

A SPEC sugere iniciar pelo cabeçalho e introduzir os estilos em seguida. Na decomposição, a fundação de estilos foi antecipada para a issue 01 porque as issues 02 a 05 consomem esse mesmo vocabulário; implementá-la depois obrigaria a retrabalhar o cabeçalho. O restante da ordem é preservado.

## Dependências

- A issue 01 é pré-requisito de todas as demais: ela define os nomes e valores de estilo que as outras issues apenas consomem.
- As issues 03 e 04 são independentes entre si e podem ser feitas em paralelo depois da 02.
- A issue 05 depende de 03 e 04, pois substitui o retorno antecipado de carregamento pela renderização condicional das seções já construídas.
- A issue 06 é a última: remover estilos órfãos antes das demais quebraria a árvore antiga ainda em uso.

## Regras que não podem regredir

- Os cinco indicadores permanecem visíveis: quantidade de sessões, lucros recebidos, pagamentos pendentes, sessões realizadas e sessões canceladas.
- Os valores exibidos continuam idênticos aos da tela anterior para o mesmo psicólogo e mês.
- A tela continua consultando apenas o mês corrente, com uma única chamada a `sessaoService.getEstatisticas(ano, mes)` por carga.
- `formatarMoeda()` permanece a única formatação de valores monetários.
- A autorização continua no backend; a tela nunca passa a exibir dados de pacientes individuais.
- Nenhum token de cor, raio ou fonte fora dos já presentes em `home.js` e das cores semânticas `#4CAF50`, `#FFA726` e `#EF5350` é introduzido.
- `home.js`, `sessoes.js` e `topo.js` permanecem inalterados.
