# Issue 05 — App: card "Minha Sala Virtual" no menu do psicólogo

**Fase:** 5 — Visibilidade e conveniência
**Prioridade:** 🟡 Média
**Arquivos principais:** `src/screens/home.js`
**Referência:** seção 4.5 de `SPEC_SESSOES_ONLINE_GOOGLE_MEET.md`

## Problema

Mesmo com o campo pronto no perfil (issue 04), o psicólogo pode esquecer de configurar o link, ou não saber onde editá-lo depois. Precisa de um lugar visível e recorrente que reflita o estado atual.

## Objetivo

Dar destaque ao estado da sala virtual direto no menu principal do psicólogo, com acesso de um toque para configurar ou revisar.

## Escopo de implementação

Em `src/screens/home.js`, novo card no `cardsContainer` já existente, seguindo exatamente o padrão visual dos cards atuais (`styles.card`, `cardContent`, `cardTitle`, `cardSubtitle`, ícone).

### Conteúdo do card

- Título: "Minha Sala Virtual".
- Subtítulo dinâmico, a partir do `link_sala_video` já disponível em `user`/perfil do psicólogo autenticado:
  - Configurado → algo como "Sua sala está disponível" (pode incluir uma versão curta/truncada do link, só leitura).
  - Não configurado → algo como "Configure sua sala de vídeo", com um tratamento visual levemente distinto (mesma linguagem de alerta neutro já usada em outros pontos do app, se houver padrão a seguir; caso não haja, uma cor de destaque discreta é suficiente).
- Toque no card: `navigation.navigate('PerfilPsicologo', { focarCampo: 'linkSalaVideo' })`, usando o suporte adicionado na issue 04.

## Tarefas

- [ ] Adicionar o card ao `cardsContainer` de `home.js`, no mesmo padrão visual dos demais.
- [ ] Implementar os dois estados de subtítulo a partir do dado já carregado do usuário/perfil (conferir se `home.js` já tem esse dado disponível ou se precisa buscá-lo).
- [ ] Implementar a navegação com o parâmetro de foco de campo.
- [ ] Testar manualmente os dois estados (com e sem link configurado) e a navegação resultante.

## Critérios de aceite

- ✅ Card aparece no menu do psicólogo, no mesmo estilo visual dos demais cards.
- ✅ Subtítulo reflete corretamente se o link está ou não configurado.
- ✅ Tocar no card leva direto ao campo do link no perfil, já focado.
- ✅ Nenhum outro card ou fluxo do menu é afetado.

## Dependências

- Depende das issues 03 e 04.
- Independente da issue 06.
