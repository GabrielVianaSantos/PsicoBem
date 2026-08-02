# SPEC — Roteamento de Interações das Notificações

Data: 2026-07-30  
Status: planejamento  
Escopo: notificações nativas do Expo e inbox interna do aplicativo

## 1. Objetivo

Fazer com que tocar em uma notificação abra a tela relacionada ao evento, de maneira consistente no push nativo (barra de notificações do celular) e na lista interna de **Notificações**. O evento, a tela e os parâmetros devem usar um contrato único, com fallback seguro quando a notificação não tiver rota válida.

## 2. Estado atual e problemas identificados

| Área | Estado atual | Impacto |
|---|---|---|
| Push nativo | `notificationService.setupNotificationListeners()` lê `data.screen`/`data.params` e navega diretamente. | O comportamento depende de payloads corretos, não valida a rota e pode tentar navegar antes de a navegação estar pronta. |
| Inbox interna | `src/screens/notificacoes.js` apenas marca o item como lido. | Tocar em uma notificação não abre o contexto que gerou o evento. |
| Contrato de parâmetros | Sessões são emitidas com `params.id`, mas `DetalhesSessao` espera `sessaoId`. | O push pode abrir a tela sem conseguir carregar a sessão. |
| Rotas de sementes | Alguns eventos usam `SementesPsicologo`, mas a rota registrada é `SementesCuidado`. | A navegação do push pode falhar por nome de rota inexistente. |
| Eventos genéricos | Vários eventos usam `tipo='sistema'`, diferenciados somente por `event` em `dados_extras`. | O roteamento não pode depender apenas do tipo; precisa considerar o evento. |
| Metas | `meta_vencendo` atualmente aponta para `Notificacoes` e não há tela de metas registrada. | Não existe destino específico disponível; deve haver fallback documentado até uma tela de metas ser criada. |

## 3. Contrato canônico de roteamento

O backend deve produzir em `dados_extras` um objeto de rota com:

```json
{
  "screen": "DetalhesSessao",
  "params": { "sessaoId": 123 },
  "event": "sessao_agendada",
  "entity_type": "sessao",
  "entity_id": 123
}
```

O mesmo contrato deve ser serializado no payload `data` do push e retornado no campo `dados_extras` da notificação da inbox. A tela interna não deve reconstruir rotas a partir de título ou mensagem.

Parâmetros canônicos:

- sessão: `{ "sessaoId": <id> }`;
- registro de Odisseia: `{ "registroId": <id> }`;
- prontuário: `{ "prontuarioId": <id> }`;
- semente: `{ "sementeId": <id> }`;
- paciente/vínculo: `{ "pacienteId": <id> }` quando aplicável.

## 4. Mapa de destinos

| Tipo/evento | Destinatário | Tela ao tocar | Parâmetros | Observação |
|---|---|---|---|---|
| `sessao_agendada` | Paciente ou psicólogo | `DetalhesSessao` | `sessaoId` | Corrigir o atual `id` para o nome consumido pela tela. |
| `sessao_cancelada` | Paciente ou psicólogo | `DetalhesSessao` | `sessaoId` | Permite consultar o status e os detalhes do cancelamento. |
| `sessao_lembrete` | Paciente ou psicólogo | `DetalhesSessao` | `sessaoId` | Mantém o lembrete acionável. |
| `pagamento_confirmado` | Paciente | `DetalhesSessao` | `sessaoId` | Evento atualmente emitido como `sistema`. |
| `pagamento_atrasado` | Paciente | `DetalhesSessao` | `sessaoId` | Evento atualmente emitido como `sistema`. |
| `sessao_realizada` | Paciente | `RegistrosOdisseia` | `{ "modo": "novo" }` | Abre o fluxo para registrar como a pessoa está se sentindo. |
| `nova_semente` | Paciente | `SementesPaciente` | `sementeId` | A tela deve, quando possível, destacar/carregar a semente recebida. |
| `semente_curtida` | Psicólogo | `SementesCuidado` | `sementeId` | Substitui o nome inexistente `SementesPsicologo`. |
| `novo_registro_odisseia` | Psicólogo | `RegistroCompleto` | `registroId` | A tela deve carregar o registro indicado e respeitar a autorização existente. |
| `comentario_psicologo` | Paciente | `RegistroCompleto` | `registroId` | Abre o registro que recebeu o comentário. |
| `novo_prontuario`/`prontuario_criado` | Paciente | `MeusProntuarios` | `prontuarioId` | A tela pode destacar o prontuário quando o parâmetro estiver disponível. |
| `novo_vinculo` | Psicólogo | `VinculosPacientes` | `pacienteId` quando disponível | Abre a lista de vínculos para revisar a conexão. |
| `vinculo_alterado` | Paciente | `MeuPsicologo` | nenhum ou `status` | Exibe o status atual do vínculo. |
| `inatividade_paciente` (paciente) | Paciente | `RegistrosOdisseia` | `{ "modo": "novo" }` | Incentivo para criar um registro. |
| `alerta_inatividade_paciente` (psicólogo) | Psicólogo | `VinculosPacientes` | `pacienteId` | Permite localizar o paciente acompanhado. |
| `meta_vencendo` | Paciente | `Notificacoes` | nenhum | Fallback temporário: não há tela de metas registrada. Deve preservar acesso à mensagem até existir destino específico. |
| `sistema` sem evento conhecido | Qualquer | `Notificacoes` | nenhum | Fallback seguro e estável. |

