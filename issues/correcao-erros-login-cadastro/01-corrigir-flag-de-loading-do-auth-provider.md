# Issue 01 — Separar o flag de bootstrap do flag de operações de autenticação

**Fase:** 1 — Causa raiz
**Prioridade:** 🔴 Alta
**Arquivos principais:** `src/providers/AuthProvider.js`, `src/routes.js`
**Origem:** seções 2 e 3.1 de `SPEC_CORRECAO_ERROS_LOGIN_CADASTRO.md`

## Problema

`AuthProvider.js` usa o mesmo estado `loading` para duas coisas diferentes:

1. o carregamento inicial do app, feito por `loadStorageData()` ao abrir o app;
2. cada chamada de `login()`, `registerPaciente()`, `registerPsicologo()` e `updateProfile()`, que fazem `setLoading(true)` no início e `setLoading(false)` no `finally` — **mesmo quando a chamada falha**.

`routes.js` usa esse mesmo `loading` para decidir se substitui toda a `NavigationContainer`/`AppStack.Navigator` por uma tela de carregamento em tela cheia (`if (loading) return <ActivityIndicator .../>`). Como nenhuma rota é preservada nessa substituição, quando `loading` volta a `false` após uma falha de login/cadastro, o `AppStack.Navigator` é remontado do zero e cai na primeira rota da pilha "Guest": `Inicio`. É exatamente esse o redirecionamento indevido relatado pelo usuário.

## Objetivo

Fazer com que uma falha em `login`, `registerPaciente`, `registerPsicologo` ou `updateProfile` não desmonte mais o navigator, mantendo o usuário na tela em que ele estava, sem alterar o comportamento do carregamento inicial do app.

## Escopo de implementação

- Em `src/providers/AuthProvider.js`:
  - Renomear o estado hoje chamado `loading` (controlado só por `loadStorageData()`) para `initializing`.
  - Expor `initializing` (não mais `loading`) no valor do `AuthContext.Provider`.
  - Remover as chamadas `setLoading(true)`/`setLoading(false)` (ou equivalentes com o novo nome) de dentro de `login()`, `registerPaciente()`, `registerPsicologo()` e `updateProfile()`. Nenhuma dessas funções deve tocar em `initializing`.
- Em `src/routes.js`:
  - Trocar a desestruturação `const { isAuthenticated, userType, loading } = useAuth();` para usar `initializing` no lugar de `loading`.
  - Trocar o gate `if (loading) { ... }` para `if (initializing) { ... }`, mantendo exatamente a mesma tela de `ActivityIndicator` já existente.
- Não alterar a lógica interna de `loadStorageData()`, `login()`, `registerPaciente()`, `registerPsicologo()` ou `updateProfile()` além da remoção do flag global — o corpo de cada função (chamadas a `authService`, `AsyncStorage`, `setUser`, `setUserType`, `setIsAuthenticated`, tratamento de erro) permanece o mesmo.
- Não alterar o `loading` local já existente em `login.js`, `cadastroPacientes.js` e `cadastroPsicologos.js` — esse estado é independente do contexto e já funciona corretamente para desabilitar botão e trocar o texto do botão.

## Tarefas

- [ ] Renomear `loading` → `initializing` no estado interno de `AuthProvider.js`, usado apenas por `loadStorageData()`.
- [ ] Remover `setLoading`/`setInitializing` de dentro de `login()`.
- [ ] Remover `setLoading`/`setInitializing` de dentro de `registerPaciente()`.
- [ ] Remover `setLoading`/`setInitializing` de dentro de `registerPsicologo()`.
- [ ] Remover `setLoading`/`setInitializing` de dentro de `updateProfile()`.
- [ ] Atualizar o valor exposto pelo `AuthContext.Provider` para `initializing` no lugar de `loading`.
- [ ] Atualizar `routes.js` para consumir `initializing` em vez de `loading`.
- [ ] Buscar em todo `src/` por outros usos de `loading` vindo de `useAuth()` antes de remover o nome antigo, confirmando que só `routes.js` o consome (já verificado na SPEC, reconferir no momento da implementação).

## Critérios de aceite

- ✅ Uma tentativa de login com senha incorreta mantém o usuário na tela `Login`.
- ✅ Uma tentativa de cadastro de paciente ou psicólogo com erro do servidor mantém o usuário na respectiva tela de cadastro.
- ✅ Uma falha ao atualizar o perfil (`updateProfile`, usado em `PerfilPsicologo`) não navega mais para nenhuma tela de fora do fluxo autenticado.
- ✅ O carregamento inicial do app (abrir com sessão salva, token válido ou inválido) continua mostrando a tela de `ActivityIndicator` em tela cheia normalmente.
- ✅ Um login ou cadastro bem-sucedido continua navegando para a área correta (`HomeBarNavigation` para psicólogo, `HomePaciente` para paciente), sem regressão.
- ✅ Nenhum arquivo de `psicoapp_backend/` foi alterado.

## Dependências

- Nenhuma. Esta é a issue de causa raiz do backlog.
- As issues 02, 03 e 04 podem ser feitas depois desta, mas não dependem dela tecnicamente (tratam de um problema diferente: falta de destaque de campo). Ainda assim, corrigir a navegação primeiro evita testar o destaque de campo em uma tela que está prestes a desaparecer.
