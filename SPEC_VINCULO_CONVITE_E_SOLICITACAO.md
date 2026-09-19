# SPEC — Vínculo por Convite e Solicitação (Fase 1)

Data: 2026-09-18
Status: planejado
Escopo: backend Django (`core`, `authentication`, `sessoes`) e app Expo (telas de vínculo do paciente e do psicólogo). Inclui duas correções de segurança pré-requisito no fluxo de vínculo existente. **Não** inclui a vitrine/busca aberta de profissionais (SPEC futura) nem a verificação real de CRP junto ao CFP (ver `SPEC_VERIFICACAO_CRP.md`).

---

## 1. Objetivo

Hoje o único caminho para um paciente se vincular a um psicólogo é digitar o CRP do profissional. Isso é uma barreira real de adoção — ninguém sabe um CRP de cabeça — e, ao mesmo tempo, **não** é uma barreira de segurança, porque CRP é dado público.

Esta fase adiciona um caminho amigável (**convite gerado pelo psicólogo**, via link, QR ou código curto) e transforma o caminho por CRP em uma **solicitação que o profissional aceita ou recusa**, corrigindo de passagem dois defeitos do fluxo atual.

---

## 2. Estado atual identificado

| Tema | Estado atual | Impacto |
|---|---|---|
| CRP é o único caminho de vínculo | `src/screens/conexaoTerapeutica.js` é uma tela de input único de CRP, mascarado como `00/000000`. Acessível por `homePaciente.js:116` e por `meuPsicologo.js:47` e `:109`. | Barreira de entrada. É o problema que origina esta SPEC. |
| O CRP funciona como se fosse senha, mas é público | `conecta_psicologo_view` (`authentication/views.py:203`) busca `Psicologo.objects.get(crp=...)` e **já cria o vínculo com `status='ativo'`**, notificando o psicólogo só depois do fato consumado. CRP é consultável publicamente no Cadastro Nacional do CFP e é divulgado pelos próprios profissionais. | Qualquer pessoa que digite um CRP válido entra na lista de pacientes ativos daquele profissional, sem nenhum aceite. É o furo que a "solicitação pendente" fecha. |
| **BUG — a troca de profissional deixa dois vínculos ativos** | `conecta_psicologo_view` seta `paciente.psicologo = novo` e cria o vínculo novo, mas **nunca inativa o anterior**. O constraint do modelo (`core/models.py`) é `UniqueConstraint(fields=['paciente','psicologo'], condition=Q(status='ativo'))` — único por **par**, não por paciente. | O paciente não percebe (o endpoint `meu-psicologo` usa `.filter(status='ativo').first()` com `ordering = ['-data_vinculo']`, devolvendo o mais recente), mas **o psicólogo anterior continua com o paciente na lista de ativos**, com acesso a prontuário e capacidade de agendar sessão, e nunca é avisado. Defeito de privacidade em produção hoje. |
| **BUG — as rotas genéricas do `VinculoViewSet` não têm autorização** | `VinculoViewSet` (`core/views.py:70`) é um `ModelViewSet` completo com `permission_classes = [IsAuthenticated]`, e o `get_queryset` devolve ao paciente os vínculos **dele**. A action `alterar-status` é protegida para psicólogo, mas `PATCH`/`PUT`/`DELETE /api/vinculos/{id}/` não são, e `status` é campo **gravável** (`core/serializers.py:73` — `read_only_fields` não inclui `status`). | Hoje um paciente já pode alterar o status do próprio vínculo pela rota genérica. Ao introduzir o status `pendente`, ele poderia **auto-aprovar a própria solicitação**, tornando o fluxo de aceite inteiro contornável. Correção é pré-requisito, não melhoria. |
| Paciente troca, mas não encerra | `meuPsicologo.js:112` tem "Conectar outro profissional" → `ConexaoTerapeutica`. Não existe nenhuma ação de encerrar o vínculo sem substituí-lo; `alterar-status` é explicitamente bloqueado para paciente. | O paciente só consegue sair de um vínculo entrando em outro. Esta SPEC adiciona o encerramento avulso. |
| Deep link não existe no app | `app.json` **não tem `scheme`**, nem `intentFilters` (Android), nem `associatedDomains`/`bundleIdentifier` (iOS). `NavigationContainer` (`src/routes.js:80`) não recebe prop `linking`. | Qualquer link só passa a abrir o app após **configuração nativa nova + rebuild EAS**. Reforça a decisão de todo convite ter também um código curto digitável, que funciona sem nenhuma dependência nativa. |
| Já existe um `navigationRef` global | `src/navigationRef.js`, usado por `notificationService.setupNotificationListeners` (`routes.js:62`) para navegar a partir de push. | O tratamento do deep link pode reaproveitar esse mesmo ref, sem precisar montar a configuração declarativa `linking` completa do React Navigation. |
| Notificação in-app + push já são uma coisa só | `NotificationDomainService.emit` (`core/services.py:56`) cria a `NotificacaoSistema` e agenda o push via `enqueue_push_for_notification` no `transaction.on_commit`. | O requisito "push + in-app" não exige nada novo: basta chamar `emit` com o `dados_extras` no contrato canônico de roteamento. |
| Cancelamento de sessão já tem campos próprios | `Sessao` (`sessoes/models.py:226`) tem `cancelado_por` (`paciente`/`psicologo`), `cancelamento_tardio` e `motivo_cancelamento`; `pode_ser_cancelada` em `:371`. | O cancelamento automático no encerramento de vínculo reaproveita esses campos (`cancelado_por='paciente'`), sem modelo novo. |
| Dados disponíveis para a tela de confirmação | `Psicologo` tem `crp`, `specialization`, `biography`; `CustomUser` tem `first_name`/`last_name` e `avatar_url` (preenchido só em contas Google). `PsicologoBasicSerializer` hoje não expõe `avatar_url`. | A tela de confirmação de vínculo consegue mostrar nome, CRP e especialidade sem nada novo. Foto depende de expor `avatar_url` e só existirá para contas Google. |

