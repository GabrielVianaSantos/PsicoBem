from django.db import transaction

from .models import NotificacaoSistema, VinculoPacientePsicologo


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
    def _routing_payload(screen="Notificacoes", params=None, **extra):
        return {
            "screen": screen,
            "params": params or {},
            **extra,
        }

    @staticmethod
    def emit(*, target, tipo, titulo, mensagem, link_relacionado=None, dados_extras=None):
        """
        Cria a notificação de inbox e agenda o envio push depois do commit.
        Mantém a inbox atual como fonte de histórico.
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
        data_formatada = sessao.data_hora.strftime("%d/%m/%Y às %H:%M")
        route = NotificationDomainService._routing_payload(
            screen="DetalhesSessao",
            params={"id": sessao.pk},
            event="sessao_agendada",
            session_id=sessao.pk,
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
                screen="RegistroCompleto",
                params={"id": registro.pk},
                event="novo_registro_odisseia",
                registro_id=registro.pk,
            ),
        )
