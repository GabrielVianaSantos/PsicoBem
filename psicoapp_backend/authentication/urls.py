from django.urls import path
from . import views

urlpatterns = [
    # Rotas de autenticação
    path('register/paciente/', views.PacienteRegistrationView.as_view(), name='register-paciente'),
    path('register/psicologo/', views.PsicologoRegistrationView.as_view(), name='register-psicologo'),
    path('login/', views.login_view, name='login'),
    
    # Rotas de perfil
    path('profile/', views.user_profile_view, name='user-profile'),
    path('profile/update/', views.user_update_view, name='user-update'),
]