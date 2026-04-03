# 📋 Testes dos Endpoints de Sessões - PsicoBem

## 🎯 Objetivo
Testar todos os endpoints relacionados a **Sessões** e **Tipos de Sessão** do backend Django.

---

## 📡 URLs Base
- **Backend Local**: `http://127.0.0.1:8000/api/`
- **Backend Rede Local**: `http://192.168.15.9:8000/api/`

---

## 🔐 Autenticação
Todos os endpoints requerem autenticação via **JWT Token**.

### Headers necessários:
```json
{
  "Authorization": "Bearer SEU_TOKEN_JWT_AQUI",
  "Content-Type": "application/json"
}
```

---

## 📂 ENDPOINTS - TIPOS DE SESSÃO

### 1️⃣ Listar Tipos de Sessão (GET)
**Endpoint**: `/api/tipos-sessao/`  
**Permissão**: Apenas Psicólogos (retorna apenas os tipos criados pelo psicólogo logado)

**Exemplo de Resposta**:
```json
[
  {
    "id": 1,
    "psicologo": {
      "id": 1,
      "user": {
        "id": 2,
        "first_name": "Dr. João",
        "last_name": "Silva",
        "email": "joao@example.com"
      },
      "crp": "01/12345",
      "specialization": "Terapia Cognitivo-Comportamental",
      "nome_completo": "Dr. João Silva"
    },
    "nome": "Primeira Sessão",
    "tipo": "primeira",
    "valor": "150.00",
    "duracao_minutos": 60,
    "descricao": "Primeira consulta com anamnese completa",
    "ativo": true,
    "created_at": "2025-10-14T10:30:00Z",
    "updated_at": "2025-10-14T10:30:00Z",
    "valor_formatado": "R$ 150,00",
    "duracao_formatada": "60 min"
  }
]
```

---

### 2️⃣ Listar Apenas Tipos de Sessão Ativos (GET)
**Endpoint**: `/api/tipos-sessao/ativos/`  
**Permissão**: Apenas Psicólogos

**Uso**: Retorna apenas tipos de sessão com `ativo: true`

---

### 3️⃣ Criar Tipo de Sessão (POST)
**Endpoint**: `/api/tipos-sessao/`  
**Permissão**: Apenas Psicólogos

**Body da Requisição**:
```json
{
  "nome": "Sessão Online",
  "tipo": "online",
  "valor": "120.00",
  "duracao_minutos": 50,
  "descricao": "Sessão via videochamada",
  "ativo": true
}
```

**Validações**:
- `valor` ≥ 0
- `duracao_minutos` > 0 e ≤ 480 (8 horas)
- `nome` único para o psicólogo

**Resposta de Sucesso** (201 Created):
```json
{
  "id": 2,
  "nome": "Sessão Online",
  "tipo": "online",
  "valor": "120.00",
  "duracao_minutos": 50,
  "descricao": "Sessão via videochamada",
  "ativo": true,
  "valor_formatado": "R$ 120,00",
  "duracao_formatada": "50 min"
}
```

---

### 4️⃣ Atualizar Tipo de Sessão (PUT)
**Endpoint**: `/api/tipos-sessao/{id}/`  
**Permissão**: Psicólogo dono do tipo

**Body da Requisição**:
```json
{
  "nome": "Sessão Online - Promocional",
  "tipo": "online",
  "valor": "100.00",
  "duracao_minutos": 50,
  "descricao": "Sessão via videochamada - Preço promocional",
  "ativo": true
}
```

---

### 5️⃣ Deletar Tipo de Sessão (DELETE)
**Endpoint**: `/api/tipos-sessao/{id}/`  
**Permissão**: Psicólogo dono do tipo

⚠️ **Atenção**: Se houver sessões agendadas com este tipo, a deleção pode falhar.

---

## 📂 ENDPOINTS - SESSÕES

### 6️⃣ Listar Sessões (GET)
**Endpoint**: `/api/sessoes/`  
**Permissão**: 
- **Psicólogos**: veem todas as suas sessões
- **Pacientes**: veem apenas as suas próprias sessões

