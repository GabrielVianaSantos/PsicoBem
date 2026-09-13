# SPEC — Badges de Novidade nos Cards do Menu, Correção das Visualizações de Sementes e Alertas Customizados

Data: 2026-09-13
Status: planejamento
Escopo: três pedidos independentes do usuário, agrupados nesta SPEC por terem sido levantados juntos — indicador visual de "algo novo" nos cards de menu das telas Home (paciente e psicólogo), correção do contador de visualizações das Sementes do Cuidado, e substituição do `Alert.alert` nativo por um componente de alerta com a identidade visual do PsicoBem.

---

## 1. Objetivo

1. **Badges de novidade**: nos cards de menu das telas Home (`home.js` do psicólogo e `homePaciente.js` do paciente), exibir um indicador visual quando existir algo novo relevante para aquele card — nova sessão, nova semente, novo like em semente, novo registro de Odisseia — sem exigir que o usuário abra a tela de Notificações para descobrir.
2. **Corrigir contagem de visualizações**: o contador de "visualizações" de uma Semente do Cuidado (visível ao psicólogo) permanece zerado mesmo depois de um paciente abrir e curtir a semente — precisa refletir a realidade, do mesmo jeito que a contagem de curtidas já reflete (corrigida em `SPEC_CORRECAO_ERROS_SESSOES_SEMENTES.md`).
3. **Alertas customizados**: substituir o `Alert.alert` do sistema operacional (visual genérico, sem identidade do app) por um componente próprio, com a paleta e tipografia do PsicoBem, mantendo o mesmo comportamento (título, mensagem, botões com estilos `cancel`/`destructive`/padrão).

---

## 2. Estado atual e problemas identificados

### 2.1 Badges de novidade nos cards do menu

| Tema | Estado atual | Impacto |
|---|---|---|
| Infraestrutura de notificação já existe | `NotificacaoSistema` (`psicoapp_backend/core/models.py:168-256`) já tem `lida` (bool) e `dados_extras` (JSON com `event`, `screen`, `entity_type`, `entity_id`). `NotificationDomainService.emit()` já cria essas notificações para praticamente todo evento relevante do sistema. | A base de dados para "existe algo novo" já existe; falta só uma forma de consultá-la agregada por assunto (não por notificação individual) e de exibi-la nos cards. |
| Hoje só existe contagem global | `NotificacaoViewSet.nao_lidas()` (`core/views.py:298-302`) retorna um único número (`nao_lidas`) somando **todas** as notificações não lidas do usuário, sem discriminar por assunto. Esse número já alimenta o sininho no topo de `home.js` e `homePaciente.js` (`dashboard.notificacoes_nao_lidas`). | Não há como saber, a partir da API atual, se a novidade pendente é sobre sessões, sementes ou Odisseia — logo não há como acender apenas o card certo. |
| Cards de menu hoje (psicólogo) | `src/screens/home.js:103-141`: cards **Registros de Odisseia** → `RegistrosOdisseia`, **Sementes do Cuidado** → `SementesCuidado`, **Guias do Apoio** → `GuiasApoio`, **Meus Pacientes** → `VinculosPacientes`. "Sessões de Hoje" é uma seção separada (não um card), com link "ver todas" → `Sessoes` (`home.js:144-149`). | Cards existentes o suficiente para os 3 assuntos pedidos (Odisseia, Sementes, Sessões via o link). |
| Cards de menu hoje (paciente) | `src/screens/homePaciente.js` (grade "Ferramentas", após a remoção do card de Prontuários): **Odisseia** → `RegistrosOdisseia`, **Sessões** → `MinhasSessoes`, **Sementes** → `SementesPaciente`. | Idem — os 3 assuntos pedidos já têm card correspondente. |
| Mistura de `tipo` dedicado e `evento` genérico | Nem toda notificação usa um `tipo` (`TIPO_CHOICES`) específico para o assunto: `sessao_agendada`, `sessao_cancelada`, `nova_semente`, `novo_registro` e `comentario_psicologo` são tipos dedicados, mas `sessao_realizada`, `sessao_nao_realizada` (`sessoes/views.py`) e `semente_curtida` (`engajamentos/views.py:126`) usam `tipo='sistema'`, discriminados apenas por `dados_extras['event']`. | Qualquer consulta "notificações do assunto X" precisa olhar tanto `tipo` quanto `dados_extras__event`, não apenas `tipo`. |

### 2.2 Contagem de visualizações de Sementes travada em zero

