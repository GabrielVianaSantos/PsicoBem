# Issue 03 — Corrigir labels e seletor do formulário

**Fase:** 3 — Interface  
**Prioridade:** 🟡 Média  
**Origem:** [SPEC_CORRECOES_CONFIGURACAO_SESSOES.md](/Users/user/Documents/GitHub/PsicoBem/SPEC_CORRECOES_CONFIGURACAO_SESSOES.md)  
**Arquivos principais:** `src/screens/tipoSessao.js`

## Problema e objetivo

O formulário depende de placeholders que podem desaparecer ou ficar ilegíveis. Além disso, o seletor mistura modalidades com categorias antigas. A tela deve explicar cada campo de forma persistente e oferecer somente as opções válidas.

## Escopo de implementação

Adicionar labels visíveis para Nome, Valor, Duração e Modalidade; preservar placeholders úteis como exemplos; limitar `categoriasDisponiveis` a `presencial` e `online`; usar estado inicial válido; e exibir o rótulo legível na listagem.

## Tarefas

- [ ] Adicionar `<Text>` de label persistente para cada input e picker.
- [ ] Ajustar contraste, fonte e espaçamento dos labels sem quebrar o layout responsivo.
- [ ] Alterar o estado inicial da categoria para uma modalidade válida.
- [ ] Remover Avulsa, Primeira Sessão, Urgência, Pacote e Retorno do picker.
- [ ] Mapear `presencial` para “Presencial” e `online` para “Online” na badge/listagem.
- [ ] Preservar validações, teclado, loading, alertas e payload de cadastro.

## Critérios de aceite

- [ ] Labels ficam visíveis com o campo vazio, focado, preenchido e após erro.
- [ ] O picker apresenta exatamente Presencial e Online.
- [ ] O payload enviado contém somente `presencial` ou `online`.
- [ ] A lista mostra “Presencial”/“Online” sem depender de `toUpperCase()` nos códigos.
- [ ] A tela permanece legível em Android, iOS e larguras menores.

## Dependências

- Depende da Issue 02 para alinhar o contrato da API.
