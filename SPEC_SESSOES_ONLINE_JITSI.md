# SPEC — Sessões Online com Jitsi, Lembrete de Entrada e Agenda do Dispositivo

Data: 2026-09-14
Status: planejamento
Escopo: backend Django (`sessoes`, `notificacoes_push`) + aplicativo Expo. Nenhuma integração OAuth, nenhuma API externa de terceiros, nenhum provedor de e-mail.

---

## 1. Objetivo

Fazer com que uma sessão **online** agendada no PsicoBem tenha uma sala de videoconferência própria, e que paciente e psicólogo cheguem até ela **sem precisar ficar abrindo o aplicativo para conferir**.

A entrega se divide em três mecanismos, nesta ordem de importância:

| Parte | Mecanismo | Papel |
|---|---|---|
| **A** | Lembrete push com ação "Entrar na sessão" | **Principal.** Confiável, sob nosso controle, reaproveita infraestrutura já existente. |
| **B** | Evento gravado na agenda do próprio dispositivo | **Conveniência.** O sistema operacional passa a lembrar, e no Android o evento sobe sozinho para o Google Calendar da conta do aparelho. |
| **C** | Arquivo `.ics` avulso ("Adicionar à minha agenda") | **Opcional.** Fallback manual, última fase, pode ser cortado sem prejuízo. |

Complementarmente, fecha-se o ciclo com uma **notificação de confirmação pós-sessão**, que provoca o psicólogo a marcar a sessão como realizada ou não realizada logo após o horário previsto — hoje ele precisa lembrar sozinho de abrir o aplicativo.

### Decisão arquitetural que motivou este desenho

Foi avaliada a alternativa de integrar **Google Meet via Google Calendar API** e descartada por três motivos concretos:

1. A API que forneceria dados de participação (`conferenceRecords` / `participants`) é **restrita a reuniões hospedadas por contas Google Workspace**. Psicólogo com `@gmail.com` pessoal — o caso mais comum — simplesmente não gera esse dado.
2. Exigiria escopo OAuth *sensitive* de Calendar, com processo de verificação do app (vídeo, política publicada, domínio verificado) e limite de 100 contas de teste até a aprovação.
3. Exigiria custodiar `refresh_token` de acesso à **agenda pessoal** do psicólogo no servidor, incluindo compromissos alheios ao aplicativo.

O desenho com Jitsi + agenda local entrega o mesmo resultado prático (evento na agenda, lembrete, entrada em um toque) **sem nenhum desses três custos**.

---

## 2. Estado atual identificado

