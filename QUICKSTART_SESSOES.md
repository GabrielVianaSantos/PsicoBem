# 🚀 Quick Start - Sistema de Sessões

## ⚡ Inicio Rápido

### 1️⃣ Iniciar o Backend

```bash
cd psicoapp_backend
python manage.py runserver
```

### 2️⃣ Testar os Endpoints (Opcional)

```bash
# Voltar para o diretório raiz
cd ..

# Executar testes automatizados
python3 test_endpoints_sessoes.py
```

### 3️⃣ Iniciar o App React Native

```bash
# Em outro terminal
npm start

# Escolher plataforma:
# Pressione 'i' para iOS
# Pressione 'a' para Android
```

### 4️⃣ Usar o App

1. Fazer login como **psicólogo** (exemplo: `psicologo@example.com / senha123`)
2. Navegar até **"Sessões"**
3. Explorar funcionalidades:
   - Ver lista de sessões
   - Filtrar por: Todas, Hoje, Semana, Mês
   - Clicar em uma sessão para ver detalhes
   - Agendar nova sessão
   - Cancelar sessão
   - Confirmar pagamento

---

## 📋 Checklist de Configuração

- [ ] Backend Django rodando
- [ ] Migrations aplicadas (`python manage.py migrate`)
- [ ] Superusuário criado (`python manage.py createsuperuser`)
- [ ] Ao menos um psicólogo cadastrado
- [ ] Ao menos um paciente cadastrado
- [ ] Vínculo ativo entre paciente e psicólogo
- [ ] URL da API configurada em `src/services/api.js`
- [ ] Dependências instaladas (`npm install`)

---

## 🔗 Links Rápidos

- **Documentação Completa**: `TESTES_ENDPOINTS_SESSOES.md`
- **Resumo da Implementação**: `SESSOES_IMPLEMENTATION_SUMMARY.md`
- **Script de Testes**: `test_endpoints_sessoes.py`

---

## 🎯 Endpoints Principais

```
GET    /api/sessoes/              - Listar sessões
POST   /api/sessoes/              - Criar sessão
GET    /api/sessoes/{id}/         - Detalhar sessão
POST   /api/sessoes/{id}/cancelar/ - Cancelar sessão
GET    /api/sessoes/hoje/         - Sessões de hoje
GET    /api/sessoes/estatisticas/ - Estatísticas
```

---

## ⚙️ Configurar URL da API

Editar `src/services/api.js`:

```javascript
// Escolher conforme seu ambiente:
const BASE_URL = 'http://127.0.0.1:8000/api';        // iOS Simulator
// const BASE_URL = 'http://10.0.2.2:8000/api';      // Android Emulator
// const BASE_URL = 'http://SEU_IP:8000/api';        // Dispositivo físico
```

---

## 🐛 Problemas Comuns

**Backend não inicia?**
```bash
cd psicoapp_backend
python manage.py migrate
python manage.py runserver
```

**App não conecta na API?**
- Verificar URL em `src/services/api.js`
- Verificar se backend está rodando
- Verificar firewall/rede

**Erro "Paciente não vinculado"?**
- Acessar Django Admin: `http://127.0.0.1:8000/admin/`
- Criar vínculo em "Vínculos Paciente-Psicólogo"

---

## 📱 Telas Implementadas

1. **`telas/sessoes.js`** - Lista de sessões com filtros
2. **`telas/agendarSessao.js`** - Formulário para agendar
3. **`telas/detalhesSessao.js`** - Detalhes completos da sessão

---

## ✅ Tudo Pronto!

O sistema está 100% funcional. Boa sorte com o desenvolvimento! 🎉
