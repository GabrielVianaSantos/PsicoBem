# SPEC — Novas Notificações: Auditoria do Sistema Atual + Propostas

Data: 2026-04-07  
Status: planejamento  
Escopo: app Expo SDK 53 + backend Django (Celery worker)

---

## 1. Auditoria Completa do Sistema de Notificações Atual

### 1.1 Infraestrutura Push (resumo do SPEC_NOTIFICACOES_PUSH.md)

A infraestrutura base já está implementada:

| Componente | Status |
|---|---|
| `notificationService.js` (Frontend) | ✅ Handler, listeners, register/deactivate device |
| `NotificacaoSistema` model (inbox in-app) | ✅ 9 tipos cadastrados |
| `NotificationDomainService.emit()` (core) | ✅ Cria inbox + agenda push via Celery |
| `ExpoPushProvider` (envio HTTP para Expo API) | ✅ Funcional |
| Task `enqueue_push_for_notification` | ✅ Busca dispositivos ativos e envia |
| Task `dispatch_session_reminders` (24h/2h/15m) | ✅ Implementada |
| Tela `Notificacoes` (FlatList do inbox) | ✅ UI funcional |
| Registro/desativação de dispositivo no login/logout | ✅ Implementado |

> **Pendências da SPEC_NOTIFICACOES_PUSH.md** (5 passos): nova build EAS, deploy worker/beat na VPS, CELERY_BEAT_SCHEDULE no settings.py, remover duplicação App.js, completar reconcile_push_receipts. Essas pendências são **pré-requisito operacional** — a implementação de código das novas notificações pode avançar em paralelo.

---

### 1.2 Tipos de Notificação Registrados no Model

O `NotificacaoSistema.TIPO_CHOICES` define 9 tipos:

| Tipo | Nome Legível | Usado atualmente? | Onde? |
|---|---|---|---|
| `sessao_agendada` | Sessão Agendada | ✅ Sim | `signals.py` → `emit_session_created()` |
| `sessao_cancelada` | Sessão Cancelada | ❌ **NÃO** | — |
| `sessao_lembrete` | Lembrete de Sessão | ✅ Sim | `tasks.py` → `dispatch_session_reminders()` |
| `nova_semente` | Nova Semente do Cuidado | ⚠️ Parcial | `SementeCuidado.enviar_para_pacientes()` cria inbox, mas **não usa `emit()`**, logo **não dispara push** |
| `novo_registro` | Novo Registro de Odisseia | ✅ Sim | `signals.py` → `emit_new_odisseia_record()` |
| `comentario_psicologo` | Comentário do Psicólogo | ❌ **NÃO** | — |
| `meta_vencendo` | Meta Próxima do Vencimento | ❌ **NÃO** | — |
| `pagamento_pendente` | Pagamento Pendente | ❌ **NÃO** | — |
| `sistema` | Notificação do Sistema | ✅ Sim | `signals.py` (boas-vindas paciente) + `Sessao.confirmar_pagamento()` |

**Resumo: de 9 tipos definidos, apenas 4 são efetivamente usados (sessao_agendada, sessao_lembrete, novo_registro, sistema). 5 tipos existem no código mas nunca são disparados.**

---

### 1.3 Notificações Ativas — Detalhamento

#### A) Boas-vindas do Paciente
- **Trigger:** `post_save` em `Paciente` (quando `created=True`)
- **Tipo:** `sistema`
- **Título:** `"Bem-vindo ao PsicoBem! 🌱"`
- **Mensagem:** `"Seja bem-vindo! Estamos aqui para apoiar sua jornada de bem-estar. Explore as funcionalidades e conecte-se com seu psicólogo."`
- **Destinatário:** Paciente recém-cadastrado
- **Push:** ❌ Não — cria `NotificacaoSistema` direto, sem passar pelo `emit()`. Logo não dispara push nativo.
- **Navegação:** Nenhuma (sem `dados_extras`)

#### B) Sessão Agendada
- **Trigger:** `post_save` em `Sessao` (quando `created=True`)
- **Tipo:** `sessao_agendada`
- **Para o paciente:**
  - Título: `"Sessão Agendada"`
  - Mensagem: `"Sua sessão foi agendada para 10/04/2026 às 14:00."`
- **Para o psicólogo:**
  - Título: `"Nova Sessão Agendada"`
  - Mensagem: `"Sessão agendada com João para 10/04/2026 às 14:00."`
