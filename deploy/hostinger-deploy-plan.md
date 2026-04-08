# Plano de Deploy Hostinger

## Estado atual da VPS

- `reverse-proxy` já foi criado e está rodando.
- `curl http://localhost` no host responde corretamente.
- O próximo passo não é criar proxy do zero, e sim apontar esse proxy para a stack do backend.

## 1. Preparar a VPS

1. Atualizar o sistema.
2. Instalar Docker e Docker Compose.
3. Criar os diretórios:
   - `/opt/apps/reverse-proxy`
   - `/opt/apps/projetos`
   - `/opt/apps/volumes`
   - `/opt/apps/scripts`

## 2. Subir o projeto

1. Clonar o repositório em `/opt/apps/projetos/psicobem`.
2. Criar arquivo `.env` de produção no backend.
3. Subir a stack de produção do backend.
4. Rodar as migrations.
5. Iniciar `postgres`, `redis`, `web`, `worker` e `beat`.

## 3. Reverse proxy existente

1. Revisar o `nginx/conf.d/default.conf` já criado.
2. Garantir que ele aponte para o backend correto.
3. Apontar o domínio para a VPS.
4. Habilitar TLS.
5. Expor a API pública em HTTPS.

### Observação técnica importante

- Como os containers do backend podem mudar de IP entre recriações, o `proxy_pass` do Nginx deve usar resolução dinâmica do Docker.
- Isso evita o caso em que o proxy guarda um IP antigo do `web` e passa a devolver `502`.

## 4. Frontend Expo

1. Configurar `EXPO_PUBLIC_API_URL` com a URL pública da API.
2. Buildar o app mobile fora da VPS.
3. Testar token push em dispositivo físico.

## 5. Operação

1. Monitorar logs do `web`, `worker` e `beat`.
2. Garantir backup do banco em volume persistente.
3. Revisar falhas de push e tokens inválidos.

## 6. Ordem de subida

1. `db`
2. `redis`
3. `web`
4. `worker`
5. `beat`
6. `reverse-proxy` já existente, apenas validar/upstream
