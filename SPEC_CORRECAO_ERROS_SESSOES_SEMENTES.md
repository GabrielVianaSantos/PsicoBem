# SPEC — Correção de Erros: Falta em Sessão, Edição de Sementes e Horário Divergente

Data: 2026-09-12
Status: planejamento
Escopo: três correções independentes, reportadas pelo usuário, no app Expo (telas de sessões e sementes do cuidado) e na API Django (`sessoes`, `engajamentos`, notificações). Nenhuma alteração de fluxo de autenticação ou de outras áreas do produto.

---

## 1. Objetivo

Corrigir três defeitos distintos, sem relação de dependência entre si, mas agrupados nesta SPEC por serem pequenos e terem sido reportados juntos:

1. **Falta em sessão**: o psicólogo não tem como marcar uma sessão como "não realizada" quando o paciente cancela em cima da hora ou não comparece — hoje a única ação disponível nesse cenário é marcá-la, incorretamente, como "Realizada".
2. **Sementes do Cuidado sem edição/exclusão**: a tela do psicólogo só permite criar e listar sementes; erros de digitação ou conteúdo publicado por engano não podem ser corrigidos nem removidos.
3. **Horário divergente entre cards**: na tela "Minhas Sessões" do paciente, o card "Próxima Sessão" mostra um horário diferente do mesmo horário exibido no card da lista abaixo (a data bate, a hora não) — a causa raiz afeta também outras telas.

---

## 2. Estado atual identificado (causa raiz por item)

### 2.1 Falta em sessão

| Tema | Estado atual | Impacto |
|---|---|---|
| Status já modelado | `Sessao.STATUS_CHOICES` já inclui `('faltou', 'Paciente Faltou')` (`psicoapp_backend/sessoes/models.py`). Telas `sessoes.js` e `detalhesSessao.js` já têm cor mapeada para esse status (`getStatusColor`). | O status existe no domínio e no visual, mas nunca é atingível — não há nenhum caminho no código que grave `status='faltou'`. |
| Regra de cancelamento é só para o futuro | `Sessao.pode_ser_cancelada()` exige `data_hora > timezone.now()`. Uma sessão cujo horário já passou **não pode mais ser cancelada**. | Se o paciente não comparece (o horário já passou no momento em que o psicólogo abre o app), a ação "Cancelar" já não aparece (`pode_cancelar=False`). |
| Única ação restante é "Realizar" | `Sessao.pode_ser_realizada()` não tem restrição de tempo; `pode_realizar` fica `True` para qualquer sessão em `agendada`/`confirmada`/`remarcada`, passada ou futura. | O psicólogo é forçado a marcar como "Realizada" uma sessão que na verdade foi uma falta do paciente, distorcendo o histórico e as estatísticas de sessões realizadas. |
| Nenhum endpoint expõe a transição | `psicoapp_backend/sessoes/views.py` tem as actions `cancelar` e `realizar`, mas nenhuma para `faltou`. `src/services/sessaoService.js` não tem método correspondente. | Não há como acionar esse status nem pelo app nem por chamada direta documentada à API. |
| Paciente não teria como ver o novo status | `src/screens/minhasSessoes.js` define `STATUS_CONFIG` e `FILTROS` apenas com `agendada`, `confirmada`, `realizada`, `cancelada`. | Uma sessão marcada `faltou` cairia no fallback `STATUS_CONFIG.agendada` (rótulo "Agendada", errado) e não apareceria em nenhum filtro de status específico. |

### 2.2 Sementes do Cuidado sem edição/exclusão