---

## 3. Requisitos funcionais

### 3.1 Novos estados e origem do vínculo

**Backend — `core/models.py`**

- Acrescentar a `VinculoPacientePsicologo.STATUS_CHOICES`:
  - `pendente` — solicitação criada pelo paciente, aguardando decisão do psicólogo.
  - `recusado` — solicitação recusada pelo profissional (estado terminal).
  - `expirado` — solicitação que passou de 5 dias sem decisão (estado terminal).
- Novo campo `origem` (`CharField`, choices `convite_link`, `convite_codigo`, `crp`), substituindo o uso informal de `motivo_vinculo` como marcador de origem. O `motivo_vinculo` existente permanece como texto livre (o `help_text` atual já cita "Busca via CRP, Indicação" — esta SPEC formaliza isso em campo próprio, sem remover o antigo).
- Novo campo `data_solicitacao` (`DateTimeField`, null) — usado para calcular a expiração de 5 dias. `data_vinculo` (`auto_now_add`) continua marcando a criação do registro.
- Migração: registros existentes recebem `origem='crp'` e `data_solicitacao=NULL` (nenhum vínculo histórico é pendente).

### 3.2 Um vínculo ativo por paciente, garantido no banco

**Backend — `core/models.py` + migração**

- Substituir o `UniqueConstraint` atual (por par paciente+psicólogo) por: **`UniqueConstraint(fields=['paciente'], condition=Q(status='ativo'), name='unique_vinculo_ativo_por_paciente')`**.
- Migração de dados obrigatória **antes** de aplicar o constraint: para todo paciente com mais de um vínculo ativo (consequência do bug da seção 2), manter ativo apenas o de `data_vinculo` mais recente e marcar os demais como `finalizado`, com `data_fim_tratamento = date.today()`. A migração deve registrar quantos vínculos foram corrigidos.
- Decisão consciente: os psicólogos anteriores afetados por essa correção retroativa **não** são notificados, e os prontuários dessas correções **não** são apagados — a regra de exclusão da seção 3.10 vale apenas para encerramentos feitos a partir da entrada desta feature, não para o saneamento de um estado inconsistente antigo.

