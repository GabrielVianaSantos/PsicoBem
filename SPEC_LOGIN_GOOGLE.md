# SPEC — Login e Cadastro com Google

Data: 2026-08-16
Status: planejamento
Escopo: aplicativo Expo (fluxo de autenticação) + backend Django (novo endpoint de autenticação social, campos de identidade no `CustomUser`). Plataforma Android nesta entrega; iOS documentado como passo futuro.

---

## 1. Objetivo

Habilitar autenticação via conta Google no PsicoBem, cobrindo tanto **login** quanto **cadastro completo**, mantendo o modelo de dados íntegro (sem usuários criados pela metade) e sem alterar o comportamento de nenhuma conta existente.

Ganhos concretos:

- **Entrar sem senha.** Hoje o "esqueci minha senha" está em modo de desenvolvimento: `password_reset_request_view` (`psicoapp_backend/authentication/views.py:138`) faz `print()` do token e o devolve no corpo da resposta, porque não há backend de e-mail configurado (`EMAIL_BACKEND` ausente em `settings.py`). Na prática, **quem esquece a senha hoje não tem como recuperá-la sozinho** — o login com Google passa a ser a via real de recuperação de acesso.
- **Cadastro mais curto.** Hoje são 6 a 7 campos (`cadastroPacientes.js`, `cadastroPsicologos.js`). Com Google, nome e e-mail já vêm preenchidos e a senha deixa de existir.
- **E-mail verificado.** O cadastro local não verifica e-mail nenhum; o Google entrega `email_verified` de graça.

### Atrito central da integração

O Google, no escopo básico (`openid email profile`), entrega apenas: `sub` (ID estável da conta), `email`, `email_verified`, `name`, `given_name`, `family_name` e `picture`.

Não entrega — e são obrigatórios no banco:

| campo | onde | constraint |
|---|---|---|
| `user_type` | `CustomUser` | `NOT NULL`, choices paciente/psicologo |
| `cpf` | `Paciente` | `NOT NULL`, `UNIQUE` |
| `gender` | `Paciente` | `NOT NULL` |
| `crp` | `Psicologo` | `NOT NULL`, `UNIQUE` |

Toda a arquitetura desta SPEC existe para resolver esse atrito sem enfraquecer o modelo.

---

## 2. Estado atual identificado