- **Push:** ✅ Sim — usa `NotificationDomainService.emit()` → agenda push via `on_commit`
- **Navegação:** Toque no push → abre `DetalhesSessao` com `{id: sessao.pk}`

#### C) Lembretes de Sessão (Celery Beat)
- **Trigger:** Task periódica `dispatch_session_reminders()`, roda a cada 60s
- **Tipo:** `sessao_lembrete`
- **Janelas:** 24h antes, 2h antes, 15min antes
- **Destinatários:** Paciente **e** Psicólogo da sessão
- **Mensagens:**
  - 24h: `"Sua sessão está marcada para amanhã, 10/04/2026 às 14:00."`
  - 2h: `"Sua sessão começa em cerca de 2 horas: 10/04/2026 às 14:00."`
  - 15m: `"Sua sessão começa em 15 minutos: 10/04/2026 às 14:00."`
- **Push:** ✅ Sim
- **Navegação:** Toque → `DetalhesSessao` com `{id: sessao.pk}`
- **Dedupe:** `ReminderDispatch` garante que não envia lembrete duplicado

#### D) Novo Registro de Odisseia
- **Trigger:** `post_save` em `RegistroOdisseia` (quando `created=True` e `compartilhar_psicologo=True`)
- **Tipo:** `novo_registro`
- **Título:** `"Novo Registro de Odisseia"`
- **Mensagem:** `"João fez um novo registro emocional."`
- **Destinatário:** Psicólogo vinculado ativo do paciente
- **Push:** ✅ Sim
- **Navegação:** Toque → `RegistroCompleto` com `{id: registro.pk}`

#### E) Pagamento Confirmado
- **Trigger:** `Sessao.confirmar_pagamento()` (chamado pela view)
- **Tipo:** `sistema`
- **Título:** `"Pagamento Confirmado"`
- **Mensagem:** `"Pagamento da sessão de 10/04/2026 foi confirmado."`
- **Destinatário:** Paciente da sessão
- **Push:** ❌ Não — cria `NotificacaoSistema` direto, sem `emit()`
- **Navegação:** Nenhuma

#### F) Nova Semente do Cuidado (parcial)
- **Trigger:** `SementeCuidado.enviar_para_pacientes()`
- **Tipo:** `nova_semente`
- **Título:** `"Nova Semente do Cuidado"`
- **Mensagem:** `"Você recebeu uma nova mensagem: 'Respire fundo'"`
- **Destinatário:** Pacientes vinculados
- **Push:** ❌ Não — cria `NotificacaoSistema` direto, sem `emit()`. Apenas inbox.
- **Navegação:** Nenhuma (sem `dados_extras` com `screen`)

---

### 1.4 Design Visual das Notificações

#### Tela de Notificações (in-app inbox)

| Aspecto | Estado Atual |
|---|---|
| **Header** | Usa o componente `<Topo />` com o **logo.png** do app no banner verde `#11B5A4` |
| **Título da tela** | `"Notificações"` + subtítulo `"Atualizações do seu cuidado"` |
| **Fonte** | `RalewayBold` (consistente com o design system do app) |
| **Ícones por tipo** | Usa `Ionicons` mapeados por tipo (calendar, alarm, leaf, journal, chatbubble, flag, card, notifications) |
| **Cor de ícone** | `#11B5A4` (verde principal do app) |
| **Card não-lida** | Borda `#11B5A4`, fundo `#F1FBF8`, bolinha verde indicadora |
| **Card lida** | Borda `#E5EFED`, fundo `#F8FBFA` |
| **Botão "Ler todas"** | Botão verde `#11B5A4`, fonte branca, desabilita quando tudo lido |
| **Empty state** | Ícone `notifications-off-outline` + `"Nenhuma notificação"` |
| **Identidade visual** | ✅ Consistente — usa o verde `#11B5A4`, fontes `Raleway`, componente `<Topo />` com logo |

#### Push Nativo (Android/iOS)

| Aspecto | Estado Atual |
|---|---|
| **Título** | Texto do campo `titulo` da `NotificacaoSistema` |
| **Body** | Texto do campo `mensagem` |
| **Ícone** | Ícone padrão do app (definido pela build nativa) |
| **Logo customizado** | ❌ Não — o `app.json` não configura `"icon"` para notificações. O ícone é o default do Expo |
| **Som** | `"default"` (som padrão do sistema) |
| **Badge** | Desabilitado (`shouldSetBadge: false`) |

