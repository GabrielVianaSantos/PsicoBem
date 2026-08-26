# Issue 05 — App: infraestrutura de login com Google

**Fase:** 4 — Infraestrutura do aplicativo
**Prioridade:** 🔴 Alta
**Arquivos principais:** `package.json`, `src/services/googleAuth.js` (novo), `src/services/authService.js`, `src/providers/AuthProvider.js`, `src/screens/login.js`
**Origem:** seção 3.7 de `SPEC_LOGIN_GOOGLE.md`

## Problema

O botão "Entre com o Google" existe em `src/screens/login.js:143-151`, com os estilos `btnGoogle`, `btnGoogleText` e `btnGoogleDesabilitado` já prontos (linhas 216-236), mas o `onPress` é apenas:

```js
onPress={() => Alert.alert('Info', 'Login com Google será implementado em breve!')}
```

Nenhuma biblioteca de OAuth está instalada, e o `AuthProvider` não tem nenhum método capaz de consumir os endpoints da issue 03.

## Objetivo

Fazer o botão funcionar de verdade para os casos que **não** exigem tela nova: conta Google já vinculada (entra direto) e conta cujo e-mail já existe (encaminha para a tela da issue 06). Deixar `AuthProvider` e `authService` prontos para os três fluxos.

## Escopo de implementação

### Biblioteca

```bash
yarn add @react-native-google-signin/google-signin
```

O repositório usa **yarn** (`yarn.lock`) e tem um bloco `resolutions` — não usar npm. Validar a compatibilidade com `npx expo-doctor` após a instalação.

### `src/services/googleAuth.js` (novo)

```js
export function configureGoogleSignIn()   // idempotente
export async function signInWithGoogle()  // {ok:true, idToken} | {ok:false, cancelled:true} | {ok:false, code, message}
export async function googleSignOut()     // silencioso
```

- `GoogleSignin.configure({ webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID, scopes:['profile','email'], offlineAccess:false })`.
- Chamar `hasPlayServices({ showPlayServicesUpdateDialog: true })` antes de `signIn()`.
- A v14+ retorna `{type:'success'|'cancelled', data:{idToken, user}}`; versões anteriores retornam o objeto direto. Tratar **as duas formas**.
- Mapear `statusCodes.SIGN_IN_CANCELLED` como cancelamento silencioso, `IN_PROGRESS`, `PLAY_SERVICES_NOT_AVAILABLE`, e principalmente **`DEVELOPER_ERROR` / código 10**, com mensagem explícita apontando para configuração de SHA-1/package — é o erro esperado na primeira tentativa.
- Chamar `GoogleSignin.signOut()` **antes** de `signIn()`, para forçar o seletor de contas. Sem isso, o próximo login reentra silenciosamente na mesma conta e parece bug de "não consigo trocar de conta".

`configureGoogleSignIn()` deve ser chamado uma única vez, no `useEffect` de montagem do `AuthProvider`, antes de qualquer `signIn`.

### `src/services/authService.js`

Três métodos novos, seguindo o mesmo padrão try/catch → `handleError` → `throw Error` com `.status`/`.data` já usado pelos existentes:

```js
async loginWithGoogle(idToken)              // POST /auth/google/
async linkGoogleAccount({linkToken, password})   // POST /auth/google/link/
async completeGoogleRegistration(payload)   // POST /auth/google/complete/
```

Acrescentar `code` ao objeto retornado por `handleError` (`{message, status, data, code}`), para as telas ramificarem por código em vez de comparar strings de mensagem.

### `src/providers/AuthProvider.js`

1. **Extrair `persistSession(response, fallbackUserType)`** — a persistência está hoje triplicada nas linhas 61-76, 101-116 e 138-153 (`multiSet` das quatro chaves + `setUser`/`setUserType`/`setIsAuthenticated` + `notificationService.registerDevice()` em try/catch). Reaproveitar nas três funções existentes e nas novas.
2. Expor no contexto:
   ```js
   async function loginWithGoogle()
   // {success:true, status:'authenticated'}                                  → persistSession já rodou
   // {success:true, status:'registration_required', registrationToken, prefill}  → nada persistido
   // {success:true, status:'link_confirmation_required', linkToken, email}       → nada persistido
   // {success:false, cancelled:true} | {success:false, message, code, status}

   async function linkGoogleAccount({linkToken, password})
   async function completeGoogleSignUp({registrationToken, userType, ...campos})
   ```
3. `logout()` passa a chamar `googleSignOut()` em try/catch, no mesmo padrão já usado para `notificationService.deactivateDevice()`.

As quatro chaves do `AsyncStorage` permanecem exatamente as mesmas. **O `registrationToken`/`linkToken` nunca é persistido** — trafega apenas em parâmetros de navegação.

### `src/screens/login.js`

Substituir o `onPress` da linha 144 por `handleGoogleLogin`, com estado **próprio** `googleLoading` — não reaproveitar `loading`, que pertence ao login por senha:

- `cancelled` → não fazer nada (silêncio);
- `registration_required` → `navigation.navigate('CompletarCadastroGoogle', {...})`;
- `link_confirmation_required` → `navigation.navigate('ConfirmarVinculoGoogle', {...})`;
- `authenticated` → **não navegar**: o `routes.js` troca a pilha declarativamente;
- erro → `Alert` com `r.message`.

Texto do botão passa a `googleLoading ? 'Conectando...' : 'Entre com o Google'`. Os estilos já existem.

> As duas navegações apontam para telas que só existirão na issue 06. Nesta issue, é aceitável que elas ainda não resolvam — o caminho testável aqui é o de conta já existente.

### Build

**Gerar novo build EAS `development` e instalar no dispositivo.** A biblioteca é código nativo: o dev-client atualmente instalado não a contém, e sem o novo build o `import` derruba o aplicativo.

## Tarefas

- [ ] Instalar `@react-native-google-signin/google-signin` com yarn e rodar `npx expo-doctor`.
- [ ] Criar `src/services/googleAuth.js` com as três funções e o mapeamento de erros.
- [ ] Chamar `configureGoogleSignIn()` na montagem do `AuthProvider`.
- [ ] Adicionar os três métodos ao `authService.js` e o `code` ao `handleError`.
- [ ] Extrair `persistSession()` e reaproveitá-la nas três funções existentes.
- [ ] Adicionar `loginWithGoogle`, `linkGoogleAccount` e `completeGoogleSignUp` ao `AuthProvider`.
- [ ] Chamar `googleSignOut()` dentro de `logout()`.
- [ ] Trocar o `onPress` em `login.js` e adicionar o estado `googleLoading`.
- [ ] Gerar build EAS `development` e instalar no aparelho.

## Critérios de aceite

- ✅ Conta Google cujo e-mail **já existe** no PsicoBem com senha → o aplicativo encaminha para o fluxo de confirmação (ou exibe o estado esperado, se a issue 06 ainda não estiver pronta).
- ✅ Conta Google **já vinculada** → entra direto, sem navegação manual, com a pilha trocando sozinha.
- ✅ Cancelar a folha do Google não exibe nenhum alerta de erro.
- ✅ Após logout, o próximo "Entre com o Google" exibe o seletor de contas.
- ✅ Login por e-mail e senha permanece inalterado (regressão).
- ✅ `persistSession` é a única função que grava as quatro chaves do `AsyncStorage`.
- ✅ Nenhum token de propósito é gravado no `AsyncStorage`.

## Dependências

- Depende da issue 01 (OAuth clients e `google-services.json` regenerado) e da issue 03 (endpoints no ar).
- É pré-requisito das issues 06 e 07.