| Tema | Estado atual | Impacto |
|---|---|---|
| Botão já existe, sem função | `src/screens/login.js:143-151` renderiza "Entre com o Google" com estilos prontos (`btnGoogle`, `btnGoogleText`, `btnGoogleDesabilitado`), mas o `onPress` é `Alert.alert('Info', 'Login com Google será implementado em breve!')`. | A promessa já está visível ao usuário; falta apenas a implementação por trás. |
| Backend sem OAuth | `requirements.txt` tem 16 pacotes; **não** há `google-auth`, `django-allauth`, `dj-rest-auth` nem `social-auth-app-django`. Grep por `google\|oauth\|social\|id_token` em todo o backend: zero ocorrências. | Greenfield completo. Nenhuma migração de biblioteca existente a considerar. |
| App sem OAuth | `package.json` não tem `expo-auth-session`, `expo-web-browser`, `expo-crypto`, `expo-linking` nem `@react-native-google-signin/google-signin`. | Idem. A escolha de biblioteca é livre. |
| Autenticação atual | E-mail + senha via `UserLoginSerializer` (`serializers.py:63`). As três views de auth (`login_view`, `PacienteRegistrationView`, `PsicologoRegistrationView`) repetem o mesmo bloco `RefreshToken.for_user(user)` e devolvem `{message, user, tokens:{refresh, access}}`. | Esse envelope é o contrato que o `AuthProvider` consome; o fluxo Google deve replicá-lo exatamente para reaproveitar a persistência existente. |
| `username` obrigatório e único | `CustomUser` herda de `AbstractUser`: `username` é `UNIQUE` e `NOT NULL`. Hoje o app gera com `email.split('@')[0]` (`authService.js:36`). | O Google não fornece username. Além disso, a geração atual **já colide hoje**: `joao@gmail.com` e `joao@outlook.com` produzem o mesmo `joao`. |
| `routes.js` ramifica pelo `else` | `src/routes.js:113` usa o bloco do Paciente como `else`, não como `userType === "paciente"`. | Um usuário autenticado com `user_type` nulo cairia direto na `HomePaciente`. Determinante para a decisão de arquitetura (seção 3.1). |
| Backend assume "usuário ⇒ profile" | `views.py:193` e `:254` fazem `request.user.paciente_profile` dentro de `try/except AttributeError`. O mesmo padrão se repete em `core`, `sessoes` e `engajamentos`. | Um usuário sem profile receberia `403` silencioso em várias telas. |
| `password_change_view` incompatível com conta sem senha | `views.py:330`: `if not authenticate(email=request.user.email, password=old_password)`. Com senha inutilizável, `authenticate()` **sempre** retorna `None`. | Todo usuário criado via Google ficaria preso na tela "alterar senha": não teria senha atual para informar, e o reset por e-mail não funciona (ver seção 1). Correção obrigatória nesta SPEC. |
| Sessão cai em 60 minutos | `SIMPLE_JWT.ACCESS_TOKEN_LIFETIME = 60min`, `REFRESH_TOKEN_LIFETIME = 7 dias`, mas **não existe rota de refresh** (`TokenRefreshView` não está registrada em lugar nenhum). O interceptor de `src/services/api.js:41-45` apaga o token em qualquer 401. | `@PsicoBem:refreshToken` é salvo e nunca usado. O usuário é deslogado após ~1h. Já acontece hoje, mas seria naturalmente atribuído ao login Google ("entrei com o Google e fui deslogado"). Incluído nesta SPEC. |
| `google-services.json` sem OAuth clients | O arquivo existe (projeto Firebase `psicoapp-5d144`, package `com.devianatech.psicoapp`), mas com `"oauth_client": []` vazio — foi gerado apenas para FCM/push. | Precisa ser regenerado após a criação dos OAuth clients. |
| `app.json` sem `scheme` nem `bundleIdentifier` | `app.json` tem `android.package`, mas `ios` só tem `supportsTablet`. Não há campo `scheme`. | Confirma o recorte Android-primeiro. O `scheme` **não** é necessário na abordagem escolhida (ver seção 3.6). |
| `eas.json` sem bloco `env` | Nenhum perfil (`development`, `preview`, `production`) declara `env`, e `.env` está no `.gitignore`. | Builds `preview`/`production` **já falhariam hoje** em `api.js:6` por falta de `EXPO_PUBLIC_API_URL`. Corrigido de passagem nesta SPEC. |

---

## 3. Requisitos funcionais

### 3.1 Decisão de arquitetura: nenhum usuário criado pela metade

O backend **não cria o usuário** enquanto faltarem `user_type` e `cpf`/`crp`. Ao validar o `id_token` do Google para um e-mail desconhecido, devolve um **token de curta duração com propósito declarado** (claim `typ`, TTL de 15 minutos), assinado com a `SECRET_KEY`, contendo `google_sub` e `email` **dentro do payload assinado**. O cliente nunca escolhe para qual e-mail está cadastrando.

**Alternativa avaliada e descartada:** criar o usuário imediatamente com `user_type` nulo e devolver tokens JWT com uma flag `profile_complete: false`. Motivos objetivos da recusa:

1. `src/routes.js:113` usa o bloco do Paciente como `else` — um usuário pendente cairia na `HomePaciente` antes de qualquer guard.
2. O backend inteiro pressupõe que existir usuário implica existir profile (`views.py:193`, `:254`, mais `core`, `sessoes`, `engajamentos`). Um usuário pendente receberia `403` silencioso em várias telas.
3. Abandonar o cadastro deixaria uma linha órfã em `authentication_customuser` ocupando o e-mail permanentemente (`email` é `UNIQUE`), impedindo inclusive o cadastro normal posterior — exigindo um job de limpeza só para consertar um estado que a abordagem escolhida nunca cria.
4. Exigiria `ALTER COLUMN user_type DROP NOT NULL`, enfraquecendo permanentemente uma invariante de negócio para atender um caso transitório de ~60 segundos.

**Custo aceito da decisão:** o cadastro incompleto **não é retomável entre reinícios do app** — o token de propósito trafega apenas em parâmetros de navegação e nunca é persistido no `AsyncStorage`. Fechar o app no meio custa refazer o login Google (dois toques). É deliberado: persistir em disco um token capaz de criar conta é pior do que o reinício.

### 3.2 Os três fluxos de autenticação

```
app: GoogleSignin.signIn() → id_token → POST /api/auth/google/
│
├─ google_sub já conhecido ............ 200 {status:"authenticated", user, tokens}
│                                       → persistSession() → routes.js troca a pilha sozinho
│
├─ e-mail existe, conta COM senha ..... 200 {status:"link_confirmation_required", link_token, email}
│                                       → tela ConfirmarVinculoGoogle (pede a senha uma vez)
│                                       → POST /api/auth/google/link/ {link_token, password}
│                                       → 200 {status:"authenticated", user, tokens}
│
└─ e-mail desconhecido ................ 200 {status:"registration_required", registration_token, prefill}
                                        → tela CompletarCadastroGoogle (perfil + CPF/gênero ou CRP)
                                        → POST /api/auth/google/complete/
                                        → 201 {status:"authenticated", user, tokens}
```

O envelope de sucesso é **idêntico** ao de `login_view` (`views.py:86-93`), de propósito: o `AuthProvider` reaproveita o mesmo caminho de persistência já existente.

Se a conta existente **não** tiver senha utilizável, o vínculo é feito direto — não há senha contra a qual confirmar.

### 3.3 Política de vínculo por e-mail

Quando o e-mail do Google já pertence a uma conta local **com senha utilizável**, o vínculo **exige a senha uma única vez**.

Justificativa: o cadastro local não verifica e-mail. Sem essa confirmação, alguém que tenha registrado uma conta usando o e-mail de outra pessoa passaria a compartilhar essa conta — e seus prontuários clínicos — com o dono real quando este entrasse pelo Google. O atrito ocorre uma única vez, e apenas nesse cenário específico.

O e-mail só é aceito para login ou vínculo quando o Google informar `email_verified: true`.

### 3.4 Identidade e modelo de dados

Quatro campos novos em `CustomUser` (`psicoapp_backend/authentication/models.py`), todos nullable ou com default — a migration aplica sem prompt interativo e sem downtime:

| campo | definição | função |
|---|---|---|
| `google_sub` | `CharField(max_length=255, unique=True, null=True, blank=True, default=None, db_index=True)` | Identidade estável da conta Google. Postgres aceita múltiplos `NULL` em coluna `UNIQUE`, então contas locais convivem. **Nunca** usar e-mail como chave de identidade: o e-mail de uma conta Google pode mudar, o `sub` não. |
| `auth_provider` | `CharField(max_length=20, choices=(('local','Local'),('google','Google')), default='local')` | Registra **como a conta foi criada**. Contas existentes recebem `'local'` automaticamente pelo `default`. O vínculo posterior não altera este valor — o vínculo é expresso por `google_sub is not None`. |
| `email_verified` | `BooleanField(default=False)` | Informativo e de auditoria. **Não** deve virar gate de login: nenhuma conta legada tem verificação. |
| `avatar_url` | `URLField(max_length=500, blank=True, null=True)` | Armazena o `picture` do Google. Sem consumo em interface nesta entrega; incluído agora para evitar uma segunda migration depois. |