> ⚠️ **Ponto de melhoria**: O push nativo não exibe o logo do PsicoBem. Para Android, seria necessário adicionar `notification.icon` e `notification.color` no `app.json`. Para iOS, o ícone do app já é usado automaticamente.

#### Acesso às Notificações pelas Telas

| Tela | Acesso |
|---|---|
| `Home` (psicólogo) | Ícone de sino `notifications` no header → navega para `Notificacoes` |
| `HomePaciente` | Ícone de sino `notifications-outline` + badge com contagem de não-lidas → navega para `Notificacoes` |

---

## 2. Problemas Identificados

### 2.1 Notificações que criam inbox mas NÃO disparam push

| Notificação | Motivo |
|---|---|
| Boas-vindas paciente | Usa `NotificacaoSistema.objects.create()` direto, não passa por `emit()` |
| Pagamento confirmado | Idem |
| Nova semente do cuidado | Idem |

**Solução:** Migrar todas para usar `NotificationDomainService.emit()`.

### 2.2 Tipos definidos mas nunca usados

- `sessao_cancelada` — sessão pode ser cancelada via view mas nenhuma notificação é criada
- `comentario_psicologo` — `ComentarioPsicologo` existe no model mas não tem signal/trigger de notificação
- `meta_vencendo` — `MetaOdisseia` tem `dias_para_conclusao` e `status_prazo` mas não dispara alertas
- `pagamento_pendente` — não há verificação periódica de pagamentos atrasados

### 2.3 Ações sem notificação alguma

| Ação no Sistema | Notificação? | Quem deveria receber? |
|---|---|---|
| Paciente se vincula a psicólogo (CRP) | ❌ | Psicólogo |
| Sessão é cancelada | ❌ | Paciente e/ou Psicólogo |
| Sessão é remarcada (update de data_hora) | ❌ | Paciente e/ou Psicólogo |
| Sessão é marcada como realizada | ❌ | Paciente |
| Psicólogo comenta em registro de odisseia | ❌ | Paciente |
| Psicólogo cria prontuário do paciente | ❌ | Paciente |
| Psicólogo altera status do vínculo (inativar/suspender/finalizar) | ❌ | Paciente |
| Paciente curte uma semente | ❌ | Psicólogo |
| Meta próxima do vencimento | ❌ | Paciente |
| Sessão com pagamento atrasado (>7 dias) | ❌ | Psicólogo |
| Paciente não registra humor por X dias | ❌ | Psicólogo |

---

## 3. Plano de Novas Notificações

### Prioridade ALTA (corrigir bugs + ativar tipos existentes)

---

#### 3.1 FIX: Migrar notificações existentes para `emit()`

**O que:** Substituir os `NotificacaoSistema.objects.create()` diretos por `NotificationDomainService.emit()` para que também disparem push nativo.

##### 3.1.1 Boas-vindas Paciente (`core/signals.py`)

**Antes:**
```python
NotificacaoSistema.objects.create(
    paciente=instance,
    tipo='sistema',
    titulo='Bem-vindo ao PsicoBem! 🌱',
    mensagem='Seja bem-vindo!...',
    dados_extras={'first_login': True}
)
```

**Depois:**
```python
NotificationDomainService.emit(
    target=instance.user,
    tipo='sistema',
    titulo='Bem-vindo ao PsicoBem! 🌱',
    mensagem='Seja bem-vindo! Estamos aqui para apoiar sua jornada de bem-estar. '
             'Explore as funcionalidades e conecte-se com seu psicólogo.',
    dados_extras=NotificationDomainService._routing_payload(
        screen='HomePaciente',
        event='boas_vindas',
    ),
)
```

##### 3.1.2 Pagamento Confirmado (`sessoes/models.py`)

**Antes:**
```python
NotificacaoSistema.objects.create(
    paciente=self.paciente,
    tipo='sistema',
    titulo='Pagamento Confirmado',
    mensagem=f'Pagamento da sessão de {data} foi confirmado.'
)
```

