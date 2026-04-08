# Issues — Novas Notificações (SPEC_NOVAS_NOTIFICACOES.md)

Rastreamento de implementação das novas notificações e correções identificadas na auditoria do sistema.

## Estrutura

As issues estão divididas em 4 fases, alinhadas à ordem de execução da SPEC:

| Fase | Issues | Foco |
|------|--------|------|
| **Fase 1** | 01 a 06 | Fixes críticos — migrar para `emit()` + ativar tipos não usados |
| **Fase 2** | 07 a 10 | Engajamento — novas notificações de eventos de negócio |
| **Fase 3** | 11 a 13 | Tasks periódicas Celery — requerem Beat ativo na VPS |
| **Fase 4** | 14 a 15 | Polish — identidade visual do push nativo + badge counter |

## Pré-requisitos

Antes de mergear qualquer código das Fases 1/2 em produção, os **5 passos da `SPEC_NOTIFICACOES_PUSH.md`** devem estar concluídos:

- [ ] Nova build EAS
- [ ] Deploy worker + beat na VPS
- [ ] `CELERY_BEAT_SCHEDULE` no `settings.py`
- [ ] Remover duplicação `App.js`
- [ ] Completar `reconcile_push_receipts`

> As Fases 1 e 2 podem ser implementadas e testadas localmente (inbox in-app). O push real exige os pré-requisitos acima.

## Referência rápida

| Issue | Notificação | Prioridade | Arquivo |
|-------|------------|------------|---------|
| 01 | FIX: Boas-vindas paciente → push | 🔴 Alta | `core/signals.py` |
| 02 | FIX: Pagamento confirmado → push | 🔴 Alta | `sessoes/models.py` |
| 03 | FIX: Nova semente → push | 🔴 Alta | `engajamentos/models.py` |
| 04 | NOVO: Sessão cancelada | 🔴 Alta | `sessoes/views.py` |
| 05 | NOVO: Comentário do psicólogo | 🔴 Alta | `core/signals.py` |
| 06 | NOVO: Paciente conectou via CRP | 🔴 Alta | `authentication/views.py` |
| 07 | NOVO: Sessão realizada | 🟡 Média | `sessoes/views.py` |
| 08 | NOVO: Prontuário criado | 🟡 Média | `core/signals.py` |
| 09 | NOVO: Paciente curtiu semente | 🟡 Média | `engajamentos/views.py` |
| 10 | NOVO: Vínculo alterado pelo psicólogo | 🟡 Média | `core/views.py` |
| 11 | NOVO: Meta próxima do vencimento (Celery) | 🟢 Baixa | `notificacoes_push/tasks.py` |
| 12 | NOVO: Pagamentos atrasados (Celery) | 🟢 Baixa | `notificacoes_push/tasks.py` |
| 13 | NOVO: Paciente inativo sem registro (Celery) | 🟢 Baixa | `notificacoes_push/tasks.py` |
| 14 | POLISH: Ícone de notificação Android | 🟢 Baixa | `app.json` + assets |
| 15 | POLISH: Badge counter no app | 🟢 Baixa | `notificationService.js` + `notificacoes.js` |