| Tema | Estado atual | Impacto |
|---|---|---|
| Backend já suporta CRUD completo | `SementeCuidadoViewSet` (`psicoapp_backend/engajamentos/views.py`) é um `ModelViewSet` registrado via `DefaultRouter` (`engajamentos/urls.py`), o que já expõe `PUT`/`PATCH`/`DELETE /sementes-cuidado/{id}/` automaticamente. `SementeCuidadoSerializer` permite editar `titulo`, `conteudo`, `tipo`, `status` e `publica` (`read_only_fields` cobre só `id`, `psicologo`, `created_at`, `updated_at`, contadores). | Falta apenas expor essas operações na interface do psicólogo — não é necessário criar rota nova no backend. |
| Gap de permissão em `update`/`destroy` | `get_queryset()` do `SementeCuidadoViewSet` retorna, para o paciente, as sementes **do psicólogo vinculado** (não sementes próprias). Como a viewset não sobrescreve `update`/`partial_update`/`destroy` nem adiciona uma permissão de objeto own-only, um paciente autenticado que descubra o `id` de uma semente do seu psicólogo pode, hoje, chamar `PATCH`/`DELETE /sementes-cuidado/{id}/` diretamente na API e alterar/apagar conteúdo que não é seu. `perform_create` já bloqueia criação por paciente, mas não há proteção equivalente para editar/excluir. | Falha de autorização real na API (não apenas ausência de UI): paciente pode editar ou apagar mensagens do psicólogo, mesmo sem esse botão existir no app. Precisa ser corrigida junto com a feature, pois habilitar edição no app sem fechar esse gap deixaria a falha mais fácil de ser descoberta. |
| Tela do psicólogo só cria/lista | `src/screens/sementesCuidado.js` tem o formulário "Plantar Nova Semente" e a lista "Seu Jardim de Sementes", mas cada card (`estilos.cardSemente`) é somente leitura — sem botão de editar ou excluir. | Erros de digitação ou publicações indevidas ficam permanentes até uma intervenção manual no banco. |
| Serviço sem métodos de update/delete | `src/services/odisseiaService.js` só tem `getSementesCuidado` e `createSementeCuidado`. | Frontend não tem como chamar as rotas que já existem no backend. |

### 2.3 Horário divergente entre cards (causa raiz sistêmica)

| Tema | Estado atual | Impacto |
|---|---|---|
| Configuração do projeto | `psicoapp_backend/psicoapp_backend/settings.py` tem `USE_TZ = True` e `TIME_ZONE = 'America/Sao_Paulo'`. Com `USE_TZ=True`, o Django armazena e mantém `data_hora` internamente como datetime **timezone-aware em UTC**. | Qualquer `.strftime()` chamado **diretamente** sobre um valor desses formata os componentes de hora em **UTC**, não em horário de Brasília — só fica correto se antes for convertido com `django.utils.timezone.localtime(...)`. |
| Card "Próxima Sessão" usa o campo quebrado | `SessaoDetailSerializer.get_data_hora_formatada()` (`psicoapp_backend/sessoes/serializers.py:141`) faz `obj.data_hora.strftime('%d/%m/%Y às %H:%M')` sem `timezone.localtime()`. O endpoint `GET /sessoes/proxima/` usa esse serializer, e `src/screens/minhasSessoes.js:68` exibe exatamente esse campo (`proxima.data_hora_formatada`). | O card "Próxima Sessão" mostra a hora em UTC (3h a menos que o horário real de Brasília, no horário padrão vigente). |
| Cards da lista usam o campo cru, formatado no app | Os cards abaixo (`src/screens/minhasSessoes.js:99-113`) usam `sessao.data_hora` (o campo ISO cru, não o `_formatado`) e formatam a hora no cliente com `new Date(sessao.data_hora).toLocaleTimeString('pt-BR', ...)`, que já converte corretamente para o fuso do dispositivo. | Essa lista mostra a hora **certa** — daí a divergência: mesma sessão, dois horários diferentes na mesma tela, um deles errado. |
| Mesma causa raiz em outras telas | `SessaoListSerializer.get_data_hora_formatada()` (linha 102, usada por `GET /sessoes/`) e o campo `data_hora_formatada` montado em `paciente_dashboard_view` (`psicoapp_backend/authentication/views.py:290`, consumido pelo card de próxima sessão em `src/screens/homePaciente.js:129`) têm o mesmo bug. `src/screens/detalhesSessao.js:176` também exibe `sessao.data_hora_formatada` vindo do mesmo serializer quebrado. | O problema não está isolado em "Minhas Sessões": a tela inicial do paciente (`HomePaciente`) e a tela de detalhes de qualquer sessão (`DetalhesSessao`, usada por paciente e psicólogo) também mostram a hora errada da sessão. |
| Mesma causa raiz em mensagens de notificação | `.strftime()` direto sobre `data_hora` aparece também em: `core/services.py:88` (mensagem "Sessão Agendada", disparada para paciente e psicólogo ao criar sessão), `sessoes/views.py:180` (mensagem "Sessão Cancelada"), `sessoes/models.py:309` (mensagem de "Pagamento Confirmado"), `sessoes/tasks.py:32` (lembrete de pagamento atrasado) e `notificacoes_push/tasks.py:273` (lembretes push de 24h/2h/15min antes da sessão). | Toda mensagem de notificação (inbox e push) que cita o horário da sessão está mostrando a hora errada para o usuário final, incluindo os lembretes que chegam no celular pouco antes do horário real da sessão. |
| Não afetados (fora de escopo) | `Sessao.__str__` (linha 233, só aparece no Django Admin), `RegistroOdisseia.__str__`/`data_hora_completa` (`engajamentos/models.py:670,677` — usam `data_registro`, um `DateField`, e `hora_registro`, um `TimeField` ingênuo; não são datetime timezone-aware, não sofrem esse bug), `core/signals.py:118` (mesmo caso, `data_registro` é `DateField`), e os comandos de seed (`popular_dados_completos.py`, `criar_sementes_exemplo.py`, usados só em desenvolvimento). | Confirmar que o fix não precisa (nem deve) tocar nesses pontos. |