**Depois:**
```python
NotificationDomainService.emit(
    target=self.paciente.user,
    tipo='sistema',
    titulo='Pagamento Confirmado ✅',
    mensagem=f'Pagamento da sessão de {data} foi confirmado.',
    link_relacionado=f'/sessoes/{self.pk}',
    dados_extras=NotificationDomainService._routing_payload(
        screen='DetalhesSessao',
        params={'id': self.pk},
        event='pagamento_confirmado',
        session_id=self.pk,
    ),
)
```

##### 3.1.3 Nova Semente do Cuidado (`engajamentos/models.py`)

**Antes:**
```python
NotificacaoSistema.objects.create(
    paciente=paciente,
    tipo='nova_semente',
    titulo='Nova Semente do Cuidado',
    mensagem=f'Você recebeu uma nova mensagem: "{self.titulo}"',
    link_relacionado=f'/sementes/{self.pk}'
)
```

**Depois:**
```python
NotificationDomainService.emit(
    target=paciente.user,
    tipo='nova_semente',
    titulo='Nova Semente do Cuidado 🌱',
    mensagem=f'Você recebeu uma nova mensagem: "{self.titulo}"',
    link_relacionado=f'/sementes/{self.pk}',
    dados_extras=NotificationDomainService._routing_payload(
        screen='SementesPaciente',
        event='nova_semente',
    ),
)
```

---

#### 3.2 NOVO: Sessão Cancelada

**Trigger:** View `SessaoViewSet.cancelar()` — após `sessao.status = 'cancelada'`  
**Tipo:** `sessao_cancelada`  
**Destinatários:**
- Se cancelada pelo **psicólogo** → notifica o **paciente**
- Se cancelada pelo **paciente** → notifica o **psicólogo**

**Implementação (no `sessoes/views.py`, método `cancelar`):**

```python
# Após sessao.save()
from core.services import NotificationDomainService

data_formatada = sessao.data_hora.strftime("%d/%m/%Y às %H:%M")
route = NotificationDomainService._routing_payload(
    screen='DetalhesSessao',
    params={'id': sessao.pk},
    event='sessao_cancelada',
    session_id=sessao.pk,
)

# Determinar quem cancelou e quem deve ser notificado
if hasattr(request.user, 'psicologo_profile'):
    # Psicólogo cancelou → notifica paciente
    NotificationDomainService.emit(
        target=sessao.paciente.user,
        tipo='sessao_cancelada',
        titulo='Sessão Cancelada',
        mensagem=f'Sua sessão de {data_formatada} foi cancelada pelo psicólogo.',
        link_relacionado=f'/sessoes/{sessao.pk}',
        dados_extras=route,
    )
else:
    # Paciente cancelou → notifica psicólogo
    NotificationDomainService.emit(
        target=sessao.psicologo.user,
        tipo='sessao_cancelada',
        titulo='Sessão Cancelada',
        mensagem=f'{sessao.paciente.user.first_name} cancelou a sessão de {data_formatada}.',
        link_relacionado=f'/sessoes/{sessao.pk}',
        dados_extras=route,
    )
```

**Tela de destino (push touch):** `DetalhesSessao`

---

#### 3.3 NOVO: Comentário do Psicólogo em Registro de Odisseia

**Trigger:** Signal `post_save` em `ComentarioPsicologo` (quando `created=True`)  
**Tipo:** `comentario_psicologo`  
**Destinatário:** Paciente do registro

**Implementação — novo signal em `core/signals.py`:**

```python
from engajamentos.models import ComentarioPsicologo

@receiver(post_save, sender=ComentarioPsicologo)
def notificar_paciente_comentario(sender, instance, created, **kwargs):
    """Notifica paciente quando psicólogo comenta em registro de odisseia"""
    if created:
        NotificationDomainService.emit(
            target=instance.registro.paciente.user,
            tipo='comentario_psicologo',
            titulo='Novo Comentário do Psicólogo 💬',
            mensagem=f'Seu psicólogo comentou no seu registro de {instance.registro.data_registro.strftime("%d/%m/%Y")}.',
            link_relacionado=f'/registros/{instance.registro.pk}',
            dados_extras=NotificationDomainService._routing_payload(
                screen='RegistroCompleto',
                params={'id': instance.registro.pk},
                event='comentario_psicologo',
                registro_id=instance.registro.pk,
            ),
        )
```

---

#### 3.4 NOVO: Paciente Conectou-se via CRP (novo vínculo)

**Trigger:** View `conecta_psicologo_view()` — após vínculo criado/reativado  
**Tipo:** `sistema`  
**Destinatário:** Psicólogo

