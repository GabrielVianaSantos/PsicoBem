# Issue 04 — App: migrar as 19 telas para o `CustomAlert`

**Fase:** 2 — Alertas customizados
**Prioridade:** 🟡 Média
**Arquivos principais:** os 19 arquivos listados abaixo
**Origem:** seções 2.3 e 3.3 de `SPEC_BADGES_NOVIDADES_E_ALERTAS_CUSTOMIZADOS.md`

## Problema

90 chamadas de `Alert.alert` espalhadas por 19 arquivos ainda usam o diálogo nativo do sistema operacional.

## Objetivo

Trocar a origem do `Alert` usado em cada um dos 19 arquivos pelo `CustomAlert` (issue 03), sem alterar nenhuma chamada existente.

## Escopo de implementação

Em cada arquivo abaixo, trocar a importação de `Alert` vinda de `"react-native"` (removendo `Alert` da desestruturação, se vier junto de outros imports de RN) por:

```js
import { CustomAlert as Alert } from '<caminho relativo>/components/common/CustomAlert';
```

Nenhuma outra linha do arquivo deve mudar — os 90 pontos de chamada (`Alert.alert(titulo, mensagem, [...])`) continuam exatamente como estão.

Arquivos (todos em `src/screens/`):

- [ ] `agendarSessao.js`
- [ ] `cadastroPacientes.js`
- [ ] `cadastroPsicologos.js`
- [ ] `completarCadastroGoogle.js`
- [ ] `conexaoTerapeutica.js`
- [ ] `confirmarVinculoGoogle.js`
- [ ] `detalhesSessao.js`
- [ ] `login.js`
- [ ] `meuPerfil.js`
- [ ] `perfilPsicologo.js`
- [ ] `prontuarios.js`
- [ ] `redefinirSenha.js`
- [ ] `registrosOdisseia.js`
- [ ] `relatorios.js`
- [ ] `sementesCuidado.js`
- [ ] `sementesPaciente.js`
- [ ] `sessoes.js`
- [ ] `tipoSessao.js`
- [ ] `vinculosPacientes.js`

## Tarefas

- [ ] Migrar os 19 arquivos conforme acima.
- [ ] Buscar em todo `src/` por `Alert.alert` ou `Alert.prompt` remanescente após a migração — deve retornar zero ocorrências vindas de `"react-native"`.
- [ ] Testar manualmente pelo menos um alerta de cada arquivo migrado que tenha um fluxo crítico (login, cadastro, exclusão, confirmação de sessão).

## Critérios de aceite

- ✅ Nenhum dos 19 arquivos importa mais `Alert` de `"react-native"`.
- ✅ Todos os fluxos que dependiam do `onPress` de um botão de alerta continuam funcionando (confirmar exclusão, cancelar sessão, navegar após sucesso, etc.).
- ✅ Visualmente, todo alerta do app usa o componente customizado.

## Dependências

- Depende da issue 03 (`CustomAlert.js` precisa existir).
- Independente das issues 01, 02, 05 e 06.
