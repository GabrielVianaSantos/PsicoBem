from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone

class CustomUser(AbstractUser):
    """
    Modelo customizado de usuário para o PsicoBem
    """
    USER_TYPE_CHOICES = (
        ('paciente', 'Paciente'),
        ('psicologo', 'Psicólogo'),
    )
    
    AUTH_PROVIDER_CHOICES = (
        ('local', 'Local'),
        ('google', 'Google'),
    )

    email = models.EmailField(unique=True)
    user_type = models.CharField(max_length=10, choices=USER_TYPE_CHOICES)
    phone = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    google_sub = models.CharField(max_length=255, unique=True, null=True, blank=True, default=None, db_index=True)
    auth_provider = models.CharField(max_length=20, choices=AUTH_PROVIDER_CHOICES, default='local')
    email_verified = models.BooleanField(default=False)
    avatar_url = models.URLField(max_length=500, blank=True, null=True)
    
    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username', 'user_type']
    
    def __str__(self):
        return f"{self.email} ({self.get_user_type_display()})"

class Paciente(models.Model):
    """
    Modelo específico para dados dos Pacientes
    """
    GENDER_CHOICES = (
        ('M', 'Masculino'),
        ('F', 'Feminino'),
        ('O', 'Outro'),
    )
    
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='paciente_profile')
    cpf = models.CharField(max_length=14, unique=True)  # Format: XXX.XXX.XXX-XX
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES)
    birth_date = models.DateField(null=True, blank=True)
    address = models.TextField(blank=True, null=True)
    emergency_contact = models.CharField(max_length=20, blank=True, null=True)
    
    # Relacionamento com psicólogo
    psicologo = models.ForeignKey('Psicologo', on_delete=models.SET_NULL, null=True, blank=True, related_name='pacientes')
    
    def __str__(self):
        return f"Paciente: {self.user.first_name} {self.user.last_name}"

class Psicologo(models.Model):
    """
    Modelo específico para dados dos Psicólogos
    """
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE, related_name='psicologo_profile')
    crp = models.CharField(max_length=15, unique=True)  # Format: XX/XXXXX+
    specialization = models.CharField(max_length=200, blank=True, null=True)
    license_date = models.DateField(null=True, blank=True)
    biography = models.TextField(blank=True, null=True)
    # Link pessoal e fixo do Google Meet (SPEC_SESSOES_ONLINE_GOOGLE_MEET.md).
    # Nullable pois psicólogos cadastrados antes desta feature não têm esse
    # dado e não há como preenchê-lo retroativamente.
    link_sala_video = models.URLField(
        max_length=300, blank=True, null=True,
        verbose_name='Link da Sala de Vídeo (Google Meet)'
    )
    
    def __str__(self):
        return f"Dr(a). {self.user.first_name} {self.user.last_name} - CRP: {self.crp}"


class PasswordResetCode(models.Model):
    """
    Código numérico de recuperação de senha.

    Substitui o antigo token JWT (gigantesco, difícil de copiar do e-mail no
    celular) por um código curto de 6 dígitos. Guardamos apenas o hash do
    código — nunca o valor em texto puro — e limitamos tentativas de
    validação para não abrir uma via de força-bruta sobre um espaço de
    apenas 1 milhão de combinações.
    """
    MAX_TENTATIVAS = 5

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='password_reset_codes')
    code_hash = models.CharField(max_length=64)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    tentativas = models.PositiveSmallIntegerField(default=0)
    usado = models.BooleanField(default=False)

    class Meta:
        indexes = [models.Index(fields=['user', 'usado'])]

    def __str__(self):
        return f"Código de reset para {self.user.email} (usado={self.usado})"

    @property
    def expirado(self):
        return timezone.now() > self.expires_at

    @property
    def esgotado(self):
        return self.tentativas >= self.MAX_TENTATIVAS