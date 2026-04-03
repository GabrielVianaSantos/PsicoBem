# Spec: Fase 2 - Arquitetura de Backend (Django) e Segurança para Deploy (VPS)

Este documento especifica as etapas file-by-file para desmembrar o monólito do Backend e preparar o sistema de forma perfeitamente segura e escalonável para ser alocado em um Virtual Private Server (VPS) via Docker.

## 1. Tratamento de Segurança e Variáveis de Ambiente
A configuração raiz do Django não deve, sob nenhuma hipótese, expor chaves nativas aos repositórios versionáveis em sistemas abertos.

**Ações em `psicoapp_backend/psicoapp_backend/settings.py`:**
- Instalar `python-dotenv` no `requirements.txt`.
- Adicionar linha para leitura do `.env` raiz do sistema Ubuntu do VPS.
- **Mudança:** `SECRET_KEY = os.getenv("SECRET_KEY", "fallback-insecure-dev-only")`.
- **Mudança:** `DEBUG = os.getenv("DEBUG", "False").lower() in ["true", "1", "t"]`.
- **Mudança:** `ALLOWED_HOSTS = os.getenv("ALLOWED_HOSTS", "localhost").split(',')`.
- **CORS Config:** Corrigir `CORS_ALLOW_ALL_ORIGINS`. Permitiremos o acesso total originado estritamente para subdomínios (em prod).

## 2. Quebra do Monolito "Core" (`models.py` e `views.py`)
Atualmente, o `psicoapp_backend/core/models.py` tem mais de 1500 linhas alocando o sistema todo de Pacientes a Odisseias numa única Application Django. O Django Architecture Style propõe que cada negócio tenha um `app`.

**Fluxos a serem realizados via terminal:**
Criar os apps individualmente (via `manage.py startapp sessoes`, `manage.py startapp engajamentos`...).
Após, as responsabilidades de código do arquivo longo migrarão para eles:

### App 2A: `sessoes/`
Arquivos novos a serem formatados (cortados do Core e transferidos):
- `sessoes/models.py`: Migração das Classes `TipoSessao`, `Sessao` e `SessaoManager`.
- `sessoes/views.py`: Migração dos Viewsets do psicólogo para aceitar consultas/cancelar consultas e pagar Sessões.
- `sessoes/serializers.py`: Serializers limitados unicamente aos campos de sessão.
- **urls.py:** Fazer um arquivo para abster as rotas `/api/sessoes/`.

### App 2B: `engajamentos/` (Sementes e Odisseias)
- `engajamentos/models.py`: Migração das Classes `CategoriaMensagem`, `SementeCuidado`, `MensagemPaciente`, `CategoriaOdisseia` e afins.
- `engajamentos/serializers.py` & `engajamentos/views.py`: Concentrando apenas fluxos de registros de humor e sementes programadas na semana.

### App 2C: `core/` (O Que Restar)
- Ficará mantido APENAS os dados raízes da aplicação: Perfis, Notificações Sistêmicas e Utils Gerais não acopláveis.

## 3. Consertando o Gargalo de Banco de Dados de Produção
Migraremos do banco de dados relacional genérico limitante SQLite para um cluster produtivo poderoso do PostgreSQL. 

**Edição:** `psicoapp_backend/psicoapp_backend/settings.py`
```python
DATABASES = {
    'default': dj_database_url.config(
        default=os.getenv('DATABASE_URL', 'sqlite:///' + str(BASE_DIR / 'db.sqlite3'))
    )
}
```
*Isto permite SQLite em dev (rodando clean), mas que no container Docker, injeta-se e vira um banco Postgre simultaneamente robusto.*

## 4. Dockerização e CI/CD Simples
Criação dos manifestos que orquestram a subida da sua VPS com um único comando remoto no Terminal (usando Compose).

**Novos Arquivos:**
- `/psicoapp_backend/Dockerfile`: Regras de sistema operacional, dependências pip instaláveis puras. Gunicorn e WSGI Binding de porta para fora do web.
- `/docker-compose.yml` (Na raíz ou pasta de deploy): Subirá 2 serviços simultâneos:
  - Serviço Web (Nossa imagem construída Django de Backend).
  - Serviço DB (Imagem Oficial puramente configurada do Postgresql 15+ com montagem automática de storage volumes).

---
*Final da Spec Fase 2. Ao final deste estágio a base de back-end não será travada na leitura e toda segurança para o domínio em nuvem estará preparada contra injeção de scripts e vazamento via terminal.*