**Geração de `username`:** helper `generate_unique_username(email)` — parte local do e-mail, `lower()`, apenas `[a-z0-9._-]`, truncado em 24 caracteres; em colisão, sufixo aleatório de 4 caracteres (até 10 tentativas); fallback `user_<uuid4[:12]>`. Executado dentro da transação de criação, com retry único em `IntegrityError`.

**Senha:** contas criadas via Google recebem `set_unusable_password()` explícito.

### 3.5 Contrato dos endpoints

Todos em `psicoapp_backend/authentication/`, roteados sob `/api/auth/`.

**`POST /api/auth/google/`** — entrada `{"id_token": "<JWT do Google>"}`

| cenário | HTTP | resposta |
|---|---|---|
| `google_sub` conhecido | 200 | `{status:"authenticated", message, user, tokens}` |
| e-mail existe, sem senha utilizável (vincula direto) | 200 | `{status:"authenticated", message, user, tokens}` |
| e-mail existe, com senha utilizável | 200 | `{status:"link_confirmation_required", link_token, expires_in, email}` |
| e-mail desconhecido | 200 | `{status:"registration_required", registration_token, expires_in, prefill:{email, first_name, last_name, picture}}` |
| token inválido, expirado ou `aud` divergente | 400 | `{detail, code:"invalid_google_token"}` |
| `email_verified` falso | 403 | `{detail, code:"email_not_verified"}` |
| `is_active` falso | 401 | `{detail, code:"account_disabled"}` |
| feature não configurada | 503 | `{detail, code:"google_auth_not_configured"}` |

**`POST /api/auth/google/link/`** — entrada `{"link_token", "password"}`

| cenário | HTTP | resposta |
|---|---|---|
| senha correta | 200 | `{status:"authenticated", message, user, tokens}` — grava `google_sub`, `email_verified=True`, e `avatar_url` se estiver vazio |
| senha incorreta | 400 | `{password:["Senha incorreta."], code:"invalid_password"}` |
| token expirado/inválido | 401 | `{detail, code:"link_token_expired"}` |

**`POST /api/auth/google/complete/`** — entrada `{"registration_token", "user_type", "first_name", "last_name", "phone", e ("cpf","gender") ou ("crp","specialization")}`

| cenário | HTTP | resposta |
|---|---|---|
| criado | 201 | `{status:"authenticated", message, user, tokens}` |
| `google_sub` já criado (duplo submit / retry) | 200 | `{status:"authenticated", ...}` — idempotente |
| campos inválidos | 400 | erros **na raiz**: `{"cpf":[...]}`, `{"crp":[...]}`, `{"user_type":[...]}`, `{"gender":[...]}` |
| token expirado/inválido | 401 | `{detail, code:"registration_token_expired"}` |
| e-mail tomado por outra conta nesse meio-tempo | 409 | `{detail, code:"email_taken"}` |

Regras invioláveis deste endpoint:
1. `email` e `google_sub` são lidos **exclusivamente do token assinado**. Qualquer `email` no corpo é ignorado.
2. Executa em `transaction.atomic()` e recheca `Q(email=...) | Q(google_sub=...)` antes de criar.
3. Erros de campo saem **na raiz**, não aninhados em `user` — é o formato que o `handleError` de `src/services/authService.js:184-208` **já** traduz para "CPF já cadastrado." / "CRP já cadastrado.".

**`POST /api/auth/token/refresh/`** — `TokenRefreshView` do SimpleJWT, registrada para viabilizar a seção 3.8.

### 3.6 Validação do `id_token`

Biblioteca: **`google-auth`** (adicionar a `requirements.txt`, junto de `requests`, que hoje existe apenas como dependência transitiva no venv e não está declarado).

`google.oauth2.id_token.verify_oauth2_token(raw, google_requests.Request(), audience=None, clock_skew_in_seconds=10)` já valida assinatura contra o JWKS do Google (com cache e rotação de chaves), `exp` e `iss`.

