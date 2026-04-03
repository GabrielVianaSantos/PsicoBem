# Comandos de Deploy na VPS Hostinger

Esses comandos assumem:
- reverse proxy já criado em `/opt/apps/reverse-proxy`
- repositório clonado em `/opt/apps/projetos/psicobem`
- compose de produção em `psicoapp_backend/docker-compose.prod.yml`

## 1. Verificar a rede do proxy

```bash
docker network ls | grep reverse-proxy_default
```

Se a rede existir, a stack do backend pode entrar nela e o proxy vai enxergar o serviço `web`.

## 2. Criar o `.env` do backend

```bash
cd /opt/apps/projetos/psicobem/psicoapp_backend
cp /opt/apps/projetos/psicobem/deploy/.env.production.example .env
nano .env
```

## 3. Subir a stack de produção

```bash
cd /opt/apps/projetos/psicobem/psicoapp_backend
docker compose -f docker-compose.prod.yml up -d --build
```

## 4. Validar migrations e staticfiles

```bash
docker compose -f docker-compose.prod.yml logs -f web
docker compose -f docker-compose.prod.yml exec web python manage.py showmigrations
docker compose -f docker-compose.prod.yml exec web python manage.py collectstatic --noinput
```

## 5. Criar superuser

```bash
docker compose -f docker-compose.prod.yml exec web python manage.py createsuperuser
```

## 6. Ajustar o reverse proxy

No arquivo `/opt/apps/reverse-proxy/nginx/conf.d/default.conf`, o upstream deve apontar para `web:8000`.

Exemplo:

```nginx
server {
    listen 80;
    server_name api.seudominio.com;

    location / {
        proxy_pass http://web:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Depois recarregue:

```bash
cd /opt/apps/reverse-proxy
docker compose up -d
docker compose restart proxy
```

## 7. Verificar saúde

```bash
docker ps
docker compose -f /opt/apps/projetos/psicobem/psicoapp_backend/docker-compose.prod.yml logs -f worker beat
curl -I http://localhost
```

## 8. Frontend Expo

No ambiente do frontend, definir:

```bash
EXPO_PUBLIC_API_URL=https://api.seudominio.com/api
```

## 9. Ordem operacional

1. Subir `db`
2. Subir `redis`
3. Subir `web`
4. Subir `worker`
5. Subir `beat`
6. Validar proxy
7. Validar domínio/TLS