| Tema | Estado atual | Impacto |
|---|---|---|
| Modalidade já existe no modelo | `TipoSessao.TIPO_CHOICES = [('presencial','Presencial'), ('online','Online')]`, com `default='online'` (`psicoapp_backend/sessoes/models.py:60`). | Já existe o discriminador para decidir quais sessões ganham sala. Nenhum campo novo é necessário para isso. |
| **Janela de 15 minutos já existe e está ociosa** | `_reminder_minutes_to_types()` (`notificacoes_push/tasks.py:264`) já mapeia `24*60 → lembrete_24h`, `2*60 → lembrete_2h` e `15 → lembrete_15m`. A tarefa `dispatch_session_reminders` já processa as três janelas. | O gancho para "sua sessão começa agora, entre" **já está implementado e funcionando** — falta apenas o conteúdo e a ação. |
| Agendamento periódico ativo | `CELERY_BEAT_SCHEDULE["disparar_lembretes_sessao_periodico"]` roda `crontab(minute="*/5")` (`settings.py:245`). A busca usa janela de ±2 minutos em torno do alvo. | A cadência de 5 minutos com janela de ±2 min já cobre os alvos sem lacuna. Nada a ajustar. |
| Idempotência de lembrete garantida | `ReminderDispatch` tem `unique_together = ("session_id", "reminder_type", "destinatario_user")`, e a tarefa usa `IntegrityError` como guarda. | Novos tipos de lembrete herdam a proteção contra envio duplicado automaticamente. |
| Contrato de roteamento canônico | `NotificationDomainService._routing_payload(screen, params, event, entity_type, entity_id, **extra)` (`core/services.py:21`) monta `dados_extras`, copiado integralmente para o `data` do push. Aceita campos extras. | Existe um lugar correto e já padronizado para carregar metadados de roteamento. |
| Validação de rota por perfil | `ROUTES_BY_PROFILE` (`src/services/notificationService.js:40`) valida a rota contra o perfil autenticado. `DetalhesSessao` está presente **nos dois** perfis. | O deep link de sessão funciona para paciente e psicólogo sem alteração. |
| **Tela de confirmação já existe e funciona** | `src/screens/detalhesSessao.js` já tem `confirmarRealizacao()`, `marcarNaoRealizada()`, `cancelarSessao()` e `confirmarPagamento()`, renderizados conforme `pode_realizar`, `pode_marcar_falta` e `pode_cancelar` vindos do serializer. | A confirmação pós-sessão **não exige tela nova** — exige apenas uma notificação que leve até ela no momento certo. |
| Status previstos no modelo | `Sessao.STATUS_CHOICES` inclui `agendada`, `confirmada`, `realizada`, `cancelada`, `faltou`, `remarcada`. | O vocabulário necessário já existe; nenhum status novo é criado. |
| Duração disponível | `TipoSessao.duracao_minutos` (`PositiveIntegerField`). | Permite calcular o fim previsto da sessão, necessário para o `DTEND` do evento de agenda e para a janela de confirmação pós-sessão. |
| Sem sala de videoconferência | Não existe nenhum campo, serviço ou tela relacionada a videoconferência em todo o repositório. | Greenfield. |
| Sem acesso à agenda | `expo-calendar` **não está instalado**. `expo-file-system` está instalado; `expo-sharing` não. | A Parte B exige uma dependência nativa nova (e portanto rebuild EAS). A Parte C exige mais uma. |
| Sem infraestrutura de e-mail | Não há `EMAIL_BACKEND` configurado; `password_reset_request_view` apenas imprime o token no log. | Convite de calendário por e-mail (com "Aceitar/Recusar" nativo) está fora de alcance e **não** faz parte desta SPEC. |

---

## 3. Requisitos funcionais

### 3.1 Sala Jitsi vinculada à sessão

#### Comportamento esperado

- Toda sessão cujo `tipo_sessao.tipo == 'online'` possui uma sala de videoconferência própria e exclusiva.
- Sessões `presencial` **não** possuem sala, e nenhuma interface relacionada a entrar em sala é exibida para elas.
- A sala não precisa ser criada em serviço nenhum: ela passa a existir no momento em que a primeira pessoa entra, e deixa de existir quando a última sai.

#### Modelo de dados

Um campo novo em `Sessao` (`psicoapp_backend/sessoes/models.py`):

```python
sala_uuid = models.UUIDField(null=True, blank=True, unique=True, editable=False,
                             verbose_name='Identificador da Sala Online')
```

**Guardar o identificador, não a URL completa.** A URL é derivada em tempo de leitura a partir de `settings.JITSI_BASE_URL`. Isso permite migrar a instância do Jitsi (pública → JaaS → self-hosted) alterando uma variável de ambiente, sem reescrever nenhuma linha do banco.

Nome da sala derivado: `psicobem-<uuid4 em hexadecimal, sem hífens>`, e a URL final `f"{JITSI_BASE_URL}/psicobem-{uuid_hex}"`.

O prefixo existe apenas para facilitar suporte e depuração; a segurança vem dos 122 bits de entropia do UUID v4, que tornam o link inadivinhável.

#### Regras de geração

1. **Na criação da sessão**, se `tipo_sessao.tipo == 'online'`, gerar `sala_uuid`. Se for `presencial`, deixar `NULL`.
2. **Na remarcação** (alteração de `data_hora`), **regerar** o `sala_uuid`. Isso limita a janela de exposição de um link que possa ter vazado, e o custo é zero: uma remarcação já obriga a atualizar o evento na agenda de qualquer forma, porque a data mudou.
3. Se o `tipo_sessao` de uma sessão existente mudar de `presencial` para `online`, gerar o `sala_uuid` naquele momento. No sentido inverso, limpar o campo.
4. A geração deve ser resiliente a colisão de `unique` (retry), ainda que a probabilidade seja desprezível.

#### Configuração

Em `settings.py`:

```python
JITSI_BASE_URL = os.getenv("JITSI_BASE_URL", "https://meet.jit.si").rstrip("/")
JITSI_ENABLED = env_bool("JITSI_ENABLED", "True")
```

