from django.db import models


class DispositivoPush(models.Model):
    class Provider(models.TextChoices):
        EXPO = "expo", "Expo"
        FCM = "fcm", "FCM"
        APNS = "apns", "APNs"

    class Platform(models.TextChoices):
        IOS = "ios", "iOS"
        ANDROID = "android", "Android"

    class PermissionStatus(models.TextChoices):
        GRANTED = "granted", "Granted"
        DENIED = "denied", "Denied"
        UNDETERMINED = "undetermined", "Undetermined"

    user = models.ForeignKey("authentication.CustomUser", on_delete=models.CASCADE, related_name="dispositivos_push")
    provider = models.CharField(max_length=20, choices=Provider.choices, default=Provider.EXPO)
    push_token = models.CharField(max_length=255)
    platform = models.CharField(max_length=20, choices=Platform.choices)
    app_version = models.CharField(max_length=50, blank=True, default="")
    device_id = models.CharField(max_length=100)
    timezone = models.CharField(max_length=100, blank=True, default="")
    ativo = models.BooleanField(default=True)
    permissao_status = models.CharField(max_length=20, choices=PermissionStatus.choices, default=PermissionStatus.UNDETERMINED)
    last_seen_at = models.DateTimeField(auto_now=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ("user", "device_id", "provider")
        indexes = [
            models.Index(fields=["user", "ativo"]),
            models.Index(fields=["push_token", "provider"]),
            models.Index(fields=["last_seen_at"]),
        ]


class EntregaPush(models.Model):
    class Status(models.TextChoices):
        QUEUED = "queued", "Queued"
        SENT = "sent", "Sent"
        RECEIPT_OK = "receipt_ok", "Receipt OK"
        RECEIPT_ERROR = "receipt_error", "Receipt Error"
        FAILED = "failed", "Failed"
        DEVICE_UNREGISTERED = "device_unregistered", "Device Unregistered"

    notificacao = models.ForeignKey("core.NotificacaoSistema", on_delete=models.SET_NULL, null=True, blank=True)
    destinatario_user = models.ForeignKey("authentication.CustomUser", on_delete=models.CASCADE)
    dispositivo = models.ForeignKey(DispositivoPush, on_delete=models.SET_NULL, null=True, blank=True)
    provider = models.CharField(max_length=20, choices=DispositivoPush.Provider.choices, default=DispositivoPush.Provider.EXPO)
    status = models.CharField(max_length=30, choices=Status.choices, default=Status.QUEUED)
    titulo = models.CharField(max_length=100)
    mensagem = models.TextField()
    payload_json = models.JSONField(default=dict, blank=True)
    provider_ticket_id = models.CharField(max_length=255, blank=True, default="")
    provider_receipt_id = models.CharField(max_length=255, blank=True, default="")
    provider_error_code = models.CharField(max_length=100, blank=True, default="")
    provider_error_detail = models.TextField(blank=True, default="")
    tentativas = models.PositiveIntegerField(default=0)
    next_retry_at = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    receipt_checked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["status", "next_retry_at"]),
            models.Index(fields=["destinatario_user", "created_at"]),
            models.Index(fields=["provider_ticket_id"]),
        ]


class ReminderDispatch(models.Model):
    session_id = models.IntegerField()
    reminder_type = models.CharField(max_length=20)
    destinatario_user = models.ForeignKey("authentication.CustomUser", on_delete=models.CASCADE)
    sent_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ("session_id", "reminder_type", "destinatario_user")
        indexes = [
            models.Index(fields=["session_id", "reminder_type"]),
            models.Index(fields=["destinatario_user", "sent_at"]),
        ]
