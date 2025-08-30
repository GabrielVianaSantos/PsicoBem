<div align="center">
  
![PsicoBem Banner](https://github.com/GabrielVianaSantos/PsicoBem/assets/99519646/80313817-b7d4-4617-90d3-0ccf4e4fa11e)

# 🧠 PsicoBem - Acompanhe, Cuide & Gerencie

**Aplicativo de gestão de sessões para psicólogos e pacientes**

[![Expo SDK](https://img.shields.io/badge/Expo-SDK%2051-blue.svg)](https://expo.dev/)
[![React Native](https://img.shields.io/badge/React%20Native-0.74.5-61DAFB.svg)](https://reactnative.dev/)
[![Status](https://img.shields.io/badge/Status-Em%20Desenvolvimento-yellow.svg)]()

</div>

---

## 📖 Sobre o Projeto

O **PsicoBem** é uma ferramenta completa destinada a psicólogos e pacientes para auxiliar na gestão e acompanhamento de sessões terapêuticas. O aplicativo oferece recursos para registro de pacientes, agendamento de consultas, relatórios e acompanhamento do progresso dos tratamentos.

### 🎯 Objetivo Principal
Digitalizar e otimizar o processo de gestão clínica, proporcionando uma experiência integrada entre profissionais e pacientes.

---

## 🛠️ Stack Tecnológica

| Tecnologia | Versão | Descrição |
|------------|---------|------------|
| **React Native** | 0.74.5 | Framework principal para desenvolvimento mobile |
| **Expo** | SDK 51 | Plataforma de desenvolvimento e build |
| **React Navigation** | 6.x | Sistema de navegação entre telas |
| **React Native Elements** | 3.4.3 | Biblioteca de componentes UI |
| **TypeScript** | 5.7.3 | Linguagem de programação tipada |
| **Reactotron** | 5.1.12 | Ferramenta de debug e desenvolvimento |

---

## 🗺️ Roadmap de Desenvolvimento

### ✅ **Módulos Implementados**

#### 🏗️ **Estrutura Base do Projeto**
- [x] Configuração Expo SDK 51
- [x] Sistema de navegação (Stack + Bottom Tabs)
- [x] Configuração de fontes customizadas (Raleway)
- [x] Estrutura de roteamento definida
- [x] Configuração de debug (Reactotron)

#### 🎨 **Interface e Componentes**
- [x] **Telas Principais**: Home, Login, Cadastros
- [x] **Componentes Reutilizáveis**: 
  - [x] Botão customizado (`botao.js`)
  - [x] Componente de topo (`topo.js`)
  - [x] ScrollView customizado (`customScrollView.js`)
  - [x] Seletor customizado (`select.js`)
  - [x] Navegação inferior (`navigation-bar.js`)

#### 📱 **Telas do Psicólogo**
- [x] **Home**: Dashboard principal com seções organizadas
- [x] **Cadastro de Psicólogos**: Formulário completo de registro
- [x] **Guias do Apoio**: Interface para dados de pacientes
- [x] **Registros de Odisseia**: Visualização de registros emocionais
- [x] **Sementes do Cuidado**: Área motivacional
- [x] **Prontuários**: Sistema de documentação clínica
- [x] **Relatórios**: Interface de relatórios e métricas
- [x] **Sessões**: Gerenciamento de tipos de sessão

#### 📱 **Telas do Paciente**
- [x] **Cadastro de Pacientes**: Formulário de registro
- [x] **Perfil do Paciente**: Visualização de dados pessoais
- [x] **Conexão Terapêutica**: Interface de vinculação
- [x] **Registros de Odisseia**: Sistema de autoregistro emocional

### ⬜ **Módulos Pendentes**

#### 🔐 **Sistema de Autenticação**
- [ ] Implementação JWT
- [ ] Diferenciação de perfis (Psicólogo/Paciente)
- [ ] Sistema de login/logout
- [ ] Recuperação de senha
- [ ] Validação de credenciais

#### 🌐 **Backend Django REST Framework**
- [ ] Configuração do servidor Django
- [ ] Modelos de dados (Usuários, Pacientes, Sessões)
- [ ] APIs REST para todas as funcionalidades
- [ ] Sistema de permissões
- [ ] Documentação da API

#### 🔗 **Integração Frontend ↔ Backend**
- [ ] Configuração Axios
- [ ] Gerenciamento de estado (Context API/Redux)
- [ ] Interceptors de requisição
- [ ] Cache de dados offline
- [ ] Sincronização de dados

#### 🚀 **Funcionalidades Avançadas**
- [ ] **Sistema de Relatórios**: Gráficos e análises
- [ ] **Agendamento**: Calendário integrado
- [ ] **Notificações Push**: Lembretes e alertas
- [ ] **Backup na Nuvem**: Sincronização de dados
- [ ] **Módulo Financeiro**: Controle de pagamentos

---

## ⚙️ Instalação e Configuração

### 📋 Pré-requisitos
- Node.js (versão 16 ou superior)
- npm ou yarn
- Expo CLI
- Android Studio (para Android) ou Xcode (para iOS)

### 🔧 Configuração do Ambiente

```bash
# 1. Clone o repositório
git clone https://github.com/GabrielVianaSantos/PsicoBem.git
cd PsicoBem

# 2. Instale as dependências
npm install
# ou
yarn install

# 3. Inicie o servidor de desenvolvimento
npm start
# ou
yarn start

# 4. Execute em dispositivo/emulador
npm run android  # Para Android
npm run ios      # Para iOS
npm run web      # Para Web
```

---

## 📁 Estrutura do Projeto

```
PsicoBem/
├── 📁 telas/                    # Componentes de tela
│   ├── 📁 components/           # Componentes reutilizáveis
│   │   ├── botao.js            # Botão customizado
│   │   ├── topo.js             # Cabeçalho das telas
│   │   ├── navigation-bar.js   # Navegação inferior
│   │   └── customScrollView.js # ScrollView customizado
│   ├── home.js                 # Tela principal
│   ├── login.js                # Tela de login
│   ├── cadastroPsicologos.js   # Cadastro de psicólogos
│   ├── cadastroPacientes.js    # Cadastro de pacientes
│   └── ...                     # Outras telas
├── 📁 src/                     # Recursos principais
│   ├── 📁 hooks/               # Hooks customizados
│   ├── 📁 logo/                # Assets de logo
│   ├── 📁 icons/               # Ícones da aplicação
│   └── routes.js               # Configuração de rotas
├── 📁 config/                  # Configurações
│   └── ReactotronConfig.js     # Config do Reactotron
├── App.js                      # Componente raiz
├── package.json                # Dependências do projeto
└── app.json                    # Configuração do Expo
```

---

## 🚀 Como Executar o Projeto

### 💻 **Desenvolvimento Local**

1. **Instale o Expo CLI globalmente:**
   ```bash
   npm install -g @expo/cli
   ```

2. **Execute o projeto:**
   ```bash
   expo start
   ```

3. **Visualize no dispositivo:**
   - Escaneie o QR Code com o app Expo Go
   - Ou execute em emulador Android/iOS

### 📱 **Build para Produção**

```bash
# Build para Android
expo build:android

# Build para iOS
expo build:ios

# Build universal
expo build
```

---

## 📊 Status Atual do Projeto

### ✅ **Funcionalidades Ativas**
- ✅ Navegação completa entre telas
- ✅ Interface responsiva e consistente
- ✅ Componentes reutilizáveis funcionais
- ✅ Estrutura de dados definida
- ✅ Sistema de fontes customizadas
- ✅ Configuração de build otimizada

### 🔄 **Em Desenvolvimento**
- 🔄 Sistema de autenticação
- 🔄 Integração com backend
- 🔄 Persistência de dados

### 📈 **Progresso Geral**: ~40% Concluído

---

## 🎯 Próximos Passos

### **Fase 1 - Autenticação (Próximas 2 semanas)**
1. Implementar sistema de login/cadastro
2. Criar middlewares de autenticação
3. Definir fluxos de navegação por perfil

### **Fase 2 - Backend (Próximas 4 semanas)**
1. Configurar Django REST Framework
2. Criar modelos de dados
3. Implementar APIs principais

### **Fase 3 - Integração (Próximas 3 semanas)**
1. Conectar frontend com backend
2. Implementar gerenciamento de estado
3. Criar sistema de cache

---

## 🤝 Como Contribuir

### 📝 **Processo de Contribuição**

1. **Fork o projeto**
2. **Crie sua branch de feature:**
   ```bash
   git checkout -b feature/nova-funcionalidade
   ```
3. **Commit suas mudanças:**
   ```bash
   git commit -m 'feat: adiciona nova funcionalidade'
   ```
4. **Push para a branch:**
   ```bash
   git push origin feature/nova-funcionalidade
   ```
5. **Abra um Pull Request**

### 🎨 **Padrões de Código**
- Use TypeScript para novos componentes
- Siga as convenções de nomenclatura existentes
- Adicione comentários em código complexo
- Teste suas alterações antes do commit

---

## 📋 Funcionalidades Detalhadas

### 👨‍⚕️ **Para Psicólogos**
- 📅 **Agendamentos**: Gerencie consultas e horários
- 📈 **Relatórios Financeiros**: Controle de receitas e pagamentos
- 📊 **Fluxo de Pacientes**: Métricas de atendimento
- 📝 **Registros de Pacientes**: Acompanhe emoções e comportamentos
- 🌱 **Sementes do Cuidado**: Crie mensagens motivacionais
- 📋 **Guias do Apoio**: Visualize perfis completos
- 📂 **Prontuários**: Documente sintomas e orientações
- 🚩 **Gestão de Sessões**: Configure tipos e valores

### 👤 **Para Pacientes**
- 📅 **Meus Agendamentos**: Visualize e gerencie consultas
- 🌍 **Conexão Terapêutica**: Conecte-se com seu psicólogo
- 📝 **Diário Emocional**: Registre emoções e pensamentos
- 🌱 **Mensagens de Apoio**: Receba motivação personalizada

---

## 📞 Suporte e Contato

Para dúvidas, sugestões ou reportar problemas:

- 📧 **Email**: [gabriel.developer@email.com]
- 🐛 **Issues**: [GitHub Issues](https://github.com/GabrielVianaSantos/PsicoBem/issues)
- 💬 **Discussões**: [GitHub Discussions](https://github.com/GabrielVianaSantos/PsicoBem/discussions)

---

<div align="center">

**Desenvolvido com ❤️ para a comunidade de saúde mental**

[⭐ Dê uma estrela se este projeto te ajudou!](https://github.com/GabrielVianaSantos/PsicoBem)

</div>