**Implementação — no final de `authentication/views.py` → `conecta_psicologo_view()`:**

```python
# Após criar/reativar o vínculo
from core.services import NotificationDomainService

NotificationDomainService.emit(
    target=psicologo.user,
    tipo='sistema',
    titulo='Novo Paciente Conectado 🔗',
    mensagem=f'{paciente.user.first_name} se vinculou a você via CRP.',
    dados_extras=NotificationDomainService._routing_payload(
        screen='VinculosPacientes',
        event='novo_vinculo',
    ),
)
```

---

### Prioridade MÉDIA (novas funcionalidades de engajamento)

---

#### 3.5 NOVO: Sessão Realizada (confirmação para paciente)

**Trigger:** View `SessaoViewSet.realizar()` — após `sessao.status = 'realizada'`  
**Tipo:** `sistema`  
**Destinatário:** Paciente

```python
# Após sessao.save() no método realizar()
data_formatada = sessao.data_hora.strftime("%d/%m/%Y")
NotificationDomainService.emit(
    target=sessao.paciente.user,
    tipo='sistema',
    titulo='Sessão Realizada ✅',
    mensagem=f'Sua sessão de {data_formatada} foi marcada como realizada.',
    link_relacionado=f'/sessoes/{sessao.pk}',
    dados_extras=NotificationDomainService._routing_payload(
        screen='MinhasSessoes',
        event='sessao_realizada',
        session_id=sessao.pk,
    ),
)
```

---

#### 3.6 NOVO: Prontuário Criado para Paciente

**Trigger:** Signal `post_save` em `Prontuario` (quando `created=True`)  
**Tipo:** `sistema`  
**Destinatário:** Paciente

```python
from core.models import Prontuario

@receiver(post_save, sender=Prontuario)
def notificar_paciente_prontuario(sender, instance, created, **kwargs):
    """Notifica paciente quando psicólogo cria prontuário"""
    if created:
        NotificationDomainService.emit(
            target=instance.paciente.user,
            tipo='sistema',
            titulo='Novo Prontuário Disponível 📋',
            mensagem=f'Seu psicólogo adicionou um novo prontuário ao seu perfil.',
            link_relacionado=f'/prontuarios/{instance.pk}',
            dados_extras=NotificationDomainService._routing_payload(
                screen='MeusProntuarios',
                event='novo_prontuario',
            ),
        )
```

---

#### 3.7 NOVO: Paciente Curtiu Semente (feedback para psicólogo)

**Trigger:** View `SementeCuidadoViewSet.curtir()` — ao chamar `msg.marcar_como_curtida()`  
**Tipo:** `sistema`  
**Destinatário:** Psicólogo da semente

```python
# No método curtir() da view, após msg.marcar_como_curtida()
from core.services import NotificationDomainService

NotificationDomainService.emit(
    target=semente.psicologo.user,
    tipo='sistema',
    titulo='Semente Curtida ❤️',
    mensagem=f'{request.user.first_name} curtiu sua semente "{semente.titulo}".',
    dados_extras=NotificationDomainService._routing_payload(
        screen='SementesCuidado',
        event='semente_curtida',
    ),
)
```

---

#### 3.8 NOVO: Vínculo Alterado pelo Psicólogo

**Trigger:** View `VinculoViewSet.alterar_status()` — ao mudar status do vínculo  
**Tipo:** `sistema`  
**Destinatário:** Paciente

```python
# Após vinculo.save() no método alterar_status()
mensagens_status = {
    'inativo': 'Seu acompanhamento foi marcado como inativo pelo seu psicólogo.',
    'suspenso': 'Seu acompanhamento foi temporariamente suspenso pelo seu psicólogo.',
    'finalizado': 'Seu tratamento foi finalizado pelo seu psicólogo. Obrigado pela jornada!',
    'ativo': 'Seu acompanhamento foi reativado pelo seu psicólogo.',
}

NotificationDomainService.emit(
    target=vinculo.paciente.user,
    tipo='sistema',
    titulo='Atualização do Vínculo Terapêutico',
    mensagem=mensagens_status.get(novo_status, f'Status do seu vínculo foi alterado para {novo_status}.'),
    dados_extras=NotificationDomainService._routing_payload(
        screen='MeuPsicologo',
        event='vinculo_alterado',
    ),
)
```

