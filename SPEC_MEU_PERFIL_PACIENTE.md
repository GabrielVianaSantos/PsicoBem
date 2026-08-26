# SPEC — Tela "Meu Perfil" para o Paciente

Data: 2026-08-16
Status: planejamento
Escopo: aplicativo Expo (fluxo do paciente) + um campo somente leitura adicionado ao serializer de perfil já existente no backend Django. Nenhuma regra de autorização é alterada.

---

## 1. Objetivo

Dar ao paciente uma tela de "Meu Perfil" equivalente à que o psicólogo já tem (`PerfilPsicologo`), acessível ao tocar no próprio avatar na Home:

- Exibir **CPF**, **E-mail**, **Nome completo**, **Psicólogo atribuído** e **Tempo de tratamento** (dias corridos desde o vínculo ativo com esse psicólogo).
- Nenhum desses dados é editável pelo paciente — a única ação disponível é **redefinir a senha**, no mesmo padrão de fluxo já usado em `PerfilPsicologo.js`.

---

## 2. Estado atual identificado

| Tema | Estado atual | Impacto |
|---|---|---|
| Avatar do paciente não é clicável | `src/screens/homePaciente.js:66-68` renderiza o avatar como uma `<View>` simples, sem `TouchableOpacity` nem `onPress`. | Confirmado com o usuário: tocar no avatar não faz nada. |
| Tela `PerfilPaciente` já existe, mas com outro propósito | `src/screens/PerfilPaciente/index.js` é usada exclusivamente pelo **psicólogo** para ver o perfil de **um paciente específico** (`guiasApoio.js` e `vinculosPacientes.js` navegam para ela passando `{ paciente }` via `route.params`). Nenhuma tela do lado do paciente navega para ela. | Reaproveitar esse componente para o autoperfil do paciente misturaria duas fontes de dado diferentes (`route.params.paciente` vs. usuário autenticado) na mesma tela — melhor criar uma tela dedicada. |
| Padrão de referência já existe | `src/screens/perfilPsicologo.js` já resolve exatamente o mesmo problema do lado do psicólogo: avatar clicável em `home.js` → tela com dados do perfil, campos não editáveis destacados visualmente, seção de troca de senha reaproveitando `authService.changePassword`. | Serve de modelo direto de estrutura e de fluxo de troca de senha para a nova tela do paciente. |
| Dados já disponíveis sem alteração de backend | `authService.getUserProfile()` (`GET /auth/profile/`) já retorna `email`, `nome_completo` (via `normalizeUserProfile`), `first_name`, `last_name`. `pacienteService.getMeuPsicologo()` (`GET /vinculos/meu-psicologo/`) já retorna o psicólogo vinculado ativo (`nome_completo`, `crp`, `specialization`, `email`) **e** `data_inicio` / `duracao_dias` do vínculo, calculados no backend (`VinculoPacientePsicologo.duracao_tratamento`, propriedade que já faz `(hoje - data_inicio_tratamento).days`). | "Psicólogo atribuído" e "Tempo de tratamento" não exigem nenhum cálculo novo no frontend nem no backend — é só consumir um endpoint que já existe. |
| CPF não está disponível na resposta de perfil do paciente | `UserSerializer` (`psicoapp_backend/authentication/serializers.py`) já expõe `crp`, `specialization` e `biography` como campos somente leitura, lidos de `psicologo_profile` — mas não tem nenhum campo equivalente lendo `paciente_profile.cpf`. `Paciente.cpf` (`authentication/models.py:36`) existe e é único, mas hoje só é usado no cadastro; não é devolvido em nenhuma resposta de perfil ao próprio paciente. | É o único dado pedido que exige uma alteração de backend: adicionar um campo somente leitura ao `UserSerializer`, no mesmo padrão já usado para `crp`. |
| Investigação: é seguro tornar o e-mail editável? | `CustomUser.email` é único (`unique=True`) **e** é o `USERNAME_FIELD` do Django (`authentication/models.py:19`) — ou seja, é o identificador usado para autenticar (`UserLoginSerializer.validate()` chama `authenticate(username=email, password=...)`). Além disso, `UserSerializer.update()` (`authentication/serializers.py:157-172`) faz `setattr(instance, attr, value)` para **todo** campo presente em `validated_data`, sem excluir `email` — e `email` não está em `read_only_fields` (`= ('id', 'created_at')`). Hoje o e-mail só não é alterado porque **nenhuma tela envia esse campo** no payload de `updateProfile`; nada no backend impede. `PerfilPsicologo.js` já trata e-mail como "Não editável" na interface, mas sem reforço no serializer. | **Não é recomendável tornar o e-mail editável nesta feature.** Alterar o identificador de login tem efeitos colaterais reais (teria que revalidar unicidade, decidir o que fazer com sessões/tokens já emitidos para o e-mail antigo, e potencialmente confundir o paciente sobre qual e-mail usar no próximo login). Ver decisão detalhada na seção 3.4. |