O parâmetro `audience` é passado como `None` **de propósito**, e o `aud` é checado manualmente contra `settings.GOOGLE_OAUTH_ALLOWED_AUDIENCES` (lista) — assim o client iOS pode ser adicionado depois por variável de ambiente, sem alterar código.

O `aud` esperado é o **Web Client ID**: a biblioteca `@react-native-google-signin` recebe `webClientId` no `configure()`, e é esse ID que o Google coloca no `aud`. O Android Client ID serve apenas para o Google Play Services validar package + SHA-1 e **não** aparece no `aud`.

Novas configurações em `settings.py`, reaproveitando o helper `env_list()` que já existe em `settings.py:17`:

```python
GOOGLE_OAUTH_WEB_CLIENT_ID = os.getenv("GOOGLE_OAUTH_WEB_CLIENT_ID", "")
GOOGLE_OAUTH_ALLOWED_AUDIENCES = env_list("GOOGLE_OAUTH_ALLOWED_AUDIENCES", GOOGLE_OAUTH_WEB_CLIENT_ID)
GOOGLE_PURPOSE_TOKEN_TTL = int(os.getenv("GOOGLE_PURPOSE_TOKEN_TTL", "900"))
GOOGLE_AUTH_ENABLED = bool(GOOGLE_OAUTH_ALLOWED_AUDIENCES)
```

Com `GOOGLE_AUTH_ENABLED` falso, as três views retornam `503` controlado — permitindo deployar o backend antes de o Google Cloud Console estar configurado.

**Tokens de propósito** (`registration` e `link`): JWT HS256 assinado com `SECRET_KEY` via PyJWT (já em `requirements.txt`), claims `{typ, iss:"psicobem", sub, email, exp, iat, jti}`. Não são confundíveis com o access token do SimpleJWT (não possuem `token_type` nem `user_id`, então `JWTAuthentication` os rejeita), e a checagem de `typ` impede o inverso.

### 3.7 Fluxo e telas no aplicativo

Biblioteca: **`@react-native-google-signin/google-signin`** (nativo). O projeto já usa `expo-dev-client` + EAS, então código nativo é viável, e a folha nativa de seleção de conta oferece UX superior à do fluxo por navegador.

**`src/services/googleAuth.js`** (novo): `configureGoogleSignIn()` (idempotente, chamado uma vez na montagem do `AuthProvider`), `signInWithGoogle()`, `googleSignOut()`. Deve chamar `hasPlayServices({showPlayServicesUpdateDialog:true})` antes de `signIn()`, tratar tanto o retorno `{type, data}` da v14+ quanto o formato antigo, e mapear `SIGN_IN_CANCELLED` (silencioso) e `DEVELOPER_ERROR`/código 10 com mensagem explícita. Deve chamar `signOut()` antes de `signIn()` para forçar o seletor de contas.

**`src/providers/AuthProvider.js`**: extrair a persistência hoje triplicada (linhas 61-76, 101-116, 138-153) para uma função `persistSession(response, fallbackUserType)`, e expor `loginWithGoogle()`, `linkGoogleAccount()` e `completeGoogleSignUp()`. `logout()` passa a chamar `googleSignOut()` em try/catch, no mesmo padrão já usado para `notificationService.deactivateDevice()`. As quatro chaves do `AsyncStorage` permanecem inalteradas.

**`src/screens/login.js`**: substituir o `onPress` da linha 144, usando um estado próprio `googleLoading` (não reaproveitar `loading`, que pertence ao login por senha). Cancelamento é silencioso; `authenticated` não requer navegação alguma (o `routes.js` troca a pilha declarativamente).

