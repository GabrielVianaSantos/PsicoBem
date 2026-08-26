# SPEC — Correção de Erros de Login e Cadastro Redirecionando para "Início"

Data: 2026-08-16
Status: planejamento
Escopo: aplicativo Expo (fluxo de autenticação) + verificação do contrato de erro da API Django já existente. Nenhuma regra de autorização do backend é alterada.

---

## 1. Objetivo

Corrigir o comportamento de erro nas telas de **Login**, **Cadastro de Pacientes** e **Cadastro de Psicólogos**, hoje quebrado pela mesma causa raiz:

- Ao ocorrer qualquer erro (credenciais inválidas, CPF/CRP/e-mail já cadastrados, senha muito curta, senhas não coincidentes, erro de rede, etc.), o app abandona a tela atual e volta para **Início**, em vez de permanecer na tela e mostrar o erro.
- No cadastro, além de permanecer na tela, o campo especificamente apontado pela API como inválido (CPF, CRP ou e-mail já cadastrados, por exemplo) deve ficar contornado em vermelho, reutilizando o mesmo padrão visual já usado pela validação local (`error={!!errors.campo}` em `TextInputCustom`).
- No login, a expectativa é apenas permanecer na tela e mostrar o erro — a API de login já retorna uma mensagem genérica ("Credenciais inválidas") por segurança, sem indicar qual campo está incorreto, então não há campo específico a destacar.

---

## 2. Estado atual identificado (causa raiz)

| Tema | Estado atual | Impacto |
|---|---|---|
| Flag de carregamento compartilhada | `src/providers/AuthProvider.js` usa o **mesmo** estado `loading` tanto para o carregamento inicial do app (`loadStorageData()`, ao abrir o app) quanto para `login()`, `registerPaciente()`, `registerPsicologo()` e `updateProfile()`. Cada uma dessas funções chama `setLoading(true)`/`setLoading(false)` no início/fim, **inclusive quando a chamada falha**. | Qualquer tentativa de login ou cadastro — com sucesso ou erro — dispara `loading = true` no contexto global. |
| Gate de navegação por `loading` | `src/routes.js:71-77` faz `if (loading) return <ActivityIndicator .../>`, substituindo **toda** a `NavigationContainer`/`AppStack.Navigator` por uma tela de carregamento, sem preservar a rota atual. | Ao `loading` voltar para `false` (após a falha), o `AppStack.Navigator` é remontado do zero. Como `isAuthenticated` continua `false`, a pilha "Guest" é recriada e inicia na sua primeira rota declarada, `Inicio` (`src/routes.js:85`) — não na tela em que o usuário estava (`Login`, `CadastroPacientes` ou `CadastroPsicologos`). |
| Único consumidor do `loading` global | Nenhuma tela desestrutura `loading` de `useAuth()` — foi confirmado por busca em todo `src/`. Apenas `routes.js` consome esse valor. | A correção pode isolar o flag de bootstrap do flag de operações de auth sem impactar nenhuma outra tela. |
| Estado local de carregamento das telas | `login.js`, `cadastroPacientes.js` e `cadastroPsicologos.js` já mantêm seu **próprio** `useState` local de `loading`, usado para desabilitar o botão e trocar o texto ("Entrando...", "Cadastrando..."). | Esse estado local já funciona corretamente e não precisa mudar — o bug está apenas no flag global do `AuthProvider`. |
| Mensagem de erro no login | `AuthProvider.login()` já devolve `{ success: false, message, status }` corretamente, e `login.js` já exibe `Alert.alert(errorTitle, result.message)` com a mensagem certa ("Credenciais inválidas..."). | O conteúdo da mensagem já está correto; o único problema é o desaparecimento da tela. |
| Dado de erro por campo já existe, mas é descartado | `authService.js` (`login`, `registerPaciente`, `registerPsicologo`) já captura `error.response.data` bruto do Django (`errorInfo.data`) e anexa em `errorToThrow.data`. Porém `AuthProvider.js` (`login`, `registerPaciente`, `registerPsicologo`) só repassa `message` e `status` no retorno de falha — **`data` é descartado**. | As telas de cadastro não têm como saber qual campo (CPF, CRP, e-mail) causou o erro, então hoje só mostram `Alert.alert` genérico e os campos nunca ficam vermelhos por erro de servidor. |
| Formato dos erros de validação do backend | `PacienteRegistrationSerializer`/`PsicologoRegistrationSerializer` usam `user = UserRegistrationSerializer()` aninhado. Erros de unicidade de CPF/CRP chegam em `{"cpf": [...]}` / `{"crp": [...]}` (nível raiz); erros de e-mail/senha/confirmação chegam aninhados em `{"user": {"email": [...]}}`, `{"user": {"password": [...]}}` ou `{"user": {"non_field_errors": ["As senhas não coincidem"]}}` (quando `password_confirm` não bate). | `authService.handleError()` já trata `cpf`, `crp`, `user.email` e `user.username`, mas **não trata `user.non_field_errors`** (erro de confirmação de senha) nem `user.password` isoladamente além do caso raiz `password`. |
| Login: formato do erro | `UserLoginSerializer.validate()` levanta um erro não vinculado a campo (`Credenciais inválidas`), retornado pela view como `{"non_field_errors": [...]}` com **HTTP 400** (não 401). | `authService.handleError()` já trata esse caso pelo fallback `non_field_errors` e produz a mensagem certa. O bloco `if (error.response.status === 401)` em `handleError()` nunca é alcançado nesse fluxo, pois o backend não emite 401 aqui — mantido como está, fora de escopo (não altera o resultado observável hoje). |