**Exemplo de Resposta**:
```json
[
  {
    "id": 1,
    "paciente": {
      "id": 1,
      "user": {
        "id": 3,
        "first_name": "Maria",
        "last_name": "Santos",
        "email": "maria@example.com"
      },
      "cpf": "123.456.789-01",
      "gender": "F",
      "nome_completo": "Maria Santos"
    },
    "psicologo": {
      "id": 1,
      "user": {
        "id": 2,
        "first_name": "Dr. João",
        "last_name": "Silva",
        "email": "joao@example.com"
      },
      "crp": "01/12345",
      "specialization": "TCC",
      "nome_completo": "Dr. João Silva"
    },
    "tipo_sessao": {
      "id": 1,
      "nome": "Primeira Sessão",
      "valor": "150.00",
      "duracao_minutos": 60
    },
    "data_hora": "2025-10-20T14:00:00Z",
    "status": "agendada",
    "status_pagamento": "pendente",
    "valor": "150.00",
    "data_hora_formatada": "20/10/2025 às 14:00",
    "valor_formatado": "R$ 150,00",
    "status_display": "Agendada",
    "status_pagamento_display": "Pendente",
    "pode_cancelar": true,
    "pode_remarcar": true
  }
]
```

---

### 7️⃣ Buscar Sessão Específica (GET)
**Endpoint**: `/api/sessoes/{id}/`  
**Permissão**: Psicólogo da sessão OU Paciente da sessão

**Resposta**: Dados completos da sessão (incluindo observações)

---

### 8️⃣ Criar Sessão (POST)
**Endpoint**: `/api/sessoes/`  
**Permissão**: Apenas Psicólogos

**Body da Requisição**:
```json
{
  "paciente_id": 1,
  "tipo_sessao_id": 2,
  "data_hora": "2025-10-25T15:00:00Z",
  "status": "agendada",
  "observacoes_agendamento": "Paciente solicitou urgência"
}
```

**Validações**:
- `data_hora` não pode ser no passado
- `paciente_id` deve estar vinculado ao psicólogo
- `tipo_sessao_id` deve pertencer ao psicólogo
- Não pode haver conflito de horário (psicólogo já tem sessão no mesmo horário)

**Resposta de Sucesso** (201 Created):
```json
{
  "id": 5,
  "paciente": {...},
  "psicologo": {...},
  "tipo_sessao": {...},
  "data_hora": "2025-10-25T15:00:00Z",
  "status": "agendada",
  "valor": "120.00",
  "status_pagamento": "pendente"
}
```

**Possíveis Erros**:
```json
{
  "data_hora": ["Não é possível agendar sessões no passado."]
}
```
```json
{
  "paciente_id": ["Paciente deve estar vinculado ao psicólogo."]
}
```
```json
{
  "data_hora": ["Psicólogo já tem uma sessão agendada neste horário."]
}
```

---

### 9️⃣ Atualizar Sessão (PUT/PATCH)
**Endpoint**: `/api/sessoes/{id}/`  
**Permissão**: Psicólogo da sessão

**Body da Requisição**:
```json
{
  "data_hora": "2025-10-25T16:00:00Z",
  "status": "confirmada",
  "observacoes_agendamento": "Paciente confirmou presença"
}
```

**Validações**:
- Não pode alterar data/hora de sessão realizada/cancelada
- Não pode reverter status de realizada/cancelada para agendada

---

### 🔟 Cancelar Sessão (POST)
**Endpoint**: `/api/sessoes/{id}/cancelar/`  
**Permissão**: Psicólogo OU Paciente da sessão

**Resposta de Sucesso**:
```json
{
  "message": "Sessão cancelada com sucesso.",
  "sessao": {
    "id": 1,
    "status": "cancelada",
    ...
  }
}
```

**Erro** (se não puder ser cancelada):
```json
{
  "error": "Esta sessão não pode ser cancelada."
}
```

---

### 1️⃣1️⃣ Confirmar Pagamento (POST)
**Endpoint**: `/api/sessoes/{id}/confirmar-pagamento/`  
**Permissão**: Apenas Psicólogo da sessão

**Resposta de Sucesso**:
```json
{
  "message": "Pagamento confirmado com sucesso.",
  "sessao": {
    "id": 1,
    "status_pagamento": "pago",
    "data_pagamento": "2025-10-15T10:00:00Z",
    ...
  }
}
```

**Possíveis Erros**:
```json
{
  "error": "Apenas sessões realizadas podem ter pagamento confirmado."
}
```
```json
{
  "error": "Pagamento já foi confirmado."
}
```

---

## 📂 CONSULTAS ESPECÍFICAS

### 1️⃣2️⃣ Sessões de Hoje (GET)
**Endpoint**: `/api/sessoes/hoje/`  
**Descrição**: Retorna todas as sessões do dia atual

---

### 1️⃣3️⃣ Sessões da Semana (GET)
**Endpoint**: `/api/sessoes/semana/`  
**Descrição**: Retorna sessões da semana atual (segunda a domingo)

---

### 1️⃣4️⃣ Sessões do Mês (GET)
**Endpoint**: `/api/sessoes/mes/?ano=2025&mes=10`  
**Parâmetros Opcionais**:
- `ano` (int): Ano desejado
- `mes` (int): Mês desejado (1-12)

