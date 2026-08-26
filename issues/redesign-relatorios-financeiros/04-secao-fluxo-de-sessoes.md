# Issue 04 — Seção "Fluxo de Sessões"

**Fase:** 4 — Indicadores de sessões  
**Prioridade:** 🔴 Alta  
**Arquivos principais:** `src/screens/relatorios.js`  
**Origem:** seção 4.3 de `SPEC_REDESIGN_RELATORIOS_FINANCEIROS.md`

## Problema

Quantidade de sessões do mês está isolada no bloco financeiro, enquanto realizadas e canceladas ficam em outro bloco, todas como linhas de texto de mesmo peso. Não há leitura rápida da proporção entre o que foi realizado e o que foi cancelado.

## Objetivo

Reconstruir os três indicadores de sessões como cards, com o total do mês em destaque e realizadas e canceladas em um grid comparável lado a lado.

## Escopo de implementação

- Renderizar o cabeçalho da seção com o título **"Fluxo de Sessões"** no padrão `sectionHeaderCont` / `sectionTitle`.
- Adicionar a ação **"Ver tudo"** à direita do título, no estilo `verTodos`, navegando para a aba `Sessoes`.
  - **Decisão em aberto registrada na SPEC**: `Relatorios` e `Sessoes` são telas irmãs do mesmo `Tab.Navigator` (`src/screens/components/navigation-bar.js`), portanto `navigation.navigate('Sessoes')` é válido. Caso a decisão seja manter a tela sem navegação, remover apenas este link; nada mais nesta issue depende dele.
- **Card de destaque — Sessões no Mês**: mesma anatomia do card financeiro da issue 03, com `SectionFluxoPacientes` (`../sections/improvement.png`) 60×60, rótulo "Sessões no Mês", valor `estatisticas?.total_sessoes ?? 0` em 28px `RalewayBold` `#0B7A6E` e linha de apoio "Total agendado no período".
- **Grid de dois indicadores**: linha `flexDirection: 'row'` com dois cards `flex: 1`, separados por 15px, ambos brancos com borda `#f0f0f0`, raio 10 e conteúdo centralizado:
  - **Realizadas** — `Ionicons` `checkmark-circle` 24px `#4CAF50`, valor `estatisticas?.sessoes_realizadas ?? 0` em 22px `#4CAF50`, rótulo "Realizadas" em 13px `#777`;
  - **Canceladas** — `Ionicons` `close-circle` 24px `#EF5350`, valor `estatisticas?.sessoes_canceladas ?? 0` em 22px `#EF5350`, rótulo "Canceladas" em 13px `#777`.
- Reaproveitar o import já existente de `improvement.png`; nenhum asset novo é adicionado.

## Tarefas

- [ ] Importar `useNavigation` de `@react-navigation/native` caso o link "Ver tudo" seja mantido.
- [ ] Renderizar o cabeçalho da seção com título e ação à direita.
- [ ] Montar o card de destaque com rótulo, valor, linha de apoio e ícone `improvement.png`.
- [ ] Montar o grid de dois cards com ícone, valor e rótulo centralizados.
- [ ] Manter as chaves lidas do payload exatamente como hoje: `total_sessoes`, `sessoes_realizadas` e `sessoes_canceladas`.
- [ ] Preservar os fallbacks para `0` quando os campos estiverem ausentes.
- [ ] Remover da árvore o bloco antigo de "Fluxo de Sessões", incluindo a linha "Qtd de Sessões (Mês)" que hoje vive no bloco financeiro.
- [ ] Verificar o grid em largura de 360dp e confirmar que os rótulos não truncam.
- [ ] Se o link for mantido, confirmar que a navegação para `Sessoes` não empilha telas indevidamente.

## Critérios de aceite

- ✅ Quantidade de sessões do mês, sessões realizadas e sessões canceladas continuam visíveis, com os mesmos valores da tela anterior.
- ✅ O total do mês aparece em card de destaque no mesmo padrão do card financeiro.
- ✅ Realizadas e canceladas ficam lado a lado, com largura igual e cores semânticas preservadas.
- ✅ Em largura de 360dp os dois cards permanecem na mesma linha, legíveis e sem sobreposição.
- ✅ Contagens ausentes no payload continuam exibindo `0`.
- ✅ Se mantido, "Ver tudo" navega para a aba `Sessoes` e nada mais na tela é navegável.

## Dependências

- Depende da issue 01 (`highlightCard`, `highlightValue`, `statsRow`, `statCard`, `statValue`, `statLabel`, `sectionHeaderCont`, `verTodos`).
- Recomendada após a issue 02, que define o cabeçalho acima desta seção.
- Independente da issue 03; as duas podem ser feitas em paralelo.