Reaproveitar o helper `env_bool()` que **já existe** em `settings.py:13` — não escrever outro parser.

Com `JITSI_ENABLED` falso, nenhuma sala é gerada e nenhum link é exposto; a feature fica desligada sem quebrar nada.

### 3.2 Exposição do link e autorização

#### Regras invioláveis

- O link só pode ser retornado para **o paciente e o psicólogo daquela sessão específica**. Deve ser confirmado que os ViewSets de `sessoes` já restringem o queryset ao usuário autenticado, e a exposição do campo novo **não pode** ampliar esse alcance.
- O link **nunca** trafega no corpo (`title`/`body`) de uma notificação push, porque esse conteúdo aparece na tela de bloqueio do aparelho.
- O link **nunca** trafega no `data` do push. O push carrega apenas `screen: "DetalhesSessao"` e `params: {sessaoId}`; o aplicativo abre a tela e obtém o link pela API autenticada.

> Justificativa da terceira regra: o payload de push transita por servidores da Expo e do FCM/APNs. Como qualquer pessoa de posse do link consegue entrar na sala, ele é material sensível e deve permanecer no canal autenticado.

#### Exposição via serializer

Em `SessaoDetailSerializer` e `SessaoListSerializer` (`psicoapp_backend/sessoes/serializers.py`), acrescentar campos **somente leitura**, no padrão de `SerializerMethodField` já usado por `valor_formatado`, `pode_realizar` etc.:

| campo | conteúdo |
|---|---|
| `sala_url` | URL completa, ou `null` quando não houver sala (presencial, ou `JITSI_ENABLED` falso) |
| `pode_entrar_sala` | booleano — verdadeiro somente dentro da janela de entrada |
| `sala_disponivel_em` | ISO-8601 do início da janela de entrada, ou `null` |

`sala_uuid` **não** é exposto em nenhum serializer; apenas a URL derivada.

#### Janela de entrada

`pode_entrar_sala` é verdadeiro quando, simultaneamente:

- existe `sala_uuid`;
- `status` está em `{agendada, confirmada, remarcada}`;
- o instante atual está entre `data_hora - 15 minutos` e `data_hora + duracao_minutos + 30 minutos`.

A margem posterior de 30 minutos evita que uma sessão que começou atrasada perca o acesso à sala.

> Trata-se de regra de **conveniência de interface**, não de segurança: quem tiver a URL consegue entrar a qualquer momento, e isso é inerente ao modelo do Jitsi. A mitigação real é a regeneração do link na remarcação (3.1) e, se necessário no futuro, a migração para uma instância com lobby (3.7).

### 3.3 Parte A — Lembrete push com entrada na sessão

#### Comportamento esperado

- No lembrete de 15 minutos de uma sessão **online**, a mensagem convida explicitamente a entrar, e tocar na notificação abre `DetalhesSessao`.
- Em `DetalhesSessao`, quando `pode_entrar_sala` for verdadeiro, um botão primário **"Entrar na sessão"** é exibido em destaque, acima das demais ações, e abre a `sala_url` via `Linking.openURL`.
- Quando houver sala mas a janela ainda não tiver aberto, exibir o horário a partir do qual será possível entrar, em vez do botão.
- Sessões presenciais não exibem nada disso.

#### Alterações previstas

**`psicoapp_backend/notificacoes_push/tasks.py`**

- Em `_build_reminder_message(sessao, reminder_type, minutes)`, diferenciar a mensagem quando a sessão for online. Sugestão para `lembrete_15m` online: `"Sua sessão online começa em 15 minutos. Toque para entrar."`
- Não alterar `_reminder_minutes_to_types()`, as janelas, a cadência do beat, nem a estrutura de `ReminderDispatch`.
- No `_routing_payload`, manter `screen="DetalhesSessao"` e `params={"sessaoId": sessao.pk}` exatamente como estão. Pode-se acrescentar `modalidade: "online"` como metadado, mas **jamais** o link.

**`src/screens/detalhesSessao.js`**

- Renderizar o botão "Entrar na sessão" condicionado a `sessao.pode_entrar_sala`, posicionado acima do bloco de ações existente (`realizarSessao`, `marcarNaoRealizada`, `cancelarSessao`).
- Reaproveitar o componente `Botao` (`src/components/common/Button.js`) com `iconName="videocam-outline"`.
- Tratar falha de `Linking.openURL` com mensagem clara e opção de copiar o link.

