try:
    from celery import shared_task
except ModuleNotFoundError:  # pragma: no cover - fallback para ambiente sem Celery instalado
    def shared_task(func=None, *args, **kwargs):
        if func is None:
            return lambda f: f
        return func

import logging
from django.db import IntegrityError
from django.utils import timezone
from datetime import timedelta

from core.models import NotificacaoSistema
from sessoes.models import Sessao
from core.services import NotificationDomainService
from .models import DispositivoPush, EntregaPush, ReminderDispatch
from .services import ExpoPushProvider

logger = logging.getLogger("notificacoes_push")


def _notification_target_user(notificacao):
    if notificacao.paciente:
        return notificacao.paciente.user
    if notificacao.psicologo:
        return notificacao.psicologo.user
    return None


def _build_push_payload(notificacao):
    dados_extras = notificacao.dados_extras or {}
    return {
        "title": notificacao.titulo,
        "body": notificacao.mensagem,
        "data": {
            "notification_id": notificacao.id,
            "screen": dados_extras.get("screen", "Notificacoes"),
            "params": dados_extras.get("params", {}),
            "link_relacionado": notificacao.link_relacionado,
            "event": dados_extras.get("event"),
            "session_id": dados_extras.get("session_id"),
            "registro_id": dados_extras.get("registro_id"),
        },
        "sound": "default",
    }


@shared_task
def enqueue_push_for_notification(notification_id):
    try:
        notificacao = NotificacaoSistema.objects.select_related("paciente__user", "psicologo__user").get(id=notification_id)
    except NotificacaoSistema.DoesNotExist:
        return {"status": "missing"}

    destinatario_user = _notification_target_user(notificacao)
    if destinatario_user is None:
        logger.info(
            "push.notification.skipped",
            extra={"notification_id": notification_id, "reason": "missing_target"},
        )
        return {"status": "skipped", "reason": "missing_target"}

    dispositivos = list(
        DispositivoPush.objects.filter(
            user=destinatario_user,
            ativo=True,
            permissao_status=DispositivoPush.PermissionStatus.GRANTED,
        )
    )

    if not dispositivos:
        logger.info(
            "push.notification.no_devices",
            extra={"notification_id": notificacao.id, "user_id": destinatario_user.id},
        )
        return {"status": "queued_without_devices", "notification_id": notificacao.id}

    provider = ExpoPushProvider()
    mensagens = []
    entregas = []
    payload_padrao = _build_push_payload(notificacao)

    for dispositivo in dispositivos:
        entrega = EntregaPush.objects.create(
            notificacao=notificacao,
            destinatario_user=destinatario_user,
            dispositivo=dispositivo,
            provider=dispositivo.provider,
            status=EntregaPush.Status.QUEUED,
            titulo=notificacao.titulo,
            mensagem=notificacao.mensagem,
            payload_json=payload_padrao,
        )
        entregas.append(entrega)
        mensagens.append({
            "to": dispositivo.push_token,
            "title": notificacao.titulo,
            "body": notificacao.mensagem,
            "data": payload_padrao["data"],
            "sound": "default",
        })

    resposta = provider.send(mensagens)
    tickets = resposta.get("data", []) if isinstance(resposta, dict) else []
    logger.info(
        "push.notification.sent_batch",
        extra={
            "notification_id": notificacao.id,
            "user_id": destinatario_user.id,
            "devices": len(dispositivos),
            "provider": "expo",
        },
    )

    for entrega, ticket in zip(entregas, tickets):
        if ticket.get("status") == "ok":
            entrega.status = EntregaPush.Status.SENT
            entrega.provider_ticket_id = ticket.get("id", "")
            entrega.sent_at = timezone.now()
            entrega.save(update_fields=["status", "provider_ticket_id", "sent_at", "updated_at"])
        else:
            entrega.status = EntregaPush.Status.FAILED
            entrega.provider_error_code = ticket.get("details", {}).get("error", "unknown_error")
            entrega.provider_error_detail = str(ticket)
            entrega.tentativas += 1
            entrega.next_retry_at = timezone.now() + timedelta(minutes=15)
            entrega.save(update_fields=["status", "provider_error_code", "provider_error_detail", "tentativas", "next_retry_at", "updated_at"])
            if entrega.dispositivo and ticket.get("details", {}).get("error") == "DeviceNotRegistered":
                entrega.dispositivo.ativo = False
                entrega.dispositivo.save(update_fields=["ativo", "updated_at", "last_seen_at"])
            logger.warning(
                "push.notification.delivery_failed",
                extra={
                    "notification_id": notificacao.id,
                    "entrega_id": entrega.id,
                    "device_id": entrega.dispositivo.device_id if entrega.dispositivo else None,
                    "provider_error_code": entrega.provider_error_code,
                },
            )

    return {
        "status": "queued",
        "notification_id": notificacao.id,
        "devices": len(dispositivos),
        "sent_at": timezone.now().isoformat(),
    }