---

## 3. Requisitos funcionais

### 3.1 Marcar sessão como "Não Realizada" (falta do paciente)

#### Comportamento esperado

- Na tela de detalhes de uma sessão (`DetalhesSessao`), quando o usuário logado for o **psicólogo** dono da sessão e ela estiver em `agendada`, `confirmada` ou `remarcada` (mesma elegibilidade hoje usada por "Marcar como Realizada"), deve aparecer um botão adicional **"Marcar como Não Realizada"**, distinto do botão "Marcar como Realizada".
- Confirmação por `Alert` antes de efetivar, no mesmo padrão das ações existentes (`cancelarSessao`, `realizarSessao`).
- Ao confirmar, a sessão passa para o status `faltou` ("Paciente Faltou"), sem alterar `status_pagamento` (mantém o valor atual — o psicólogo decide separadamente se cobra ou não a sessão perdida, assim como já ocorre hoje ao cancelar).
- O paciente recebe uma notificação informando que a sessão foi marcada como não realizada, no mesmo padrão das notificações já emitidas para cancelamento.
- Este botão só aparece para o psicólogo — ao contrário de "Cancelar"/"Realizar" (que hoje não têm essa distinção de papel na tela, comportamento pré-existente e fora de escopo desta correção), marcar falta é uma decisão exclusiva de quem conduz o atendimento.
- No app do paciente, uma sessão com status `faltou` deve exibir rótulo e cor consistentes (reaproveitando o padrão de cores já usado em `sessoes.js`/`detalhesSessao.js`) e aparecer corretamente sob um filtro próprio em "Minhas Sessões", em vez de cair no filtro/rótulo padrão de "Agendada".

#### Alterações previstas

**`psicoapp_backend/sessoes/models.py`**
- Adicionar `Sessao.pode_ser_marcada_falta()`, com a mesma regra de `pode_ser_realizada()` (`status in ['agendada', 'confirmada', 'remarcada']`).

**`psicoapp_backend/sessoes/views.py`**
- Nova action `@action(detail=True, methods=['post'], url_path='nao-realizada')` no `SessaoViewSet`, restrita a psicólogo (`if not hasattr(request.user, 'psicologo_profile')`, mesmo padrão de `confirmar_pagamento`), que:
  - valida `pode_ser_marcada_falta()`;
  - grava `status = 'faltou'`;
  - emite notificação para o paciente (`NotificationDomainService.emit`, reaproveitando o formato de rota usado em `cancelar`).

**`psicoapp_backend/sessoes/serializers.py`**
- Adicionar `pode_marcar_falta` (`SerializerMethodField`) em `SessaoListSerializer` e `SessaoDetailSerializer`, espelhando `get_pode_realizar`.