### 3.4 Parte B — Evento na agenda do dispositivo

#### Comportamento esperado

- Com a permissão do usuário, cada sessão futura **online ou presencial** vira um evento na agenda do próprio aparelho, com alarme 15 minutos antes.
- No Android, por a agenda padrão do aparelho ser normalmente a conta Google do usuário, o evento **sincroniza sozinho para o Google Calendar** — sem nenhuma API do Google envolvida.
- Remarcações atualizam o evento; cancelamentos o removem.
- A permissão é opcional: recusá-la não impede nenhuma outra funcionalidade, e a Parte A continua funcionando normalmente.

#### Dependência

`expo-calendar` (não instalado). Exige **rebuild EAS**. Utiliza permissão do sistema operacional (`Calendar.requestCalendarPermissionsAsync()`), **não** OAuth.

#### Onde escrever o evento

Escrever no **calendário padrão gravável** do aparelho, não em um calendário próprio criado pelo app. Justificativa: um calendário local exclusivo não sincroniza com a conta Google, o que anularia o principal benefício desta parte.

- iOS: `Calendar.getDefaultCalendarAsync()`.
- Android: listar via `Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT)` e escolher o primeiro com `allowsModifications === true`, preferindo `accessLevel` de proprietário e origem de conta Google; cair para o primeiro gravável caso não haja.

#### Mapeamento sessão ↔ evento

O identificador do evento é **específico do aparelho** e por isso **não** deve ser persistido no backend. Guardar em `AsyncStorage`, sob a chave `@PsicoBem:calendarEvents`, no formato `{ "<sessaoId>": "<eventId>" }`.

#### Estratégia de sincronização

Uma função `sincronizarAgenda(sessoes)` executada após o carregamento da lista de sessões (`minhasSessoes.js` para o paciente, `sessoes.js` para o psicólogo), que reconcilia:

1. Para cada sessão futura com status em `{agendada, confirmada, remarcada}`: criar o evento se não houver mapeamento, ou atualizar se os dados divergirem.
2. Para cada sessão que passou a `cancelada`: remover o evento e o mapeamento.
3. Para mapeamentos cujo evento não existe mais no aparelho (o usuário apagou à mão): remover o mapeamento e **não** recriar — respeitar a decisão do usuário.

Reconciliar por leitura da lista é mais robusto do que reagir a eventos pontuais, porque se recupera sozinho de falhas e de períodos sem rede.

#### Conteúdo do evento — decisão de privacidade

| campo | valor | motivo |
|---|---|---|
| `title` | `"Sessão PsicoBem"` — **sem nome de paciente ou psicólogo, e sem a palavra terapia/psicólogo** | O evento sincroniza para a conta Google do aparelho. Título identificando quem faz terapia com quem é metadado clínico. |
| `startDate` | `data_hora` | — |
| `endDate` | `data_hora + duracao_minutos` (60 minutos como padrão se ausente) | — |
| `notes` | `sala_url` quando houver, mais uma linha curta neutra | Sem o link, o usuário precisaria abrir o app assim mesmo, o que anularia o propósito da Parte B. |
| `alarms` | `[{ relativeOffset: -15 }]` | O alarme passa a ser do sistema operacional, independente do app. |
| `location` | `sala_url` quando online | Faz o link virar toque direto na maioria das agendas. |

> **Decisão registrada:** incluir o link no evento implica que o provedor da agenda (Google, na maioria dos aparelhos Android) passa a ver a URL da sala. Optou-se por incluir, porque sem isso a Parte B não cumpre seu objetivo. A contrapartida é que o título é deliberadamente neutro e o consentimento (seção 4) menciona o ponto de forma explícita. A migração para uma instância com lobby (3.7) reduz materialmente o risco residual.

### 3.5 Parte C — Arquivo `.ics` avulso (opcional)

Última fase. Pode ser cortada sem impacto nas anteriores.

#### Comportamento esperado

Um botão "Adicionar à minha agenda" em `DetalhesSessao` gera um arquivo `.ics` daquela sessão e aciona o compartilhamento do sistema, permitindo que o usuário o adicione a qualquer agenda (Google, Apple, Outlook).

