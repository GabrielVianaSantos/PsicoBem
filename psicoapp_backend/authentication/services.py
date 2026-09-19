import hashlib
import logging
import random
import re
import secrets
import string
import time
import uuid
from datetime import timedelta

import jwt
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone

from .models import CustomUser, PasswordResetCode

logger = logging.getLogger(__name__)


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


def hash_reset_code(code):
    """Hash determinístico (com pepper via SECRET_KEY) do código de reset."""
    return hashlib.sha256(f'{settings.SECRET_KEY}:{code}'.encode()).hexdigest()


# ==================== CÓDIGO CURTO DE CONVITE (SPEC_VINCULO_CONVITE_E_SOLICITACAO.md) ====================
#
# Utilitário compartilhado por `Psicologo.codigo_convite` (convite permanente)
# e `core.models.ConviteVinculo.codigo` (convite de uso único) — mesmo
# alfabeto e formato para os dois. Alfabeto sem caracteres ambíguos
# (0/O, 1/I/L) porque o código é feito para ser digitado de cabeça, sem o
# app instalado.
CODIGO_CONVITE_ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'


def _prefixo_seguro_do_nome(nome, tamanho=3):
    """Extrai até `tamanho` letras do nome que já pertencem ao alfabeto seguro
    (maiúsculas, sem acento, sem 0/O/1/I/L); completa com caracteres
    aleatórios do mesmo alfabeto quando o nome não fornece letras suficientes."""
    import unicodedata

    nome_ascii = unicodedata.normalize('NFKD', nome or '').encode('ascii', 'ignore').decode('ascii').upper()
    letras = [c for c in nome_ascii if c in CODIGO_CONVITE_ALFABETO]
    prefixo = ''.join(letras[:tamanho])
    while len(prefixo) < tamanho:
        prefixo += random.choice(CODIGO_CONVITE_ALFABETO)
    return prefixo


def gerar_codigo_curto(nome_referencia=''):
    """Gera um código no formato `XXX-XXXX` (ex.: `ANA-4K7Q`)."""
    prefixo = _prefixo_seguro_do_nome(nome_referencia)
    sufixo = ''.join(random.choices(CODIGO_CONVITE_ALFABETO, k=4))
    return f'{prefixo}-{sufixo}'


def gerar_codigo_curto_unico(model, field_name, nome_referencia=''):
    """Gera um código curto garantindo unicidade em `model.field_name`."""
    for _ in range(20):
        codigo = gerar_codigo_curto(nome_referencia)
        if not model.objects.filter(**{field_name: codigo}).exists():
            return codigo
    # Fallback praticamente inatingível (espaço de códigos é grande), mas
    # nunca deve travar um cadastro/geração de convite.
    sufixo = uuid.uuid4().hex[:4].upper()
    return f'{_prefixo_seguro_do_nome(nome_referencia)}-{sufixo}'


def normalizar_codigo_curto(valor):
    """
    Normaliza a entrada do usuário para o formato canônico `XXX-XXXX`:
    maiúsculas e hífen opcional (aceita `ana-4k7q`, `ANA4K7Q` e `ANA-4K7Q`
    como o mesmo código).
    """
    limpo = re.sub(r'[^A-Za-z0-9]', '', valor or '').upper()
    if len(limpo) == 7:
        return f'{limpo[:3]}-{limpo[3:]}'
    return (valor or '').strip().upper()


def gerar_slug_psicologo_unico(first_name, last_name):
    """Slug único a partir do nome, com sufixo numérico em colisão (`ana-silva`, `ana-silva-2`)."""
    from django.utils.text import slugify

    from .models import Psicologo

    base = slugify(f'{first_name or ""} {last_name or ""}'.strip()) or 'psicologo'
    slug = base
    contador = 2
    while Psicologo.objects.filter(slug=slug).exists():
        slug = f'{base}-{contador}'
        contador += 1
    return slug


def generate_password_reset_code(user):
    """
    Gera um código numérico de 6 dígitos para recuperação de senha e persiste
    apenas seu hash. Invalida quaisquer códigos anteriores ainda não usados
    do mesmo usuário, garantindo que só o código mais recente seja válido.
    """
    PasswordResetCode.objects.filter(user=user, usado=False).update(usado=True)

    code = f'{secrets.randbelow(1_000_000):06d}'
    PasswordResetCode.objects.create(
        user=user,
        code_hash=hash_reset_code(code),
        expires_at=timezone.now() + timedelta(seconds=settings.PASSWORD_RESET_TOKEN_TTL),
    )
    return code


def send_password_reset_email(user, code):
    """Envia o código de recuperação de senha por e-mail (texto simples)."""
    minutos = settings.PASSWORD_RESET_TOKEN_TTL // 60
    mensagem = (
        f"Olá, {user.first_name or user.email}!\n\n"
        f"Recebemos uma solicitação para redefinir a senha da sua conta PsicoBem.\n\n"
        f"Seu código de recuperação é: {code}\n\n"
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


def send_welcome_email(user):
    """
    Envia e-mail de boas-vindas após cadastro (conta nativa ou Google).
    Best-effort: falha de envio não deve impedir o cadastro, então erros
    são apenas logados.
    """
    tipo_conta = user.get_user_type_display()
    mensagem = (
        f"Olá, {user.first_name or user.email}!\n\n"
        f"Seu cadastro no PsicoBem foi realizado com sucesso.\n\n"
        f"Tipo de conta: {tipo_conta}\n\n"
        f"Agora você já pode acessar o aplicativo com o e-mail cadastrado.\n\n"
        f"Seja bem-vindo(a)!"
    )
    try:
        send_mail(
            subject="Bem-vindo(a) ao PsicoBem!",
            message=mensagem,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,
        )
    except Exception:
        logger.exception("Falha ao enviar e-mail de boas-vindas para %s", user.email)
