# Issue 06 — App: telas de complemento de cadastro e de confirmação de vínculo

**Fase:** 5 — Telas
**Prioridade:** 🔴 Alta
**Arquivos principais:** `src/screens/completarCadastroGoogle.js` (novo), `src/screens/confirmarVinculoGoogle.js` (novo), `src/routes.js`
**Origem:** seções 3.2, 3.3 e 3.7 de `SPEC_LOGIN_GOOGLE.md`

## Problema

Depois da issue 05, o aplicativo já obtém o `id_token` e chama o backend, mas os dois cenários que exigem interação do usuário não têm para onde ir: não existem as telas de complemento de cadastro nem de confirmação de vínculo.

## Objetivo

Fechar os dois fluxos que dependem de entrada do usuário, reaproveitando ao máximo os componentes e as máscaras que já existem nas telas de cadastro.

## Escopo de implementação

### `src/screens/completarCadastroGoogle.js` (novo)

Estrutura visual seguindo `cadastroPacientes.js`: `<Topo back={true} />` + `CustomScrollView`.

- **Cabeçalho somente leitura** com o e-mail e o nome vindos de `prefill` (exibir o avatar se houver `picture`).
- **Seleção de perfil na mesma tela**, reaproveitando os cards de `tipoCadastro.js` (`optionCard`, `optionCardSelected`, `optionIconBadge`, ícones `person-outline` e `medkit-outline`), controlando `userType` por estado local — não navegar para outra tela.
- **Campos condicionais:**
  - paciente → CPF (reusar `formatCPF` de `cadastroPacientes.js:46`), telefone (reusar `formatPhone`), e `<Select>` de gênero com o mapeamento `Masculino→M / Feminino→F / demais→O`, o mesmo já usado em `authService.js:45`;
  - psicólogo → CRP (máscara `XX/XXXXXX`, regex `^\d{2}\/\d{4,6}$` de `cadastroPsicologos.js`) e especialidade (opcional).
- **Nome editável**, pré-preenchido com `given_name` + `family_name` — o Google às vezes devolve nome incompleto.
- Botão "Concluir cadastro" chamando `completeGoogleSignUp()`. Em sucesso, **não navegar**: `persistSession` dispara a troca de pilha no `routes.js`.
- Erros por campo em `setErrors` com borda vermelha, exatamente como nas telas de cadastro existentes (os endpoints devolvem os erros na raiz justamente para o `handleError` já traduzi-los).
- `code === 'registration_token_expired'` → `Alert` explicativo + `navigation.goBack()` para a tela de login.

### `src/screens/confirmarVinculoGoogle.js` (novo)

Tela curta e focada:

- Texto explicando que o e-mail já possui conta no PsicoBem e que a senha é pedida uma única vez para confirmar que a conta é da pessoa.
- Um único campo de senha (`TextInputCustom` com `secureTextEntry`).
- Botão de confirmação chamando `linkGoogleAccount()`.
- Senha incorreta → borda vermelha no campo, permanecendo na tela.
- `code === 'link_token_expired'` → `Alert` + `goBack()`.
- Sucesso → nada a fazer: a pilha troca sozinha.

### `src/routes.js`

Duas linhas no bloco Guest:

```jsx
<AppStack.Screen name="CompletarCadastroGoogle" component={CompletarCadastroGoogle} />
<AppStack.Screen name="ConfirmarVinculoGoogle" component={ConfirmarVinculoGoogle} />
```

Nada mais muda. Quando `persistSession` roda, `isAuthenticated` vira `true` e o navigator substitui a pilha inteira, desmontando a tela automaticamente.

## Tarefas

- [ ] Criar `completarCadastroGoogle.js` com cabeçalho de `prefill` somente leitura.
- [ ] Implementar a seleção de perfil na própria tela, reaproveitando os estilos de `tipoCadastro.js`.
- [ ] Implementar os campos condicionais de paciente (CPF, telefone, gênero) reusando `formatCPF` e `formatPhone`.
- [ ] Implementar os campos condicionais de psicólogo (CRP, especialidade).
- [ ] Mapear os erros de servidor para `setErrors` (borda vermelha por campo).
- [ ] Tratar `registration_token_expired` com aviso e retorno à tela de login.
- [ ] Criar `confirmarVinculoGoogle.js` com o campo único de senha.
- [ ] Tratar senha incorreta sem sair da tela, e `link_token_expired` com retorno.
- [ ] Registrar as duas telas no bloco Guest do `routes.js`.

## Critérios de aceite

- ✅ Conta Google nova completada como **paciente** cria o perfil e cai na `HomePaciente` com os dados corretos.
- ✅ Conta Google nova completada como **psicólogo** cria o perfil e cai na `HomeBarNavigation`.
- ✅ CPF ou CRP duplicado destaca o campo correto e mantém o usuário na tela.
- ✅ Fechar o aplicativo durante o complemento e refazer o login **não** produz erro de "e-mail já cadastrado" — nenhum usuário foi criado.
- ✅ Token de propósito expirado leva de volta à tela de login com aviso compreensível.
- ✅ Senha incorreta na confirmação de vínculo destaca o campo, sem sair da tela.
- ✅ Em nenhum dos dois sucessos há navegação manual — a pilha troca declarativamente.
- ✅ Nenhuma tela fora das duas novas e do `routes.js` foi alterada.

## Dependências

- Depende da issue 05 (`completeGoogleSignUp` e `linkGoogleAccount` precisam existir no `AuthProvider`).