#### Alterações previstas

**Backend** — endpoint autenticado `GET /api/sessoes/<id>/agenda.ics`, respondendo `Content-Type: text/calendar; charset=utf-8`, restrito aos participantes da sessão. O conteúdo é texto puro no formato RFC 5545 e **não exige biblioteca externa**:

- `VEVENT` com `UID` estável (derivado do id da sessão e do domínio), `DTSTAMP`, `DTSTART`, `DTEND`, `SUMMARY`, `DESCRIPTION`, `LOCATION` e um `VALARM` com `TRIGGER:-PT15M`.
- Emitir datas em **UTC com sufixo `Z`**, evitando a necessidade de declarar `VTIMEZONE`.
- `SEQUENCE` incrementado a cada alteração, para que uma reimportação substitua o evento anterior em vez de duplicá-lo.

**Aplicativo** — como o endpoint é autenticado, não basta abrir a URL no navegador. O fluxo é: baixar com a instância axios já autenticada (`src/services/api.js`), gravar em cache com `expo-file-system` (**já instalado**) e compartilhar com `expo-sharing` (**a instalar**), usando `mimeType: 'text/calendar'` e `UTI: 'com.apple.ical.ics'`.

#### Limitação a documentar na interface

O `.ics` é uma **cópia estática**. Se a sessão for remarcada, a cópia na agenda do usuário fica desatualizada. Por isso a Parte C é apresentada como conveniência complementar, e **a Parte B continua sendo o mecanismo recomendado** de integração com agenda.

### 3.6 Confirmação pós-sessão

Fecha o ciclo que originou esta SPEC: hoje o psicólogo precisa lembrar sozinho de abrir o aplicativo para registrar o desfecho da sessão.

#### Comportamento esperado

- Decorrido o fim previsto da sessão mais uma margem, o **psicólogo** (e somente ele) recebe uma notificação perguntando o desfecho.
- Tocar leva a `DetalhesSessao`, onde os botões "Sessão realizada" e "Paciente faltou" **já existem** e já são controlados por `pode_realizar` / `pode_marcar_falta`.
- Só é disparada para sessões ainda pendentes de desfecho (`status` em `{agendada, confirmada, remarcada}`).
- Vale tanto para sessões online quanto presenciais — o problema de registro é o mesmo nos dois casos.

#### Alterações previstas

**`psicoapp_backend/notificacoes_push/tasks.py`** — nova tarefa `dispatch_post_session_confirmations()`, espelhando a estrutura de `dispatch_session_reminders`:

- Alvo: `data_hora + duracao_minutos + 15 minutos`, com a mesma janela de ±2 minutos.
- Reaproveitar `ReminderDispatch` com `reminder_type = "pos_sessao"`, herdando a proteção de duplicidade.
- Destinatário: apenas `sessao.psicologo.user`.
- `NotificationDomainService.emit()` com `tipo="sessao_confirmacao"` e `_routing_payload(screen="DetalhesSessao", params={"sessaoId": ...}, event="pos_sessao", entity_type="sessao", entity_id=...)`.

**`psicoapp_backend/psicoapp_backend/settings.py`** — registrar em `CELERY_BEAT_SCHEDULE` com `crontab(minute="*/5")`, mesma cadência dos lembretes.

> **Não automatizar o desfecho.** Nenhum sinal técnico marca a sessão como realizada. Marcar `realizada` significa decidir cobrar (`Sessao.valor` e `status_pagamento`), e essa é uma decisão profissional e financeira do psicólogo. A notificação **provoca** a decisão; não a substitui.

### 3.7 Decisões registradas sobre a instância do Jitsi

Esta entrega assume a instância pública `https://meet.jit.si` como padrão, por ser a única que permite começar sem custo e sem infraestrutura. As limitações precisam estar claras:

| Aspecto | Instância pública | JaaS (8x8) | Auto-hospedada |
|---|---|---|---|
| Custo inicial | zero | free tier limitado | VPS adicional |
| Lobby / sala de espera | não garantido | sim | sim |
| Controle de moderador | não | sim (JWT) | sim |
| Contrato / acordo de tratamento de dados | **não há** | sim | você é o controlador |
| Esforço | nenhum | moderado | alto |

