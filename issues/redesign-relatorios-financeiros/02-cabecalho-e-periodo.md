# Issue 02 — Cabeçalho compacto e período de referência

**Fase:** 2 — Cabeçalho da tela  
**Prioridade:** 🔴 Alta  
**Arquivos principais:** `src/screens/relatorios.js`  
**Origem:** seção 4.1 de `SPEC_REDESIGN_RELATORIOS_FINANCEIROS.md`

## Problema

A tela usa `<Topo />` em altura cheia (`width / 1.9`), consumindo grande parte da primeira dobra antes de qualquer dado. Logo abaixo, o texto "Relatórios Mensais" usa o mesmo estilo `titulo` dos títulos de seção, sem hierarquia. Além disso, `carregarEstatisticas()` consulta o mês corrente a partir de `new Date()`, mas a tela nunca informa a que mês os números se referem.

## Objetivo

Montar um cabeçalho compacto e hierarquizado, no ritmo da `home.js`, que deixe explícito o período consultado antes de o usuário ler qualquer valor.

## Escopo de implementação

- Trocar `<Topo />` por `<Topo compact />`. A prop já existe em `src/screens/components/topo.js` e reduz a altura para `width / 3.5`; o componente não deve ser alterado.
- Renderizar o título **"Relatórios"** em 18px `RalewayBold` `#333`, no padrão `sectionTitle` da home.
- Renderizar o subtítulo com o mês de referência por extenso e capitalizado, no formato `"Agosto de 2026"`, em 14px `#666`.
- Derivar o rótulo do mês da mesma `dataAtual` já usada em `carregarEstatisticas()`, sem nova chamada de API e sem alterar os parâmetros `ano` e `mes` enviados ao backend.
- Inserir o divisor `#eee` com margem horizontal de 25px abaixo do bloco de cabeçalho.
- Manter o `ScrollView` e o `RefreshControl` existentes.

## Tarefas

- [ ] Substituir `<Topo />` por `<Topo compact />` nos dois pontos de renderização da tela, incluindo o do estado de carregamento.
- [ ] Definir a origem do rótulo do mês, guardando-o em estado junto das estatísticas ou recalculando na renderização a partir de `new Date()`.
- [ ] Garantir que o mês exibido corresponda exatamente ao `mes` enviado em `sessaoService.getEstatisticas(ano, mes)`, lembrando que a chamada usa `getMonth() + 1`.
- [ ] Capitalizar a primeira letra do nome do mês em pt-BR.
- [ ] Renderizar o bloco `headerBlock` com `screenTitle` e `screenSubtitle`.
- [ ] Renderizar o `divider` abaixo do cabeçalho.
- [ ] Remover o texto "Relatórios Mensais" da árvore antiga, sem tocar nas duas seções de dados ainda existentes.
- [ ] Conferir que o `Topo` compacto não corta a logo em telas pequenas.

## Critérios de aceite

- ✅ A tela usa `<Topo compact />` e o cabeçalho ocupa visivelmente menos altura que antes.
- ✅ O título "Relatórios" e o subtítulo com o mês têm pesos tipográficos distintos.
- ✅ O mês exibido corresponde ao período efetivamente consultado na API.
- ✅ Em janeiro, o rótulo exibe `"Janeiro de <ano>"`, sem erro de índice de mês.
- ✅ Nenhuma chamada adicional à API foi introduzida.
- ✅ `src/screens/components/topo.js` não foi modificado.

## Dependências

- Depende da issue 01, que define `headerBlock`, `screenTitle`, `screenSubtitle` e `divider`.
- É pré-requisito prático das issues 03 e 04, que renderizam abaixo deste cabeçalho.