---

## 3. Requisitos funcionais

### 3.1 Nova tela "Meu Perfil" do paciente

#### Comportamento esperado

- Uma nova tela exibe, todos **somente leitura**:
  - Nome completo;
  - E-mail;
  - CPF;
  - Psicólogo atribuído (nome completo; se possível, também CRP e especialidade, no mesmo padrão visual de `meuPsicologo.js`);
  - Tempo de tratamento, em dias, contado a partir da data de início do vínculo ativo com esse psicólogo.
- Se o paciente não tiver psicólogo vinculado no momento, os campos "Psicólogo atribuído" e "Tempo de tratamento" mostram um estado vazio claro (ex.: "Nenhum psicólogo vinculado no momento"), sem quebrar a tela nem sugerir que o paciente pode editar isso ali.
- Nenhum campo de dado pessoal é editável — não há botão "Salvar Alterações" nesta tela (diferente de `PerfilPsicologo`, que permite editar nome e especialidade).

#### Alterações previstas

**Nova tela — `src/screens/meuPerfil.js`**

- Seguir a estrutura visual já usada em `src/screens/perfilPsicologo.js`: cabeçalho com avatar grande e nome, blocos de informação somente leitura (`readOnlyBox` / `labelReadOnly` / `textReadOnly`, ou equivalente), seção de troca de senha reaproveitando o mesmo fluxo (ver 3.3).
- Buscar nome completo e e-mail via `authService.getUserProfile()`, no mesmo padrão de `sincronizarPerfil()` de `perfilPsicologo.js`.
- Buscar CPF do mesmo `authService.getUserProfile()`, após a alteração de backend da seção 3.2 incluir esse campo na resposta.
- Buscar psicólogo vinculado e tempo de tratamento via `pacienteService.getMeuPsicologo()` (já usado por `meuPsicologo.js` — nenhuma chamada nova é criada, apenas reaproveitada).
- Tratar o caso de paciente sem vínculo ativo (`getMeuPsicologo()` retornando 404, já tratado como `success: false` pelo serviço) com uma mensagem neutra, sem `Alert` de erro — não é um estado de falha, é um estado válido do domínio.

**`src/screens/homePaciente.js`**

- Envolver o avatar (`estilos.avatar`, atualmente uma `View` sem interação) em um `TouchableOpacity` com `onPress={() => navigation.navigate('MeuPerfil')}`, no mesmo padrão já usado pelo avatar de `home.js` (psicólogo), que navega para `PerfilPsicologo`.

**`src/routes.js`**

- Registrar a nova rota `MeuPerfil` dentro do bloco "Fluxo do Paciente", ao lado de `MeuPsicologo`, `MinhasSessoes`, etc.

### 3.2 Expor o CPF do paciente na resposta de perfil

#### Alterações previstas

**Backend — `psicoapp_backend/authentication/serializers.py`**

- Em `UserSerializer`, adicionar um campo somente leitura análogo ao já existente para `crp`:
  ```python
  cpf = serializers.CharField(source='paciente_profile.cpf', read_only=True)
  ```