---

### Prioridade BAIXA (tasks periódicas — requerem Celery Beat)

---

#### 3.9 NOVO: Meta Próxima do Vencimento (Celery Beat)

**Trigger:** Nova task periódica `check_metas_vencendo()`, roda 1x/dia  
**Tipo:** `meta_vencendo`  
**Destinatário:** Paciente dono da meta

```python
# notificacoes_push/tasks.py (nova task)

@shared_task
def check_metas_vencendo():
    """Verifica metas com prazo vencendo em ≤3 dias e notifica o paciente."""
    from engajamentos.models import MetaOdisseia
    from datetime import date, timedelta

    limite = date.today() + timedelta(days=3)
    metas = MetaOdisseia.objects.filter(
        status='em_andamento',
        data_prevista__lte=limite,
        data_prevista__gte=date.today(),
    )

    results = {"processed": 0, "notified": 0}
    for meta in metas:
        results["processed"] += 1
        # Dedupe: só notificar 1x por meta (verificar se já existe notificação recente)
        from core.models import NotificacaoSistema
        ja_notificado = NotificacaoSistema.objects.filter(
            paciente=meta.paciente,
            tipo='meta_vencendo',
            link_relacionado=f'/metas/{meta.pk}',
            created_at__gte=timezone.now() - timedelta(days=1),
        ).exists()
        if ja_notificado:
            continue

        dias = meta.dias_para_conclusao
        NotificationDomainService.emit(
            target=meta.paciente.user,
            tipo='meta_vencendo',
            titulo='Meta Vencendo ⏰',
            mensagem=f'Sua meta "{meta.titulo}" vence em {dias} dia(s). Progresso: {meta.progresso}%.',
            link_relacionado=f'/metas/{meta.pk}',
            dados_extras=NotificationDomainService._routing_payload(
                screen='Notificacoes',
                event='meta_vencendo',
            ),
        )
        results["notified"] += 1

    return results
```

**CELERY_BEAT_SCHEDULE** (adicionar ao settings.py):
```python
"check-metas-vencendo": {
    "task": "notificacoes_push.tasks.check_metas_vencendo",
    "schedule": crontab(hour=9, minute=0),  # 1x/dia às 9h
},
```

---

#### 3.10 NOVO: Pagamentos Atrasados (Celery Beat)

**Trigger:** Nova task periódica `check_pagamentos_atrasados()`, roda 1x/dia  
**Tipo:** `pagamento_pendente`  
**Destinatário:** Psicólogo

```python
@shared_task
def check_pagamentos_atrasados():
    """Verifica sessões realizadas com pagamento pendente há mais de 7 dias."""
    from sessoes.models import Sessao

    limite = timezone.now() - timedelta(days=7)
    sessoes = Sessao.objects.filter(
        status='realizada',
        status_pagamento='pendente',
        data_hora__lte=limite,
    ).select_related('paciente__user', 'psicologo__user')

    results = {"processed": 0, "notified": 0}
    # Agrupar por psicólogo para não spammar
    from collections import defaultdict
    por_psicologo = defaultdict(list)
    for sessao in sessoes:
        por_psicologo[sessao.psicologo].append(sessao)

    for psicologo, sessoes_list in por_psicologo.items():
        results["processed"] += len(sessoes_list)
        total = len(sessoes_list)

        # Dedupe: só 1 notificação por dia por psicólogo
        from core.models import NotificacaoSistema
        ja_notificado = NotificacaoSistema.objects.filter(
            psicologo=psicologo,
            tipo='pagamento_pendente',
            created_at__gte=timezone.now() - timedelta(days=1),
        ).exists()
        if ja_notificado:
            continue

        NotificationDomainService.emit(
            target=psicologo.user,
            tipo='pagamento_pendente',
            titulo='Pagamentos Pendentes 💳',
            mensagem=f'Você tem {total} sessão(ões) realizada(s) com pagamento pendente há mais de 7 dias.',
            dados_extras=NotificationDomainService._routing_payload(
                screen='Sessoes',
                event='pagamento_pendente',
            ),
        )
        results["notified"] += 1

    return results
```

**CELERY_BEAT_SCHEDULE:**
```python
"check-pagamentos-atrasados": {
    "task": "notificacoes_push.tasks.check_pagamentos_atrasados",
    "schedule": crontab(hour=10, minute=0),  # 1x/dia às 10h
},
```