### 3.3 Trancar as rotas de escrita do vínculo (pré-requisito de segurança)

**Backend — `core/views.py` + `core/serializers.py`**

- `VinculoPacientePsicologoSerializer`: `status` passa a `read_only`, junto com `paciente`, `data_solicitacao` e `origem`. Alterar status só pelas actions dedicadas, nunca pela rota genérica.
- `VinculoViewSet` deixa de ser `ModelViewSet` e passa a `ReadOnlyModelViewSet` + actions explícitas. Não existe caso de uso para `POST`/`PUT`/`PATCH`/`DELETE` genéricos de vínculo — toda criação e transição passa pelos fluxos desta SPEC.
- Teste de regressão obrigatório: `PATCH /api/vinculos/{id}/ {"status":"ativo"}` com token de **paciente**, sobre um vínculo `pendente` dele, precisa responder `405`/`403` e **não** alterar o status.

### 3.4 Slug público e código curto do psicólogo (convite permanente)

**Backend — `authentication/models.py`**

- Novo campo `slug` em `Psicologo` (`SlugField`, único, indexado), gerado a partir de `first_name`+`last_name` no cadastro, com sufixo numérico em caso de colisão (`ana-silva`, `ana-silva-2`). Migração faz backfill para os psicólogos existentes.
- Novo campo `codigo_convite` (`CharField(9)`, único, indexado) — código curto estável e legível, formato `XXX-XXXX` (ex.: `ANA-4K7Q`), alfabeto sem caracteres ambíguos (`0/O`, `1/I/L`). Backfill na mesma migração.
- Ambos são **permanentes** por psicólogo e usados no convite de divulgação aberta (bio de Instagram, cartaz no consultório, assinatura de e-mail).
- Entrada por `slug`/`codigo_convite` é **case-insensitive** e tolera ausência do hífen no código.

### 3.5 Convite de uso único

**Backend — novo model `ConviteVinculo` em `core/models.py`**

| Campo | Descrição |
|---|---|
| `psicologo` | FK, `CASCADE` |
| `codigo` | `CharField(9)`, único, mesmo formato de 3.4, gerado aleatoriamente |
| `criado_em` | `auto_now_add` |
| `expira_em` | `DateTimeField` — padrão de **7 dias** a partir da criação |
| `usado_em` | `DateTimeField`, null |
| `usado_por` | FK `Paciente`, null, `SET_NULL` |
| `revogado` | `BooleanField(default=False)` |
| `apelido` | `CharField`, opcional — anotação do psicólogo ("João, indicação da Dra. Marta") para ele se localizar na lista |

- Um convite de uso único é válido enquanto `not revogado and usado_em is None and expira_em > agora`.
- O link de uso único tem a forma `.../c/<slug>?i=<codigo>`; o código sozinho também resgata, sem o link.

### 3.6 Endpoints de convite (psicólogo)

- `GET /api/convites/meu-link/` — devolve `slug`, `codigo_convite` permanente, a URL completa e o conteúdo para o QR.
- `POST /api/convites/` — cria convite de uso único (aceita `apelido` opcional). Rate limit: máximo de 20 convites ativos simultâneos por psicólogo.
- `GET /api/convites/` — lista os convites de uso único do psicólogo com estado derivado (`ativo`, `usado`, `expirado`, `revogado`).
- `POST /api/convites/{id}/revogar/` — marca `revogado=True`.
- Todos exigem `IsAuthenticated` **e** perfil de psicólogo; operam sempre sobre `request.user.psicologo_profile`, nunca recebendo o id do psicólogo por parâmetro.

### 3.7 Resgate de convite (paciente) — vínculo ativado direto

