# SPEC — Sessões Online via Link Fixo do Google Meet (substitui o Jitsi)

Data: 2026-09-17
Status: planejamento
Escopo: backend Django (`authentication`, `sessoes`, `notificacoes_push`) + aplicativo Expo. Sem OAuth novo, sem API paga do Google, sem Workspace.

---

## 1. Objetivo

Substituir o mecanismo de sala do Jitsi (`SPEC_SESSOES_ONLINE_JITSI.md`, issues 01–02) por um **link fixo e pessoal do Google Meet**, configurado uma única vez por psicólogo, mantendo intacto tudo o que já funciona em torno dele: janela de entrada, botão "Entrar na sessão", lembretes, agenda do dispositivo e `.ics`.

A mudança nasce de um problema real de produção: o `meet.jit.si` público passou a exigir login de moderador para "liberar" a sala, e quem chega primeiro (tipicamente o paciente) fica esperando sem entender o motivo.

## 2. Decisão e alternativas descartadas

| Alternativa | Por que foi descartada |
|---|---|
| Contornar a exigência de moderador do `meet.jit.si` via parâmetros de URL | O serviço público passou a bloquear esse tipo de override no servidor, não é confiável. |
| Self-host de Jitsi Meet na VPS | Resolve o login de moderador, mas adiciona uma infraestrutura nova e não-trivial (prosody, jicofo, jvb, portas de mídia UDP) só para contornar um problema de UX. |
| JaaS (8x8.vc) com JWT de moderador | Funciona e tem tier gratuito, mas ainda depende de um provedor terceiro pago a partir de certo volume (MAU) e de gerar/assinar JWT por sessão. |
| Google Meet via Calendar/Meet API própria | **Exige Google Workspace pago** para quem cria a sala — confirmado nos guias oficiais do Google (`spaces.create` não funciona com Gmail pessoal) — reintroduzindo custo recorrente por psicólogo e revisão de escopo sensível do Google. |
| **Link pessoal e fixo do Google Meet (esta SPEC)** | **Escolhida.** Uma sessão de terapia é sempre 1-para-1 (paciente + psicólogo) — e chamadas 1:1 do Meet **não têm limite de duração**, mesmo em conta pessoal gratuita (o limite de 60 min só existe para chamadas em grupo, 3+ pessoas). Custo zero, sem OAuth, sem API paga. Quem chega primeiro cai na tela nativa "aguardando o anfitrião" do próprio Meet — um comportamento padrão e reconhecível, não a tela confusa de login de moderador do Jitsi público. |

**Trade-off aceito conscientemente:** o link deixa de ser regenerado a cada remarcação (era a mitigação de segurança do Jitsi para um link vazado). Isso é aceitável porque o link já é de conhecimento do paciente vinculado de qualquer forma (ele é reutilizado sessão após sessão, como uma "sala permanente" do consultório).

## 3. Estado atual identificado

