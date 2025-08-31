from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    """
    Modelo customizado de usuário para o PsicoBem
    """
    USER_TYPE_CHOICES = (
        ('paciente', 'Paciente'),
        ('psicologo', 'Psicólogo'),
    )
    
    email = models.EmailField(unique=True)
    user_type = models.CharField(max_length=10, choices=USER_TYPE_CHOICES)
    phone = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
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
    crp = models.CharField(max_length=8, unique=True)  # Format: XX/XXXXX
    specialization = models.CharField(max_length=200, blank=True, null=True)
    license_date = models.DateField(null=True, blank=True)
    biography = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return f"Dr(a). {self.user.first_name} {self.user.last_name} - CRP: {self.crp}"