---

#### 3.11 NOVO: Paciente Inativo (sem registro de odisseia em X dias)

**Trigger:** Nova task periódica `check_pacientes_inativos()`, roda 1x/dia  
**Tipo:** `sistema`  
**Destinatário:** Psicólogo

```python
@shared_task
def check_pacientes_inativos():
    """Notifica psicólogos sobre pacientes que não registraram humor em 7+ dias."""
    from engajamentos.models import RegistroOdisseia
    from core.models import VinculoPacientePsicologo
    from django.db.models import Max

    limite = date.today() - timedelta(days=7)
    vinculos = VinculoPacientePsicologo.objects.filter(
        status='ativo',
    ).select_related('paciente__user', 'psicologo__user')

    results = {"checked": 0, "notified": 0}
    from collections import defaultdict
    alertas_por_psicologo = defaultdict(list)

    for vinculo in vinculos:
        results["checked"] += 1
        ultimo = RegistroOdisseia.objects.filter(
            paciente=vinculo.paciente
        ).aggregate(Max('data_registro'))['data_registro__max']

        if ultimo is None or ultimo < limite:
            alertas_por_psicologo[vinculo.psicologo].append(vinculo.paciente)

    for psicologo, pacientes in alertas_por_psicologo.items():
        # Dedupe semanal
        from core.models import NotificacaoSistema
        ja_notificado = NotificacaoSistema.objects.filter(
            psicologo=psicologo,
            tipo='sistema',
            dados_extras__event='pacientes_inativos',
            created_at__gte=timezone.now() - timedelta(days=7),
        ).exists()
        if ja_notificado:
            continue

        nomes = ', '.join([p.user.first_name for p in pacientes[:3]])
        extra = f' e mais {len(pacientes)-3}' if len(pacientes) > 3 else ''

        NotificationDomainService.emit(
            target=psicologo.user,
            tipo='sistema',
            titulo='Pacientes sem Registro Recente 📊',
            mensagem=f'{nomes}{extra} não registra(m) humor há mais de 7 dias.',
            dados_extras=NotificationDomainService._routing_payload(
                screen='VinculosPacientes',
                event='pacientes_inativos',
            ),
        )
        results["notified"] += 1

    return results
```

**CELERY_BEAT_SCHEDULE:**
```python
"check-pacientes-inativos": {
    "task": "notificacoes_push.tasks.check_pacientes_inativos",
    "schedule": crontab(hour=11, minute=0, day_of_week='1'),  # Toda segunda às 11h
},
```

---

## 4. Melhorias no Push Nativo (Identidade Visual)

### 4.1 Ícone de Notificação para Android

Adicionar no `app.json`:

```json
{
  "expo": {
    "notification": {
      "icon": "./assets/notification-icon.png",
      "color": "#11B5A4"
    }
  }
}
```

> O `notification-icon.png` deve ser um ícone **monocromo branco em fundo transparente**, 96×96px, formato PNG. O Android colore-o com a `color` especificada.

### 4.2 Ativar Badge Counter

Mudar em `notificationService.js`:

```javascript
shouldSetBadge: true,  // era false
```

E resetar o badge ao abrir a tela de notificações:

```javascript
// Em notificacoes.js, no useFocusEffect
import * as Notifications from 'expo-notifications';
Notifications.setBadgeCountAsync(0);
```

---

## 5. Mapa de Ícones no Frontend (atualizar `TIPO_ICONE`)

Atualizar o mapeamento em `notificacoes.js` para garantir cobertura visual de todos os tipos:

```javascript
const TIPO_ICONE = {
  sessao_agendada: 'calendar-outline',
  sessao_cancelada: 'close-circle-outline',
  sessao_lembrete: 'alarm-outline',
  nova_semente: 'leaf-outline',
  novo_registro: 'journal-outline',
  comentario_psicologo: 'chatbubble-ellipses-outline',
  meta_vencendo: 'flag-outline',
  pagamento_pendente: 'card-outline',
  sistema: 'notifications-outline',
};
```

> ✅ O mapeamento atual já está completo para todos os 9 tipos. Nenhuma alteração necessária aqui.

---

## 6. Resumo de Implementação

### Tabela de referência rápida