- `GET /api/convites/resolver/?codigo=<x>` ou `?slug=<y>` — endpoint autenticado que **apenas resolve e descreve**, sem criar nada: devolve nome, CRP, especialidade e biografia do profissional, o tipo de convite, e um bloco `avisos` informando se o paciente já tem vínculo ativo (ver 3.10). Erros possíveis: não encontrado, expirado, já usado, revogado.
- `POST /api/convites/aceitar/` com `codigo` ou `slug` — cria o vínculo **já com `status='ativo'`**, porque o convite *é* a autorização do profissional. Marca o convite de uso único como usado.
  - Se o paciente já tem vínculo ativo, o corpo precisa trazer `confirmar_troca: true`; sem isso, responde `409` com o resumo do que será perdido. Com a confirmação, executa o encerramento da seção 3.10 **na mesma transação**.
  - Convite do psicólogo com quem o paciente **já** tem vínculo ativo: responde `200` sem criar nada, com mensagem de que o vínculo já existe.
- Notifica o psicólogo (`emit`, push + in-app): novo paciente conectado, roteando para `VinculosPacientes`.

### 3.8 CRP passa a criar solicitação pendente

**Backend — `authentication/views.py:203` (`conecta_psicologo_view`)**

- O endpoint continua existindo e recebendo CRP, mas passa a criar o vínculo com `status='pendente'`, `origem='crp'` e `data_solicitacao=agora`, **em vez de `ativo`**.
- **Deixa de mexer em `paciente.psicologo`** — o FK legado só é atualizado quando o vínculo de fato se torna ativo (aceite, ou convite).
- Se já existe solicitação `pendente` do mesmo paciente para o mesmo psicólogo, responde `200` idempotente sem duplicar.
- Se existe um `recusado` para esse par há menos de **30 dias**, responde com a mensagem neutra da seção 3.9 sem criar nova solicitação (limite de re-solicitação).
- Notificação ao psicólogo muda de "novo paciente conectado" para "nova solicitação de vínculo", roteando para a aba de pendentes.

### 3.9 Aceite, recusa e expiração

- `POST /api/vinculos/{id}/aceitar/` — só psicólogo, só sobre vínculo `pendente` dele. Transição para `ativo`, atualiza `paciente.psicologo`, e aplica o encerramento da seção 3.10 se o paciente tiver adquirido outro vínculo ativo nesse meio-tempo. Notifica o paciente (push + in-app).
- `POST /api/vinculos/{id}/recusar/` — só psicólogo, só sobre `pendente` dele. Transição para `recusado`.
- **A recusa é opaca para o paciente.** Ele vê sempre a mesma mensagem, tanto na recusa quanto na expiração: **"Profissional indisponível para tratamento"**. Nunca "recusou". O objetivo é não transformar a recusa em um evento constrangedor nem num canal de insistência sobre o profissional.
- **Expiração:** solicitação `pendente` com `data_solicitacao` anterior a 5 dias vira `expirado`. Implementada como task periódica no worker já existente (mesma infraestrutura de `notificacoes_push/tasks.py`), com uma verificação defensiva no momento da leitura, para que uma solicitação vencida nunca apareça como pendente mesmo se a task falhar.
- Ao expirar, o paciente é notificado com a mesma mensagem neutra; o psicólogo não é notificado.

### 3.10 Encerramento de vínculo pelo paciente

Dispara nos dois casos: **encerramento avulso** (paciente decide sair) e **troca** (paciente aceita convite de outro profissional). O efeito é idêntico:

1. O vínculo passa a `finalizado`, com `data_fim_tratamento = hoje`.
2. `paciente.psicologo` é limpo (ou apontado para o novo, no caso de troca).
3. **Todas as sessões futuras** (`data_hora > agora`, `status='agendada'`) daquele par são canceladas automaticamente, com `cancelado_por='paciente'` e `motivo_cancelamento` indicando o encerramento do vínculo. A política de cancelamento tardio (`cancelamento_tardio`) **não** se aplica aqui — não é o cancelamento de uma sessão avulsa.
4. **Todos os prontuários daquele par paciente-psicólogo são apagados.** Ver a nota de decisão abaixo.
5. O psicólogo é notificado (push + in-app): o paciente optou por encerrar o tratamento. A notificação **não** diferencia "encerrou" de "trocou de profissional" — o paciente não deve dados a ninguém sobre para onde foi.

