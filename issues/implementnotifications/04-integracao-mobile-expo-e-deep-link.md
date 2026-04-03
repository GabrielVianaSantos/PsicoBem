# Issue: Integracao mobile Expo e roteamento de notificacao

**Objetivo:** Registrar token no app, escutar respostas do push e navegar para a tela correta.

**Tarefas:**
- [ ] Criar `src/services/notificationService.js` para permissao, coleta de token e envio ao backend.
- [ ] Integrar `expo-notifications`, `expo-device` e `expo-constants` no app.
- [ ] Registrar o device apos login bem-sucedido e atualizar o registro quando o app abrir autenticado.
- [ ] Desativar o device no logout.
- [ ] Criar listeners de recebimento e resposta da notificacao.
- [ ] Mapear `screen` e `params` para abrir `Notificacoes`, `DetalhesSessao` e telas correlatas.
- [ ] Configurar canal Android e comportamento de foreground/background.

**Dependencias:**
- Endpoint de register/deactivate pronto.
- Rotas internas do app consolidadas.

