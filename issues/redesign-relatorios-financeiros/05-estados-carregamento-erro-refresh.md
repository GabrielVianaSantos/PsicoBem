# Issue 05 — Estados de carregamento, erro e atualização

**Fase:** 5 — Estados da tela  
**Prioridade:** 🟡 Média  
**Arquivos principais:** `src/screens/relatorios.js`  
**Origem:** seção 4.4 de `SPEC_REDESIGN_RELATORIOS_FINANCEIROS.md`

## Problema

Dois comportamentos destoam do restante do app:

1. O carregamento usa um retorno antecipado com `ActivityIndicator` centralizado em tela cheia. O conteúdo salta de uma tela praticamente vazia para a tela completa, enquanto a `home.js` mantém a estrutura e usa indicador inline.
2. Uma falha de carregamento exibe apenas `Alert.alert` e deixa `estatisticas` como `null`. Depois de fechar o alerta, o psicólogo vê `R$ 0,00` e zeros, sem distinguir um mês sem movimento de uma falha de rede.

## Objetivo

Alinhar os estados da tela ao padrão da `home.js` e tornar a falha de carregamento visualmente distinguível de um mês sem movimento, sem alterar a lógica de busca de dados.

## Escopo de implementação

- Remover o retorno antecipado de carregamento. Manter `Topo`, cabeçalho e divisor sempre renderizados e trocar apenas a área de conteúdo.
- **Carregando (primeira carga)**: exibir `ActivityIndicator` `#11B5A4` inline no lugar das seções, com o texto "Calculando estatísticas..." já usado hoje.
- **Carregado com dados**: renderizar as seções das issues 03 e 04 normalmente.
- **Carregado sem movimento no mês**: renderizar os cards com `0` e `R$ 0,00`. Não usar estado vazio nem bloco de erro.
- **Falha de carregamento**: preservar o `Alert.alert` atual e, adicionalmente, quando `estatisticas` for `null` após o término do carregamento, renderizar um bloco no padrão `errorBox` com `Ionicons` `cloud-offline-outline`, o texto "Não foi possível carregar os relatórios" e a instrução para puxar a tela para baixo e tentar novamente.
- **Atualizando**: manter o `RefreshControl` existente, adicionando `tintColor="#11B5A4"` e `colors={["#11B5A4"]}`.
- Não alterar `carregarEstatisticas()`, `onRefresh()`, o `useFocusEffect` nem os estados `estatisticas`, `loading` e `refreshing`.

## Tarefas

- [ ] Remover o bloco `if (loading && !refreshing) { return … }` e substituí-lo por renderização condicional interna.
- [ ] Garantir que o `ScrollView` e o `RefreshControl` permaneçam montados durante o carregamento, para que o pull to refresh continue disponível.
- [ ] Renderizar o indicador inline com o texto de carregamento na área de conteúdo.
- [ ] Distinguir "carregado com zeros" de "falha": o bloco de erro só aparece quando `estatisticas` é `null` e `loading` é `false`.
- [ ] Renderizar o `errorBox` com ícone, mensagem e instrução de atualização.
- [ ] Adicionar `tintColor` e `colors` ao `RefreshControl`.
- [ ] Confirmar que o `Alert.alert` de falha continua sendo disparado como hoje.
- [ ] Testar com o backend indisponível e depois restaurado, confirmando que o pull to refresh recupera a tela.

## Critérios de aceite

- ✅ Durante a primeira carga, o `Topo`, o título e o mês de referência permanecem visíveis.
- ✅ O indicador de carregamento aparece na área de conteúdo, não em tela cheia.
- ✅ Um mês sem movimento renderiza os cards com zeros, e não um estado de erro.
- ✅ Uma falha de carregamento exibe o alerta e o bloco de erro com orientação para atualizar.
- ✅ Recuperada a conexão, o pull to refresh recarrega os cinco indicadores e remove o bloco de erro.
- ✅ O indicador do `RefreshControl` usa a cor `#11B5A4`.
- ✅ `carregarEstatisticas()` e `onRefresh()` permanecem funcionalmente inalteradas.

## Dependências

- Depende da issue 01 (`errorBox`).
- Depende das issues 03 e 04, pois a renderização condicional substitui o retorno antecipado envolvendo as seções já construídas.