Tudo em uma única transação atômica: ou o encerramento inteiro acontece, ou nada acontece.

**Endpoint:** `POST /api/vinculos/{id}/encerrar/` — só paciente, só sobre vínculo ativo **dele**. Exige `confirmar: true` no corpo, depois de o app exibir explicitamente o que será perdido.

> **Nota de decisão — exclusão dos prontuários.** A exclusão dos prontuários no encerramento do vínculo foi **decidida explicitamente pelo usuário**, na mesma linha da decisão de cascata total já adotada na exclusão de conta (`SPEC_EXCLUSAO_CONTA.md`, revisão de 2026-09-18). Fica registrada aqui a ressalva levantada durante o planejamento e conscientemente aceita: o prontuário é registro documental obrigatório do profissional, e a Resolução CFP nº 001/2009 prevê guarda mínima (5 anos) — apagá-lo por ação do paciente coloca o psicólogo em conflito com uma obrigação que é dele, não do paciente. A decisão foi mantida; este parágrafo existe para que ela seja rastreável como escolha deliberada, e não como descuido de implementação.
>
> **Escopo da exclusão — confirmado pelo usuário em 2026-09-18:** a exclusão vale **apenas para o encerramento iniciado pelo paciente** (avulso ou por troca). Ela **não** ocorre quando o próprio psicólogo muda o status via `alterar-status` — inclusive para `finalizado`, que é o desfecho clínico normal de uma terapia concluída. Nesse caso o prontuário é **preservado integralmente**. Regra que não pode regredir: nenhuma alteração de status feita pelo psicólogo apaga prontuário.

### 3.11 Telas do app

| Tela | Mudança |
|---|---|
| `src/screens/conexaoTerapeutica.js` | Deixa de ser um input de CRP e vira um **hub** com dois caminhos: "Tenho um convite" (campo de código, com o link tratado automaticamente quando vier por deep link) e "Informar o CRP do meu profissional" (fluxo atual preservado). Espaço reservado para a terceira porta (busca), da SPEC futura. |
| Nova — `ConfirmarVinculo` | Tela única de confirmação para os dois caminhos: mostra nome, CRP e especialidade do profissional antes de qualquer coisa ser criada (alimentada por `convites/resolver/`). Se houver vínculo ativo, exibe o aviso completo da troca: sessões futuras canceladas **e prontuários apagados**, com confirmação explícita. Segue o padrão de `confirmarVinculoGoogle.js`. |
| `src/screens/homePaciente.js` | Card de estado quando há solicitação `pendente` ("Aguardando resposta do profissional"), substituindo o card de conectar enquanto durar. |
| `src/screens/meuPsicologo.js` | Nova ação **"Encerrar vínculo"**, visualmente destrutiva, abaixo de "Conectar outro profissional" (`:112`), com o mesmo aviso de perda. |
| Nova — `ConvidarPaciente` (psicólogo) | Link permanente + QR + código curto, com botão de compartilhar nativo; geração e lista de convites de uso único com estado e ação de revogar. |
| `src/screens/vinculosPacientes.js` | Nova aba/filtro **"Solicitações"** com badge de contagem, listando pendentes com ação de aceitar/recusar. O filtro atual (`ativos`/todos) é preservado. |
| `src/routes.js` | Registro das duas telas novas; tratamento do deep link via `navigationRef`. |
| `src/services/vinculoService.js` | `aceitarSolicitacao`, `recusarSolicitacao`, `encerrarVinculo`, `solicitacoesPendentes`. |
| Novo — `src/services/conviteService.js` | `meuLink`, `criarConvite`, `listarConvites`, `revogarConvite`, `resolverConvite`, `aceitarConvite`. |

### 3.12 Link, QR e deep link

