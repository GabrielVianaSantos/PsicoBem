# Issue: Fragmentação do Monólito Odisseia (Frontend)

**Objetivo:** Quebrar a super-tela de `registrosOdisseia.js` (610+ linhas) em partes moleculares, prevenindo gargalos de perfomance na thread UI.

**Tarefas:**
- [ ] Extrair `/src/screens/RegistrosOdisseia/index.js` para manter apenas roteamentos e abas.
- [ ] Extrair seletor de humor abstrato para `/src/screens/RegistrosOdisseia/components/EmocoesGrid.js`.
- [ ] Extrair seleções de stress físico para `/src/screens/RegistrosOdisseia/components/ReacoesFisiologicas.js`.
- [ ] Extrair funções puramente visuais e reaproveitáveis criando `/src/components/common/NivelSlider.js` e `/src/components/common/NivelChip.js`.
- [ ] Refatorar importando tudo ao controller principal e apagando as declarativas internas (SecaoView) engessadas na var mãe.
