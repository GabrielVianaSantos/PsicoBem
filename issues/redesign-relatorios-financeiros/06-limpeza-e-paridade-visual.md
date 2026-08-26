# Issue 06 — Limpeza de estilos órfãos e validação de paridade

**Fase:** 6 — Fechamento  
**Prioridade:** 🟡 Média  
**Arquivos principais:** `src/screens/relatorios.js`  
**Origem:** seções 5, 7 e 8 de `SPEC_REDESIGN_RELATORIOS_FINANCEIROS.md`

## Problema

A issue 01 mantém deliberadamente os estilos do layout tabular para não quebrar a tela durante a migração. Depois que as issues 02 a 05 substituem a árvore de componentes, esses estilos ficam sem uso. Além disso, um redesenho que preserva métricas precisa de uma verificação explícita de que nenhum valor mudou de significado no caminho.

## Objetivo

Remover o resíduo do layout anterior e comprovar, indicador a indicador, que a tela redesenhada exibe exatamente os mesmos números da versão anterior.

## Escopo de implementação

- Remover do `StyleSheet` os estilos que deixaram de ser referenciados: `container`, `containerImage`, `item`, `sectionConteudo`, `rowItem`, `textoLabel`, `textoValor` e o `titulo` de duplo uso.
- Avaliar `loadingContainer` e `loadingText`: manter apenas se ainda forem usados pelo estado de carregamento inline da issue 05; caso contrário, remover ou renomear.
- Remover imports que tenham deixado de ser usados.
- Executar a validação de paridade dos cinco indicadores contra a tela anterior.
- Executar a checagem visual em Android e iOS.

## Tarefas

- [ ] Buscar cada nome de estilo antigo no arquivo e confirmar que não há mais referências antes de remover.
- [ ] Remover os estilos órfãos listados no escopo.
- [ ] Conferir que todos os imports do topo do arquivo continuam sendo usados.
- [ ] Comparar, lado a lado com a versão anterior da tela e para o mesmo psicólogo e mês, os cinco valores: `total_sessoes`, `receita_total`, `pagamentos_pendentes`, `sessoes_realizadas` e `sessoes_canceladas`.
- [ ] Testar com psicólogo sem nenhuma sessão no mês e confirmar zeros sem estado de erro.
- [ ] Testar com valores altos, acima de `R$ 100.000,00`, nos cards financeiros.
- [ ] Confirmar em Android e iOS que `formatarMoeda()` continua produzindo separador de milhar e vírgula decimal em pt-BR.
- [ ] Confirmar que o conteúdo final não fica encoberto pela `tabBar` do `Tab.Navigator`.
- [ ] Validar o recarregamento por `useFocusEffect` ao voltar de outra aba.
- [ ] Abrir `home.js` e `sessoes.js` no app e confirmar que continuam visualmente inalteradas.
- [ ] Executar `git diff --check`.
- [ ] Confirmar que `git status` não acusa alteração em nenhum arquivo de `psicoapp_backend/`.

## Critérios de aceite

- ✅ Nenhum estilo do layout tabular anterior permanece no arquivo.
- ✅ Nenhum import não utilizado permanece no arquivo.
- ✅ Os cinco indicadores exibem valores idênticos aos da tela anterior para o mesmo psicólogo e mês.
- ✅ Valores monetários mantêm a formatação pt-BR em Android e iOS.
- ✅ O conteúdo final não é encoberto pela `tabBar`.
- ✅ `home.js`, `sessoes.js` e `topo.js` permanecem inalterados.
- ✅ Nenhum arquivo de backend foi alterado em todo o backlog.
- ✅ `git diff --check` passa sem apontamentos.

## Dependências

- Depende de todas as issues anteriores. Remover os estilos antes que a árvore antiga seja substituída quebraria a tela.