- Incluir `cpf` na tupla `fields` de `Meta`.
- Não alterar `PacienteRegistrationSerializer`, `Paciente.cpf` nem nenhuma regra de cadastro — este campo é apenas leitura, adicionado à resposta de `GET /auth/profile/` (e, por consequência, ao login e ao carregamento inicial da sessão, que já usam `UserSerializer`).
- Confirmar que a resposta para um **psicólogo** autenticado simplesmente não inclui `cpf` (equivalente a `None`), pois `paciente_profile` não existe nesse caso — mesmo comportamento já observado hoje com `crp` para pacientes.

### 3.3 Redefinir senha (reaproveitando o fluxo do psicólogo)

#### Comportamento esperado

- Idêntico ao já existente em `PerfilPsicologo`: um botão "Alterar Senha" alterna a tela para um formulário com "Senha Atual", "Nova Senha" e "Confirme a Nova Senha"; ao confirmar, chama a API já existente de troca de senha; ao cancelar, volta para a visualização do perfil.

#### Alterações previstas

**`src/screens/meuPerfil.js`**

- Reaproveitar `authService.changePassword(senhaAtual, novaSenha)` (`POST /auth/password/change/`) — endpoint genérico, já usado por `PerfilPsicologo.js`, sem nenhuma dependência do tipo de usuário.
- Replicar a mesma validação de formulário já usada em `PerfilPsicologo.js` (campos obrigatórios, nova senha e confirmação devem coincidir).
- Não criar nenhum endpoint novo nem alterar `authService.changePassword`.

### 3.4 Decisão: e-mail permanece não editável

Conforme investigado na seção 2, tornar o e-mail editável não é recomendado nesta feature:

- O e-mail é o `USERNAME_FIELD` do Django — é literalmente o identificador de login, não apenas um dado de contato.
- Alterar esse valor exigiria, no mínimo: revalidação de unicidade com mensagem de erro amigável, uma decisão explícita sobre o que fazer com o token/sessão atual do usuário após a troca, e uma comunicação clara ao paciente de que o e-mail de login mudou — nada disso existe hoje em nenhuma tela do app.
- `PerfilPsicologo.js` já trata esse mesmo dado como não editável para o psicólogo; manter a mesma regra para o paciente preserva consistência entre os dois perfis.
- **Recomendação complementar (opcional, fora do caminho crítico desta feature):** adicionar `email` a `read_only_fields` em `UserSerializer` como reforço de backend, já que hoje nada no servidor impede a alteração — apenas nenhuma tela envia esse campo. Isso eliminaria uma fragilidade estrutural (depender só do frontend "se comportar bem") sem mudar nenhum comportamento observável hoje. Ver seção 8.

---

## 4. Autorização e privacidade

- A nova tela usa exclusivamente dados do próprio usuário autenticado (`useAuth()` / `authService.getUserProfile()` / `pacienteService.getMeuPsicologo()`), já protegidos por `IsAuthenticated` e pelos filtros de perfil já existentes no backend — nenhuma nova exposição de dado de terceiros.
- O campo `cpf` adicionado ao `UserSerializer` só é preenchido quando o usuário autenticado tem `paciente_profile` — um psicólogo autenticado não recebe esse campo, e um paciente nunca recebe o CPF de outro paciente por essa via (a resposta é sempre sobre `request.user`).
- Nenhuma alteração de permissão, autenticação ou regra de vínculo é feita nesta SPEC.

---

## 5. Critérios de aceite

### Navegação

- [ ] Tocar no avatar em `HomePaciente` navega para a nova tela `MeuPerfil`.
- [ ] O avatar em `Home` (psicólogo) continua navegando para `PerfilPsicologo`, sem alteração.

### Conteúdo da tela