Como `JITSI_BASE_URL` é variável de ambiente e o banco guarda apenas o identificador da sala, **migrar de instância não exige alteração de código nem de dados**. A migração para uma instância com lobby é o caminho recomendado assim que a feature sair de validação.

---

## 4. Autorização, privacidade e conformidade

- **Restrição de acesso ao link:** `sala_url` só pode ser retornada para o paciente e o psicólogo daquela sessão. Deve ser verificado que o filtro de queryset existente nos ViewSets de `sessoes` já garante isso antes de expor o campo.
- **O link não circula fora do canal autenticado:** nem no corpo nem no `data` das notificações push (3.2).
- **Modelo de segurança do Jitsi:** o acesso à sala é por posse do link. A entropia do UUID v4 (122 bits) torna o link inadivinhável, mas **não** impede o reencaminhamento. A regeneração na remarcação limita a janela de exposição.
- **Dado sensível (LGPD, art. 11):** a existência de uma sessão de psicoterapia, seus participantes e sua frequência são dados referentes à saúde. Por isso o evento de agenda tem título deliberadamente neutro (3.4) e as notificações não revelam a natureza clínica na tela de bloqueio.
- **Consentimento da Parte B:** a permissão de calendário deve ser precedida de uma explicação em linguagem clara sobre o que será gravado e que, no Android, o evento pode sincronizar para a conta Google do aparelho. Pedir a permissão do sistema sem esse esclarecimento não é consentimento informado.
- **Resolução CFP nº 11/2018:** não obriga plataforma específica, mas obriga o psicólogo a **especificar quais recursos tecnológicos garantem o sigilo e esclarecer o cliente sobre isso**. Ao oferecer uma sala pronta, o aplicativo influencia uma escolha que é responsabilidade profissional dele. Consequências práticas: a sala deve ser apresentada como **opção**, o psicólogo precisa conseguir realizar a sessão por outro meio se preferir, e a documentação deve informar qual instância está em uso.
- **Nada é gravado.** Nenhuma gravação de áudio, vídeo ou transcrição é produzida, armazenada ou intermediada pelo aplicativo. Conteúdo de sessão é o dado mais sensível do domínio.
- **Nenhuma regra de autorização existente é alterada** por esta SPEC.

---

## 5. Alterações previstas por arquivo

### Backend

| Arquivo | Alteração |
|---|---|
| `psicoapp_backend/sessoes/models.py` | Campo `sala_uuid`; lógica de geração/regeneração; propriedade auxiliar para a URL derivada e para a janela de entrada. |
| `psicoapp_backend/sessoes/migrations/000X_sessao_sala_uuid.py` | Migration do campo novo (nullable — aplica sem prompt e sem downtime). |
| `psicoapp_backend/sessoes/serializers.py` | `sala_url`, `pode_entrar_sala` e `sala_disponivel_em` como `SerializerMethodField` somente leitura em `SessaoListSerializer` e `SessaoDetailSerializer`. |
| `psicoapp_backend/sessoes/views.py` | Regeneração do `sala_uuid` na remarcação; endpoint `agenda.ics` (Parte C). |
| `psicoapp_backend/sessoes/urls.py` | Rota do `.ics` (Parte C). |
| `psicoapp_backend/notificacoes_push/tasks.py` | Mensagem diferenciada para sessão online no `lembrete_15m`; nova tarefa `dispatch_post_session_confirmations`. |
| `psicoapp_backend/psicoapp_backend/settings.py` | `JITSI_BASE_URL`, `JITSI_ENABLED`; entrada no `CELERY_BEAT_SCHEDULE` para a confirmação pós-sessão. |
| `psicoapp_backend/sessoes/tests.py` | Cobertura descrita na seção 7. |

### Aplicativo

| Arquivo | Alteração |
|---|---|
| `package.json` | `expo-calendar` (Parte B); `expo-sharing` (Parte C). `expo-file-system` já está instalado. |
| `src/services/agendaDispositivo.js` *(novo)* | Permissão, escolha do calendário, criar/atualizar/remover evento, mapeamento em `AsyncStorage` e `sincronizarAgenda(sessoes)`. |
| `src/screens/detalhesSessao.js` | Botão "Entrar na sessão" condicionado a `pode_entrar_sala`; botão "Adicionar à minha agenda" (Parte C). |
| `src/screens/minhasSessoes.js` | Chamada a `sincronizarAgenda()` após carregar a lista (visão do paciente). |
| `src/screens/sessoes.js` | Idem, na visão do psicólogo. |
| `src/services/sessaoService.js` | Download autenticado do `.ics` (Parte C). |

