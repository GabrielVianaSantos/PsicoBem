# PsicoBem 🧠💚

![Status](https://img.shields.io/badge/status-em%20desenvolvimento-yellow)
![React Native](https://img.shields.io/badge/React%20Native-0.74.5-blue)
![Expo](https://img.shields.io/badge/Expo-SDK%2051-black)
![License](https://img.shields.io/badge/license-MIT-green)

**Aplicativo de gestão clínica para psicólogos e acompanhamento terapêutico para pacientes**

O PsicoBem é uma plataforma completa desenvolvida em React Native que conecta psicólogos e pacientes, oferecendo ferramentas digitais para gestão de sessões, prontuários eletrônicos, relatórios de progresso e muito mais.

## 🚀 Tecnologias Utilizadas

- **Frontend Mobile**: React Native 0.74.5 + Expo SDK 51
- **Navegação**: React Navigation 6.x
- **Gerenciamento de Estado**: Context API / Hooks
- **UI/UX**: Componentes customizados + React Native Elements
- **Fontes**: Google Fonts (Raleway)
- **Desenvolvimento**: Reactotron para debugging

## 📋 Roadmap de Desenvolvimento

### ✅ **Módulos Implementados**

#### **Estrutura Base do Projeto**
- ✅ Configuração Expo SDK 51
- ✅ Sistema de navegação Stack e Bottom Tab
- ✅ Estrutura de pastas organizada
- ✅ Configuração de fontes customizadas
- ✅ Setup de debugging com Reactotron

#### **Componentes Reutilizáveis**
- ✅ Componente Topo (Header)
- ✅ Componente Botão customizado
- ✅ CustomScrollView para scroll otimizado
- ✅ Select customizado
- ✅ Navigation Bar (Bottom Tab)

#### **Telas de Interface - Sistema de Autenticação**
- ✅ Tela de Início
- ✅ Tela de Login
- ✅ Seleção de Tipo de Cadastro
- ✅ Cadastro de Psicólogos
- ✅ Cadastro de Pacientes

#### **Telas Principais - Psicólogo**
- ✅ Home do Psicólogo
- ✅ Registros de Odisseia
- ✅ Sementes do Cuidado
- ✅ Guias de Apoio
- ✅ Perfil do Paciente
- ✅ Prontuários
- ✅ Gestão de Sessões
- ✅ Tipos de Sessão
- ✅ Relatórios
- ✅ Registro Completo

#### **Telas Principais - Paciente**
- ✅ Conexão Terapêutica
- ✅ Sistema de navegação por abas

### ⬜ **Módulos Pendentes**

#### **Sistema de Autenticação Robusto**
- ⬜ Implementação de JWT
- ⬜ Diferenciação de perfis (Psicólogo/Paciente)
- ⬜ Recuperação de senha
- ⬜ Autenticação com Google
- ⬜ Validação de CRP para psicólogos
- ⬜ Gerenciamento de sessões

#### **Backend Django REST Framework**
- ⬜ Configuração do ambiente Django
- ⬜ Modelos de dados (Usuario, Paciente, Psicólogo, Sessão, Prontuário)
- ⬜ APIs REST para autenticação
- ⬜ APIs para gestão de pacientes
- ⬜ APIs para prontuários e relatórios
- ⬜ Sistema de permissões e segurança

#### **Integração Frontend ↔ Backend**
- ⬜ Configuração do Axios
- ⬜ Gerenciamento de estado global
- ⬜ Cache de dados offline
- ⬜ Sincronização de dados
- ⬜ Tratamento de erros de rede
- ⬜ Loading states e feedback visual

#### **Funcionalidades Avançadas**
- ⬜ Sistema de agendamento com calendário
- ⬜ Notificações push
- ⬜ Relatórios em PDF
- ⬜ Dashboard com gráficos e métricas
- ⬜ Sistema de backup automático
- ⬜ Integração com sistemas de pagamento
- ⬜ Chat em tempo real (opcional)

## 💻 Instalação e Configuração

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn
- Expo CLI
- Android Studio (para Android) ou Xcode (para iOS)

### Instalação

1. **Clone o repositório**
```bash
git clone https://github.com/GabrielVianaSantos/PsicoBem.git
cd PsicoBem
```

2. **Instale as dependências**
```bash
npm install
# ou
yarn install
```

3. **Execute o projeto**
```bash
npm start
# ou
yarn start
```

4. **Execute em dispositivo específico**
```bash
# Android
npm run android

# iOS
npm run ios

# Web
npm run web
```

## 📁 Estrutura do Projeto

```
PsicoBem/
├── App.js                 # Componente principal
├── src/
│   ├── routes.js          # Configuração de navegação
│   ├── hooks/             # Custom hooks
│   ├── arts/              # Recursos artísticos
│   ├── emojis/            # Emojis customizados
│   ├── icons/             # Ícones
│   ├── logo/              # Logotipo
│   └── sections/          # Imagens de seções
├── telas/
│   ├── components/        # Componentes reutilizáveis
│   │   ├── topo.js
│   │   ├── botao.js
│   │   ├── customScrollView.js
│   │   ├── select.js
│   │   └── navigation-bar.js
│   ├── inicio.js          # Tela inicial
│   ├── login.js           # Login
│   ├── cadastroPsicologos.js
│   ├── cadastroPacientes.js
│   ├── home.js            # Home do psicólogo
│   ├── registrosOdisseia.js
│   ├── prontuarios.js
│   └── ...                # Outras telas
├── config/
│   └── ReactotronConfig.js
├── assets/                # Assets estáticos
├── package.json
└── app.json              # Configuração Expo
```

## 🎯 Como Executar o Projeto

### Desenvolvimento Local

1. **Inicie o servidor de desenvolvimento**
```bash
npm start
```

2. **Escaneie o QR Code** com o app Expo Go no seu celular ou execute em um emulador

3. **Para desenvolvimento ativo**, use:
```bash
# Modo watch para Android
npm run android

# Modo watch para iOS  
npm run ios
```

### Build para Produção

```bash
# Build para Android
eas build --platform android

# Build para iOS
eas build --platform ios
```

## 📊 Progresso Atual

### ✅ **Funcionalidades Implementadas**
- SDK 51 configurado e funcionando
- Navegação entre telas implementada
- Componentes de UI criados e padronizados
- Estrutura de roteamento definida
- Telas principais do psicólogo implementadas
- Sistema básico de formulários
- Layout responsivo e tema consistente

### 🔄 **Em Desenvolvimento**
- Sistema de autenticação
- Integração com backend
- Validação de formulários
- Gerenciamento de estado global

### 📅 **Próximos Passos**
1. **Implementar autenticação JWT**
2. **Desenvolver backend Django REST Framework**
3. **Integrar APIs no frontend**
4. **Adicionar validações e tratamento de erros**
5. **Implementar funcionalidades offline**
6. **Testes automatizados**
7. **Deploy em lojas de aplicativos**

## 🤝 Como Contribuir

1. **Fork** o projeto
2. **Crie** uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. **Push** para a branch (`git push origin feature/AmazingFeature`)
5. **Abra** um Pull Request

### Padrões de Código
- Use componentes funcionais com Hooks
- Siga a estrutura de pastas estabelecida
- Mantenha componentes pequenos e reutilizáveis
- Documente funções complexas

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 👥 Equipe

- **Gabriel Viana Santos** - *Desenvolvedor Principal* - [@GabrielVianaSantos](https://github.com/GabrielVianaSantos)

## 📞 Contato

Para dúvidas, sugestões ou colaborações:
- **Email**: [contato@psicolbem.com](mailto:contato@psicolbem.com)
- **Issues**: [GitHub Issues](https://github.com/GabrielVianaSantos/PsicoBem/issues)

---

**PsicoBem** - Conectando cuidado e tecnologia para uma psicologia mais acessível e eficiente. 💚

