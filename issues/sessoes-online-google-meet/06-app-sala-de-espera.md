# Issue 06 — App: tela "Sala de Espera" com respiração guiada e fallback de link pendente

**Fase:** 6 — Fecha o fluxo principal
**Prioridade:** 🔴 Alta
**Arquivos principais:** `src/screens/detalhesSessao.js`, `src/screens/salaDeEspera.js` (novo)
**Referência:** seções 4.4, 4.6 e 9 de `SPEC_SESSOES_ONLINE_GOOGLE_MEET.md`

## Problema

Hoje o botão "Entrar na sessão" chama `Linking.openURL` direto, jogando a pessoa sem aviso para fora do app. E quando `sala_url` é `null` por falta de configuração do psicólogo (não por ser presencial), a tela hoje não mostra nada — a pessoa não entende o motivo.

## Objetivo

Preparar a pessoa antes de sair do app (instruções + respiração guiada) e tratar de forma explícita o caso de link ainda não configurado.

**Esta issue fecha o fluxo principal de ponta a ponta.**

## Escopo de implementação

### 1. Fallback de `sala_pendente_configuracao` em `detalhesSessao.js`

Reestruturar o bloco que hoje só verifica `sessao.sala_url` para também tratar `sessao.sala_pendente_configuracao`:

- **Se `sala_pendente_configuracao` for verdadeiro e o usuário autenticado for o paciente**: mostrar um aviso neutro, sem jargão técnico, com telefone e e-mail do psicólogo (`sessao.psicologo_contato_alternativo`) para contato por outro meio.
- **Se `sala_pendente_configuracao` for verdadeiro e o usuário autenticado for o psicólogo** (usar `userType` do `useAuth()`, já usado nesta tela): mostrar um convite direto a configurar o link agora, navegando para `PerfilPsicologo` com o mesmo parâmetro de foco da issue 04/05.
- **Se `sala_url` for `null` e `sala_pendente_configuracao` for falso** (== sessão presencial): não renderizar nada, como já é hoje.

### 2. Nova tela `src/screens/salaDeEspera.js`

Registrar a rota (verificar se precisa de entrada em `routes.js`/navigator, seguindo o padrão de outras telas do projeto).

Conteúdo:

1. Cabeçalho curto com o horário da sessão.
2. Bloco de instruções (texto curto, sem alarmismo): permissão de câmera/microfone que o Meet vai pedir; aviso de que, se a pessoa chegar primeiro, é normal ver "aguardando o anfitrião" — comportamento nativo do Google Meet.
3. **Animação de respiração guiada**: círculo que cresce e encolhe em ciclo de 16s (4s inspire/crescendo, 4s segure no máximo, 4s expire/encolhendo, 4s segure no mínimo), com texto sincronizado alternando "Inspire" / "Segure" / "Expire" / "Segure". Usar `react-native-reanimated` (já instalado — não deve exigir rebuild EAS).
4. Efeito ambiente suave ao fundo (névoa/poeira/onda) — ver decisão técnica pendente abaixo.
5. Botão final "Entrar no Google Meet", que só então chama `Linking.openURL(sessao.sala_url)`. Migrar para esta tela o tratamento de erro e o fallback de link copiável que hoje vivem em `detalhesSessao.js` (`erroAbrirSala`, texto selecionável com o link).

### 3. Navegação em `detalhesSessao.js`

O botão "Entrar na sessão" (quando `pode_entrar_sala` é verdadeiro) passa a navegar para `SalaDeEspera` com `{ sessaoId }`, em vez de chamar `entrarNaSala()` diretamente. A lógica de `entrarNaSala`/`erroAbrirSala` migra para a nova tela.

### Paleta e identidade visual

**Obrigatório reaproveitar a paleta já existente do app** (verde-água `#11B5A4` e os tons já usados em `home.js`/`detalhesSessao.js`, tipografia Raleway já padrão). Nenhuma cor, gradiente ou identidade nova deve ser introduzida nesta tela.

### Decisão técnica registrada

**Escolhida a opção (b): instalar `expo-linear-gradient` e `expo-blur`.** Prioriza o resultado visual (névoa/glow suave) sobre evitar mais um rebuild — decisão do usuário em 2026-09-17. Isso implica:

- `expo-linear-gradient` e `expo-blur` entram como dependências novas do projeto.
- **Esta issue exige rebuild EAS** antes de validar em dispositivo (junto com a validação da issue 08).
- O efeito de respiração em si (círculo crescendo/encolhendo, texto sincronizado) continua via `react-native-reanimated` (já instalado); o `expo-blur`/`expo-linear-gradient` entram só para o glow/névoa ambiente ao fundo.

## Tarefas

- [ ] Reestruturar o bloco de sala em `detalhesSessao.js` para tratar `sala_pendente_configuracao` (paciente vê contato, psicólogo vê convite a configurar).
- [ ] Criar `salaDeEspera.js` com instruções, animação de respiração e efeito ambiente.
- [ ] Migrar o tratamento de erro/link copiável para a nova tela.
- [ ] Trocar a navegação do botão "Entrar na sessão" para a nova tela.
- [ ] Registrar a rota nova onde o projeto já registra as demais.
- [ ] Decidir e registrar a abordagem do efeito de névoa/partículas (item acima).
- [ ] Testar manualmente: ciclo de respiração no ritmo correto (16s por ciclo), paleta consistente com o resto do app, abertura do Meet ao final, fallback de erro/link copiável funcionando na nova tela.
- [ ] Conferir que sessão presencial continua sem exibir nada relacionado a sala.

## Critérios de aceite

- ✅ Paciente com sessão online pendente de configuração vê telefone e e-mail do psicólogo, não uma tela vazia.
- ✅ Psicólogo com sessão online pendente de configuração vê um convite direto para configurar, não uma tela vazia.
- ✅ Tocar em "Entrar na sessão" abre a tela de preparo antes de sair do app, não `Linking.openURL` direto.
- ✅ Animação de respiração roda no ciclo 4-4-4-4 com texto sincronizado.
- ✅ Paleta e tipografia da nova tela são as mesmas já usadas no resto do app.
- ✅ Botão final abre o Google Meet; erro de abertura oferece o link copiável, como já acontece hoje.
- ✅ Sessão presencial não exibe nenhum elemento novo desta issue.

## Dependências

- Depende das issues 01 e 03.
- Independente das issues 04 e 05.
