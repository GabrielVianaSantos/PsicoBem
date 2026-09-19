from datetime import date, timedelta

from django.db import transaction
from django.utils import timezone

from .models import NotificacaoSistema, Prontuario, VinculoPacientePsicologo

# Mensagem neutra de recusa/expiração de solicitação (SPEC_VINCULO_CONVITE_E_SOLICITACAO.md,
# seção 3.9) — o paciente nunca deve conseguir distinguir "recusou" de
# "expirou" nem de "indisponível por outro motivo". Usada palavra por
# palavra (sem variação) nos três pontos que a disparam: recusa explícita,
# expiração automática e bloqueio de re-solicitação após recusa recente.
MENSAGEM_SOLICITACAO_INDISPONIVEL = 'Profissional indisponível para tratamento'

# Janela de validade de uma solicitação pendente por CRP antes de expirar
# automaticamente (seção 3.9).
PRAZO_EXPIRACAO_SOLICITACAO = timedelta(days=5)

# Status de Sessao considerados "ainda vai acontecer" — os mesmos usados em
# outros pontos do app (ex.: Sessao.pode_entrar_na_sala). 'realizada',
# 'cancelada' e 'faltou' já são desfechos e nunca são tocados aqui.
_SESSAO_STATUS_FUTUROS = ['agendada', 'confirmada', 'remarcada']


def _target_kwargs(target):
    if hasattr(target, "paciente_profile"):
        return {"paciente": target.paciente_profile}
    if hasattr(target, "psicologo_profile"):
        return {"psicologo": target.psicologo_profile}
    if hasattr(target, "paciente"):
        return {"paciente": target.paciente}
    if hasattr(target, "psicologo"):
        return {"psicologo": target.psicologo}
    raise ValueError("Target inválido para notificação.")


class NotificationDomainService:
    @staticmethod
    def _routing_payload(
        screen="Notificacoes",
        params=None,
        event=None,
        entity_type=None,
        entity_id=None,
        **extra,
    ):
        """
        Constrói o payload canônico de roteamento que será armazenado em
        `dados_extras` da inbox e copiado integralmente para `data` do push.

        Campos canônicos:
        - screen: nome da rota registrada no navigator.
        - params: dicionário de parâmetros (sessaoId, registroId, etc.).
        - event: string identificadora do evento (ex: 'sessao_agendada').
        - entity_type: tipo da entidade relacionada (ex: 'sessao', 'registro').
        - entity_id: ID numérico da entidade relacionada.

        Campos extras são aceitos para metadados adicionais (dedup_id, status, etc.).
        """
        payload = {
            "screen": screen,
            "params": params or {},
        }
        if event is not None:
            payload["event"] = event
        if entity_type is not None:
            payload["entity_type"] = entity_type
        if entity_id is not None:
            payload["entity_id"] = entity_id
        payload.update(extra)
        return payload

    @staticmethod
    def emit(*, target, tipo, titulo, mensagem, link_relacionado=None, dados_extras=None):
        """
        Cria a notificação de inbox e agenda o envio push depois do commit.
        Mantém a inbox atual como fonte de histórico.

        `dados_extras` deve seguir o contrato canônico de roteamento:
        { screen, params, event, entity_type, entity_id }
        """
        payload = _target_kwargs(target)
        notificacao = NotificacaoSistema.objects.create(
            tipo=tipo,
            titulo=titulo,
            mensagem=mensagem,
            link_relacionado=link_relacionado,
            dados_extras=dados_extras or {},
            **payload,
        )

        def enqueue_push():
            try:
                from notificacoes_push.tasks import enqueue_push_for_notification
                enqueue_push_for_notification.delay(notificacao.id)
            except Exception:
                # Se o worker não estiver pronto ainda, a inbox continua funcionando.
                pass

        transaction.on_commit(enqueue_push)
        return notificacao

    @staticmethod
    def emit_session_created(sessao):
        paciente = sessao.paciente.user
        psicologo = sessao.psicologo.user
        data_formatada = timezone.localtime(sessao.data_hora).strftime("%d/%m/%Y às %H:%M")
        # Parâmetro canônico: sessaoId (não mais 'id')
        route = NotificationDomainService._routing_payload(
            screen="DetalhesSessao",
            params={"sessaoId": sessao.pk},
            event="sessao_agendada",
            entity_type="sessao",
            entity_id=sessao.pk,
        )

        NotificationDomainService.emit(
            target=paciente,
            tipo="sessao_agendada",
            titulo="Sessão Agendada",
            mensagem=f"Sua sessão foi agendada para {data_formatada}.",
            link_relacionado=f"/sessoes/{sessao.pk}",
            dados_extras=route,
        )

        NotificationDomainService.emit(
            target=psicologo,
            tipo="sessao_agendada",
            titulo="Nova Sessão Agendada",
            mensagem=f"Sessão agendada com {sessao.paciente.user.first_name} para {data_formatada}.",
            link_relacionado=f"/sessoes/{sessao.pk}",
            dados_extras=route,
        )

    @staticmethod
    def emit_new_odisseia_record(registro):
        vinculo = VinculoPacientePsicologo.objects.filter(
            paciente=registro.paciente,
            status="ativo",
        ).select_related("psicologo").first()
        if not vinculo:
            return None

        return NotificationDomainService.emit(
            target=vinculo.psicologo.user,
            tipo="novo_registro",
            titulo="Novo Registro de Odisseia",
            mensagem=f"{registro.paciente.user.first_name} fez um novo registro emocional.",
            link_relacionado=f"/registros/{registro.pk}",
            dados_extras=NotificationDomainService._routing_payload(
                # RegistroCompleto foi descontinuada — a lista de RegistrosOdisseia
                # já exibe o conteúdo completo de cada registro inline.
                screen="RegistrosOdisseia",
                params={"registroId": registro.pk},
                event="novo_registro_odisseia",
                entity_type="registro",
                entity_id=registro.pk,
            ),
        )