- **Formato do link:** `https://<host>/c/<slug>` (permanente) e `https://<host>/c/<slug>?i=<codigo>` (uso único). O host é servido pelo reverse-proxy já existente na VPS.
- O link aponta para uma **landing page** simples, não direto para o app. Ela: abre o app se instalado; caso contrário, mostra o nome do profissional, o **código curto em destaque** e o link para a loja. É isso que resolve o caso do paciente que ainda não tem o app — o código sobrevive à instalação, o deep link não.
- **Configuração nativa necessária (exige rebuild EAS):** `scheme` em `app.json`, `intentFilters` de App Links no Android e `assetlinks.json` publicado no host. iOS fica fora por enquanto — o projeto não tem `bundleIdentifier` configurado.
- **O código curto é o caminho garantido.** Toda a feature precisa funcionar ponta a ponta apenas com o código digitado, sem nenhuma dependência de deep link. A landing page e o App Link são conveniência, não requisito.

### 3.13 Costuras para a verificação de CRP (sem verificar nada ainda)

- Novos campos em `Psicologo`: `verificado` (`BooleanField(default=False)`), `verificado_em` (`DateTimeField`, null), `verificacao_fonte` (`CharField`, null — `manual`, `cnp`, `provedor`).
- O cadastro de psicólogo **não muda**: segue direto, sem consulta e sem bloqueio.
- **Nenhum selo é exibido no app nesta fase** — nem "verificado" nem "não verificado". Badge de "não verificado" em todo mundo só gera desconfiança sem informar nada.
- O contrato do serviço de verificação está em `SPEC_VERIFICACAO_CRP.md`.

---

## 4. Alterações previstas por área/arquivo

| Arquivo | Alteração |
|---|---|
| `psicoapp_backend/core/models.py` | Novos status, `origem`, `data_solicitacao`; troca do constraint; model `ConviteVinculo`. |
| `psicoapp_backend/core/migrations/` | Migração de schema + migração de dados (saneamento de vínculos ativos duplicados, backfill de `slug`/`codigo_convite`). |
| `psicoapp_backend/core/serializers.py` | `status`/`paciente`/`origem` read-only; serializers de convite e de solicitação pendente. |
| `psicoapp_backend/core/views.py` | `VinculoViewSet` → `ReadOnlyModelViewSet` + actions `aceitar`, `recusar`, `encerrar`; novo `ConviteViewSet`. |
| `psicoapp_backend/core/services.py` | Serviço de encerramento de vínculo (transação: status + sessões + prontuários + notificação), reutilizado pelos três pontos de entrada. |
| `psicoapp_backend/core/urls.py` | Registro do `ConviteViewSet`. |
| `psicoapp_backend/authentication/models.py` | `slug`, `codigo_convite`, `verificado`, `verificado_em`, `verificacao_fonte` em `Psicologo`. |
| `psicoapp_backend/authentication/views.py` | `conecta_psicologo_view` passa a criar `pendente`; deixa de escrever em `paciente.psicologo`. |
| `psicoapp_backend/notificacoes_push/tasks.py` | Task periódica de expiração de solicitações (5 dias). |
| `psicoapp_backend/core/tests.py`, `authentication/tests.py` | Cobertura da seção 7. |
| `app.json` | `scheme` + `intentFilters` (Android). Requer novo build EAS. |
| `src/routes.js`, `src/navigationRef.js` | Telas novas + tratamento de deep link. |
| `src/screens/conexaoTerapeutica.js`, `homePaciente.js`, `meuPsicologo.js`, `vinculosPacientes.js` | Ver 3.11. |
| Novas telas `src/screens/confirmarVinculo.js`, `src/screens/convidarPaciente.js` | Ver 3.11. |
| `src/services/vinculoService.js`, novo `src/services/conviteService.js` | Ver 3.11. |

---

## 5. Autorização, privacidade e segurança