**`src/screens/completarCadastroGoogle.js`** (novo): cabeçalho somente leitura com os dados do `prefill`; seleção de perfil na mesma tela, reaproveitando os cards de `tipoCadastro.js`; campos condicionais — paciente com CPF (reusando `formatCPF` de `cadastroPacientes.js:46`), telefone e gênero; psicólogo com CRP e especialidade. Erros por campo em `setErrors`, com borda vermelha, exatamente como nas telas de cadastro existentes.

**`src/screens/confirmarVinculoGoogle.js`** (novo): tela curta explicando que o e-mail já possui conta, com um único campo de senha e o botão de confirmação.

**`src/routes.js`**: duas linhas novas no bloco Guest. Nada mais muda.

### 3.8 Correções obrigatórias decorrentes

**`password_change_view` (`views.py:321-337`)** — ramificar por `request.user.has_usable_password()`: quando falso, opera em modo "criar senha", exigindo apenas `new_password` (mínimo 6 caracteres) e ignorando `old_password`. Sem isso, todo usuário Google fica sem saída nessa tela.

**`UserLoginSerializer` (`serializers.py:63`)** — quando `authenticate()` falhar e existir usuário com aquele e-mail sem senha utilizável, retornar mensagem específica orientando o uso do botão do Google.

**`UserSerializer`** — adicionar `auth_provider`, `email_verified`, `avatar_url` e `has_password` (`SerializerMethodField` sobre `has_usable_password()`). **Todos precisam entrar em `read_only_fields`**: `user_update_view` usa este mesmo serializer com `partial=True`, então qualquer campo gravável se torna editável pelo cliente. `google_sub` **não** entra no serializer.

**Sessão de 60 minutos** — registrar `TokenRefreshView` e fazer o interceptor de `src/services/api.js:41-45` tentar o refresh antes de derrubar a sessão, persistindo o refresh token novo (a rotação está ligada) e limpando as **quatro** chaves apenas se o refresh falhar. Hoje o interceptor remove só `token` e `user`, deixando `refreshToken` e `userType` órfãos.

**`src/screens/meuPerfil.js:82` e `src/screens/perfilPsicologo.js:92`** — ocultar o campo "senha atual" quando `user.has_password === false`.

### 3.9 Configuração externa (manual, sob responsabilidade do usuário)

1. Coletar o SHA-1 de **cada perfil de build** via `eas credentials -p android`. Perfis com fingerprints distintos exigem um OAuth client Android próprio para cada um.
2. No Google Cloud Console (projeto `psicoapp-5d144`, já existente): configurar a *OAuth consent screen* (External; em modo *Testing*, cadastrar as contas de teste); criar um OAuth client **Web application** (cujo Client ID vai para o app e para o backend) e um OAuth client **Android** por SHA-1, com package `com.devianatech.psicoapp`.
3. No Firebase, adicionar os mesmos SHA-1 e baixar o `google-services.json` regenerado, substituindo o atual (hoje com `"oauth_client": []`).
4. `app.json`: acrescentar o plugin `@react-native-google-signin/google-signin`. **Não** adicionar `scheme` — o fluxo nativo não usa redirect de navegador; `scheme` só seria necessário com `expo-auth-session`.
5. `.env` do app: `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. `eas.json`: criar o bloco `env` nos perfis `preview` e `production` com `EXPO_PUBLIC_API_URL` e `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (o Web Client ID não é segredo — viaja dentro do APK).
6. `.env` da VPS: `GOOGLE_OAUTH_WEB_CLIENT_ID` (lido via `env_file`; o bloco `environment:` do compose não precisa mudar).

---

## 4. Autorização, privacidade e segurança