---

## 3. Requisitos funcionais

### 3.1 Parar de redirecionar para "Início" em qualquer erro de autenticação

#### Comportamento esperado

- Uma falha em `login`, `registerPaciente` ou `registerPsicologo` deve manter o usuário exatamente na tela onde ele estava (`Login`, `CadastroPacientes` ou `CadastroPsicologos`), sem desmontar o `AppStack.Navigator`.
- O carregamento inicial do app (splash enquanto lê o `AsyncStorage` e valida o token salvo) deve continuar mostrando o `ActivityIndicator` de tela cheia normalmente — esse comportamento é preservado.

#### Causa raiz e correção

- Separar, em `src/providers/AuthProvider.js`, o flag usado pelo **bootstrap** do flag usado pelas **operações de autenticação**:
  - Renomear o estado hoje chamado `loading` (controlado só por `loadStorageData()`) para `initializing`, e expor `initializing` no valor do contexto.
  - Remover as chamadas `setLoading(true)`/`setLoading(false)` de dentro de `login()`, `registerPaciente()`, `registerPsicologo()` e `updateProfile()` — essas funções não precisam mais mexer em nenhum flag global, já que cada tela chamadora mantém seu próprio estado local de carregamento (confirmado na seção 2).
- Atualizar `src/routes.js` para desestruturar `initializing` em vez de `loading` e usar esse valor no gate de tela cheia (`if (initializing) { ... }`).
- Não alterar a assinatura pública de `login`, `registerPaciente`, `registerPsicologo` além do retorno de erro (seção 3.2) — os parâmetros de entrada e o formato de sucesso continuam os mesmos.

### 3.2 Destacar em vermelho o campo apontado pela API, no cadastro

#### Comportamento esperado

- Ao tentar cadastrar com CPF, CRP ou e-mail já cadastrados (ou qualquer outro erro de validação de campo retornado pela API), a tela de cadastro correspondente permanece visível, mostra a mensagem de erro (mantendo o `Alert.alert` já existente) e contorna em vermelho exatamente o campo relacionado, usando o mesmo mecanismo já usado pela validação local (`error={!!errors.campo}` e `<Text style={estilos.errorText}>`).
- Se a API apontar mais de um campo inválido ao mesmo tempo, todos os campos relacionados devem ficar destacados.
- O comportamento de validação local (formato de e-mail, CPF, CRP, senha curta, senhas não coincidentes) continua funcionando exatamente como hoje — este item cobre apenas os erros que só o servidor consegue detectar (unicidade de CPF/CRP/e-mail, por exemplo).

#### Alterações previstas

**`src/providers/AuthProvider.js`**

- No retorno de falha de `registerPaciente()` e `registerPsicologo()` (e, por consistência, também `login()`), incluir `data: error.data` (o payload bruto já capturado por `authService.handleError()`), junto de `message` e `status`.

**`src/services/authService.js`**

