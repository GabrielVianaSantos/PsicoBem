---
description: Start PsicoBem Development Servers
---

This workflow starts the PsicoBem local stack for development:
- Django backend through Docker Compose
- Postgres from the compose stack
- Expo frontend reading `EXPO_PUBLIC_API_URL`

Use this for local development on the computer and on a physical phone via Expo Go. This workflow is not the VPS deployment flow.

// turbo-all
1. Start everything with one command
`cd /Users/user/Documents/GitHub/PsicoBem && npm run start:psicobem`

Notes:
- The frontend must have `EXPO_PUBLIC_API_URL` set to the backend URL reachable from the device, for example `http://SEU_IP_LOCAL:8000/api`.
- The script starts the backend in Docker Compose and then launches Expo from the repo root.
- For local device testing, the backend must accept the host/IP used by the phone; the compose default now uses `ALLOWED_HOSTS=*` for development.
- If the backend image is already built, you can change the command inside `scripts/start-psicobem.sh` from `docker compose up --build` to `docker compose up`.
- Keep using this single workflow for local startup; add a separate VPS workflow later if deployment steps diverge.