| Tema | Estado atual | Impacto nesta SPEC |
|---|---|---|
| `sala_uuid` / `JITSI_BASE_URL` / `JITSI_ENABLED` | Implementados em `sessoes/models.py` (`Sessao._sync_sala_uuid`, `sala_url`, `pode_entrar_na_sala`) e `settings.py`, deployados em produção sem uso real (apenas um smoke test criado e removido). | **Serão removidos** nesta SPEC — não há dado real de produção a preservar. |
| Janela de entrada (`pode_entrar_sala`, `sala_disponivel_em`) | `Sessao.pode_entrar_na_sala()` já implementa a regra de -15min a +duração+30min, com fallback de 60min quando falta `tipo_sessao.duracao_minutos` (`sessoes/models.py`). | **Mantida sem alteração.** Só a origem da URL muda; a regra de quando mostrar o botão continua igual. |
| Botão "Entrar na sessão" | `src/screens/detalhesSessao.js` já renderiza o botão condicionado a `pode_entrar_sala`, com aviso de janela e fallback de link copiável em erro. | **Reaproveitado**, mas passa a navegar para uma tela nova (`SalaDeEspera`) em vez de chamar `Linking.openURL` direto. |
| Lembrete de 15 min diferenciado para sessão online | `notificacoes_push/tasks.py::_build_reminder_message` já produz "Sua sessão online começa em 15 minutos. Toque para entrar." para `tipo_sessao.tipo == 'online'`. | **Mantido sem alteração** — o texto não depende do Jitsi. |
| Confirmação pós-sessão | `dispatch_post_session_confirmations` já avisa só o psicólogo após o fim previsto. | **Mantido sem alteração.** |
| Agenda do dispositivo e `.ics` | `src/services/agendaDispositivo.js` e o endpoint `agenda.ics` já leem `sessao.sala_url`/`sessao.tipo_sessao.duracao_minutos` sem conhecer a origem do link. | **Mantidos sem alteração** — continuam funcionando com qualquer URL que `sala_url` devolver. |
| Contato do psicólogo já disponível no modelo | `CustomUser.phone` e `CustomUser.email` já existem (`authentication/models.py:18,20`) — nenhum campo novo de contato é necessário. | Usado diretamente no fallback de "link não configurado" (seção 4.4). |
| Edição de perfil do psicólogo | `UserSerializer.update()` (`authentication/serializers.py`) já grava campos aninhados em `psicologo_profile` (`specialization`, `biography`) a partir de `PUT /api/auth/profile/` (`user_update_view`). `src/screens/perfilPsicologo.js` já edita esses campos com `TextInputCustom`. | Mesmo mecanismo será estendido para `link_sala_video` — nenhum endpoint novo. |
| Cadastro de psicólogo | Nativo: `PsicologoRegistrationSerializer` (`fields = ('user', 'crp', 'specialization')`) chamado por `PsicologoRegistrationView`. Google: `GoogleCompleteRegistrationSerializer` valida `crp`/`specialization` no ramo `psicologo` dentro de `validate()`, e `google_complete_registration_view` cria o `Psicologo` manualmente. | Os dois pontos precisam passar a exigir o link do Meet para **novos** cadastros. |
| Menu do psicólogo | `src/screens/home.js` já tem um `cardsContainer` com cards de navegação no mesmo padrão visual (`styles.card`, `cardContent`, `cardTitle`, `cardSubtitle`, `Image` de ícone). | Novo card "Minha Sala Virtual" segue exatamente esse padrão. |
| Dependências nativas do app | `react-native-reanimated` **já está instalado** (`package.json`); `expo-linear-gradient`/`expo-blur` **não estão**. | A tela de respiração guiada pode ser construída **sem exigir rebuild EAS**, se o efeito de névoa/partículas for feito só com Reanimated + Views (ver seção 4.6 e "itens em aberto"). |

## 4. Requisitos funcionais e regras de negócio

### 4.1 Campo do link no perfil do psicólogo

- Novo campo `Psicologo.link_sala_video` (URL, opcional a nível de banco — `blank=True, null=True` — para não quebrar psicólogos já cadastrados).
- Validação de formato: deve começar com `https://meet.google.com/`. Não validar se o link "funciona de verdade" (não há como, sem API paga).
- Editável via `PUT /api/auth/profile/` → `UserSerializer`, no mesmo padrão de `specialization`/`biography`.

### 4.2 Cadastro passa a exigir o link (novos psicólogos)

- **Cadastro nativo** (`cadastroPsicologos.js` + `PsicologoRegistrationSerializer`): novo campo obrigatório "Link da sua sala de vídeo (Google Meet)", com texto de apoio curto ("Crie uma em meet.google.com/new e cole o link aqui"). Validação de formato no serializer.
- **Cadastro via Google** (`completarCadastroGoogle.js` + `GoogleCompleteRegistrationSerializer`): mesmo campo obrigatório, adicionado ao ramo `elif user_type == 'psicologo':` de `validate()`.
- **Psicólogos já cadastrados antes desta feature não são afetados retroativamente** — ver fallback na seção 4.4. Não há backfill possível (não temos como inventar o link de ninguém).

### 4.3 Origem de `sala_url` deixa de ser o Jitsi