| Tema | Estado atual | Impacto |
|---|---|---|
| Endpoint de visualização nunca é chamado | `pacienteService.visualizarSemente(id)` (`src/services/pacienteService.js:87-94`) chama `POST /sementes-cuidado/{id}/visualizar/`, mas **nenhuma tela do app chama esse método** — confirmado por busca em todo `src/screens/`. | `MensagemPaciente.marcar_como_visualizada()` nunca é executado no fluxo real de uso; `total_visualizacoes` só poderia crescer por essa via, que está morta. |
| Bug no incremento embutido em "curtir" | `MensagemPaciente.marcar_como_curtida()` (`psicoapp_backend/engajamentos/models.py:386-399`) tenta contar a curtida também como uma visualização (para o caso comum de o paciente nunca ter chamado `/visualizar/` antes): primeiro faz `if not self.visualizada_em: self.visualizada_em = timezone.now()` (define o campo), e **só depois** verifica `if not self.visualizada_em: self.semente.total_visualizacoes += 1` — como `visualizada_em` acabou de ser preenchido duas linhas acima, essa segunda checagem nunca é verdadeira. O incremento de `total_visualizacoes` é, portanto, inalcançável nesse caminho. | Curtir uma semente sem visualização prévia (o único caminho que existe hoje, já que `/visualizar/` nunca é chamado) sempre incrementa `total_curtidas` corretamente, mas **nunca** incrementa `total_visualizacoes` — exatamente o sintoma relatado: like registrado, visualização zerada. |
| Exibição já existe e está correta | O contador de visualizações no card do psicólogo (`src/screens/sementesCuidado.js`, adicionado em `SPEC_CORRECAO_ERROS_SESSOES_SEMENTES.md`) já lê `item.total_visualizacoes` corretamente — o problema é 100% no valor gravado pelo backend, não na exibição. | Nenhuma mudança de frontend é necessária além de, opcionalmente, disparar a visualização real. |

### 2.3 `Alert.alert` nativo sem identidade visual

| Tema | Estado atual | Impacto |
|---|---|---|
| Volume de uso | `Alert.alert` é chamado **90 vezes** em **19 arquivos** de `src/screens/` (busca `grep -rn "Alert\.alert"`). Nenhum uso de `Alert.prompt`. | Troca precisa ser ampla, mas o padrão de chamada é uniforme (título, mensagem, array opcional de botões com `text`/`style`/`onPress`), o que viabiliza uma solução "encaixe direto" sem reescrever cada chamada. |
| Arquivos afetados | `agendarSessao.js`, `cadastroPacientes.js`, `cadastroPsicologos.js`, `completarCadastroGoogle.js`, `conexaoTerapeutica.js`, `confirmarVinculoGoogle.js`, `detalhesSessao.js`, `login.js`, `meuPerfil.js`, `perfilPsicologo.js`, `prontuarios.js`, `redefinirSenha.js`, `registrosOdisseia.js`, `relatorios.js`, `sementesCuidado.js`, `sementesPaciente.js`, `sessoes.js`, `tipoSessao.js`, `vinculosPacientes.js`. | Lista fecha o escopo da migração; nenhum outro arquivo usa `Alert`. |
| Nenhum componente de modal/diálogo customizado existe hoje | `src/components/common/` só tem `Button.js`, `NivelChip.js`, `NivelSlider.js`, `TextAreaCard.js`, `TextInputField.js`. Nenhum uso de `Modal` do React Native em `src/`. | Componente novo, sem conflito com nada existente. |
| Identidade visual de referência | Já estabelecida em várias telas: verde principal `#11B5A4`, vermelho de alerta/destrutivo `#EF5350`, fonte `RalewayBold` para títulos e ações, `Raleway`/texto padrão para corpo, cartões brancos com cantos arredondados (`borderRadius: 12`) e sombra leve. | Referência suficiente para o novo componente não precisar inventar uma paleta nova. |

---

## 3. Requisitos funcionais

### 3.1 Badges de novidade nos cards do menu

#### Comportamento esperado

