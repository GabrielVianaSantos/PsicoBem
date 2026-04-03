# Issue: Empacotamento Docker e Orquestração Isolada (Backend)

**Objetivo:** Tornar viável subir e derrubar instâncias em servidores puros de Ubuntu ou via DigitalOcean sem tração manual.

**Tarefas:**
- [ ] Construir arquivo declarativo primário `/psicoapp_backend/Dockerfile` contendo exportação para ambiente virtual puro e gunicorn daemon binding.
- [ ] Formular receita base em `docker-compose.yml` (raiz superior backend) pra ativamente levantar os contêineres e unificar conectividade.
- [ ] No Compose, definir a injeção do contêiner paralelo de `postgres:15` puxando via imagem limpa oficial e construindo user/password linkável no environment de Database URL para o Web.
- [ ] Mapear Bind Mounts / Docker Volumes pra assegurar persistência de logs caso os Nodes sofram auto-killing.