- **As duas correções da seção 2 são pré-requisito**, não melhorias paralelas: sem trancar as rotas genéricas do `VinculoViewSet` (3.3), o paciente auto-aprova a própria solicitação e o fluxo de aceite vira decorativo; sem o constraint de um ativo por paciente (3.2), a troca continua deixando o profissional anterior com acesso ao prontuário.
- Todos os endpoints novos operam sobre `request.user.paciente_profile` / `request.user.psicologo_profile`. Nenhum recebe o id da contraparte por parâmetro.
- Resolver um convite (`convites/resolver/`) **expõe dados do profissional a qualquer paciente autenticado que tenha o slug ou o código**. Isso é intencional — é exatamente a função do convite — e por isso o endpoint devolve apenas o que o profissional já divulga publicamente: nome, CRP, especialidade e biografia. Nunca e-mail, telefone ou qualquer dado de pacientes.
- O slug expõe o nome do profissional na URL. É uma escolha deliberada (link legível é o ponto do convite permanente) e o dado já é público.
- Rate limit no resgate por código: o espaço de códigos é pequeno o suficiente para ser varrido por força bruta. Limitar tentativas por usuário autenticado e por IP; um código não encontrado e um código expirado devem responder de forma indistinguível.
- A recusa é opaca (3.9) por decisão de produto: o paciente nunca sabe se foi recusa, expiração ou indisponibilidade.
- A exclusão de prontuários (3.10) é um efeito destrutivo e irreversível disparado por ação do paciente. Exige confirmação explícita no app e está registrada na nota de decisão daquela seção.

---

## 6. Critérios de aceite

- [ ] Psicólogo obtém seu link permanente, QR e código curto, e consegue gerar, listar e revogar convites de uso único.
- [ ] Paciente sem vínculo resgata um convite (por link **ou** por código digitado) e o vínculo nasce **ativo**, sem nenhuma etapa de aprovação.
- [ ] Convite de uso único não pode ser resgatado duas vezes, nem depois de expirado, nem depois de revogado.
- [ ] Paciente informando CRP cria uma solicitação **pendente**; o vínculo não fica ativo e `paciente.psicologo` não é alterado.
- [ ] Psicólogo vê a solicitação na aba "Solicitações" com badge e consegue aceitar (vira ativo, paciente notificado) ou recusar.
- [ ] Solicitação recusada ou expirada mostra ao paciente **exatamente** "Profissional indisponível para tratamento", sem distinção entre os casos.
- [ ] Solicitação pendente há mais de 5 dias aparece como expirada, mesmo que a task periódica não tenha rodado.
- [ ] Nova solicitação para um profissional que recusou há menos de 30 dias não é criada.
- [ ] Paciente com vínculo ativo que aceita convite de outro profissional vê o aviso do que será perdido; ao confirmar, o vínculo anterior é finalizado, as sessões futuras daquele par são canceladas com `cancelado_por='paciente'`, os prontuários daquele par são apagados e o profissional anterior é notificado — tudo atômico.
- [ ] Paciente consegue encerrar o vínculo avulso, com o mesmo efeito, ficando sem nenhum vínculo ativo.
- [ ] **Regressão de segurança:** `PATCH /api/vinculos/{id}/ {"status":"ativo"}` com token de paciente sobre um vínculo pendente dele não altera nada.
- [ ] **Regressão de dados:** após a migração, nenhum paciente na base tem mais de um vínculo `ativo`, e o constraint impede a criação de um segundo.
- [ ] A feature funciona ponta a ponta usando apenas o código curto, com o app instalado por fora e sem nenhum deep link.
- [ ] Nenhum selo de verificação aparece em nenhuma tela.

---

## 7. Testes e validação

- **Backend (`core/tests.py`):** transições de status válidas e inválidas; aceite/recusa por quem não é o psicólogo dono do vínculo (`403`); resgate de convite usado/expirado/revogado; idempotência do resgate pelo mesmo par; expiração de 5 dias; limite de re-solicitação de 30 dias; encerramento atômico (sessões canceladas + prontuários apagados + notificação emitida); rollback se qualquer etapa falhar.
- **Backend (segurança):** rotas genéricas do `VinculoViewSet` rejeitadas para paciente e para psicólogo; `status` não gravável pelo serializer.
- **Backend (migração):** cenário com paciente tendo dois vínculos ativos (reproduzindo o bug atual) → após a migração, só o mais recente permanece ativo e o constraint é aplicado sem erro.
- **Backend (`authentication/tests.py`):** `conecta_psicologo_view` cria `pendente` e não toca em `paciente.psicologo`; unicidade e formato de `slug` e `codigo_convite`; backfill.
- **Suíte completa** (`python manage.py test`) local e no servidor após deploy, no padrão das features anteriores.
- **Validação manual em dispositivo:** psicólogo gera convite → paciente resgata por código → vínculo ativo; paciente com vínculo troca por convite e confirma que o profissional anterior deixou de ver o paciente, as sessões futuras sumiram e os prontuários foram apagados; fluxo de CRP pendente → aceite; fluxo de CRP pendente → expiração em 5 dias.