### Não alterados

`src/routes.js` (nenhuma tela nova), `ROUTES_BY_PROFILE` em `notificationService.js` (`DetalhesSessao` já está nos dois perfis), `core/services.py`, modelo `ReminderDispatch`, cadência do beat de lembretes.

---

## 6. Critérios de aceite

### Sala e autorização

- [ ] Sessão criada com `tipo_sessao.tipo == 'online'` recebe `sala_uuid`; sessão `presencial` permanece com `NULL`.
- [ ] `sala_url` é derivada de `JITSI_BASE_URL`; alterar a variável muda a URL de todas as sessões sem migração de dados.
- [ ] Remarcar uma sessão gera um `sala_uuid` novo.
- [ ] Um usuário que não é participante da sessão **não** recebe `sala_url` em nenhuma resposta da API.
- [ ] `sala_uuid` não aparece em nenhuma resposta da API.
- [ ] Com `JITSI_ENABLED` falso, nenhuma sala é gerada e nenhuma interface de entrada é exibida.

### Parte A — push e entrada

- [ ] O lembrete de 15 minutos de sessão online traz mensagem convidando a entrar.
- [ ] O payload do push **não** contém a URL da sala, nem no corpo nem no `data`.
- [ ] Tocar na notificação abre `DetalhesSessao` da sessão correta, para paciente e para psicólogo.
- [ ] O botão "Entrar na sessão" aparece apenas dentro da janela e abre a sala.
- [ ] Fora da janela, a tela informa a partir de quando será possível entrar.
- [ ] Sessão presencial não exibe nada relacionado a sala.
- [ ] Os lembretes de 24h e 2h continuam funcionando exatamente como antes.

### Parte B — agenda do dispositivo

- [ ] Concedida a permissão, sessões futuras viram eventos na agenda do aparelho com alarme de 15 minutos.
- [ ] O título do evento não contém nome de participante nem a natureza clínica.
- [ ] Remarcar atualiza o evento existente, sem duplicar.
- [ ] Cancelar remove o evento.
- [ ] Evento apagado manualmente pelo usuário **não** é recriado.
- [ ] Recusar a permissão não quebra nenhuma outra funcionalidade, e a Parte A segue funcionando.
- [ ] Em Android com conta Google no aparelho, o evento aparece no Google Calendar do usuário.

### Parte C — `.ics` (opcional)

- [ ] O arquivo abre corretamente em Google Calendar, Apple Calendar e Outlook.
- [ ] Contém alarme de 15 minutos e o link quando a sessão for online.
- [ ] O endpoint recusa requisição de quem não é participante da sessão.

### Confirmação pós-sessão

- [ ] Passado o fim previsto mais a margem, **apenas o psicólogo** recebe a notificação.
- [ ] Sessão já resolvida (`realizada`, `cancelada`, `faltou`) **não** gera notificação.
- [ ] A notificação não se repete para a mesma sessão e destinatário.
- [ ] Tocar leva a `DetalhesSessao` com os botões de desfecho disponíveis.
- [ ] Nenhum desfecho é marcado automaticamente pelo sistema.

### Regressão

- [ ] Fluxos de agendamento, cancelamento, remarcação e pagamento permanecem inalterados.
- [ ] Sessões presenciais não têm nenhum comportamento alterado.
- [ ] `python manage.py check` e `makemigrations --check` passam.
- [ ] `git diff --check` sem apontamentos.

---

## 7. Testes e validação

### Backend (automatizado)

- Geração de `sala_uuid` apenas para `online`; ausência para `presencial`.
- Regeneração na remarcação; unicidade preservada.
- `sala_url` derivada corretamente, inclusive com `JITSI_BASE_URL` alternativa e com barra final.
- `pode_entrar_sala` nos limites da janela: antes, no início, durante, na margem posterior e depois dela.
- Participante recebe `sala_url`; **não participante recebe 403/404 e nunca o campo**.
- `sala_uuid` ausente de toda resposta serializada.
- `dispatch_post_session_confirmations`: dispara no alvo; não dispara para status já resolvido; não duplica (segunda execução na mesma janela); envia somente ao psicólogo.
- Mensagem do `lembrete_15m` diferenciada entre online e presencial.
- Parte C: `.ics` bem formado, `UID` estável entre requisições, `SEQUENCE` incrementado após alteração, acesso negado a não participante.