**`src/services/sessaoService.js`**
- Novo método `marcarNaoRealizada(id)` → `POST /sessoes/{id}/nao-realizada/`, no mesmo padrão de `cancelarSessao`/`confirmarRealizacao`.

**`src/screens/detalhesSessao.js`**
- Importar `useAuth` para checar `userType === 'psicologo'`.
- Nova função `marcarNaoRealizada()` com `Alert` de confirmação, análoga a `realizarSessao()`.
- Novo botão condicionado a `userType === 'psicologo' && sessao.pode_marcar_falta`, com cor distinta (reaproveitar `#8D6E63`, já usado como cor do status `faltou`).

**`src/screens/minhasSessoes.js`**
- Adicionar `faltou` a `STATUS_CONFIG` (rótulo "Não Realizada") e a `FILTROS`.

---

### 3.2 Editar e excluir Sementes do Cuidado (visão do psicólogo)

#### Comportamento esperado

- Cada card em "Seu Jardim de Sementes" (`sementesCuidado.js`) ganha duas ações: **editar** e **excluir**, visíveis apenas para o psicólogo autor.
- Editar abre o mesmo formulário (título/conteúdo) pré-preenchido com os dados atuais da semente; salvar atualiza a semente existente em vez de criar uma nova.
- Excluir pede confirmação (`Alert`) antes de remover definitivamente.
- A lista de sementes é recarregada após editar ou excluir com sucesso.
- Nenhuma mudança na experiência do paciente (`sementesPaciente.js` continua somente leitura + curtir/visualizar).

#### Alterações previstas

**`psicoapp_backend/engajamentos/views.py`**
- Corrigir o gap de permissão: sobrescrever `update`/`partial_update`/`destroy` (ou adicionar uma checagem de objeto equivalente, ex. `get_object()` customizado, ou uma `permission_classes` de objeto dedicada) em `SementeCuidadoViewSet` para garantir que **somente o psicólogo dono** (`instance.psicologo == request.user.psicologo_profile`) possa editar ou excluir — hoje a única barreira é o `get_queryset()`, que não impede escrita em objetos de terceiros quando o paciente os enxerga em modo leitura.
- Sem mudança de schema; `SementeCuidadoSerializer` já aceita os campos necessários.

**`src/services/odisseiaService.js`**
- Novo método `updateSementeCuidado(id, dados)` → `PATCH /sementes-cuidado/{id}/`.
- Novo método `deleteSementeCuidado(id)` → `DELETE /sementes-cuidado/{id}/`.

**`src/screens/sementesCuidado.js`**
- Estado para controlar edição (`sementeEmEdicao`), reaproveitando os mesmos campos `titulo`/`conteudo` do formulário de criação (formulário único que alterna entre "criar" e "editar").
- Botões de editar/excluir em cada `cardSemente` (ícones `create-outline`/`trash-outline`, consistente com o restante do app).
- Ao editar: preencher o formulário, trocar o texto/ação do botão de salvar para "Salvar Alterações" e cancelar a edição sem perder a lista.
- Ao excluir: `Alert` de confirmação → `deleteSementeCuidado` → recarregar lista.

---

### 3.3 Corrigir horário divergente (conversão para fuso local antes de formatar)

#### Comportamento esperado

- Toda exibição de horário de sessão (cards, telas de detalhe, mensagens de notificação in-app e push) deve mostrar o horário em `America/Sao_Paulo`, de forma consistente entre todos os pontos da tela e entre telas diferentes para a mesma sessão.

#### Causa raiz e correção

- Em todo ponto do backend que hoje chama `.strftime(...)` diretamente sobre um campo `DateTimeField` timezone-aware (`data_hora`), envolver o valor com `django.utils.timezone.localtime(...)` antes de formatar. Pontos identificados na seção 2.3:
  1. `psicoapp_backend/sessoes/serializers.py` — `SessaoListSerializer.get_data_hora_formatada()` e `SessaoDetailSerializer.get_data_hora_formatada()`.
  2. `psicoapp_backend/authentication/views.py` — `paciente_dashboard_view` (campo `data_hora_formatada` de `proxima_sessao`).
  3. `psicoapp_backend/core/services.py` — `NotificationDomainService.emit_session_created()` (mensagem "Sessão Agendada"); adicionar `from django.utils import timezone` (ainda não importado neste arquivo).
  4. `psicoapp_backend/sessoes/views.py` — action `cancelar` (mensagem "Sessão Cancelada").
  5. `psicoapp_backend/sessoes/models.py` — `Sessao.confirmar_pagamento()` (mensagem "Pagamento Confirmado").
  6. `psicoapp_backend/sessoes/tasks.py` — lembrete de pagamento atrasado.
  7. `psicoapp_backend/notificacoes_push/tasks.py` — `_build_reminder_message()` (lembretes push 24h/2h/15min).