---

## 8. Itens fora de escopo

- **Vitrine/busca aberta de profissionais** por nome, cidade e especialidade — SPEC própria, dependente da verificação de CRP e de campos que não existem hoje (`Psicologo` não tem cidade/UF, e `specialization` é texto livre, não filtrável).
- **Verificação real do CRP junto ao CFP** — ver `SPEC_VERIFICACAO_CRP.md`. Nesta fase, só os campos e o desligamento visual do selo.
- Múltiplos vínculos ativos simultâneos (terapia individual + casal, transição entre profissionais). A regra permanece um ativo por paciente.
- Solicitação de vínculo iniciada pelo **psicólogo** sobre um paciente já cadastrado (só o convite existe nesse sentido).
- Mensagem opcional do paciente junto da solicitação.
- Exclusão de prontuários quando o **psicólogo** encerra o vínculo via `alterar-status` — decidido que **não** ocorre (seção 10); o fluxo de `alterar-status` permanece exatamente como está hoje.
- iOS: App Links e `associatedDomains`. O projeto não tem `bundleIdentifier` configurado.
- Deferred deep linking (preservar o convite através da instalação do app) — resolvido por produto, com o código curto, e não por infraestrutura.
- Foto do profissional na tela de confirmação (exigiria expor `avatar_url` e só existiria para contas Google).
- Histórico/auditoria de quem aceitou ou recusou o quê, além dos campos já previstos.

---

## 9. Ordem recomendada de implementação

1. **Segurança e dados primeiro** — 3.2 e 3.3: constraint de um ativo por paciente + migração de saneamento + trancar as rotas genéricas do `VinculoViewSet`. Sem isso, todo o resto nasce contornável.
2. Modelos e migrações: novos status, `origem`, `data_solicitacao`, `slug`, `codigo_convite`, campos de verificação, `ConviteVinculo` (3.1, 3.4, 3.5, 3.13).
3. Serviço de encerramento de vínculo (3.10), com testes — é a peça reutilizada por troca, encerramento avulso e aceite.
4. Endpoints de convite (3.6) e de resgate (3.7).
5. `conecta_psicologo_view` passa a criar pendente (3.8) + actions de aceitar/recusar + task de expiração (3.9).
6. Serviços do app (`conviteService`, ampliação de `vinculoService`).
7. Telas do psicólogo: `ConvidarPaciente` + aba de solicitações em `vinculosPacientes.js`.
8. Telas do paciente: hub em `conexaoTerapeutica.js`, `ConfirmarVinculo`, estado pendente na `homePaciente`, encerrar em `meuPsicologo`.
9. Deep link: `scheme` + `intentFilters` + landing page + rebuild EAS (3.12) — **por último e opcional**, porque o código curto já entrega a feature completa.
10. Deploy e validação end-to-end em dispositivo.

---

## 10. Decisões registradas

| Decisão | Resolução |
|---|---|
| Exclusão de prontuários no encerramento | Apenas em encerramento **iniciado pelo paciente** (avulso ou troca). Encerramento pelo psicólogo via `alterar-status`, incluindo `finalizado`, **preserva** o prontuário. Confirmado pelo usuário em 2026-09-18. |
| Ressalva do CFP sobre guarda de prontuário | Levantada no planejamento e conscientemente aceita pelo usuário. Ver nota de decisão da seção 3.10. |
| Saneamento dos vínculos ativos duplicados | Não notifica os psicólogos afetados e não apaga prontuários — é correção de estado inconsistente, não encerramento de tratamento (seção 3.2). |
