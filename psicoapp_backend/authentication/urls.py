from django.urls import path
from . import views
from .views import conecta_psicologo_view, paciente_dashboard_view

urlpatterns = [
    # Rotas de autenticação
    path('register/paciente/', views.PacienteRegistrationView.as_view(), name='register-paciente'),
    path('register/psicologo/', views.PsicologoRegistrationView.as_view(), name='register-psicologo'),
    path('login/', views.login_view, name='login'),
    
    # Rotas de perfil
    path('profile/', views.user_profile_view, name='user-profile'),
    path('profile/update/', views.user_update_view, name='user-update'),

    # Rotas de senha
    path('password/reset/', views.password_reset_request_view, name='password-reset-request'),
    path('password/reset/confirm/', views.password_reset_confirm_view, name='password-reset-confirm'),
    path('password/change/', views.password_change_view, name='password-change'),
    path('paciente/conecta-psicologo/', conecta_psicologo_view, name='conecta-psicologo'),
    path('paciente/dashboard/', paciente_dashboard_view, name='paciente-dashboard'),
]