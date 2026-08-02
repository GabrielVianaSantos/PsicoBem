# Issue 03 — Implementar dispatcher compartilhado para push e inbox

**Fase:** 3 — Aplicativo mobile  
**Prioridade:** 🔴 Alta  
**Origem:** [SPEC_ROTEAMENTO_NOTIFICACOES.md](/Users/user/Documents/GitHub/PsicoBem/SPEC_ROTEAMENTO_NOTIFICACOES.md)  
**Arquivos principais:** `src/services/notificationService.js`, `src/screens/notificacoes.js`, `src/routes.js`

## Problema e objetivo

O push navega diretamente usando dados não validados, enquanto o card interno apenas marca a notificação como lida. Um único dispatcher deve tratar as duas entradas.

## Escopo de implementação

Criar resolvedor/dispatcher que valide evento, perfil, rota e parâmetros; aguarde o `NavigationContainer`; marque a notificação como lida quando houver `notification_id`; e use `Notificacoes` como fallback.

## Tarefas

- [ ] Extrair função compartilhada para resolver `dados_extras` da inbox e `data` do push.
- [ ] Validar rotas registradas e disponíveis para o perfil autenticado.
- [ ] Normalizar payload legado (`id` de sessão) somente para compatibilidade controlada.
- [ ] Enfileirar a navegação até `navigationRef.isReady()` em cold start/background.
- [ ] Atualizar `notificacoes.js` para marcar como lida e despachar a rota no mesmo toque.
- [ ] Impedir navegações duplicadas por toque repetido.
- [ ] Enviar payload inválido/sem rota para `Notificacoes` sem crash.

## Critérios de aceite

- [ ] Push e card interno com o mesmo evento chegam à mesma tela e parâmetros.
- [ ] App aberto, em background e encerrado são tratados.
- [ ] Notificação já lida continua navegando, sem repetir a requisição de leitura.
- [ ] Notificação desconhecida ou incompatível abre `Notificacoes`.
- [ ] Uma rota não disponível ao perfil nunca é aberta diretamente.

## Dependências

- Depende das Issues 01 e 02.