- Não alterar `Sessao.__str__`, os métodos de `RegistroOdisseia` nem os comandos de seed (ver linha "Não afetados" da seção 2.3) — não usam datetime timezone-aware ou são apenas de desenvolvimento.
- Não alterar `USE_TZ`, `TIME_ZONE` nem o formato ISO retornado pelos campos brutos (`data_hora`) usados pelo frontend — a correção do frontend em `minhasSessoes.js` (que já converte corretamente via `new Date(...).toLocaleTimeString(...)`) não muda; ela serve de referência do comportamento correto.

---

## 4. Autorização e privacidade

- A nova action `nao-realizada` segue exatamente o padrão de autorização de `confirmar_pagamento`: bloqueada por `403` para quem não tiver `psicologo_profile`, e por `IsPacienteOrPsicologoOwner` para quem não for dono da sessão.
- A correção de permissão em `SementeCuidadoViewSet` (seção 3.2) **fecha uma falha de autorização existente** (paciente conseguindo escrever em conteúdo do psicólogo via chamada direta à API) — não é uma restrição nova sobre um comportamento intencional, é a aplicação da regra que já vale para `perform_create` também às operações de escrita restantes.
- Nenhum dado sensível novo é exposto; a correção de fuso horário (3.3) só corrige o valor exibido, sem mudar quais dados trafegam.

---

## 5. Critérios de aceite

### Falta em sessão

- [ ] Uma sessão em `agendada`/`confirmada`/`remarcada`, com horário já passado, mostra o botão "Marcar como Não Realizada" para o psicólogo dono, mesmo sem o botão "Cancelar" (que exige horário futuro).
- [ ] Confirmar a ação muda o status para `faltou`, sem alterar `status_pagamento`.
- [ ] O botão não aparece para o paciente, nem quando `pode_marcar_falta` for `true` no payload.
- [ ] O paciente recebe notificação informando a falta.
- [ ] Em "Minhas Sessões" (paciente), uma sessão `faltou` aparece com rótulo próprio e é filtrável.
- [ ] Sessões já `realizada`/`cancelada` não podem ser marcadas como `faltou` (endpoint retorna erro).

### Sementes do Cuidado

- [ ] O psicólogo consegue editar título e conteúdo de uma semente própria, e a lista reflete a alteração após salvar.
- [ ] O psicólogo consegue excluir uma semente própria, com confirmação prévia, e ela some da lista.
- [ ] Uma chamada direta `PATCH`/`DELETE /sementes-cuidado/{id}/` autenticada como paciente, para uma semente do psicólogo vinculado, é rejeitada (403/404).
- [ ] Um psicólogo não consegue editar/excluir semente de outro psicólogo (segue não aparecendo no seu queryset).
- [ ] A visão do paciente (`sementesPaciente.js`) não sofre nenhuma alteração visual ou funcional.

### Horário divergente

- [ ] O card "Próxima Sessão" em `MinhasSessoes` mostra exatamente o mesmo horário do card correspondente na lista abaixo, para a mesma sessão.
- [ ] O card de próxima sessão em `HomePaciente` mostra o horário correto (igual ao exibido em `DetalhesSessao`/`MinhasSessoes`).
- [ ] `DetalhesSessao` mostra o horário correto para sessões de paciente e de psicólogo.
- [ ] A notificação de "Sessão Agendada" (inbox e push) mostra o horário correto no momento da criação da sessão.
- [ ] A notificação de "Sessão Cancelada" mostra o horário correto.
- [ ] Os lembretes push (24h/2h/15min) mostram o horário correto da sessão.
- [ ] Nenhuma outra tela que já exibia o horário corretamente (ex.: cards que usam `new Date(data_hora)` no cliente) teve seu comportamento alterado.

