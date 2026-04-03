import os
import django
from datetime import date

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'psicoapp_backend.settings')
django.setup()

from authentication.models import CustomUser, Psicologo, Paciente
from core.models import VinculoPacientePsicologo
from django.contrib.auth.hashers import make_password

# Clean existing test users to avoid unique constraints
CustomUser.objects.filter(
    email__in=[
        'admin@psicobem.com',
        'psicologo@example.com',
        'paciente@example.com',
        'joao@example.com',
    ]
).delete()
CustomUser.objects.filter(
    username__in=['admin', 'psicologo', 'paciente', 'joao']
).delete()

# Admin
admin, created = CustomUser.objects.get_or_create(
    email='admin@psicobem.com',
    defaults={
        'username': 'admin',
        'is_superuser': True,
        'is_staff': True,
        'password': make_password('admin123'),
        'user_type': 'psicologo'
    }
)
if not created:
    admin.password = make_password('admin123')
    admin.save()


# Psicologo
psicologo_user, created = CustomUser.objects.get_or_create(
    email='psicologo@example.com',
    defaults={
        'username': 'psicologo',
        'first_name': 'Dr.',
        'last_name': 'Teste',
        'password': make_password('senha123'),
        'user_type': 'psicologo'
    }
)
if not created:
    psicologo_user.password = make_password('senha123')
    psicologo_user.save()
    
psicologo_profile, _ = Psicologo.objects.get_or_create(
    user=psicologo_user,
    defaults={
        'crp': '00/00000',
        'specialization': 'TCC',
        'license_date': date.today()
    }
)

# Paciente principal
paciente_user, created = CustomUser.objects.get_or_create(
    email='paciente@example.com',
    defaults={
        'username': 'paciente',
        'first_name': 'Paciente',
        'last_name': 'Teste',
        'password': make_password('senha123'),
        'user_type': 'paciente'
    }
)
if not created:
    paciente_user.password = make_password('senha123')
    paciente_user.save()

paciente_profile, _ = Paciente.objects.get_or_create(
    user=paciente_user,
    defaults={
        'cpf': '000.000.000-00',
        'gender': 'M',
        'birth_date': date(1990, 1, 1),
        'psicologo': psicologo_profile
    }
)

# Paciente alternativo
joao_user, created = CustomUser.objects.get_or_create(
    email='joao@example.com',
    defaults={
        'username': 'joao',
        'first_name': 'Joao',
        'last_name': 'Souza',
        'password': make_password('senha123'),
        'user_type': 'paciente'
    }
)
if not created:
    joao_user.password = make_password('senha123')
    joao_user.save()

joao_profile, _ = Paciente.objects.get_or_create(
    user=joao_user,
    defaults={
        'cpf': '111.111.111-11',
        'gender': 'M',
        'birth_date': date(1990, 1, 1),
        'psicologo': psicologo_profile
    }
)

# Vinculo
v, created = VinculoPacientePsicologo.objects.get_or_create(
    paciente=paciente_profile,
    psicologo=psicologo_profile,
    defaults={'status': 'ativo'}
)

if not created:
    v.status = 'ativo'
    v.save()

v_joao, created = VinculoPacientePsicologo.objects.get_or_create(
    paciente=joao_profile,
    psicologo=psicologo_profile,
    defaults={'status': 'ativo'}
)

if not created:
    v_joao.status = 'ativo'
    v_joao.save()

print('Database seeded correctly!')
