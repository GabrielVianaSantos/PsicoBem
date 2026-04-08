from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from core.models import VinculoPacientePsicologo
from core.services import NotificationDomainService

@shared_task(name="core.tasks.notificar_pacientes_inativos")
def notificar_pacientes_inativos():
    """
    Identifica pacientes sem registros na Odisseia há mais de 7 dias.
    Notifica o psicólogo (alerta) e o paciente (incentivo).
    """
    from engajamentos.models import RegistroOdisseia
    
    sete_dias_atras = timezone.now().date() - timedelta(days=7)
    
    # Pegar todos os vínculos ativos
    vinculos = VinculoPacientePsicologo.objects.filter(status='ativo').select_related(
        'paciente__user', 'psicologo__user'
    )
    
    count_pacientes = 0
    count_psicologos = 0
    
    for vinculo in vinculos:
        paciente = vinculo.paciente
        # Verificar último registro do paciente
        ultimo_registro = RegistroOdisseia.objects.filter(paciente=paciente).order_by('-data_registro').first()
        
        inativo = False
        if ultimo_registro:
            if ultimo_registro.data_registro < sete_dias_atras:
                inativo = True
        else:
            # Nunca registrou, verificar data do vínculo
            if vinculo.data_vinculo.date() < sete_dias_atras:
                inativo = True
        
        if inativo:
            # 1. Notificar Paciente (Incentivo)
            NotificationDomainService.emit(
                target=paciente.user,
                tipo='sistema',
                titulo='Sentimos sua falta! 🌈',
                mensagem='Faz tempo que você não registra como está se sentindo na Odisseia. Que tal um novo registro?',
                link_relacionado='/odisseia/novo',
                dados_extras=NotificationDomainService._routing_payload(
                    screen='RegistrosOdisseia',
                    event='inatividade_paciente',
                ),
            )
            count_pacientes += 1
            
            # 2. Notificar Psicólogo (Alerta)
            NotificationDomainService.emit(
                target=vinculo.psicologo.user,
                tipo='sistema',
                titulo='Paciente Inativo ⚠️',
                mensagem=f'O paciente {paciente.user.first_name} não realiza registros na Odisseia há mais de 7 dias.',
                link_relacionado='/pacientes',
                dados_extras=NotificationDomainService._routing_payload(
                    screen='VinculosPacientes',
                    event='alerta_inatividade_paciente',
                    paciente_id=paciente.id
                ),
            )
            count_psicologos += 1
            
    return f"Inatividade: {count_pacientes} pacientes e {count_psicologos} psicólogos notificados."