### Regressão geral

- [ ] Fluxos de cancelar, remarcar, realizar e confirmar pagamento continuam funcionando exatamente como antes.
- [ ] `git diff --check` sem apontamentos.

---

## 6. Testes e validação

### Backend

- Teste de modelo: `pode_ser_marcada_falta()` para cada valor de `STATUS_CHOICES`.
- Teste de view: `POST /sessoes/{id}/nao-realizada/` — sucesso (muda status, preserva `status_pagamento`, dispara notificação), rejeição para não-psicólogo (403), rejeição para status inelegível (400), rejeição para sessão de outro psicólogo (404).
- Teste de permissão: paciente autenticado tentando `PATCH`/`DELETE` em semente de outro dono (psicólogo vinculado) → deve falhar; psicólogo dono editando/excluindo a própria semente → deve funcionar.
- Teste de serializer/formatação: comparar `data_hora_formatada` (após a correção) com `django.utils.timezone.localtime(sessao.data_hora).strftime(...)` calculado manualmente no teste, usando uma sessão com `data_hora` criada explicitamente em UTC, para garantir que o valor exibido é o horário de Brasília e não o horário cru salvo.
- Rodar a suíte completa dos apps `sessoes`, `engajamentos` e `authentication` para checar ausência de regressão.

### Frontend

- `DetalhesSessao` como psicólogo: sessão futura elegível mostra "Cancelar" e "Marcar como Realizada"; sessão passada elegível mostra apenas "Marcar como Não Realizada" e "Marcar como Realizada" (sem "Cancelar").
- `DetalhesSessao` como paciente: nunca mostra o botão "Marcar como Não Realizada".
- `SementesCuidado`: criar, editar e excluir uma semente de teste; confirmar que a lista atualiza em cada operação e que cancelar uma edição não perde os dados da lista.
- `MinhasSessoes`: com uma sessão de teste, comparar visualmente o horário do card "Próxima Sessão" com o horário do mesmo item na lista de baixo — devem ser idênticos.
- `HomePaciente`: comparar o horário do card de próxima sessão com o horário mostrado em `DetalhesSessao` para a mesma sessão.

---

## 7. Fora de escopo

- Restringir "Cancelar"/"Realizar" a um papel específico (comportamento pré-existente, não solicitado).
- Qualquer nova estatística de "faltas" em `relatorios.js` ou em `estatisticas_psicologo`.
- Cobrança automática ou lógica de multa por falta — o psicólogo decide manualmente sobre `status_pagamento`, como já ocorre hoje para cancelamento.
- Histórico de versões/edições de sementes, paginação nova ou qualquer mudança de schema em `SementeCuidado`.
- Qualquer mudança em `sementesPaciente.js`.
- Alterar `USE_TZ`, `TIME_ZONE`, ou qualquer `DateField`/`TimeField` não timezone-aware (`data_registro`, `hora_registro`, etc.).
- Alterar os comandos de seed (`popular_dados_completos.py`, `criar_sementes_exemplo.py`).
- Criação das issues de implementação nesta etapa; serão derivadas desta SPEC somente após aprovação.

---

## 8. Ordem sugerida de implementação

1. Fechar o gap de permissão de `SementeCuidadoViewSet` (segurança primeiro, independente das outras duas correções).
2. Corrigir a causa raiz do horário (todos os pontos da seção 3.3), por ser um fix mecânico e de baixo risco, e validar com teste de serializer antes de seguir.
3. Implementar a transição de status "faltou" no backend (`models.py`, `views.py`, `serializers.py`) e seus testes.
4. Implementar edição/exclusão de sementes no frontend (`odisseiaService.js`, `sementesCuidado.js`).
5. Implementar o botão "Marcar como Não Realizada" no frontend (`sessaoService.js`, `detalhesSessao.js`) e o novo status em `minhasSessoes.js`.
6. Testar os três fluxos ponta a ponta no app, incluindo os cenários de regressão da seção 6.
