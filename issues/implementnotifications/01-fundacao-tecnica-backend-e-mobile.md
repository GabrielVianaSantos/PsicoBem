# Issue: Fundacao tecnica para push nativo

**Objetivo:** Preparar a base tecnica para notificacoes push sem acoplar a solucao final a um unico provedor.

**Tarefas:**
- [ ] Definir o contrato interno de push com uma interface `PushProvider` e uma implementacao inicial `ExpoPushProvider`.
- [ ] Atualizar `psicoapp_backend/requirements.txt` para incluir dependencias de fila e job scheduler.
- [ ] Preparar `psicoapp_backend/docker-compose.yml` para `redis`, `worker` e `beat`.
- [ ] Criar a estrutura do novo app backend de notificacoes push, separada dos modelos atuais de inbox in-app.
- [ ] Ajustar `psicoapp_backend/psicoapp_backend/settings.py` para configurar broker/result backend, flags de ambiente e integracoes de producao.
- [ ] Preparar `app.json` para `expo-notifications` e parametros de build que permitam coleta de token em ambiente real.

**Dependencias:**
- Backend Django atual funcionando com autenticação e banco.
- Decisao de usar Expo Push Service na primeira fase.