- `Sessao.sala_url` passa a retornar `self.psicologo.link_sala_video` quando `tipo_sessao.tipo == 'online'`, ou `None` caso contrário (presencial) ou caso o psicólogo não tenha configurado o link ainda.
- `sala_disponivel_em` e `pode_entrar_na_sala()` **não mudam de regra** — continuam gatilhados por `sala_url` ser truthy, exatamente como hoje.
- Remoção de `sala_uuid`, `_sync_sala_uuid`, `_gerar_sala_uuid_unica` do modelo, e de `JITSI_BASE_URL`/`JITSI_ENABLED` do `settings.py` — sem uso real em produção a preservar (seção 3).

### 4.4 Sessão online sem link configurado (fallback)

Cenário possível mesmo após a regra 4.2: psicólogos cadastrados antes desta feature, ou que apagaram o link do perfil.

- Novo campo no serializer de sessão: `sala_pendente_configuracao` (booleano) — verdadeiro quando `tipo_sessao.tipo == 'online'` e `psicologo.link_sala_video` está vazio.
- Quando verdadeiro **e o usuário autenticado é o paciente**: a tela de detalhes mostra um aviso neutro, sem jargão técnico, com telefone e e-mail do psicólogo (já existentes em `CustomUser.phone`/`.email`) para contato por outro meio. Novo campo `psicologo_contato_alternativo` no serializer, exposto **somente nesse cenário** (não em toda resposta, para não expandir a exposição de dado de contato desnecessariamente).
- Quando verdadeiro **e o usuário autenticado é o psicólogo**: em vez do aviso de contato, mostrar um convite direto para configurar o link agora (deep link para o campo no perfil — mesma navegação do card da seção 4.5).

### 4.5 Card "Minha Sala Virtual" no menu do psicólogo

- Novo card em `src/screens/home.js`, no mesmo `cardsContainer` dos cards existentes.
- Subtítulo dinâmico:
  - Link configurado → algo como "Sua sala está disponível" (mostrar o link de forma curta/truncada, só para leitura — nunca editável ali).
  - Sem link configurado → "Configure sua sala de vídeo" (com destaque visual leve, mesma linguagem de alerta neutro já usada em outros cards de pendência, se existir padrão).
- Toque no card navega para `PerfilPsicologo` com um parâmetro que leva o foco/scroll diretamente ao campo do link (mesmo padrão de "editar campo específico" que a tela já suporta para outros campos, ou o equivalente mais simples disponível).

### 4.6 Tela dedicada "Sala de Espera" com respiração guiada

Substitui o `Linking.openURL` direto que o botão "Entrar na sessão" faz hoje.

- Nova tela (`SalaDeEspera` ou nome equivalente), aberta a partir de `DetalhesSessao` quando `pode_entrar_sala` é verdadeiro.
- Conteúdo:
  1. Instruções curtas de preparo (permissão de câmera/microfone que o Meet vai pedir; aviso de que, se a pessoa chegar primeiro, é normal ver "aguardando o anfitrião" — comportamento nativo do Google Meet, não um erro do app).
  2. **Animação de respiração guiada**, ciclo 4-4-4-4 (inspire 4s, segure 4s, expire 4s, segure 4s = 16s por ciclo), com um círculo que cresce e encolhe no mesmo ritmo, e texto sincronizado trocando entre "Inspire" / "Segure" / "Expire" / "Segure".
  3. Efeito ambiente suave (névoa/poeira/onda) ao fundo — decorativo, não interativo.
  4. Botão final "Entrar no Google Meet", que só então executa `Linking.openURL(sessao.sala_url)`. O tratamento de erro e o fallback de link copiável, hoje em `detalhesSessao.js`, migram para esta tela.
- **Paleta de cores obrigatoriamente a mesma do app já existente** (verde-água `#11B5A4` e tons já usados em `home.js`/`detalhesSessao.js`) — nenhuma identidade visual nova.
- Tecnicamente viável **sem novo módulo nativo** usando `react-native-reanimated` (já instalado) para o círculo e o texto; o efeito de névoa/partículas deve ser resolvido com Views/opacidade/Reanimated para não exigir rebuild EAS — ver item em aberto na seção 9.

### 4.7 Novo lembrete: "entre primeiro" para o psicólogo

