# Deploy PsicoBem na VPS Hostinger

Este diretório descreve a estrutura recomendada para subir o projeto em produção na VPS.

## Estrutura esperada na VPS

- `/opt/apps/reverse-proxy`
- `/opt/apps/projetos/psicobem`
- `/opt/apps/volumes/psicobem`
- `/opt/apps/scripts`

## Componentes

- `backend` Django em Docker
- `postgres` para banco de dados
- `redis` para fila
- `worker` Celery para envio push e jobs
- `beat` Celery Beat para lembretes
- `reverse-proxy` Nginx/Traefik para HTTPS e roteamento

## Estado atual

- O `reverse-proxy` já existe na VPS e respondeu localmente com sucesso.
- O que falta é ligar a stack do backend a esse proxy e publicar o domínio/HTTPS.

## Observações

- O app Expo não é servido na VPS. Ele consome a API pública.
- O backend precisa de domínio e HTTPS.
- Push nativo depende de Expo/EAS ou FCM/APNs, não apenas da VPS.
