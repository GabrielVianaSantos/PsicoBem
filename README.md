![PsicoBem Logo](https://github.com/GabrielVianaSantos/PsicoBem/assets/99519646/80313817-b7d4-4617-90d3-0ccf4e4fa11e)

# 🧠 PsicoBem - Acompanhe, Cuide & Gerencie

[![React Native](https://img.shields.io/badge/React%20Native-0.74.5-61DAFB?logo=react&logoColor=white)](https://reactnative.dev/)
[![Expo](https://img.shields.io/badge/Expo-51.0.0-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Status](https://img.shields.io/badge/Status-Em%20Desenvolvimento-orange)](https://github.com/GabrielVianaSantos/PsicoBem)

**Aplicativo de gestão completa para psicólogos e pacientes - Transformando o cuidado em saúde mental através da tecnologia**

O PsicoBem é uma plataforma inovadora que conecta psicólogos e pacientes, oferecendo ferramentas profissionais para gestão de consultas, acompanhamento terapêutico, relatórios detalhados e muito mais.

---

## 🗺️ Roadmap de Desenvolvimento

### 🔧 **1. Configuração e Setup**
- [x] **Expo SDK 51** configurado e funcionando
- [x] **React Native 0.74.5** implementado
- [x] **Babel** configuração para transpilação
- [x] **Estrutura de pastas** organizada
- [x] **Dependências principais** instaladas
- [x] **Fonts customizadas** (Raleway) carregadas
- [x] **Splash Screen** configurada
- [ ] **Environment variables** para diferentes ambientes
- [ ] **Build configurations** para produção

### 🔐 **2. Autenticação e Cadastro**
- [x] **Tela de Login** com interface responsiva
- [x] **Cadastro de Psicólogos** (CRP, email, senha)
- [x] **Cadastro de Pacientes** (CPF, dados pessoais)
- [x] **Seleção de tipo de usuário** (Psicólogo/Paciente)
- [x] **Validação de campos** básica implementada
- [ ] **Integração com API** de autenticação
- [ ] **Validação CRP** junto ao CFP
- [ ] **Recuperação de senha**
- [ ] **Autenticação biométrica**
- [ ] **Logout e gerenciamento de sessão**

### 🏠 **3. Home e Navegação**
- [x] **Tela Home principal** com seções organizadas
- [x] **React Navigation Stack** implementado
- [x] **Transições suaves** entre telas
- [x] **Navegação bottom tabs** estruturada
- [x] **Menu lateral** funcional
- [x] **Componente de topo** reutilizável
- [x] **Ícones e assets** organizados
- [ ] **Deep linking** para navegação externa
- [ ] **Notificações push** integradas
- [ ] **Onboarding** para novos usuários

### 👨‍⚕️ **4. Funcionalidades do Psicólogo**
- [x] **Relatórios Financeiros** - Interface criada
- [x] **Fluxo de Pacientes** - Dashboard básico
- [x] **Prontuários** - Tela de edição implementada
- [x] **Guias do Apoio** - Lista de pacientes
- [x] **Sementes do Cuidado** - Interface motivacional
- [x] **Sessões** - Tipos de sessão configuráveis
- [ ] **CRUD de Pacientes** completo
- [ ] **Agendamento de consultas** avançado
- [ ] **Exportação de relatórios** PDF/Excel
- [ ] **Dashboard analítico** com gráficos
- [ ] **Prescrições e orientações**
- [ ] **Backup e sincronização** de dados

### 👤 **5. Funcionalidades do Paciente**
- [x] **Conexão Terapêutica** - Interface básica
- [x] **Registros de Odisseia** - Diário emocional
- [x] **Perfil do Paciente** - Dados pessoais
- [ ] **Visualização de consultas** agendadas
- [ ] **Cancelamento de sessões**
- [ ] **Chat/Comunicação** com psicólogo
- [ ] **Lembretes e notificações**
- [ ] **Exercícios terapêuticos**
- [ ] **Evolução e progresso** pessoal

### 📅 **6. Sessões e Agendamentos**
- [x] **Tipos de Sessão** - Configuração básica
- [ ] **Calendário interativo**
- [ ] **Disponibilidade de horários**
- [ ] **Confirmação automática**
- [ ] **Reagendamento** de consultas
- [ ] **Integração com Google Calendar**
- [ ] **Lembretes automáticos**
- [ ] **Videoconferência** integrada
- [ ] **Pagamentos online**

### 🔗 **7. Integração Frontend ↔ Backend**
- [ ] **API REST** endpoints definidos
- [ ] **Autenticação JWT** implementada
- [ ] **Estado global** (Redux/Context)
- [ ] **Cache de dados** offline
- [ ] **Sincronização** automática
- [ ] **Error handling** robusto
- [ ] **Loading states** em todas as telas
- [ ] **Retry logic** para falhas de rede

### 🖥️ **8. Backend (Django REST Framework)**
- [ ] **Modelos de dados** definidos
- [ ] **API de Autenticação** completa
- [ ] **CRUD Psicólogos** e Pacientes
- [ ] **Sistema de Agendamentos**
- [ ] **Relatórios e Analytics**
- [ ] **Sistema de Notificações**
- [ ] **Backup automatizado**
- [ ] **Deploy em produção**

### 📚 **9. Qualidade de Código e Documentação**
- [x] **Estrutura componentizada** organizada
- [x] **Estilização consistente** (#11B5A4 theme)
- [x] **README.md** completo e profissional
- [ ] **Testes unitários** (Jest/Testing Library)
- [ ] **Testes de integração** (Detox)
- [ ] **ESLint e Prettier** configurados
- [ ] **TypeScript** migração gradual
- [ ] **Documentação de API** (Swagger)
- [ ] **CI/CD Pipeline** (GitHub Actions)

---

## 🚀 **Status Atual do Projeto**

### ✅ **Concluído**
- **Frontend Mobile**: Estrutura base implementada com 19 telas funcionais
- **Navegação**: Sistema completo de rotas e transições
- **UI/UX**: Design consistente com componentes reutilizáveis
- **Autenticação**: Interfaces completas de login e cadastro
- **Modules Core**: Todas as telas principais do psicólogo criadas

### 🔄 **Em Desenvolvimento**
- **Backend Integration**: APIs e estado global
- **Data Persistence**: Armazenamento local e remoto
- **Advanced Features**: Notificações, calendário, pagamentos

### 📋 **Próximos Passos Prioritários**
1. **Backend API** - Implementar Django REST Framework
2. **Authentication Logic** - Conectar frontend ao backend
3. **Data Management** - Estado global e persistência
4. **Calendar System** - Agendamentos funcionais
5. **Testing Suite** - Cobertura de testes completa

---

## 🛠️ **Tecnologias Utilizadas**

### **Frontend Mobile**
- **React Native** `0.74.5` - Framework principal
- **Expo** `51.0.0` - Plataforma de desenvolvimento
- **React Navigation** `6.x` - Navegação entre telas
- **Expo Vector Icons** - Ícones do aplicativo
- **React Native Elements** - Componentes UI

### **Desenvolvimento**
- **JavaScript ES6+** - Linguagem principal
- **Babel** - Transpilação de código
- **ESLint** - Linting e qualidade
- **Reactotron** - Debug e inspeção

### **Ferramentas**
- **Git/GitHub** - Controle de versão
- **VS Code** - Editor de código
- **npm/yarn** - Gerenciamento de pacotes

---

## 📁 **Estrutura do Projeto**

```
PsicoBem/
├── 📱 App.js                 # Componente principal
├── 📝 README.md             # Documentação
├── ⚙️  babel.config.js       # Configuração Babel
├── 📦 package.json          # Dependências
├── 🎨 assets/               # Imagens e recursos
├── 📂 src/
│   ├── 🎯 routes.js         # Configuração de rotas
│   ├── 🎨 arts/             # Ilustrações
│   ├── 😀 emojis/           # Ícones emoji
│   ├── 🔧 hooks/            # Custom hooks
│   ├── 🖼️  icons/            # Ícones do app
│   ├── 🏷️  logo/            # Logotipos
│   └── 📊 sections/         # Imagens de seções
├── 📱 telas/                # Telas do aplicativo
│   ├── 🏠 home.js           # Tela principal
│   ├── 🔐 login.js          # Autenticação
│   ├── 👨‍⚕️ cadastroPsicologos.js
│   ├── 👤 cadastroPacientes.js
│   ├── 📊 relatorios.js     # Dashboard
│   ├── 📋 prontuarios.js    # Prontuários
│   ├── 🌱 sementesCuidado.js
│   ├── 📚 guiasApoio.js
│   └── 🧩 components/       # Componentes reutilizáveis
│       ├── 🔘 botao.js      # Botões customizados
│       ├── 🎯 topo.js       # Header component
│       ├── 📜 select.js     # Dropdown select
│       └── 🧭 navigation-bar.js
└── ⚙️  config/              # Configurações
    └── ReactotronConfig.js  # Debug tools
```

---

## 💻 **Como Instalar e Executar**

### **Pré-requisitos**
- Node.js (v16 ou superior)
- npm ou yarn
- Expo CLI
- Android Studio ou Xcode (para emuladores)

### **Instalação**
```bash
# Clone o repositório
git clone https://github.com/GabrielVianaSantos/PsicoBem.git

# Entre no diretório
cd PsicoBem

# Instale as dependências
npm install
# ou
yarn install

# Inicie o projeto
npm start
# ou
expo start
```

### **Scripts Disponíveis**
```bash
npm start          # Inicia o Expo DevTools
npm run android    # Executa no emulador Android
npm run ios        # Executa no simulador iOS
npm run web        # Executa no navegador web
```

---

## 🤝 **Como Contribuir**

### **Processo de Contribuição**
1. **Fork** o repositório
2. Crie uma **branch** para sua feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** suas mudanças (`git commit -m 'Add: Amazing Feature'`)
4. **Push** para a branch (`git push origin feature/AmazingFeature`)
5. Abra um **Pull Request**

### **Atualizando o Roadmap**
- Marque tarefas concluídas alterando `[ ]` para `[x]`
- Adicione novas tarefas mantendo a organização por módulos
- Atualize o status do projeto conforme o progresso

### **Padrões de Commit**
- `Add:` Nova funcionalidade
- `Fix:` Correção de bug
- `Update:` Atualização de funcionalidade
- `Docs:` Documentação
- `Style:` Formatação de código

---

## 📞 **Contato e Suporte**

- **Repositório**: [GitHub](https://github.com/GabrielVianaSantos/PsicoBem)
- **Issues**: [Reporte problemas](https://github.com/GabrielVianaSantos/PsicoBem/issues)
- **Discussões**: [GitHub Discussions](https://github.com/GabrielVianaSantos/PsicoBem/discussions)

---

## 📄 **Licença**

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 🎯 **Visão e Missão**

**Missão**: Democratizar o acesso a ferramentas profissionais de gestão em saúde mental, facilitando o trabalho de psicólogos e melhorando a experiência de cuidado para pacientes.

**Visão**: Ser a principal plataforma de gestão terapêutica no Brasil, conectando profissionais e pacientes através de tecnologia inovadora e humanizada.

---

<div align="center">
  <p><strong>Desenvolvido com ❤️ para transformar o cuidado em saúde mental</strong></p>
  <p><em>PsicoBem - Acompanhe, Cuide & Gerencie</em></p>
</div>
