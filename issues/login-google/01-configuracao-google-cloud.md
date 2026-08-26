# Issue 01 — Configuração no Google Cloud Console e Firebase

**Fase:** 0 — Configuração externa (manual)
**Prioridade:** 🔴 Alta
**Arquivos principais:** `google-services.json`, `app.json`, `eas.json`, `.env` (app), `.env` (VPS)
**Origem:** seção 3.9 de `SPEC_LOGIN_GOOGLE.md`

## Problema

O projeto Firebase `psicoapp-5d144` já existe, mas foi criado apenas para notificações push: o `google-services.json` da raiz está com `"oauth_client": []` **vazio**. Não existe nenhum OAuth client criado, então nem o aplicativo consegue obter um `id_token`, nem o backend teria um `aud` válido contra o qual validar.

## Objetivo

Deixar prontas as credenciais OAuth e os arquivos de configuração, de modo que a issue 05 possa apenas consumir os valores.

## Escopo de implementação

Esta issue é majoritariamente **manual**, executada pelo usuário nos consoles do Google. As alterações de arquivo no repositório são pequenas e listadas abaixo.

### Coleta dos SHA-1

```bash
eas credentials -p android
```

Escolher a plataforma Android → o perfil de build → *Keystore: View* → anotar o **SHA-1 Fingerprint**. Repetir para **cada perfil** que gerará build (`development`, `preview`, `production`). Se os fingerprints forem diferentes entre si, **cada um exige um OAuth client Android próprio** — o mesmo package pode se repetir entre eles.

Se também for usado `npx expo run:android` local, coletar igualmente o SHA-1 do debug keystore:

```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android
```

### Google Cloud Console (projeto `psicoapp-5d144`)

Em *APIs & Services → Credentials*:

1. Configurar a *OAuth consent screen* (tipo **External**): nome do app, e-mail de suporte, e-mail do desenvolvedor. Enquanto estiver em modo *Testing*, cadastrar as contas Google de teste em *Test users* — contas fora dessa lista não conseguirão autenticar.
2. *Create Credentials → OAuth client ID → **Web application***. Não precisa de redirect URI. **Guardar o Client ID**: é ele que vai no aplicativo (`webClientId`) e no backend (`aud` esperado).
3. *Create Credentials → OAuth client ID → **Android***, com package `com.devianatech.psicoapp` e o SHA-1 correspondente. Repetir para cada SHA-1 distinto.

> O Android Client ID **não** aparece no `aud` do `id_token`. Ele serve apenas para o Google Play Services validar a combinação package + assinatura. O `aud` traz sempre o **Web Client ID**.

### Firebase

*Project settings → Your apps → Android* → adicionar os mesmos SHA-1 em *SHA certificate fingerprints* → baixar o **`google-services.json` regenerado** e substituir o da raiz do repositório. Após a regeneração, o array `oauth_client` deve conter os clients Android e o Web.

### Alterações no repositório

- **`app.json`**: acrescentar `"@react-native-google-signin/google-signin"` ao array `plugins`.
  **Não adicionar `scheme`** — o fluxo nativo não usa redirect de navegador. Boa parte dos tutoriais afirma o contrário, mas isso só se aplica a `expo-auth-session`.
- **`.env`** (raiz do app): acrescentar `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<web client id>.apps.googleusercontent.com`.
- **`eas.json`**: criar o bloco `env` nos perfis `preview` e `production`, com `EXPO_PUBLIC_API_URL` e `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`. Hoje **nenhum perfil tem bloco `env`** e o `.env` está no `.gitignore` — ou seja, um build `preview`/`production` feito hoje já falharia em `src/services/api.js:6` por falta de `EXPO_PUBLIC_API_URL`. O Web Client ID não é segredo (viaja dentro do APK), então versioná-lo no `eas.json` é aceitável.
- **`.env` da VPS** (`/opt/apps/projetos/psicobem/psicoapp_backend/.env`): acrescentar `GOOGLE_OAUTH_WEB_CLIENT_ID=<mesmo web client id>`. É lido via `env_file`, então o bloco `environment:` do compose não precisa mudar.

## Tarefas

- [ ] Coletar o SHA-1 de cada perfil de build via `eas credentials -p android`.
- [ ] Configurar a OAuth consent screen e cadastrar as contas de teste.
- [ ] Criar o OAuth client **Web application** e guardar o Client ID.
- [ ] Criar um OAuth client **Android** para cada SHA-1 distinto, com package `com.devianatech.psicoapp`.
- [ ] Adicionar os SHA-1 no Firebase e baixar o `google-services.json` regenerado.
- [ ] Substituir o `google-services.json` da raiz e confirmar que `oauth_client` deixou de estar vazio.
- [ ] Adicionar o plugin em `app.json` (sem `scheme`).
- [ ] Adicionar `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` ao `.env` do app.
- [ ] Criar o bloco `env` nos perfis `preview` e `production` do `eas.json`, incluindo também `EXPO_PUBLIC_API_URL`.
- [ ] Adicionar `GOOGLE_OAUTH_WEB_CLIENT_ID` ao `.env` da VPS.

## Critérios de aceite

- ✅ O `google-services.json` da raiz tem o array `oauth_client` preenchido.
- ✅ Existe um OAuth client Web, e um OAuth client Android por SHA-1 de perfil de build.
- ✅ As contas de teste conseguem passar pela OAuth consent screen.
- ✅ `app.json` declara o plugin e **não** declara `scheme`.
- ✅ `eas.json` tem bloco `env` em `preview` e `production` com as duas variáveis.
- ✅ Nenhuma alteração foi feita em código de aplicação (apenas configuração).

## Dependências

- Nenhuma. Pode ser feita em paralelo com as issues 02, 03 e 04.
- Bloqueia a issue 05.