- Em `handleError()`, complementar o tratamento já existente para o objeto aninhado `user`:
  - tratar `userErrors.non_field_errors` (caso de `password_confirm` divergente), com mensagem tipo "As senhas não coincidem.";
  - tratar `userErrors.password` isoladamente (hoje só o caso de `password` na raiz é tratado).
- Não alterar o formato de retorno de sucesso nem o contrato de nenhum outro método do serviço.

**`src/screens/cadastroPacientes.js` e `src/screens/cadastroPsicologos.js`**

- Em `handleCadastro()`, ao receber `result.success === false`, mapear `result.data` para o estado local `errors`, além de continuar exibindo o `Alert.alert` já existente:
  - `data.cpf` → `errors.cpf` (somente em `cadastroPacientes.js`);
  - `data.crp` → `errors.crp` (somente em `cadastroPsicologos.js`);
  - `data.user?.email` → `errors.email`;
  - `data.user?.password` → `errors.senha`;
  - `data.user?.non_field_errors` (senhas não coincidem) → `errors.confirmaSenha`;
  - erros não mapeáveis a um campo conhecido continuam só no `Alert.alert`, sem quebrar a tela.
- Não alterar `validateForm()`, os demais campos do payload enviado, nem a navegação em caso de sucesso.

### 3.3 Varredura no restante do fluxo de login/cadastro

Verificação feita nas telas do fluxo de autenticação (`Login`, `TipoCadastro`, `CadastroPacientes`, `CadastroPsicologos`, `RedefinirSenha`) e nos arquivos que elas compartilham (`AuthProvider`, `authService`, `routes.js`), restrita ao pedido do usuário.

| Tela / fluxo | Resultado da verificação |
|---|---|
| `RedefinirSenha.js` | **Não afetada** pela causa raiz: usa `authService.requestPasswordReset`/`confirmPasswordReset` diretamente (não passa por `AuthProvider`) e mantém seu próprio `loading` local. Já permanece na tela em caso de erro, mostrando só `Alert.alert`. Fora de escopo desta SPEC — nenhuma mudança prevista aqui. |
| `TipoCadastro.js` | Não faz chamada assíncrona de autenticação; não é afetada. |
| `updateProfile()` (`AuthProvider.js`), usado por `PerfilPsicologo.js` | Usa o **mesmo** flag global `loading` hoje quebrado, então uma falha ao atualizar o perfil também dispara o mesmo redirecionamento indevido — só que essa tela fica **fora do fluxo de login/cadastro** pedido nesta rodada. Como a correção da seção 3.1 remove `setLoading` de `updateProfile()` como efeito colateral direto da mesma causa raiz, esse problema é corrigido "de graça"; nenhum trabalho extra é necessário, mas também nenhum novo campo de destaque em vermelho é adicionado a `PerfilPsicologo.js` nesta SPEC. |
| Bloco `if (error.response.status === 401)` em `authService.handleError()` | Nunca é alcançado no fluxo de login atual, pois o backend responde `400` (não `401`) para credenciais inválidas (`psicoapp_backend/authentication/views.py:95`). Comportamento observável não muda; mantido como está, fora de escopo. |

---

## 4. Autorização e privacidade

- Nenhuma regra de autorização do backend é alterada; os endpoints `/auth/login/`, `/auth/register/paciente/` e `/auth/register/psicologo/` continuam validando e rejeitando exatamente como hoje.
- O login continua retornando uma mensagem genérica ("Credenciais inválidas"), sem indicar se o e-mail ou a senha está incorreta — nenhuma mudança nesta SPEC deve tornar essa mensagem mais específica, para não vazar se um e-mail está cadastrado.
- Nenhum dado sensível novo passa a ser logado ou exibido; `result.data` já trafega hoje entre `authService` e o `catch` de cada tela (só não era propagado pelo `AuthProvider`).

---

## 5. Critérios de aceite

### Navegação

- [ ] Uma tentativa de login com senha incorreta mantém o usuário na tela `Login`, mostra o alerta com a mensagem de erro e não navega para `Inicio`.
- [ ] Uma tentativa de cadastro de paciente com CPF ou e-mail já cadastrados mantém o usuário na tela `CadastroPacientes`, sem navegar para `Inicio`.
- [ ] Uma tentativa de cadastro de psicólogo com CRP ou e-mail já cadastrados mantém o usuário na tela `CadastroPsicologos`, sem navegar para `Inicio`.
- [ ] O carregamento inicial do app (abrir o app com sessão salva) continua mostrando a tela de carregamento em tela cheia normalmente.
- [ ] Um cadastro ou login bem-sucedido continua navegando para a área correta (`HomeBarNavigation` para psicólogo, `HomePaciente` para paciente) exatamente como hoje.

