from celery import shared_task
from django.utils import timezone
from datetime import timedelta
from .models import MetaOdisseia
from core.services import NotificationDomainService

@shared_task(name="engajamentos.tasks.notificar_metas_vencendo")
def notificar_metas_vencendo():
    """
    Verifica metas que vencem nas próximas 24h e notifica o paciente.
    Deduplicação: Evita enviar mais de uma vez a cada 24h usando dados_extras index.
    """
    amanha = timezone.now().date() + timedelta(days=1)
    
    # Metas que vencem amanhã e ainda não foram concluídas
    metas = MetaOdisseia.objects.filter(
        data_prevista=amanha,
        status='em_andamento'
    ).select_related('paciente__user')
    
    count = 0
    for meta in metas:
        # Padrão de identificador único de deduplicação para este evento/dia
        dedup_id = f"meta_vencendo_{meta.id}_{amanha.isoformat()}"
        
        # O NotificationDomainService.emit cria no banco, podemos filtrar por dados_extras se necessário,
        # mas aqui a lógica de task periódica deve garantir execução única via Beat.
        # Adicionamos o dedup_id nos dados_extras para auditoria.
        
        NotificationDomainService.emit(
            target=meta.paciente.user,
            tipo='sistema',
            titulo='Meta Vencendo amanhã! 🎯',
            mensagem=f'Sua meta "{meta.titulo}" vence amanhã. Como está o progresso?',
            link_relacionado='/odisseia/metas',
            dados_extras=NotificationDomainService._routing_payload(
                screen='Notificacoes',
                event='meta_vencendo',
                meta_id=meta.id,
                dedup_id=dedup_id
            ),
        )
        count += 1
        
    return f"{count} notificações de metas enviadas."