- O `id_token` é sempre validado no **backend** contra o JWKS do Google. O aplicativo nunca é a fonte de verdade sobre a identidade — ele apenas transporta o token.
- O `aud` é verificado contra uma allowlist explícita, impedindo que um `id_token` emitido para outro aplicativo seja aceito.
- `google_sub` e `email` trafegam **dentro do payload assinado** dos tokens de propósito. O cliente não consegue escalar o cadastro para um e-mail que não seja o autenticado.
- Tokens de propósito têm TTL de 15 minutos, claim `typ` obrigatória e `jti`, e não são aceitos como token de acesso pelo `JWTAuthentication`.
- Contas só são criadas ou vinculadas com `email_verified: true` vindo do Google.
- O vínculo a uma conta existente com senha exige confirmação da senha (seção 3.3), protegendo prontuários clínicos do compartilhamento indevido descrito ali.
- Nenhuma regra de autorização existente é alterada. `google_sub` nunca é exposto em nenhuma resposta de API.
- **Dívida conhecida e aceita:** as mensagens "esta conta foi criada com o Google" e "este e-mail já possui conta" permitem enumeração leve de contas. É o trade-off padrão em aplicações com login social, e o alternativa (mensagem genérica) tornaria o fluxo incompreensível para o usuário legítimo.
- **Dívida conhecida e aceita:** `ROTATE_REFRESH_TOKENS` está ligado sem o app `token_blacklist` instalado, então o refresh token antigo permanece válido até expirar naturalmente. Fora de escopo desta SPEC.

---

## 5. Critérios de aceite

### Autenticação

- [ ] Uma conta Google já vinculada entra direto, sem passos adicionais.
- [ ] Uma conta Google cujo e-mail já existe no PsicoBem **com senha** solicita a senha uma única vez e, após confirmação, passa a permitir os dois métodos de entrada.
- [ ] Uma conta Google cujo e-mail é desconhecido leva à tela de complemento e, ao concluir, cria usuário e profile corretos.
- [ ] Um `id_token` com `email_verified` falso é recusado com `403`.
- [ ] Um `id_token` com `aud` divergente é recusado com `400`.
- [ ] Com o backend sem `GOOGLE_OAUTH_WEB_CLIENT_ID` configurado, os endpoints retornam `503` sem quebrar o restante da API.

### Integridade do modelo

- [ ] Abandonar o fluxo na tela de complemento **não** deixa nenhum registro em `authentication_customuser`.
- [ ] Nenhum usuário existe sem `user_type` preenchido e sem o profile correspondente.
- [ ] `username` gerado é sempre único, inclusive para partes locais de e-mail coincidentes.
- [ ] CPF ou CRP duplicado retorna erro `400` na raiz e destaca o campo correto na interface.

### Contas existentes (regressão)

- [ ] Login por e-mail e senha permanece idêntico.
- [ ] Contas existentes permanecem com `auth_provider='local'`, `google_sub=NULL` e `email_verified=False`.
- [ ] Cadastro tradicional de paciente e de psicólogo permanece funcionando sem alteração.

### Correções decorrentes

- [ ] Usuário criado via Google consegue definir uma senha pela tela de perfil, sem que lhe seja pedida a "senha atual".
- [ ] Tentar login por senha em conta criada via Google retorna mensagem orientando o uso do botão do Google.
- [ ] A sessão sobrevive a mais de 60 minutos de uso, renovando o token automaticamente.
- [ ] Falha no refresh limpa as **quatro** chaves do `AsyncStorage`, sem deixar resíduo.

---

## 6. Testes e validação

### Backend (automatizado)

`psicoapp_backend/authentication/tests.py`, com `@patch('authentication.services.verify_google_id_token')` para não depender da rede:

- usuário desconhecido → `registration_required`;
- `/complete/` → `201`, com `CustomUser` + `Paciente`/`Psicologo` criados e consistentes;
- segundo login da mesma conta → `authenticated`;
- e-mail existente com senha → `link_confirmation_required`; `/link/` com senha correta → `200`, com senha incorreta → `400`;
- e-mail existente sem senha utilizável → vínculo direto;
- `email_verified` falso → `403`; `aud` divergente → `400`;
- token de propósito expirado → `401`; com `typ` trocado → rejeitado; com assinatura adulterada → rejeitado;
- corpo tentando sobrescrever o e-mail → prevalece o e-mail do token;
- CPF e CRP duplicados → `400` na raiz;
- `generate_unique_username` com colisão → sufixo aplicado.

