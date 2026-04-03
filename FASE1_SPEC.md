# Spec: Fase 1 - Reestruturação do Frontend (Mobile/Expo)

Este documento especifica arquivo por arquivo as mudanças a serem realizadas na Fase 1 da refatoração da Arquitetura do PsicoBem. O objetivo desta fase é desacoplar God Components, organizar a estrutura de pastas e consertar dívidas técnicas (Code Smells).

## 1. Padronização de Idioma e Estrutura de Pastas
O projeto atualmente possui pastas em português (`telas`) e pastas em inglês (`src/services`, `src/hooks`). O padrão a ser adotado será estruturado em inglês dentro do diretório `src/`.

**Ações:**
- Renomear o diretório `/telas` para `/src/screens/`.
- Todas os arquivos de tela soltos no diretório raiz de `/telas` serão movidos e organizados conforme seu módulo (ex: "Auth", "PatientDashboard", "PsychologistDashboard").
- **Correção Crítica:** Renomear `telas/pefilPaciente.js` para `src/screens/PerfilPaciente/index.js` (ou `perfilPaciente.js`) e consertar o `import` quebrado no `src/routes.js`.

## 2. Refatoração de Componentes Quebrados e Duplicados
- **Exclusão:** Remover `telas/components/botao-dinamico.js` (Gera crashes por recursividade nativa).
- Mover as variações de cards (ex: `cardCustom.js` e `cardCustomInputText.js`) e botões (`botao.js`) para `/src/components/common/`.
- Padronizar os estilos destes componentes centralizando em um *Design Token* em vez de StyleSheet duro repetido.

## 3. Gestão de Estado Central (Auth)
- **Exclusão:** Remover arquivo oco `src/contexts/AuthContext.js` que causa duplicidade mental e risco de refatoração circular.
- Passar a centralizar exportações e a lógica 100% no arquivo pai original `src/providers/AuthProvider.js`.

## 4. O Monolito: Fragmentação de `telas/registrosOdisseia.js` (610 linhas)
Este arquivo será pulverizado em componentes focados, isolando a UI, o Estado do Formulário e as Requisições.

**Arquivos novos a serem criados:**
- `/src/screens/RegistrosOdisseia/index.js` (O controlador de roteamento das abas/formulário raiz).
- `/src/screens/RegistrosOdisseia/components/EmocoesGrid.js` (Selecionador de emojis e humor).
- `/src/screens/RegistrosOdisseia/components/ReacoesFisiologicas.js` (Opções de reação corporal).
- `/src/components/common/NivelSlider.js` (Componente genérico do slider para ansiedade e estresse de até 10 pontos).
- `/src/components/common/NivelChip.js` (Avisos pequenos em top tag).

## 5. Fragmentação do "God Service" (Sessões API)
O arquivo `src/services/sessaoService.js` (527 linhas) detém requisições do sistema inteiro (sessoes, pacientes, sementes, pontuários, dashboards). Será dividido conforme princípio da responsabilidade única.

**Novos Arquivos:**
- `/src/services/sessaoService.js` (Focado estritamente em `TipoSessao`, `Sessao` CRUD e cancelamento).
- `/src/services/vinculoService.js` (Controlará `getVinculos`, `alterarStatusVinculo`).
- `/src/services/prontuarioService.js` (Lidará puramente com `getProntuarios`, `createProntuario`).
- `/src/services/odisseiaOService.js` (Lidará com `getSementesCuidado`, `getRegistrosOdisseia`).

## 6. Adequação Segura do Enviroment (Variáveis de Ambiente)
**Ação:** Instalar suporte a `.env` usando a pipeline Expo/Babel (`npx expo install dotenv` ou apenas uso nativo `EXPO_PUBLIC_`).
- **Edição no `src/services/api.js`:** Remoção do IP chumbado `const BASE_URL = 'http://192.168.15.7:8000/api';`.
- Passa a ser renderizado puramente como: `const BASE_URL = process.env.EXPO_PUBLIC_API_URL;`

---

*Final da Spec Fase 1. Ao término destas ações o Frontend estará altamente performático e escalável.*