- Nova tarefa periódica, no mesmo padrão de `dispatch_session_reminders` e `dispatch_post_session_confirmations` (`notificacoes_push/tasks.py`), mirando `data_hora - 7 minutos` (dentro da faixa de 5–8 min pedida), janela de ±2 min, mesma cadência de beat (`crontab(minute="*/5")`).
- **Somente sessões online** (`tipo_sessao.tipo == 'online'`) e **somente para o psicólogo** — o paciente não recebe.
- Filtra por `status ∈ {agendada, confirmada, remarcada}`, igual aos demais lembretes.
- Idempotência via `ReminderDispatch` com `reminder_type="entrar_primeiro"` (mesmo mecanismo, novo valor).
- Mensagem sugerida: "Sua sessão online começa em breve. Entre primeiro para receber seu paciente." — sem nome do paciente, sem termos clínicos, mesma régua de privacidade das demais notificações desta área.
- Roteamento: mesmo `_routing_payload(screen="DetalhesSessao", params={"sessaoId": ...})` já usado nos outros lembretes.

## 5. Alterações previstas por área/arquivo

**Backend**
- `authentication/models.py` — campo `Psicologo.link_sala_video` + migration.
- `authentication/serializers.py` — `PsicologoRegistrationSerializer` (campo + validação), `GoogleCompleteRegistrationSerializer` (campo + validação no ramo psicólogo), `UserSerializer` (campo editável via `psicologo_profile`, mesmo padrão de `specialization`).
- `authentication/views.py` — `google_complete_registration_view` (passar `link_sala_video` na criação do `Psicologo`).
- `sessoes/models.py` — `sala_url` lê do psicólogo; remoção de `sala_uuid`/`JITSI_*` e dos métodos associados; `pode_entrar_na_sala()`/`sala_disponivel_em` sem alteração de regra.
- `sessoes/serializers.py` — `SessaoListSerializer`/`SessaoDetailSerializer`: novos campos `sala_pendente_configuracao` e `psicologo_contato_alternativo` (condicional); `sala_uuid` continua nunca exposto (já não existirá mais).
- `psicoapp_backend/settings.py` — remoção de `JITSI_BASE_URL`/`JITSI_ENABLED`; nova entrada em `CELERY_BEAT_SCHEDULE` para a tarefa da seção 4.7.
- `notificacoes_push/tasks.py` — nova tarefa `dispatch_pre_session_host_reminder` (nome sugerido).
- Migration de dados: nenhuma (não há como inventar links de psicólogos existentes); migration de remoção do campo `sala_uuid` da issue 01 anterior.

**App**
- `src/screens/cadastroPsicologos.js` — campo obrigatório novo.
- `src/screens/completarCadastroGoogle.js` — campo obrigatório novo no ramo psicólogo.
- `src/screens/perfilPsicologo.js` — campo editável novo (mesmo padrão de especialidade/biografia).
- `src/screens/home.js` — card "Minha Sala Virtual".
- `src/screens/detalhesSessao.js` — botão passa a navegar para a nova tela em vez de `Linking.openURL` direto; trata `sala_pendente_configuracao` com o aviso de contato (paciente) ou convite a configurar (psicólogo).
- `src/screens/salaDeEspera.js` (novo) — tela de preparo com respiração guiada.
- `src/services/sessaoService.js` — nenhuma mudança esperada (`sala_url` já é consumido genericamente).

## 6. Autorização, privacidade e segurança

- `psicologo_contato_alternativo` só é serializado quando `sala_pendente_configuracao` é verdadeiro **e** o requisitante é o paciente da sessão — nunca em listagens gerais, nunca para terceiros (a restrição de queryset por participante já existe e continua valendo).
- `link_sala_video` não é um dado sensível de saúde, mas ainda assim só é exposto (via `sala_url`) aos participantes da própria sessão — mesma regra de autorização já validada na SPEC do Jitsi.
- Mensagens push desta feature seguem a mesma régua já estabelecida: nada de nome de paciente ou termo clínico no corpo, nenhuma URL de sala em payload de notificação.
- Nenhum dado de saúde novo é introduzido; `phone`/`email` já eram dados existentes do cadastro, apenas passam a ser reexibidos em um contexto novo e restrito.