Mais `python manage.py check` e `python manage.py makemigrations --check`.

### Aplicativo (manual, no dispositivo, após build EAS)

Nesta ordem, porque cada etapa destrava a seguinte:

1. Conta Google cujo e-mail **já existe com senha** → pede a senha e vincula. *(valida o fluxo de vínculo sem depender da tela de complemento)*
2. Mesma conta, segundo login → entra direto.
3. Conta Google nova → completar como **paciente** → cai na `HomePaciente` com os dados corretos.
4. Outra conta nova → completar como **psicólogo** → cai na `HomeBarNavigation`.
5. CPF ou CRP duplicado no complemento → campo correto destacado, permanece na tela.
6. Fechar o app durante o complemento e refazer → sem erro de "e-mail já cadastrado".
7. Aguardar a expiração do token de propósito e submeter → retorno à tela de login com aviso.
8. Login por e-mail e senha de conta antiga → inalterado.
9. Usuário Google abrindo "alterar senha" → modo "criar senha".
10. Sessão além de 60 minutos → permanece autenticado.
11. Após logout, novo "Entre com o Google" → exibe o seletor de contas.

### Deploy

O backend exige **rebuild da imagem** (`docker compose build web worker beat`), não apenas restart, porque `requirements.txt` muda e as dependências são instaladas na imagem, não no bind mount. A migration roda sozinha no boot do `web`.

---

## 7. Fora de escopo

- **iOS.** Exigiria definir `ios.bundleIdentifier`, criar um OAuth client iOS, configurar `iosUrlScheme` no plugin e acrescentar o Client ID iOS às audiences. O backend já nasce com allowlist de audiences justamente para permitir essa extensão sem alteração de código.
- **Integração com Google Calendar** para sincronizar sessões agendadas na agenda do psicólogo. Tecnicamente viável e potencialmente valiosa, exigiria escopos adicionais e consentimento separado. O login com Google é pré-requisito dela.
- **Exibição do avatar do Google na interface.** O campo `avatar_url` é populado e fica disponível, mas nenhuma tela passa a consumi-lo nesta entrega.
- **Login com Apple**, obrigatório pela App Store quando houver login social em aplicativos iOS — dependente da entrada do iOS em escopo.
- **`token_blacklist`** para invalidar refresh tokens rotacionados.
- **Verificação de e-mail no cadastro local** e configuração de um backend de e-mail real (que também consertaria o "esqueci minha senha").
- Criação das issues de implementação nesta etapa; serão derivadas desta SPEC após aprovação.

---

## 8. Ordem sugerida de implementação

| Fase | Conteúdo | Dependência |
|---|---|---|
| 0 | Configuração externa: OAuth clients, SHA-1, `google-services.json` regenerado | bloqueia a fase 4 |
| 1 | Backend: dependências, settings, campos em `CustomUser`, migration, `services.py`, admin | — |
| 2 | Backend: serializers e os três endpoints | fase 1 |
| 3 | Backend: correção de `password_change_view`, mensagem do `UserLoginSerializer`, rota de refresh | fase 1 |
| 4 | App: biblioteca, configuração, `googleAuth.js`, `authService`, `AuthProvider`, botão do login, **build EAS** | fases 0 e 2 |
| 5 | App: telas de complemento e de confirmação de vínculo, rotas | fase 4 |
| 6 | App: refresh automático no interceptor, `has_password` nas telas de perfil | fases 3 e 4 |
| 7 | Deploy do backend (com rebuild) e validação ponta a ponta | todas |

As fases 1 a 3 podem ser desenvolvidas e deployadas antes da configuração externa estar pronta: sem `GOOGLE_OAUTH_WEB_CLIENT_ID`, os endpoints respondem `503` de forma controlada, sem afetar nenhum fluxo existente.