- Nos cards **Odisseia**, **Sementes** e **Sessões** (chamado "ver todas" no caso do psicólogo) das telas Home de ambos os perfis, exibir um indicador visual (um ponto/badge, sem número) quando existir pelo menos uma notificação não lida relacionada àquele assunto para o usuário logado.
- O indicador some assim que o usuário **visita a tela correspondente** (não é necessário abrir a tela de Notificações separadamente) — abrir `SementesPaciente`/`SementesCuidado` limpa o badge de Sementes, abrir `MinhasSessoes`/`Sessoes` limpa o de Sessões, abrir `RegistrosOdisseia` limpa o de Odisseia.
- Isso é feito marcando como lidas (`lida=True`) as notificações daquele assunto ao focar a tela — reaproveitando o mesmo campo `lida` que já governa a contagem do sininho e a tela de Notificações, sem introduzir um segundo controle de estado "visto"/"não visto".
- O sininho de notificações e a tela de Notificações continuam funcionando exatamente como hoje (contagem geral, marcação individual, "ler todas").
- Sem contagem numérica nos cards nesta entrega — apenas presença/ausência do indicador (uma contagem exata pode ser um incremento futuro, fora de escopo aqui).

#### Mapeamento assunto → notificações que acendem o badge

| Assunto (card) | Tela(s) que limpam o badge ao focar | `tipo` e/ou `dados_extras.event` que contam |
|---|---|---|
| **Sementes** | `SementesPaciente` (paciente), `SementesCuidado` (psicólogo) | `tipo='nova_semente'` **ou** `dados_extras.event='semente_curtida'` |
| **Sessões** | `MinhasSessoes` (paciente), `Sessoes` (psicólogo) | `tipo` em `['sessao_agendada', 'sessao_cancelada']` **ou** `dados_extras.event` em `['sessao_realizada', 'sessao_nao_realizada']` |
| **Odisseia** | `RegistrosOdisseia` (ambos os perfis, mesma tela compartilhada) | `tipo` em `['novo_registro', 'comentario_psicologo']` |

`sessao_lembrete` **não** acende o badge de Sessões — é um lembrete de algo que o usuário já sabe, não uma novidade de estado. Notificações fora dessas três categorias (`sistema` genérico de boas-vindas, `novo_vinculo`, `vinculo_alterado`, `pagamento_confirmado`, `pagamento_pendente`, `meta_vencendo`) não acendem nenhum card — continuam visíveis apenas na tela de Notificações, sem mudança de comportamento.

#### Alterações previstas

**`psicoapp_backend/core/views.py` — `NotificacaoViewSet`**

- Constante de mapeamento assunto → filtro (categorias `sementes`, `sessoes`, `odisseia`), reaproveitável pelos dois novos endpoints abaixo.
- Nova action `@action(detail=False, methods=['get'], url_path='resumo-por-categoria')`: para cada categoria, verifica `self.get_queryset().filter(lida=False).filter(<condição da categoria>).exists()` e retorna `{"sementes": bool, "sessoes": bool, "odisseia": bool}`.
- Nova action `@action(detail=False, methods=['post'], url_path='marcar-categoria-lida')`: recebe `{"categoria": "sementes"|"sessoes"|"odisseia"}`, marca como lidas (`lida=True`, `data_leitura=timezone.now()`) todas as notificações não lidas do usuário que casarem com aquela categoria. Retorna `204` ou o resumo atualizado.

**`src/services/notificationService.js`** (ou novo arquivo de serviço dedicado, a critério da issue)

- `getResumoPorCategoria()` → `GET /notificacoes/resumo-por-categoria/`.
- `marcarCategoriaLida(categoria)` → `POST /notificacoes/marcar-categoria-lida/`.

**`src/screens/home.js` e `src/screens/homePaciente.js`**

- Buscar o resumo por categoria junto com o restante dos dados já carregados no `useFocusEffect`/`Promise.all` existente.
- Renderizar um pequeno badge (bolinha vermelha, ex. `#EF5350`, posicionamento absoluto no canto do card/ícone) condicionado a `resumo.sementes`/`resumo.sessoes`/`resumo.odisseia`.

**`src/screens/sementesPaciente.js`, `src/screens/sementesCuidado.js`, `src/screens/minhasSessoes.js`, `src/screens/sessoes.js`, `src/screens/RegistrosOdisseia.js`**

- No `useFocusEffect` de cada uma, chamar `marcarCategoriaLida('sementes'|'sessoes'|'odisseia')` correspondente.

---

### 3.2 Corrigir contagem de visualizações de Sementes

#### Comportamento esperado

- `total_visualizacoes` de uma semente aumenta em exatamente 1 na primeira vez que um dado paciente a visualiza — seja por uma chamada explícita de "visualizar", seja implicitamente pela primeira curtida (quando o paciente curte sem ter "visualizado" antes, o que é o fluxo real de uso hoje).
- Curtidas subsequentes do mesmo paciente na mesma semente nunca voltam a incrementar `total_visualizacoes` nem `total_curtidas` (comportamento de "uma vez só" já correto para curtidas, e que passa a valer também para visualizações).
- Uma visualização real (abrir a tela e ver a semente) passa a ser contabilizada de fato, não apenas quando o paciente curte.

