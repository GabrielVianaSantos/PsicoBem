# Issue 04 — Registrar a rota e tornar o avatar da Home do Paciente clicável

**Fase:** 4 — Navegação
**Prioridade:** 🟡 Média
**Arquivos principais:** `src/routes.js`, `src/screens/homePaciente.js`
**Origem:** seção 3.1 de `SPEC_MEU_PERFIL_PACIENTE.md`

## Problema

Mesmo depois de `meuPerfil.js` existir, não há como o paciente chegar até ela: a tela não está registrada na navegação, e o avatar em `HomePaciente` (`src/screens/homePaciente.js:66-68`) é uma `View` sem `TouchableOpacity` nem `onPress` — foi o sintoma original relatado pelo usuário.

## Objetivo

Tornar o avatar do paciente clicável, levando até `MeuPerfil`, no mesmo padrão já usado pelo avatar do psicólogo em `home.js` (que navega para `PerfilPsicologo`).

## Escopo de implementação

**`src/routes.js`**

- Importar `MeuPerfil` de `./screens/meuPerfil`.
- Registrar `<AppStack.Screen name="MeuPerfil" component={MeuPerfil} />` dentro do bloco "Fluxo do Paciente" (junto de `MeuPsicologo`, `MinhasSessoes`, etc.).
- Não alterar o bloco "Fluxo do Psicólogo" nem a ordem/registro de nenhuma outra rota.

**`src/screens/homePaciente.js`**

- Envolver o `<View style={styles.avatar}>` (com o `<Text style={styles.avatarText}>{inicial}</Text>` dentro) em um `TouchableOpacity` com `onPress={() => navigation.navigate('MeuPerfil')}`.
- Não alterar o estilo visual do avatar, apenas adicionar a interação.
- Não alterar nenhum outro ponto de `homePaciente.js`.

## Tarefas

- [ ] Importar e registrar a rota `MeuPerfil` em `routes.js`, no bloco do paciente.
- [ ] Envolver o avatar de `homePaciente.js` em `TouchableOpacity`.
- [ ] Adicionar `onPress={() => navigation.navigate('MeuPerfil')}`.
- [ ] Confirmar visualmente que o avatar mantém a mesma aparência (só ganhou a interação).

## Critérios de aceite

- ✅ Tocar no avatar em `HomePaciente` navega para `MeuPerfil`.
- ✅ O avatar em `Home` (psicólogo) continua navegando para `PerfilPsicologo`, sem nenhuma alteração.
- ✅ Nenhuma outra rota do bloco "Fluxo do Paciente" ou "Fluxo do Psicólogo" foi alterada.

## Dependências

- Depende da issue 02 (a tela `MeuPerfil` precisa existir para ser registrada e navegável).
- Independente da issue 03.