def resumo_perda_vinculo(vinculo):
    """
    Quantifica o que será perdido se `vinculo` for encerrado pelo paciente
    (sessões futuras canceladas + prontuários apagados) — usado tanto na
    confirmação do encerramento avulso quanto no aviso de troca por convite
    (SPEC_VINCULO_CONVITE_E_SOLICITACAO.md, seções 3.7 e 3.10).
    """
    from sessoes.models import Sessao

    agora = timezone.now()
    sessoes_futuras = Sessao.objects.filter(
        paciente=vinculo.paciente,
        psicologo=vinculo.psicologo,
        data_hora__gt=agora,
        status__in=_SESSAO_STATUS_FUTUROS,
    ).count()
    prontuarios = Prontuario.objects.filter(
        paciente=vinculo.paciente, psicologo=vinculo.psicologo,
    ).count()

    return {
        'psicologo_nome': f'{vinculo.psicologo.user.first_name} {vinculo.psicologo.user.last_name}'.strip(),
        'sessoes_futuras': sessoes_futuras,
        'prontuarios': prontuarios,
    }


def encerrar_vinculo_por_paciente(vinculo, *, novo_psicologo=None):
    """
    Serviço único de encerramento de vínculo iniciado pelo paciente
    (SPEC_VINCULO_CONVITE_E_SOLICITACAO.md, seção 3.10). Chamado nos três
    pontos de entrada que produzem o mesmo efeito: encerramento avulso,
    troca por convite aceito, e aceite de solicitação quando o paciente já
    adquiriu outro vínculo ativo nesse meio-tempo. Não duplicar esta lógica
    nas views que chamam este serviço.

    Regra que não pode regredir: só é chamado a partir de ações iniciadas
    pelo paciente. `alterar-status` do psicólogo — inclusive para
    'finalizado' — nunca chama este serviço.

    Tudo-ou-nada: qualquer falha em qualquer etapa desfaz o encerramento
    inteiro (status do vínculo, sessões e prontuários incluídos).
    """
    from sessoes.models import Sessao

    with transaction.atomic():
        paciente = vinculo.paciente
        psicologo_anterior = vinculo.psicologo

        vinculo.status = 'finalizado'
        vinculo.data_fim_tratamento = date.today()
        vinculo.save()

        paciente.psicologo = novo_psicologo
        paciente.save(update_fields=['psicologo'])

        agora = timezone.now()
        sessoes_futuras = Sessao.objects.filter(
            paciente=paciente,
            psicologo=psicologo_anterior,
            data_hora__gt=agora,
            status__in=_SESSAO_STATUS_FUTUROS,
        )
        sessoes_canceladas = 0
        for sessao in sessoes_futuras:
            sessao.status = 'cancelada'
            # Mesma regra do cancelamento manual: sessão cancelada não
            # segue com pagamento "pendente" em aberto.
            if sessao.status_pagamento != 'pago':
                sessao.status_pagamento = 'cancelado'
            sessao.cancelado_por = 'paciente'
            # A política de cancelamento tardio não se aplica aqui — não é
            # o cancelamento de uma sessão avulsa, é o encerramento do
            # vínculo inteiro.
            sessao.cancelamento_tardio = False
            sessao.motivo_cancelamento = 'Encerramento do vínculo com o profissional.'
            sessao.save()
            sessoes_canceladas += 1

        prontuarios_qs = Prontuario.objects.filter(paciente=paciente, psicologo=psicologo_anterior)
        prontuarios_apagados = prontuarios_qs.count()
        prontuarios_qs.delete()

        # A notificação não diferencia "encerrou" de "trocou de
        # profissional" — o paciente não deve satisfação a ninguém sobre
        # para onde foi.
        NotificationDomainService.emit(
            target=psicologo_anterior.user,
            tipo='sistema',
            titulo='Paciente encerrou o tratamento',
            mensagem=f'{paciente.user.first_name} optou por encerrar o tratamento com você.',
            link_relacionado='/pacientes',
            dados_extras=NotificationDomainService._routing_payload(
                screen='VinculosPacientes',
                event='vinculo_encerrado_pelo_paciente',
                entity_type='vinculo',
                entity_id=vinculo.id,
            ),
        )

    return {
        'sessoes_canceladas': sessoes_canceladas,
        'prontuarios_apagados': prontuarios_apagados,
    }