| # | Notificação | Prioridade | Tipo | Trigger | Onde implementar | Push? |
|---|---|---|---|---|---|---|
| 3.1.1 | FIX: Boas-vindas (push) | 🔴 Alta | `sistema` | Signal `post_save Paciente` | `core/signals.py` | ✅ |
| 3.1.2 | FIX: Pagamento confirmado (push) | 🔴 Alta | `sistema` | `Sessao.confirmar_pagamento()` | `sessoes/models.py` | ✅ |
| 3.1.3 | FIX: Nova semente (push) | 🔴 Alta | `nova_semente` | `enviar_para_pacientes()` | `engajamentos/models.py` | ✅ |
| 3.2 | Sessão cancelada | 🔴 Alta | `sessao_cancelada` | View `cancelar()` | `sessoes/views.py` | ✅ |
| 3.3 | Comentário do psicólogo | 🔴 Alta | `comentario_psicologo` | Signal `post_save ComentarioPsicologo` | `core/signals.py` | ✅ |
| 3.4 | Paciente conectou via CRP | 🔴 Alta | `sistema` | View `conecta_psicologo_view` | `authentication/views.py` | ✅ |
| 3.5 | Sessão realizada | 🟡 Média | `sistema` | View `realizar()` | `sessoes/views.py` | ✅ |
| 3.6 | Prontuário criado | 🟡 Média | `sistema` | Signal `post_save Prontuario` | `core/signals.py` | ✅ |
| 3.7 | Paciente curtiu semente | 🟡 Média | `sistema` | View `curtir()` | `engajamentos/views.py` | ✅ |
| 3.8 | Vínculo alterado | 🟡 Média | `sistema` | View `alterar_status()` | `core/views.py` | ✅ |
| 3.9 | Meta vencendo | 🟢 Baixa | `meta_vencendo` | Task Celery periódica | `notificacoes_push/tasks.py` | ✅ |
| 3.10 | Pagamentos atrasados | 🟢 Baixa | `pagamento_pendente` | Task Celery periódica | `notificacoes_push/tasks.py` | ✅ |
| 3.11 | Paciente inativo | 🟢 Baixa | `sistema` | Task Celery periódica | `notificacoes_push/tasks.py` | ✅ |

### CELERY_BEAT_SCHEDULE final proposto

```python
from celery.schedules import crontab

CELERY_BEAT_SCHEDULE = {
    # Existente
    "dispatch-session-reminders": {
        "task": "notificacoes_push.tasks.dispatch_session_reminders",
        "schedule": 60.0,
    },
    "reconcile-push-receipts": {
        "task": "notificacoes_push.tasks.reconcile_push_receipts",
        "schedule": 900.0,
    },
    # Novos
    "check-metas-vencendo": {
        "task": "notificacoes_push.tasks.check_metas_vencendo",
        "schedule": crontab(hour=9, minute=0),
    },
    "check-pagamentos-atrasados": {
        "task": "notificacoes_push.tasks.check_pagamentos_atrasados",
        "schedule": crontab(hour=10, minute=0),
    },
    "check-pacientes-inativos": {
        "task": "notificacoes_push.tasks.check_pacientes_inativos",
        "schedule": crontab(hour=11, minute=0, day_of_week='1'),
    },
}
```

---

## 7. Ordem de Execução Sugerida

```
Fase 1 — Fixes (sem dependências externas)
├── 3.1.1  Migrar boas-vindas para emit()
├── 3.1.2  Migrar pagamento confirmado para emit()
├── 3.1.3  Migrar nova semente para emit()
├── 3.2    Implementar sessao_cancelada
├── 3.3    Implementar comentario_psicologo
└── 3.4    Implementar novo_vinculo (CRP)

Fase 2 — Engajamento
├── 3.5    Sessão realizada
├── 3.6    Prontuário criado
├── 3.7    Semente curtida
└── 3.8    Vínculo alterado

Fase 3 — Tasks periódicas (requer Celery Beat ativo na VPS)
├── 3.9    Meta vencendo
├── 3.10   Pagamentos atrasados
└── 3.11   Paciente inativo

Fase 4 — Polish
├── 4.1    Ícone de notificação Android no app.json
└── 4.2    Badge counter no app
```

> **Nota:** As Fases 1 e 2 podem ser implementadas e testadas localmente com inbox. O push real requer que os 5 passos da SPEC_NOTIFICACOES_PUSH.md estejam concluídos (nova build + deploy do worker).
