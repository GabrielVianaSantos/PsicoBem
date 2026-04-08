try:
    from celery import shared_task
except ModuleNotFoundError:  # pragma: no cover - fallback para ambiente sem Celery instalado
    def shared_task(func=None, *args, **kwargs):
        if func is None:
            return lambda f: f
        return func

import logging
from django.db import IntegrityError, models
from django.db.models import Q

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
    
    # Issue 15: Badge counter logic
    user = _notification_target_user(notificacao)
    badge_count = 0
    if user:
        from core.models import NotificacaoSistema
        badge_count = NotificacaoSistema.objects.filter(
            models.Q(paciente__user=user) | models.Q(psicologo__user=user),
            lida=False
        ).count()

    return {
        "title": notificacao.titulo,
        "body": notificacao.mensagem,
        "badge": badge_count,
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
        "android": {
            "channelId": "psicobem-notificacoes",
            "icon": "notification_icon",
        },
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
            "android": payload_padrao["android"],
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
    Consulta a Expo Receipts API para entregas enviadas com ticket pendente.
    Atualiza status e desativa tokens inválidos (DeviceNotRegistered).
    """
    import json
    from urllib import request as urllib_request

    RECEIPTS_ENDPOINT = "https://exp.host/--/api/v2/push/getReceipts"
    BATCH_SIZE = 300

    pendentes = list(
        EntregaPush.objects.filter(
            status=EntregaPush.Status.SENT,
            provider_ticket_id__gt="",
            provider_receipt_id="",
        ).select_related("dispositivo")[:BATCH_SIZE]
    )

    if not pendentes:
        logger.info("push.receipts.reconcile", extra={"pending_receipts": 0})
        return {"status": "ok", "pending_receipts": 0}

    ticket_ids = [e.provider_ticket_id for e in pendentes]
    ticket_map = {e.provider_ticket_id: e for e in pendentes}

    body = json.dumps({"ids": ticket_ids}).encode("utf-8")
    req = urllib_request.Request(
        RECEIPTS_ENDPOINT,
        data=body,
        headers={"Accept": "application/json", "Content-Type": "application/json"},
        method="POST",
    )

    try:
        with urllib_request.urlopen(req, timeout=20) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except Exception as exc:
        logger.warning("push.receipts.fetch_error", extra={"error": str(exc)})
        return {"status": "error", "detail": str(exc)}

    receipts = payload.get("data", {})
    ok_count = 0
    error_count = 0
    now = timezone.now()

    for ticket_id, receipt in receipts.items():
        entrega = ticket_map.get(ticket_id)
        if not entrega:
            continue

        entrega.provider_receipt_id = ticket_id
        entrega.receipt_checked_at = now
        receipt_status = receipt.get("status")

        if receipt_status == "ok":
            entrega.status = EntregaPush.Status.RECEIPT_OK
            ok_count += 1
        else:
            error_code = receipt.get("details", {}).get("error", "unknown")
            entrega.provider_error_code = error_code
            entrega.provider_error_detail = str(receipt)
            error_count += 1

            if error_code == "DeviceNotRegistered" and entrega.dispositivo:
                entrega.dispositivo.ativo = False
                entrega.dispositivo.save(update_fields=["ativo", "updated_at", "last_seen_at"])
                entrega.status = EntregaPush.Status.DEVICE_UNREGISTERED
                logger.info(
                    "push.receipts.device_unregistered",
                    extra={"device_id": entrega.dispositivo.device_id},
                )
            else:
                entrega.status = EntregaPush.Status.RECEIPT_ERROR

        entrega.save(update_fields=[
            "status", "provider_receipt_id", "provider_error_code",
            "provider_error_detail", "receipt_checked_at", "updated_at",
        ])

    logger.info(
        "push.receipts.reconcile",
        extra={"checked": len(receipts), "ok": ok_count, "errors": error_count},
    )
    return {"status": "ok", "checked": len(receipts), "ok": ok_count, "errors": error_count}


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