@shared_task
def reconcile_push_receipts():
    """
    Revisa entregas já enviadas. A implementação completa de receipts da Expo
    será adicionada quando o worker de produção estiver com o fluxo estável.
    """
    pendentes = EntregaPush.objects.filter(
        status__in=[EntregaPush.Status.SENT, EntregaPush.Status.FAILED],
        provider_receipt_id="",
    ).count()
    logger.info("push.receipts.reconcile", extra={"pending_receipts": pendentes})
    return {"status": "noop", "pending_receipts": pendentes}


def _reminder_minutes_to_types():
    return {
        24 * 60: "lembrete_24h",
        2 * 60: "lembrete_2h",
        15: "lembrete_15m",
    }


def _build_reminder_message(sessao, reminder_type, minutes):
    data_formatada = sessao.data_hora.strftime("%d/%m/%Y às %H:%M")
    if reminder_type == "lembrete_24h":
        return f"Sua sessão está marcada para amanhã, {data_formatada}."
    if reminder_type == "lembrete_2h":
        return f"Sua sessão começa em cerca de 2 horas: {data_formatada}."
    return f"Sua sessão começa em 15 minutos: {data_formatada}."


@shared_task
def dispatch_session_reminders():
    now = timezone.now()
    window_minutes = [24 * 60, 2 * 60, 15]
    results = {"processed": 0, "created": 0, "skipped": 0}
    logger.info("push.reminders.start", extra={"now": now.isoformat()})

    for minutes in window_minutes:
        reminder_type = _reminder_minutes_to_types()[minutes]
        start = now + timedelta(minutes=minutes + 2)
        end = now + timedelta(minutes=max(minutes - 2, 0))

        sessoes = Sessao.objects.filter(
            status__in=["agendada", "confirmada", "remarcada"],
            data_hora__range=(end, start),
        ).select_related("paciente__user", "psicologo__user")

        for sessao in sessoes:
            results["processed"] += 1
            for target_user in [sessao.paciente.user, sessao.psicologo.user]:
                created = False
                try:
                    ReminderDispatch.objects.create(
                        session_id=sessao.id,
                        reminder_type=reminder_type,
                        destinatario_user=target_user,
                    )
                    created = True
                except IntegrityError:
                    results["skipped"] += 1
                    continue

                if created:
                    NotificationDomainService.emit(
                        target=target_user,
                        tipo="sessao_lembrete",
                        titulo="Lembrete de Sessão",
                        mensagem=_build_reminder_message(sessao, reminder_type, minutes),
                        link_relacionado=f"/sessoes/{sessao.pk}",
                        dados_extras=NotificationDomainService._routing_payload(
                            screen="DetalhesSessao",
                            params={"id": sessao.pk},
                            event=reminder_type,
                            session_id=sessao.pk,
                        ),
                    )
                    results["created"] += 1
                    logger.info(
                        "push.reminders.created",
                        extra={
                            "session_id": sessao.id,
                            "reminder_type": reminder_type,
                            "recipient_user_id": target_user.id,
                        },
                    )

    logger.info("push.reminders.finish", extra=results)
    return results