def notificar_solicitacao_indisponivel(vinculo):
    NotificationDomainService.emit(
        target=vinculo.paciente.user,
        tipo='sistema',
        titulo='Atualização sobre sua solicitação',
        mensagem=MENSAGEM_SOLICITACAO_INDISPONIVEL,
        link_relacionado='/conectar',
        dados_extras=NotificationDomainService._routing_payload(
            screen='ConexaoTerapeutica',
            event='solicitacao_vinculo_indisponivel',
            entity_type='vinculo',
            entity_id=vinculo.id,
        ),
    )


def expirar_se_vencido(vinculo):
    """
    Verificação defensiva (SPEC_VINCULO_CONVITE_E_SOLICITACAO.md, seção
    3.9): se `vinculo` está pendente há mais de 5 dias, expira agora mesmo
    — para que uma solicitação vencida nunca seja tratada como pendente só
    porque a task periódica ainda não rodou. Idempotente: chamar de novo
    sobre um vínculo já expirado não faz nada. Retorna True se expirou
    agora nesta chamada.
    """
    if vinculo.status != 'pendente' or vinculo.data_solicitacao is None:
        return False
    if timezone.now() - vinculo.data_solicitacao < PRAZO_EXPIRACAO_SOLICITACAO:
        return False

    vinculo.status = 'expirado'
    vinculo.save(update_fields=['status', 'updated_at'])
    notificar_solicitacao_indisponivel(vinculo)
    return True


def expirar_solicitacoes_vencidas(queryset=None):
    """
    Versão em lote de `expirar_se_vencido`, usada pela task periódica e
    pela listagem de solicitações pendentes do psicólogo. `queryset`
    restringe o escopo (ex.: só as solicitações de um psicólogo); por
    padrão varre todas. Retorna quantas solicitações foram expiradas.
    """
    corte = timezone.now() - PRAZO_EXPIRACAO_SOLICITACAO
    base = queryset if queryset is not None else VinculoPacientePsicologo.objects.all()
    vencidas = base.filter(status='pendente', data_solicitacao__lt=corte).select_related('paciente__user')

    count = 0
    for vinculo in vencidas:
        vinculo.status = 'expirado'
        vinculo.save(update_fields=['status', 'updated_at'])
        notificar_solicitacao_indisponivel(vinculo)
        count += 1
    return count