### Destaque de campo no cadastro

- [ ] CPF já cadastrado contorna em vermelho o campo CPF em `CadastroPacientes`, com a mensagem de erro correspondente.
- [ ] CRP já cadastrado contorna em vermelho o campo CRP em `CadastroPsicologos`, com a mensagem de erro correspondente.
- [ ] E-mail já cadastrado contorna em vermelho o campo E-mail, tanto em `CadastroPacientes` quanto em `CadastroPsicologos`.
- [ ] Senhas não coincidentes (rejeitadas pelo backend) contornam em vermelho o campo "Confirma Senha".
- [ ] Um erro de validação sem campo identificável continua exibindo o `Alert.alert`, sem quebrar a tela nem destacar um campo incorreto.

### Regressão

- [ ] A validação local já existente (formato de e-mail, CPF, CRP, senha curta) continua funcionando sem alteração de comportamento.
- [ ] Nenhuma tela fora de `Login`, `CadastroPacientes` e `CadastroPsicologos` teve sua árvore de componentes alterada.
- [ ] `git diff --check` sem apontamentos.

---

## 6. Testes e validação

### Frontend

- Login com senha incorreta e com e-mail inexistente: permanece na tela, mostra alerta, não navega.
- Cadastro de paciente com CPF já usado por outro paciente: mensagem + campo CPF em vermelho.
- Cadastro de paciente com e-mail já usado: mensagem + campo E-mail em vermelho.
- Cadastro de psicólogo com CRP já usado: mensagem + campo CRP em vermelho.
- Cadastro de psicólogo com e-mail já usado: mensagem + campo E-mail em vermelho.
- Cadastro (paciente e psicólogo) com "Senha" e "Confirma Senha" diferentes: campo "Confirma Senha" em vermelho.
- Login e cadastro bem-sucedidos: navegação para a área correta, sem regressão.
- Abrir o app com sessão salva (token válido e inválido): tela de carregamento inicial continua aparecendo e a sessão é restaurada/encerrada corretamente.
- Erro de rede (backend indisponível) durante login ou cadastro: mensagem de erro de conexão já existente, permanecendo na tela.

### Backend

- Nenhum teste novo é exigido — nenhum arquivo de backend é alterado por esta SPEC.

---

## 7. Fora de escopo

- Qualquer alteração em `psicoapp_backend/` (formato de erro, status codes, regras de unicidade).
- Tornar a mensagem de erro de login mais específica sobre qual campo está incorreto (permanece genérica por segurança).
- Novo tratamento visual de erro em `RedefinirSenha.js` (confirmado não afetado pela causa raiz) ou em `PerfilPsicologo.js` (fora do fluxo de login/cadastro pedido, mesmo se beneficiando indiretamente da correção do flag global).
- Redesenho visual das telas de `Login`, `CadastroPacientes` ou `CadastroPsicologos` além do necessário para exibir a borda vermelha nos campos com erro de servidor.
- Criação das issues de implementação nesta etapa; elas serão derivadas desta SPEC somente após aprovação.

---

## 8. Ordem sugerida de implementação

1. Separar `initializing` (bootstrap) de qualquer flag usado por `login`/`registerPaciente`/`registerPsicologo`/`updateProfile` em `AuthProvider.js`, e atualizar `routes.js` para consumir `initializing`.
2. Validar manualmente que login/cadastro com erro não navegam mais para `Inicio`, e que o carregamento inicial do app continua funcionando.
3. Propagar `data` no retorno de falha de `login`, `registerPaciente` e `registerPsicologo` em `AuthProvider.js`.
4. Complementar `authService.handleError()` para tratar `user.non_field_errors` e `user.password`.
5. Mapear `result.data` para `errors` em `cadastroPacientes.js` e `cadastroPsicologos.js`, cobrindo CPF, CRP, e-mail e confirmação de senha.
6. Testar os cenários da seção 6, incluindo os casos de sucesso para garantir ausência de regressão.
