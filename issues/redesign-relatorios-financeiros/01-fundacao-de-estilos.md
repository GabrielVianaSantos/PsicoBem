# Issue 01 — Fundação de estilos alinhados à home

**Fase:** 1 — Base visual  
**Prioridade:** 🔴 Alta  
**Arquivos principais:** `src/screens/relatorios.js`  
**Origem:** seções 3 e 5 de `SPEC_REDESIGN_RELATORIOS_FINANCEIROS.md`

## Problema

O `StyleSheet` atual de `relatorios.js` foi escrito para um layout tabular: `container` com borda superior verde, `sectionConteudo` em bloco único, `rowItem` com borda inferior e o estilo `titulo` acumulando dois papéis distintos. Nenhum desses estilos serve ao layout de cards da `home.js`, e as issues seguintes precisam de um vocabulário comum antes de montar qualquer seção.

## Objetivo

Introduzir no `StyleSheet` de `relatorios.js` o conjunto de estilos espelhado de `src/screens/home.js`, sem ainda alterar a árvore de componentes renderizada. Ao fim desta issue a tela continua funcionando exatamente como hoje, mas com os estilos novos disponíveis.

## Escopo de implementação

- Adicionar os estilos novos ao `StyleSheet` existente, mantendo os antigos temporariamente para não quebrar a renderização atual.
- Reproduzir os valores de `home.js` sem inventar tokens: fundo de card `#DEF6F0`, card secundário branco com borda `#f0f0f0`, realce sutil `#f0f9f8`, divisor `#eee`, títulos de seção `#333`, texto de apoio `#555`, texto neutro fraco `#777` e `#999`, título sobre card `#0B7A6E`, primária `#11B5A4`.
- Preservar as cores semânticas já usadas na tela: `#4CAF50` para lucros e realizadas, `#FFA726` para pendentes, `#EF5350` para canceladas.
- Usar apenas `RalewayRegular` e `RalewayBold`, as duas fontes carregadas em `src/hooks/useLoadFonts.js`.
- Aplicar elevação de card idêntica à de `home.js`: `elevation: 2`, `shadowOffset: { width: 0, height: 1 }`, `shadowOpacity: 0.1`, `shadowRadius: 2`.

## Tarefas

- [ ] Ler `src/screens/home.js` e listar os valores exatos de `card`, `cardTitle`, `cardSubtitle`, `cardIcon`, `divider`, `sectionHeaderCont`, `sectionTitle`, `verTodos`, `sessaoCardMini`, `sessaoTime` e `emptySessoes`.
- [ ] Criar `headerBlock`, `screenTitle` e `screenSubtitle` para o cabeçalho da tela.
- [ ] Criar `divider` replicando `height: 1`, `backgroundColor: '#eee'` e `marginHorizontal: 25`.
- [ ] Criar `sectionHeaderCont`, `sectionTitle` e `verTodos` idênticos aos da home.
- [ ] Criar `highlightCard` e `highlightValue` para os cards de destaque das issues 03 e 04.
- [ ] Criar `miniCard` e `iconBadge` para o card secundário de pagamentos pendentes.
- [ ] Criar `statsRow`, `statCard`, `statValue` e `statLabel` para o grid de dois indicadores.
- [ ] Criar `errorBox` no padrão de `emptySessoes`, para o estado de falha da issue 05.
- [ ] Definir `contentContainerStyle` do `ScrollView` com `paddingBottom` suficiente para não colidir com a `tabBar` do `Tab.Navigator`.
- [ ] Não remover nenhum estilo antigo nesta issue.

## Critérios de aceite

- ✅ Todos os estilos listados na seção 5 da SPEC existem no `StyleSheet` de `relatorios.js`.
- ✅ Nenhum valor de cor, raio, fonte ou elevação foge dos tokens de `home.js` e das três cores semânticas preservadas.
- ✅ A tela continua renderizando e se comportando exatamente como antes desta issue.
- ✅ `src/screens/home.js` e `src/screens/components/topo.js` não foram modificados.
- ✅ Nenhum arquivo de backend foi alterado.

## Dependências

- Nenhuma. Esta é a issue de base do backlog.
- As issues 02, 03, 04 e 05 dependem desta.