Se não informados, retorna mês atual.

---

### 1️⃣5️⃣ Sessões Pendentes de Pagamento (GET)
**Endpoint**: `/api/sessoes/pendentes-pagamento/`  
**Permissão**: Apenas Psicólogos  
**Descrição**: Retorna sessões realizadas com pagamento pendente

---

### 1️⃣6️⃣ Estatísticas do Psicólogo (GET)
**Endpoint**: `/api/sessoes/estatisticas/?ano=2025&mes=10`  
**Permissão**: Apenas Psicólogos  
**Parâmetros Opcionais**:
- `ano` (int)
- `mes` (int)

**Exemplo de Resposta**:
```json
{
  "total_sessoes": 45,
  "sessoes_realizadas": 38,
  "sessoes_canceladas": 5,
  "receita_total": "5700.00",
  "pagamentos_pendentes": "450.00",
  "receita_formatada": "R$ 5.700,00",
  "pagamentos_pendentes_formatado": "R$ 450,00",
  "taxa_realizacao": 84.4
}
```

---

### 1️⃣7️⃣ Pacientes Vinculados (GET)
**Endpoint**: `/api/sessoes/pacientes-vinculados/`  
**Permissão**: Apenas Psicólogos  
**Descrição**: Retorna lista de pacientes ativos vinculados ao psicólogo (para usar no agendamento)

**Exemplo de Resposta**:
```json
[
  {
    "id": 1,
    "user": {
      "id": 3,
      "first_name": "Maria",
      "last_name": "Santos",
      "email": "maria@example.com"
    },
    "cpf": "123.456.789-01",
    "gender": "F",
    "nome_completo": "Maria Santos"
  }
]
```

---

## 🧪 COMO TESTAR

### Opção 1: Usando cURL

```bash
# 1. Fazer login e obter token
curl -X POST http://127.0.0.1:8000/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "psicologo@example.com", "password": "senha123"}'

# Guarde o token retornado

# 2. Listar tipos de sessão
curl -X GET http://127.0.0.1:8000/api/tipos-sessao/ \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

# 3. Criar tipo de sessão
curl -X POST http://127.0.0.1:8000/api/tipos-sessao/ \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Sessão Teste",
    "tipo": "online",
    "valor": "100.00",
    "duracao_minutos": 50,
    "ativo": true
  }'

# 4. Listar pacientes vinculados
curl -X GET http://127.0.0.1:8000/api/sessoes/pacientes-vinculados/ \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

# 5. Criar sessão
curl -X POST http://127.0.0.1:8000/api/sessoes/ \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "paciente_id": 1,
    "tipo_sessao_id": 1,
    "data_hora": "2025-10-25T15:00:00Z",
    "status": "agendada"
  }'

# 6. Listar sessões
curl -X GET http://127.0.0.1:8000/api/sessoes/ \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"

# 7. Estatísticas
curl -X GET http://127.0.0.1:8000/api/sessoes/estatisticas/ \
  -H "Authorization: Bearer SEU_TOKEN_AQUI"
```

---

### Opção 2: Usando Postman/Insomnia

1. **Criar uma Collection** chamada "PsicoBem - Sessões"
2. **Configurar Environment Variables**:
   - `base_url`: `http://127.0.0.1:8000/api`
   - `token`: (será preenchido após login)
3. **Adicionar requests** para cada endpoint listado acima
4. **Configurar Headers** em todas as requests:
   ```
   Authorization: Bearer {{token}}
   Content-Type: application/json
   ```

---

### Opção 3: Script de Teste Python

Criar arquivo `test_sessoes.py`:

