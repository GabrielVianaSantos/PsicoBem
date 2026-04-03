# 🔐 Credenciais de Teste e Desenvolvimento

Este arquivo contém as credenciais de acesso para a base de dados local de desenvolvimento do **PsicoBem**, criadas automaticamente pelo script de seed do banco de dados (`seed_db.py`). 

As senhas e e-mails abaixo são inteiramente de uso local para desenvolvimento.

---

### 1. Psicólogo (Profissional)
Conta principal para testar o agendamento de sessões, visualização de pacientes e estatísticas financeiras da clínica.
- **E-mail:** `psicologo@example.com`
- **Senha:** `senha123`
- **CRP:** `00/00000`

### 2. Paciente (Cliente)
Conta principal para testar a visão do paciente, visualização das próprias consultas (sem permissão de edição/criação) e relatórios pessoais. *Este paciente já está previamente vinculado ao psicólogo acima.*
- **E-mail:** `paciente@example.com`
- **Senha:** `senha123`
- **CPF:** `000.000.000-00`

### 3. Jão da Silva (Paciente Alternativo)
Outro paciente registrado no sistema.
- **E-mail:** `joao@example.com`
- **Senha:** `senha123`

### 4. Administrador Geral (Superuser Django)
Acesso ao painel administrativo padrão do Django (`/admin`).
- **E-mail:** `admin@psicobem.com`
- **Usuário:** `admin`
- **Senha:** `admin123`

---
*Dica: Caso você exclua o banco de dados (`db.sqlite3`), basta rodar novamente o arquivo `psicoapp_backend/seed_db.py` usando `python manage.py shell < seed_db.py` para recriar todas essas contas automaticamente.*