O mapa deve ser aplicado pelo evento (`dados_extras.event`) e pelo perfil/destinatário quando necessário, não somente pelo campo `tipo`.

## 5. Requisitos funcionais

### 5.1 Push nativo

- Ao tocar em um push com rota válida, navegar para a tela canônica e parâmetros canônicos.
- Suportar toque com o app em primeiro plano, background ou encerrado, aguardando `NavigationContainer` ficar pronto quando necessário.
- Não navegar para uma tela inexistente, para uma tela não disponível ao perfil autenticado ou com parâmetros incompatíveis.
- Se o payload for antigo, incompleto ou inválido, abrir `Notificacoes` em vez de quebrar o app.
- Preservar `notification_id` para marcar a notificação como lida quando o usuário interagir.

### 5.2 Inbox interna

- Ao tocar no card, marcar a notificação como lida e navegar usando `item.dados_extras`.
- Evitar navegação duplicada em toques repetidos e manter o estado da lista consistente ao retornar.
- Usar exatamente o mesmo resolvedor e fallback do push nativo.
- Se a notificação não possuir rota, permanecer/abrir `Notificacoes` sem erro.

### 5.3 Segurança e autorização

- O roteamento não concede acesso; cada tela e API continuam validando o usuário e o vínculo correspondente.
- Um parâmetro de ID adulterado deve resultar em erro tratado/fallback, sem exibir dados de outro paciente.
- Rotas destinadas a um perfil não devem ser adicionadas ao navigator do perfil incorreto sem uma decisão explícita de produto.

## 6. Alterações previstas por área (sem implementação nesta etapa)

### Backend

- `psicoapp_backend/core/services.py`: centralizar construção da rota canônica e incluir `event`, `entity_type`, `entity_id` e parâmetros compatíveis.
- `psicoapp_backend/notificacoes_push/tasks.py`: copiar o contrato canônico completo para o payload do Expo, sem perder campos necessários.
- Emissores em `core/signals.py`, `core/views.py`, `core/tasks.py`, `authentication/views.py`, `sessoes/`, `engajamentos/` e `notificacoes_push/`: corrigir destinos, nomes de parâmetros e eventos inconsistentes.
- `psicoapp_backend/core/serializers.py`: garantir que `dados_extras` esteja disponível na resposta da inbox.

### Frontend

- `src/services/notificationService.js`: extrair resolvedor/dispatcher compartilhado, tratar app não pronto, fallback, perfil e compatibilidade de parâmetros.
- `src/screens/notificacoes.js`: ao tocar, marcar como lida e chamar o mesmo dispatcher do push.
- `src/routes.js`: confirmar que todos os destinos canônicos existem nos dois perfis em que são usados.
- Telas de destino (`detalhesSessao.js`, `registroCompleto.js`, `RegistrosOdisseia.js`, `sementesPaciente.js`, `sementesCuidado.js`, `meusProntuarios.js`, `vinculosPacientes.js`, `meuPsicologo.js`): aceitar parâmetros canônicos e tratar carregamento/fallback.

## 7. Critérios de aceite

- [ ] Tocar em cada evento listado na seção 4 a partir da inbox abre o destino correspondente.
- [ ] Tocar no push nativo do mesmo evento abre o mesmo destino e usa os mesmos parâmetros.
- [ ] Sessões abrem `DetalhesSessao` com `sessaoId` válido.
- [ ] Nenhum payload tenta navegar para `SementesPsicologo`, rota inexistente.
- [ ] Notificações `sistema` são roteadas por `event`; desconhecidas caem em `Notificacoes`.
- [ ] Push recebido com app encerrado aguarda a navegação estar pronta.
- [ ] Payload legado/sem rota não causa crash e abre `Notificacoes`.
- [ ] A interação marca a notificação como lida sem duplicar requisições.
- [ ] IDs inválidos ou sem autorização não expõem dados e apresentam fallback/erro tratado.
- [ ] Eventos destinados a paciente e psicólogo respeitam o navigator e as permissões de cada perfil.

## 8. Testes e validação

### Backend

- Testar o mapa de rota de cada emissor e a estrutura de `dados_extras`.
- Testar que payloads push e respostas da inbox carregam o mesmo contrato.
- Testar parâmetros de sessão, registro, prontuário, semente e paciente.
- Testar fallback para evento desconhecido, JSON vazio e rota inválida.

### Frontend

- Testar o dispatcher com app pronto, carregando, em background e iniciado por push.
- Testar toque em cada tipo de card da inbox, inclusive não lido e já lido.
- Testar os dois perfis e as rotas disponíveis em cada navigator.
- Testar IDs ausentes/inválidos e payloads legados.
- Validar manualmente em dispositivo físico um push de cada família de evento.

## 9. Fora de escopo

- Criar uma nova tela de metas; enquanto ela não existir, `meta_vencendo` permanece com fallback em `Notificacoes`.
- Alterar o conteúdo, a frequência ou os destinatários das notificações.
- Substituir a autorização das APIs ou permitir acesso por possuir um deep link.
- Alterar o design visual geral da inbox ou dos pushes, além do comportamento de toque.
- Criar issues locais ou remotas nesta etapa.

## 10. Ordem recomendada de implementação

1. Definir e testar o contrato canônico de rota no backend.
2. Corrigir emissores, eventos, nomes de telas e parâmetros.
3. Implementar o resolvedor compartilhado no frontend para push e inbox.
4. Adaptar telas de destino e validar perfil/autorização.
5. Executar testes automatizados e testes manuais em dispositivo físico, com app aberto, em background e encerrado.