#### Causa raiz e correção

**`psicoapp_backend/engajamentos/models.py` — `MensagemPaciente.marcar_como_curtida()`**

- Capturar se a mensagem **já** tinha `visualizada_em` preenchido **antes** de qualquer atribuição nesta chamada (ex.: `ja_tinha_visualizado = bool(self.visualizada_em)`), e usar essa variável — não o campo já mutado — para decidir se `total_visualizacoes` deve ser incrementado.

**`src/screens/sementesPaciente.js`**

- Ao carregar a lista (`carregar()`), para cada semente com `ja_visualizada` falso (campo já exposto pelo serializer, adicionado em `SPEC_CORRECAO_ERROS_SESSOES_SEMENTES.md`), chamar `pacienteService.visualizarSemente(id)` uma vez, e refletir `ja_visualizada: true` no estado local para não repetir a chamada em recargas subsequentes dentro da mesma sessão do componente.
- Isso passa a contabilizar visualizações reais (o paciente efetivamente abriu a tela e viu a semente), independentemente de curtir ou não.

---

### 3.3 Alertas customizados com identidade visual do PsicoBem

#### Comportamento esperado

- Toda vez que o app hoje mostraria o alerta nativo do sistema operacional, deve aparecer um modal customizado com a identidade visual do PsicoBem (verde `#11B5A4`, fonte `Raleway`/`RalewayBold`, cantos arredondados), mantendo o mesmo comportamento funcional: título, mensagem, um ou mais botões, com suporte aos estilos já usados hoje (`cancel`, `destructive`, padrão/confirmação).
- Nenhuma tela precisa ser reescrita ponto a ponto: a troca deve ser feita trocando a fonte do `Alert` usado (import) em cada um dos 19 arquivos listados na seção 2.3, preservando os 90 pontos de chamada exatamente como estão hoje (mesma assinatura `título, mensagem, [botões]`).

#### Alterações previstas

**`src/components/common/CustomAlert.js`** (novo)

- Um `Provider` (ex. `<CustomAlertProvider>`) que renderiza um `Modal` do React Native, montado uma única vez próximo da raiz do app (mesmo nível de `AuthProvider`/`NavigationContainer`).
- Uma função imperativa exportada com a **mesma assinatura** de `Alert.alert(title, message, buttons, options)`, implementada via uma referência de módulo (padrão comum para expor uma API imperativa a partir de um Provider React) — de forma que cada tela troque apenas a origem do import (`react-native` → o novo componente) sem alterar nenhuma chamada existente.
- Suporte aos três estilos de botão já usados no app: padrão (botão preenchido `#11B5A4`), `cancel` (contorno/neutro), `destructive` (`#EF5350`).
- Comportamento de fechamento: toque em qualquer botão fecha o modal e executa o `onPress` correspondente; sem botão algum informado, comporta-se como um único botão "OK" (mesma regra do `Alert.alert` nativo).

**Os 19 arquivos listados na seção 2.3**

- Trocar a importação de `Alert` (de `"react-native"`) pela do novo componente. Nenhuma outra linha dessas telas muda.

**Ponto de montagem do Provider**

- A definir na issue de implementação, ao lado de onde `AuthProvider`/`NavigationContainer` já são montados hoje (raiz do app).

---

## 4. Autorização e privacidade

- As duas novas actions de `NotificacaoViewSet` (seção 3.1) reaproveitam o mesmo `get_queryset()` já existente (`core/views.py:290-296`), que já restringe cada usuário às suas próprias notificações — nenhuma regra de autorização nova é necessária nem alterada.
- Nenhuma das três frentes desta SPEC expõe dado novo a um perfil que não devia vê-lo.

---

## 5. Critérios de aceite

### Badges de novidade

- [ ] Uma nova sessão agendada acende o badge de "Sessões" para o paciente e para o psicólogo (conforme o destinatário da notificação).
- [ ] Uma nova semente publicada acende o badge de "Sementes" para o paciente.
- [ ] Uma curtida em semente acende o badge de "Sementes" para o psicólogo dono.
- [ ] Um novo registro de Odisseia compartilhado acende o badge de "Odisseia" para o psicólogo; um comentário do psicólogo acende o badge de "Odisseia" para o paciente.
- [ ] Abrir a tela correspondente apaga o badge daquele assunto, sem apagar badges de outros assuntos nem a contagem geral de notificações não lidas de eventos fora das três categorias.
- [ ] O sininho de notificações e a tela de Notificações continuam mostrando e permitindo ler todas as notificações, sem regressão.
- [ ] Um lembrete de sessão (`sessao_lembrete`) não acende o badge de Sessões.