- [ ] A tela exibe Nome completo, E-mail e CPF do paciente autenticado, todos somente leitura.
- [ ] A tela exibe o nome do psicólogo vinculado ativo e o tempo de tratamento em dias.
- [ ] Um paciente sem psicólogo vinculado vê uma mensagem neutra nesses campos, sem erro nem tela quebrada.
- [ ] Nenhum campo de dado pessoal tem input editável ou botão de salvar.

### Redefinição de senha

- [ ] O fluxo de "Alterar Senha" funciona de ponta a ponta (senha atual incorreta é rejeitada com mensagem clara; senhas novas divergentes são bloqueadas antes de chamar a API; sucesso limpa os campos e volta para a visualização).

### Regressão

- [ ] `PerfilPaciente` (visão do psicólogo sobre um paciente específico) continua funcionando exatamente como antes, sem nenhuma alteração.
- [ ] `PerfilPsicologo` continua funcionando exatamente como antes.
- [ ] Um psicólogo autenticado que chama `GET /auth/profile/` não recebe (ou recebe `null` em) o novo campo `cpf`.
- [ ] `git diff --check` sem apontamentos.

---

## 6. Testes e validação

### Frontend

- Autenticar como paciente com psicólogo vinculado: conferir os cinco dados na tela, incluindo o tempo de tratamento batendo com a data de vínculo cadastrada.
- Autenticar como paciente sem psicólogo vinculado: conferir o estado vazio.
- Trocar a senha com sucesso e fazer login novamente com a nova senha.
- Tentar trocar a senha com a senha atual errada: mensagem de erro, tela permanece no formulário.
- Tentar trocar a senha com "Nova Senha" e "Confirme a Nova Senha" diferentes: bloqueado antes de chamar a API.
- Conferir que nenhum campo de dado pessoal aceita edição (sem `TextInput` habilitado para nome, e-mail ou CPF).

### Backend

- Confirmar que `GET /auth/profile/` para um paciente autenticado passa a incluir `cpf`.
- Confirmar que `GET /auth/profile/` para um psicólogo autenticado não quebra e não retorna CPF de ninguém.
- Se a recomendação da seção 3.4 for aceita: confirmar que uma tentativa de enviar `email` em `PUT /auth/profile/update/` é ignorada (campo somente leitura) e não altera o e-mail do usuário.

### Regressão

- Reabrir `PerfilPaciente` a partir de `GuiasApoio`/`VinculosPacientes` (visão do psicólogo) e confirmar que nada mudou.
- Reabrir `PerfilPsicologo` e confirmar que nada mudou.

---

## 7. Fora de escopo

- Tornar o e-mail editável (decisão documentada na seção 3.4).
- Editar nome completo, CPF ou qualquer outro dado pessoal do paciente por esta tela.
- Excluir conta, encerrar vínculo com o psicólogo ou qualquer ação destrutiva a partir desta tela.
- Alterar o cálculo de `duracao_tratamento` ou qualquer regra de negócio de vínculo já existente.
- Redesenho de `PerfilPaciente` (visão do psicólogo) ou `PerfilPsicologo` além do necessário para não regredir.
- Criação das issues de implementação nesta etapa; elas serão derivadas desta SPEC somente após aprovação.

---

## 8. Ordem sugerida de implementação

1. Adicionar o campo `cpf` somente leitura ao `UserSerializer` (backend), e opcionalmente reforçar `email` em `read_only_fields` como hardening.
2. Criar `src/screens/meuPerfil.js` com os dados somente leitura (nome, e-mail, CPF, psicólogo vinculado, tempo de tratamento), reaproveitando `authService.getUserProfile()` e `pacienteService.getMeuPsicologo()`.
3. Adicionar a seção de troca de senha, reaproveitando `authService.changePassword`, no mesmo padrão de `PerfilPsicologo.js`.
4. Registrar a rota `MeuPerfil` em `routes.js` (fluxo do paciente).
5. Tornar o avatar de `HomePaciente` clicável, navegando para `MeuPerfil`.
6. Testar os cenários da seção 6, incluindo os casos de regressão em `PerfilPaciente` e `PerfilPsicologo`.
