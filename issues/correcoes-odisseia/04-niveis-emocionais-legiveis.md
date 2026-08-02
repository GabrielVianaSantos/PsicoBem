# Issue 04 — Tornar legíveis os níveis emocionais dos cards

**Fase:** 4 — Clareza visual e responsividade  
**Prioridade:** 🟡 Média  
**Arquivos principais:** `src/screens/registrosOdisseia.js` e `src/components/common/NivelChip.js`  
**Origem:** seção 3.3 de `SPEC_CORRECOES_ODISSEIA.md`

## Problema

Os chips de nível nos cards usam as abreviações `Ans.`, `Str.` e `Ene.`. Embora compactas, elas não são imediatamente claras para todos os usuários e podem gerar dúvida na leitura dos indicadores.

## Objetivo

Substituir as abreviações pelos nomes completos **Ansiedade**, **Estresse** e **Energia**, mantendo a composição visual de chips, as cores e os valores numéricos atuais.

## Escopo de implementação

- Alterar somente os rótulos exibidos nos cards de lista.
- Preservar os valores de `0` a `10`, a ordem e as cores existentes.
- Garantir responsividade para que nomes completos não causem corte, sobreposição ou perda de leitura em telas menores.
- Não alterar a escala, validação, cálculo ou persistência dos níveis emocionais.

## Tarefas

- [ ] Localizar as chamadas de `NivelChip` em `src/screens/registrosOdisseia.js`.
- [ ] Substituir `Ans.`, `Str.` e `Ene.` por `Ansiedade`, `Estresse` e `Energia`.
- [ ] Revisar `src/components/common/NivelChip.js` para confirmar que o componente suporta os rótulos completos.
- [ ] Ajustar estilos apenas quando necessário para preservar equilíbrio visual e área de toque/legibilidade.
- [ ] Manter a ordem Ansiedade → Estresse → Energia.
- [ ] Manter a cor diferenciada de Energia e o padrão atual dos demais chips.
- [ ] Testar os cards com todos os níveis preenchidos em telas estreitas.

## Critérios de aceite

- ✅ Os cards mostram **Ansiedade**, **Estresse** e **Energia** por extenso.
- ✅ Cada chip continua exibindo corretamente seu valor de `0` a `10`.
- ✅ Os três chips permanecem legíveis sem sobreposição ou texto truncado em telas menores.
- ✅ Cores, ordem, humor, data e a estrutura geral do card são preservados.
- ✅ Nenhuma regra de negócio ou dado persistido da Odisséia é alterado.

## Dependências

- Não possui dependência técnica da issue 01.
- Recomenda-se validar junto da issue 02, pois os chips aparecem nos cards dos dois perfis.