### Visualizações de Sementes

- [ ] Uma curtida em semente nunca antes visualizada incrementa `total_visualizacoes` em 1, além de `total_curtidas`.
- [ ] Uma segunda curtida (já curtida) não incrementa nenhum dos dois contadores de novo.
- [ ] Abrir a tela de Sementes como paciente incrementa `total_visualizacoes` das sementes ainda não visualizadas, mesmo sem curtir.
- [ ] O card de Sementes do psicólogo passa a mostrar contagens de visualização condizentes com o uso real.

### Alertas customizados

- [ ] Todo ponto que hoje chama `Alert.alert` (nos 19 arquivos listados) passa a exibir o modal customizado, com título, mensagem e botões equivalentes.
- [ ] Botões com `style: 'destructive'` (ex. excluir, cancelar sessão) e `style: 'cancel'` mantêm a diferenciação visual esperada.
- [ ] Nenhum fluxo que dependia do `onPress` de um botão do alerta (ex. confirmar exclusão, navegar após sucesso) quebra.
- [ ] Nenhuma chamada de `Alert.alert` nativo permanece em `src/`.

### Regressão geral

- [ ] Login, cadastro, agendamento de sessão e demais fluxos que hoje usam `Alert.alert` continuam funcionando de ponta a ponta.
- [ ] `git diff --check` sem apontamentos.

---

## 6. Testes e validação

### Backend

- Teste de `resumo-por-categoria`: criar notificações de cada tipo/evento mapeado e confirmar que a categoria certa (e só ela) aparece como `true`.
- Teste de `marcar-categoria-lida`: confirmar que marca como lidas apenas as notificações da categoria informada, sem afetar as demais.
- Teste de regressão do bug de visualização: curtir uma semente nunca visualizada e verificar `total_visualizacoes == 1` e `total_curtidas == 1`; curtir de novo e verificar que nenhum dos dois muda.
- Rodar a suíte completa (`core`, `engajamentos`, `sessoes`, `authentication`).

### Frontend

- Provocar cada um dos quatro eventos (nova sessão, nova semente, like, novo registro) em ambientes de teste e confirmar visualmente o badge no card certo, em ambos os perfis quando aplicável.
- Abrir a tela correspondente e confirmar que o badge some ao voltar para a Home.
- Testar pelo menos um alerta de cada estilo (informativo simples, confirmação com `cancel`+padrão, confirmação com `destructive`) após a troca do componente, em pelo menos 3 telas diferentes das 19 listadas.
- Confirmar visualmente que a Sementes do psicólogo mostra visualizações > 0 após um paciente abrir a tela de Sementes.

---

## 7. Fora de escopo

- Contagem numérica nos badges dos cards (apenas indicador binário nesta entrega).
- Badges nos cards **Guias do Apoio**, **Meus Pacientes**, **Perfil** ou qualquer card fora dos três assuntos pedidos.
- Qualquer notificação nova além das já existentes (não é objetivo desta SPEC ativar os tipos ainda não usados listados em `SPEC_NOVAS_NOTIFICACOES.md`, como `meta_vencendo` ou `pagamento_pendente`).
- Suporte a `Alert.prompt` (não usado hoje em nenhuma tela).
- Redesenho visual das telas além da introdução do novo componente de alerta.
- Botão de badge/contador no ícone do app (badge do sistema operacional) — fora de escopo, tema de push nativo já coberto por `SPEC_NOVAS_NOTIFICACOES.md`.
- Criação das issues de implementação nesta etapa; serão derivadas desta SPEC somente após aprovação.

---

## 8. Ordem sugerida de implementação

1. Corrigir o bug de `marcar_como_curtida()` no backend (isolado, baixo risco, testável imediatamente).
2. Implementar `resumo-por-categoria` e `marcar-categoria-lida` no backend, com testes.
3. Construir `CustomAlert.js` e validar visualmente em uma tela piloto antes de propagar.
4. Migrar os 19 arquivos para o novo `Alert` (mudança mecânica, arquivo por arquivo).
5. Ligar os badges nas telas Home (fetch do resumo) e o "marcar como lida" nas cinco telas de destino.
6. Wire-up de `visualizarSemente()` em `sementesPaciente.js`.
7. Testes de ponta a ponta dos três itens, incluindo os cenários de regressão da seção 6.