### Aplicativo (manual, após rebuild EAS)

1. Sessão online daqui a ~20 minutos → chega o lembrete de 15 min → tocar abre `DetalhesSessao` → botão "Entrar na sessão" abre a sala.
2. Duas contas (paciente e psicólogo) entram na **mesma** sala e se veem.
3. Sessão presencial → nenhum botão de sala em lugar nenhum.
4. Conceder permissão de calendário → evento criado com alarme; conferir na agenda do aparelho.
5. Em Android com conta Google → confirmar que o evento apareceu também no Google Calendar.
6. Remarcar → evento atualizado, sem duplicata, e link novo.
7. Cancelar → evento removido da agenda.
8. Apagar o evento à mão e recarregar a lista → não é recriado.
9. Recusar a permissão de calendário → app segue funcionando, Parte A intacta.
10. Após o fim previsto → psicólogo recebe a confirmação; paciente **não** recebe.
11. Marcar "Sessão realizada" pela notificação → status e cobrança atualizados corretamente.
12. Parte C: "Adicionar à minha agenda" → arquivo abre e importa corretamente.

### Deploy

O backend **não** ganha dependências Python novas (o `.ics` é texto puro), portanto `restart` é suficiente; a migration roda sozinha no boot do `web`. O aplicativo **exige rebuild EAS** por causa do `expo-calendar`.

---

## 8. Fora de escopo

- **Detecção automática de comparecimento.** O Jitsi público não fornece dado de participação, e mesmo se fornecesse, "entrou na sala" não equivale a "sessão realizada". O desfecho continua sendo decisão do psicólogo.
- **Google Meet, Google Calendar API e qualquer OAuth de terceiros** — descartados na seção 1.
- **Convite de calendário por e-mail**, com "Aceitar/Recusar" nativo: depende de infraestrutura de e-mail inexistente.
- **Feed `.ics` assinável (webcal).** Avaliado e descartado: o Google Calendar atualiza feeds externos a cada 8–24 horas, de forma imprevisível e sem opção de atualização manual, o que o torna inadequado para agenda com remarcação e cancelamento.
- **Vídeo embutido dentro do aplicativo** (SDK do Jitsi). Nesta entrega, a sala abre no navegador ou no app do Jitsi via `Linking`.
- **Gravação, transcrição ou qualquer persistência de conteúdo de sessão.**
- **Sala de espera, moderador e autenticação JWT** — dependem de migrar para JaaS ou auto-hospedagem (3.7).
- **iOS.** Os mecanismos são multiplataforma, mas a validação desta entrega é Android, coerente com o estado atual do projeto.
- Criação das issues de implementação nesta etapa; serão derivadas desta SPEC após aprovação.

---

## 9. Ordem sugerida de implementação

| Fase | Conteúdo | Dependência |
|---|---|---|
| 1 | Backend: `sala_uuid`, migration, configuração, geração/regeneração | — |
| 2 | Backend: exposição via serializer, janela de entrada, autorização | fase 1 |
| 3 | Backend: mensagem do `lembrete_15m` para sessão online | fase 1 |
| 4 | App: botão "Entrar na sessão" em `DetalhesSessao` (**Parte A completa**) | fases 2 e 3 |
| 5 | Backend: `dispatch_post_session_confirmations` e agendamento no beat | fase 1 |
| 6 | App: `agendaDispositivo.js`, permissão e sincronização (**Parte B**) — exige rebuild EAS | fase 2 |
| 7 | Backend + App: `.ics` e compartilhamento (**Parte C, opcional**) | fase 2 |
| 8 | Deploy e validação ponta a ponta | todas |

As fases 1 a 5 são exclusivamente de backend e podem ser deployadas isoladamente: com `JITSI_ENABLED` falso, nada muda para o usuário. **A fase 4 já entrega valor sozinha** — é o mecanismo principal (Parte A) funcionando de ponta a ponta. As fases 6 e 7 são incrementos de conveniência, e a 7 pode ser descartada sem prejuízo.