## 7. Critérios de aceite

- ✅ Psicólogo novo (nativo ou Google) não consegue concluir o cadastro sem informar um link válido do Meet.
- ✅ `Sessao.sala_url` de uma sessão online devolve o link do psicólogo dela; presencial continua `None`.
- ✅ Janela de entrada (`pode_entrar_sala`) continua funcionando com os mesmos cinco pontos de fronteira já testados na SPEC anterior.
- ✅ Sessão online de psicólogo sem link configurado: paciente vê aviso com telefone/e-mail; psicólogo vê convite para configurar — nenhum dos dois vê o botão "Entrar".
- ✅ Card "Minha Sala Virtual" reflete corretamente os dois estados (configurado / pendente) e leva ao campo certo do perfil.
- ✅ Tela de espera roda a animação de respiração no ciclo 4-4-4-4 com texto sincronizado, usando a paleta já existente do app.
- ✅ Psicólogo com sessão online recebe o lembrete de "entrar primeiro" 5–8 min antes; paciente não recebe esse lembrete; sessão presencial não gera esse lembrete.
- ✅ Nenhuma referência a `sala_uuid`/Jitsi permanece no código após a migração.
- ✅ Agenda do dispositivo e `.ics` continuam funcionando sem alteração, usando o novo `sala_url`.

## 8. Testes e validação

- Backend: testes de `sala_url`/`sala_pendente_configuracao`/`psicologo_contato_alternativo` para os três cenários (presencial, online configurado, online pendente); testes de validação de cadastro (nativo e Google) rejeitando link ausente/mal formatado; testes da nova tarefa de lembrete (dispara no alvo, só ao psicólogo, só para online, idempotente).
- App: validação manual da tela de espera (ciclo de respiração, paleta, navegação de erro/copiar link herdada), validação do fluxo de cadastro com o novo campo obrigatório, validação do card no menu nos dois estados.
- Regressão: suíte completa de `sessoes`/`notificacoes_push`/`authentication` (as issues 03, 04 parcialmente, 05, 06 e 07 da SPEC do Jitsi não devem quebrar — elas não dependem da origem do link).

## 9. Itens fora de escopo / em aberto para a fase de issues

- **Efeito de névoa/partículas da tela de espera**: decidir entre (a) puro `Animated`/`Reanimated` + Views, sem rebuild EAS, com resultado mais simples; ou (b) instalar `expo-linear-gradient`/`expo-blur` para um efeito mais suave, aceitando mais um rebuild EAS. Não decidido nesta SPEC.
- Não há suporte a múltiplos links por psicólogo (ex.: um por tipo de sessão) — um único link fixo por psicólogo.
- Não há validação ativa de que o link realmente abre uma sala válida do Meet (sem API paga, não é possível).
- `sala_uuid` e as issues 01/02 da `SPEC_SESSOES_ONLINE_JITSI.md` são superadas por esta SPEC; issues 03 (mensagem de lembrete), 05 (confirmação pós-sessão), 06 (agenda do dispositivo) e 07 (`.ics`) permanecem válidas e não são reabertas.

## 10. Ordem recomendada de implementação

1. Backend: campo `link_sala_video`, migration, e troca de `sala_url` para ler do psicólogo (remove Jitsi).
2. Backend: exigência do link nos dois fluxos de cadastro (nativo e Google).
3. Backend: campos de fallback no serializer (`sala_pendente_configuracao`, `psicologo_contato_alternativo`) + edição via perfil.
4. App: campo de cadastro (nativo e Google) + campo editável no perfil do psicólogo.
5. App: card "Minha Sala Virtual" no menu.
6. App: tela "Sala de Espera" com respiração guiada, e troca do botão em `DetalhesSessao` para navegar até ela.
7. Backend + app: novo lembrete "entrar primeiro" (tarefa periódica + nenhuma mudança de UI adicional, reaproveita `DetalhesSessao`).
8. Deploy e validação ponta a ponta (equivalente à issue 08 da SPEC anterior, adaptada a este fluxo).
