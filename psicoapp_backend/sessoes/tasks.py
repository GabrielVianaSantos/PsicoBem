from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import Sessao
from core.services import NotificationDomainService

@shared_task(name="sessoes.tasks.notificar_pagamentos_atrasados")
def notificar_pagamentos_atrasados():
    """
    Notifica pacientes com sessões realizadas e pagamento pendente há mais de 48h.
    Execução diária via Beat.
    """
    limite = timezone.now() - timedelta(hours=48)
    
    # Sessões realizadas, pendentes e antigas
    sessoes_atrasadas = Sessao.objects.filter(
        status='realizada',
        status_pagamento='pendente',
        data_hora__lte=limite
    ).select_related('paciente__user')
    
    count = 0
    for sessao in sessoes_atrasadas:
        # Nota: Idealmente aqui poderíamos checar no banco de notificações 
        # se já enviamos um lembrete hoje para esta sessão específica 
        # para evitar múltiplos lembretes se a task rodar mais de uma vez.
        
        NotificationDomainService.emit(
            target=sessao.paciente.user,
            tipo='sistema',
            titulo='Lembrete de Pagamento 💳',
            mensagem=f'Notamos que o pagamento da sua sessão de {sessao.data_hora.strftime("%d/%m/%Y")} ainda está pendente.',
            link_relacionado=f'/sessoes/{sessao.pk}',
            dados_extras=NotificationDomainService._routing_payload(
                screen='DetalhesSessao',
                params={'id': sessao.pk},
                event='pagamento_atrasado',
                session_id=sessao.pk
            ),
        )
        count += 1
        
    return f"{count} lembretes de pagamento enviados."
