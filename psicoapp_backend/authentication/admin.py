from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import CustomUser, Paciente, Psicologo

@admin.register(CustomUser)
class CustomUserAdmin(UserAdmin):
    """
    Admin customizado para CustomUser
    """
    list_display = ('email', 'username', 'user_type', 'is_active', 'date_joined')
    list_filter = ('user_type', 'is_active', 'date_joined')
    search_fields = ('email', 'username', 'first_name', 'last_name')
    
    fieldsets = UserAdmin.fieldsets + (
        ('Informações Adicionais', {
            'fields': ('user_type', 'phone')
        }),
    )

@admin.register(Paciente)
class PacienteAdmin(admin.ModelAdmin):
    """
    Admin para Pacientes
    """
    list_display = ('user', 'cpf', 'gender', 'psicologo')
    list_filter = ('gender', 'psicologo')
    search_fields = ('user__email', 'user__first_name', 'user__last_name', 'cpf')

@admin.register(Psicologo)
class PsicologoAdmin(admin.ModelAdmin):
    """
    Admin para Psicólogos
    """
    list_display = ('user', 'crp', 'specialization')
    search_fields = ('user__email', 'user__first_name', 'user__last_name', 'crp')