```python
import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://127.0.0.1:8000/api"

# 1. Login
def login(email, password):
    response = requests.post(f"{BASE_URL}/auth/login/", 
        json={"email": email, "password": password})
    if response.status_code == 200:
        return response.json()['access']
    else:
        print(f"Erro no login: {response.text}")
        return None

# 2. Listar tipos de sessão
def listar_tipos_sessao(token):
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/tipos-sessao/", headers=headers)
    print(f"Status: {response.status_code}")
    print(json.dumps(response.json(), indent=2))

# 3. Criar tipo de sessão
def criar_tipo_sessao(token):
    headers = {"Authorization": f"Bearer {token}"}
    data = {
        "nome": "Sessão Teste API",
        "tipo": "online",
        "valor": "100.00",
        "duracao_minutos": 50,
        "ativo": True
    }
    response = requests.post(f"{BASE_URL}/tipos-sessao/", 
        headers=headers, json=data)
    print(f"Status: {response.status_code}")
    print(json.dumps(response.json(), indent=2))
    return response.json()

# 4. Criar sessão
def criar_sessao(token, paciente_id, tipo_sessao_id):
    headers = {"Authorization": f"Bearer {token}"}
    data_hora = (datetime.now() + timedelta(days=7)).isoformat()
    data = {
        "paciente_id": paciente_id,
        "tipo_sessao_id": tipo_sessao_id,
        "data_hora": data_hora,
        "status": "agendada"
    }
    response = requests.post(f"{BASE_URL}/sessoes/", 
        headers=headers, json=data)
    print(f"Status: {response.status_code}")
    print(json.dumps(response.json(), indent=2))

# 5. Estatísticas
def estatisticas(token):
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(f"{BASE_URL}/sessoes/estatisticas/", 
        headers=headers)
    print(f"Status: {response.status_code}")
    print(json.dumps(response.json(), indent=2))

# Executar testes
if __name__ == "__main__":
    # Substitua com suas credenciais de psicólogo
    token = login("psicologo@example.com", "senha123")
    
    if token:
        print("\n=== TIPOS DE SESSÃO ===")
        listar_tipos_sessao(token)
        
        print("\n=== CRIAR TIPO ===")
        novo_tipo = criar_tipo_sessao(token)
        
        print("\n=== ESTATÍSTICAS ===")
        estatisticas(token)
```

---

## ✅ CHECKLIST DE TESTES

### Tipos de Sessão
- [ ] Listar todos os tipos de sessão do psicólogo
- [ ] Listar apenas tipos ativos
- [ ] Criar novo tipo de sessão
- [ ] Validação: nome duplicado
- [ ] Validação: valor negativo
- [ ] Validação: duração inválida
- [ ] Atualizar tipo de sessão
- [ ] Deletar tipo de sessão

### Sessões
- [ ] Listar todas as sessões (psicólogo)
- [ ] Listar apenas as próprias sessões (paciente)
- [ ] Buscar sessão específica
- [ ] Criar nova sessão
- [ ] Validação: data no passado
- [ ] Validação: paciente não vinculado
- [ ] Validação: conflito de horário
- [ ] Atualizar sessão
- [ ] Cancelar sessão
- [ ] Confirmar pagamento
- [ ] Sessões de hoje
- [ ] Sessões da semana
- [ ] Sessões do mês
- [ ] Sessões pendentes de pagamento
- [ ] Estatísticas do psicólogo
- [ ] Listar pacientes vinculados

### Permissões
- [ ] Psicólogo não pode ver sessões de outro psicólogo
- [ ] Paciente não pode criar sessões
- [ ] Paciente não pode confirmar pagamentos
- [ ] Paciente não pode ver sessões de outros pacientes
- [ ] Paciente pode cancelar suas próprias sessões

---

## 🐛 ERROS COMUNS

### 401 Unauthorized
```json
{
  "detail": "Authentication credentials were not provided."
}
```
**Solução**: Verificar se o token está no header `Authorization: Bearer TOKEN`

---

### 403 Forbidden
```json
{
  "detail": "You do not have permission to perform this action."
}
```
**Solução**: Verificar se o usuário tem permissão (psicólogo para criar, etc.)

---

### 400 Bad Request
```json
{
  "data_hora": ["Não é possível agendar sessões no passado."]
}
```
**Solução**: Corrigir os dados enviados conforme a mensagem de erro

---

### 404 Not Found
```json
{
  "detail": "Not found."
}
```
**Solução**: Verificar se o ID do recurso existe e se o usuário tem permissão para acessá-lo

---

## 📝 OBSERVAÇÕES IMPORTANTES

1. **Fuso Horário**: Todas as datas devem ser enviadas em formato ISO 8601 com timezone (ex: `2025-10-25T15:00:00Z`)

2. **Vínculo Paciente-Psicólogo**: Antes de criar uma sessão, certifique-se de que existe um vínculo ativo entre o paciente e o psicólogo

3. **Status da Sessão**: Os valores válidos são:
   - `agendada`
   - `confirmada`
   - `realizada`
   - `cancelada`
   - `faltou`
   - `remarcada`

4. **Status de Pagamento**: Os valores válidos são:
   - `pendente`
   - `pago`
   - `atrasado`
   - `cancelado`

5. **Tipos de Sessão**: Os valores válidos para o campo `tipo` são:
   - `primeira`
   - `urgencia`
   - `avulsa`
   - `presencial`
   - `pacote`
   - `online`
   - `retorno`

---

## 🎉 CONCLUSÃO

Após concluir todos os testes desta checklist, você terá validado completamente a API de Sessões do PsicoBem. Qualquer erro encontrado deve ser documentado e reportado para correção.
