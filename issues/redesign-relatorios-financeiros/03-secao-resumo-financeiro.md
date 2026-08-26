# Issue 03 — Seção "Resumo Financeiro"

**Fase:** 3 — Indicadores financeiros  
**Prioridade:** 🔴 Alta  
**Arquivos principais:** `src/screens/relatorios.js`  
**Origem:** seção 4.2 de `SPEC_REDESIGN_RELATORIOS_FINANCEIROS.md`

## Problema

Lucros recebidos e pagamentos pendentes hoje aparecem como duas linhas de 12px de padding dentro de um bloco `#DEF6F0`, com o mesmo peso visual de sessões canceladas. A informação mais consultada pelo psicólogo não se destaca, e o layout tabular destoa dos cards com ícone da `home.js`.

## Objetivo

Reconstruir os dois indicadores financeiros como cards, dando a lucros recebidos o maior peso visual da tela e mantendo pagamentos pendentes como informação secundária clara.

## Escopo de implementação

- Renderizar o cabeçalho da seção com o título **"Resumo Financeiro"** no padrão `sectionHeaderCont` / `sectionTitle`, sem ação à direita.
- **Card de destaque — Lucros Recebidos**: fundo `#DEF6F0`, raio 12, padding 20, elevação de card da home. Rótulo "Lucros Recebidos" em `#0B7A6E`, valor `formatarMoeda(estatisticas?.receita_total)` em 28px `RalewayBold` `#4CAF50`, linha de apoio "Recebido no mês" em 14px `#555`, e `SectionRelatorioFinanceiro` (`../sections/money.png`) 60×60 à direita com `resizeMode: 'contain'`.
- **Card secundário — Pagamentos Pendentes**: fundo branco, borda `#f0f0f0`, raio 10. Ícone `Ionicons` `time-outline` 22px `#FFA726` dentro de contêiner `#f0f9f8` no padrão `sessaoTime`, rótulo "Pagamentos Pendentes" em 15px `RalewayBold` `#333` e valor `formatarMoeda(estatisticas?.pagamentos_pendentes)` em 18px `RalewayBold` `#FFA726`.
- Preservar `formatarMoeda()` exatamente como está, incluindo o retorno `"R$ 0,00"` para valores nulos ou indefinidos.
- Reaproveitar o import já existente de `money.png`; nenhum asset novo é adicionado.
- Não alterar os rótulos das métricas: a diferença de critério entre `receita_total` e `pagamentos_pendentes` no backend está documentada na SPEC e permanece fora de escopo.

## Tarefas

- [ ] Importar `Ionicons` de `@expo/vector-icons`.
- [ ] Renderizar o cabeçalho da seção "Resumo Financeiro".
- [ ] Montar o card de destaque com rótulo, valor, linha de apoio e ícone `money.png`.
- [ ] Montar o card secundário de pagamentos pendentes com o badge de ícone.
- [ ] Manter as chaves lidas do payload exatamente como hoje: `receita_total` e `pagamentos_pendentes`.
- [ ] Remover da árvore o bloco antigo do "Relatório Financeiro", sem tocar no bloco de "Fluxo de Sessões" ainda existente.
- [ ] Conferir o card de destaque com valores acima de `R$ 100.000,00` e garantir que valor e ícone não colidam.
- [ ] Conferir o comportamento com `receita_total` e `pagamentos_pendentes` ausentes no payload.

## Critérios de aceite

- ✅ Lucros recebidos e pagamentos pendentes continuam visíveis, com os mesmos valores da tela anterior para o mesmo psicólogo e mês.
- ✅ Lucros recebidos é o elemento de maior peso visual da tela.
- ✅ O card de destaque usa fundo `#DEF6F0`, raio 12, padding 20 e elevação equivalentes aos de `home.js`.
- ✅ O card de pagamentos pendentes usa fundo branco com borda `#f0f0f0` e raio 10.
- ✅ Valores monetários continuam formatados por `formatarMoeda()`, exibindo `R$ 0,00` quando ausentes.
- ✅ Um valor de seis dígitos mais centavos não trunca nem sobrepõe o ícone.
- ✅ Nenhuma chamada adicional à API foi introduzida.

## Dependências

- Depende da issue 01 (`highlightCard`, `highlightValue`, `miniCard`, `iconBadge`, `sectionHeaderCont`).
- Recomendada após a issue 02, que define o cabeçalho acima desta seção.
- Independente da issue 04; as duas podem ser feitas em paralelo.
