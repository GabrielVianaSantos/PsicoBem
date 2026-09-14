import random
import re
import string
import time
import uuid

import jwt
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from django.conf import settings
from django.core.mail import send_mail

from .models import CustomUser


class GoogleAuthError(Exception):
    """Erro de autenticação/validação relacionado ao fluxo Google."""

    def __init__(self, code, message=None, http_status=400):
        self.code = code
        self.message = message or code
        self.http_status = http_status
        super().__init__(self.message)


def verify_google_id_token(raw):
    """
    Valida a assinatura, expiração e emissor do id_token do Google.
    O `aud` é conferido manualmente contra GOOGLE_OAUTH_ALLOWED_AUDIENCES
    (audience=None na chamada da lib é proposital: permite múltiplas
    audiences, ex.: futuro client iOS, sem alterar código).
    """
    try:
        payload = google_id_token.verify_oauth2_token(
            raw,
            google_requests.Request(),
            audience=None,
            clock_skew_in_seconds=10,
        )
    except ValueError:
        raise GoogleAuthError('invalid_google_token', 'Token do Google inválido.', 400)

    aud = payload.get('aud')
    if aud not in settings.GOOGLE_OAUTH_ALLOWED_AUDIENCES:
        raise GoogleAuthError('invalid_google_token', 'Token do Google inválido.', 400)

    if not payload.get('email_verified'):
        raise GoogleAuthError('email_not_verified', 'E-mail do Google não verificado.', 403)

    return payload


def issue_purpose_token(typ, payload, ttl=None):
    """
    Emite um JWT HS256 de propósito específico (ex.: link/registro/reset de
    senha), não confundível com os tokens do SimpleJWT.
    """
    ttl = ttl or settings.GOOGLE_PURPOSE_TOKEN_TTL
    now = int(time.time())
    exp = now + ttl
    claims = {
        'typ': typ,
        'iss': 'psicobem',
        'iat': now,
        'exp': exp,
        'jti': uuid.uuid4().hex,
    }
    claims.update(payload)
    token = jwt.encode(claims, settings.SECRET_KEY, algorithm='HS256')
    return token, ttl


def decode_purpose_token(raw, expected_typ):
    try:
        claims = jwt.decode(
            raw,
            settings.SECRET_KEY,
            algorithms=['HS256'],
            options={'require': ['exp', 'iat', 'typ', 'sub', 'email']},
        )
    except jwt.PyJWTError:
        raise GoogleAuthError('token_expired', 'Token expirado ou inválido.', 401)

    if claims.get('typ') != expected_typ or claims.get('iss') != 'psicobem':
        raise GoogleAuthError('token_expired', 'Token expirado ou inválido.', 401)

    return claims


def generate_unique_username(email):
    local_part = (email or '').split('@')[0].lower()
    local_part = re.sub(r'[^a-z0-9._-]', '', local_part)[:24]
    base = local_part or 'user'

    if not CustomUser.objects.filter(username=base).exists():
        return base

    for _ in range(10):
        suffix = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
        candidate = f'{base}_{suffix}'
        if not CustomUser.objects.filter(username=candidate).exists():
            return candidate

    return f'user_{uuid.uuid4().hex[:12]}'


def send_password_reset_email(user, token):
    """Envia o código de recuperação de senha por e-mail (texto simples)."""
    minutos = settings.PASSWORD_RESET_TOKEN_TTL // 60
    mensagem = (
        f"Olá, {user.first_name or user.email}!\n\n"
        f"Recebemos uma solicitação para redefinir a senha da sua conta PsicoBem.\n\n"
        f"Seu código de recuperação é:\n\n{token}\n\n"
        f"Esse código expira em {minutos} minutos. Se você não solicitou essa "
        f"alteração, pode ignorar este e-mail com segurança."
    )
    send_mail(
        subject="Recuperação de senha — PsicoBem",
        message=mensagem,
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[user.email],
        fail_silently=False,
    )
