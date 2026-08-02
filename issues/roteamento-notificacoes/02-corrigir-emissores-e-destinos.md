# Issue 02 — Corrigir emissores, eventos e destinos

**Fase:** 2 — Integração dos eventos  
**Prioridade:** 🔴 Alta  
**Origem:** [SPEC_ROTEAMENTO_NOTIFICACOES.md](/Users/user/Documents/GitHub/PsicoBem/SPEC_ROTEAMENTO_NOTIFICACOES.md)  
**Arquivos principais:** `psicoapp_backend/core/services.py`, `core/signals.py`, `core/views.py`, `core/tasks.py`, `authentication/views.py`, `sessoes/`, `engajamentos/`, `notificacoes_push/`

## Problema e objetivo

Os emissores usam parâmetros diferentes, há uma rota inexistente (`SementesPsicologo`) e vários eventos `sistema` precisam ser diferenciados para escolher a tela correta.

## Escopo de implementação

Aplicar o mapa da SPEC a todos os emissores existentes, incluindo sessões, sementes, Odisseia, prontuários, vínculos, inatividade, metas e pagamentos.

## Tarefas

- [ ] Corrigir eventos de sessão para `DetalhesSessao` com `sessaoId`.
- [ ] Corrigir `semente_curtida` para `SementesCuidado`.
- [ ] Incluir IDs canônicos de registro, prontuário, semente e paciente quando disponíveis.
- [ ] Mapear `sessao_realizada` e inatividade do paciente para `RegistrosOdisseia` em modo novo.
- [ ] Mapear alerta de inatividade e novo vínculo do psicólogo para `VinculosPacientes`.
- [ ] Manter `meta_vencendo` em `Notificacoes` até existir tela de metas.
- [ ] Revisar os emissores que usam `tipo='sistema'` para preencher `event` sem depender de título/mensagem.

## Critérios de aceite

- [ ] Nenhum emissor envia `SementesPsicologo`.
- [ ] Cada evento do mapa da SPEC possui tela e parâmetros definidos ou fallback explícito.
- [ ] Todos os IDs enviados correspondem à entidade da notificação.
- [ ] Destinatários e regras de autorização atuais permanecem inalterados.

## Dependências

- Depende da Issue 01.
- Deve ser concluída antes da adaptação do dispatcher e das telas.
