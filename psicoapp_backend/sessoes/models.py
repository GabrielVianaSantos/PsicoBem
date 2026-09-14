import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone
from datetime import timedelta
from authentication.models import Paciente, Psicologo
from django.core.validators import MinValueValidator
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db.models import Sum
from core.models import VinculoPacientePsicologo, NotificacaoSistema
from core.services import NotificationDomainService

#####################################################################################################################################
# MANAGERS
#####################################################################################################################################

class SessaoManager(models.Manager):
    """Manager customizado para Sessao"""

    def sessoes_hoje(self):
        """Retorna sessões de hoje"""
        hoje = timezone.now().date()
        return self.filter(data_hora__date=hoje)

    def sessoes_semana(self):
        """Retorna sessões da semana atual"""
        hoje = timezone.now().date()
        inicio_semana = hoje - timedelta(days=hoje.weekday())
        fim_semana = inicio_semana + timedelta(days=6)
        return self.filter(data_hora__date__range=[inicio_semana, fim_semana])

    def sessoes_mes(self, ano=None, mes=None):
        """Retorna sessões do mês"""
        if not ano or not mes:
            hoje = timezone.now().date()
            ano = hoje.year
            mes = hoje.month
        return self.filter(data_hora__year=ano, data_hora__month=mes)

    def pendentes_pagamento(self):
        """Retorna sessões com pagamento pendente"""
        return self.filter(status_pagamento='pendente', status='realizada')

    def por_psicologo(self, psicologo):
        """Retorna sessões de um psicólogo específico"""
        return self.filter(psicologo=psicologo)

    def por_paciente(self, paciente):
        """Retorna sessões de um paciente específico"""
        return self.filter(paciente=paciente)

#####################################################################################################################################
# CATEGORIA TIPOS SESSAO
#####################################################################################################################################

class TipoSessao(models.Model):
    """
    Modelo para tipos de sessão configuráveis pelo psicólogo
    Ex: Primeira Sessão, Urgência, Avulsa, Presencial, Pacote 4 Sessões
    """
    TIPO_CHOICES = [
        ('presencial', 'Presencial'),
        ('online', 'Online'),
    ]
    
    psicologo = models.ForeignKey(
        Psicologo, 
        on_delete=models.CASCADE,
        related_name='tipos_sessao',
        verbose_name='Psicólogo'
    )
    nome = models.CharField(
        max_length=100,
        verbose_name='Nome do Tipo de Sessão'
    )
    tipo = models.CharField(
        max_length=20,
        choices=TIPO_CHOICES,
        default='online',
        verbose_name='Categoria'
    )
    valor = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name='Valor (R$)'
    )
    duracao_minutos = models.PositiveIntegerField(
        default=50,
        verbose_name='Duração em Minutos'
    )
    descricao = models.TextField(
        blank=True,
        null=True,
        verbose_name='Descrição'
    )
    ativo = models.BooleanField(
        default=True,
        verbose_name='Ativo'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Tipo de Sessão'
        verbose_name_plural = 'Tipos de Sessão'
        ordering = ['nome']
        unique_together = ['psicologo', 'nome']
    
    def __str__(self):
        return f"{self.nome} - R$ {self.valor}"

    def delete(self, *args, **kwargs):
        """
        Custom block for deletion:
        Only allow deletion if there are no pending/scheduled sessions.
        """
        # Status que bloqueiam a exclusão
        status_pendentes = ['agendada', 'confirmada', 'remarcada']
        
        has_active_sessions = self.sessoes.filter(status__in=status_pendentes).exists()
        
        if has_active_sessions:
            raise ValidationError(
                "Não é possível excluir este tipo de sessão pois existem sessões "
                "agendadas ou confirmadas vinculadas a ele. Cancele-as primeiro."
            )
            
        # As outras sessões (realizada, cancelada, faltou) serão setadas para NULL 
        # automaticamente pelo on_delete=models.SET_NULL definido na Sessao.
        super().delete(*args, **kwargs)

class Sessao(models.Model):
    """
    Modelo para sessões terapêuticas agendadas
    """
    STATUS_CHOICES = [
        ('agendada', 'Agendada'),
        ('confirmada', 'Confirmada'),
        ('realizada', 'Realizada'),
        ('cancelada', 'Cancelada'),
        ('faltou', 'Paciente Faltou'),
        ('remarcada', 'Remarcada'),
    ]
    
    PAGAMENTO_CHOICES = [
        ('pendente', 'Pendente'),
        ('pago', 'Pago'),
        ('atrasado', 'Atrasado'),
        ('cancelado', 'Cancelado'),
    ]
    
    # Relacionamentos
    paciente = models.ForeignKey(
        Paciente,
        on_delete=models.CASCADE,
        related_name='sessoes',
        verbose_name='Paciente'
    )
    psicologo = models.ForeignKey(
        Psicologo,
        on_delete=models.CASCADE,
        related_name='sessoes',
        verbose_name='Psicólogo'
    )
    tipo_sessao = models.ForeignKey(
        TipoSessao,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sessoes',
        verbose_name='Tipo de Sessão'
    )
    
    # Informações da sessão
    data_hora = models.DateTimeField(
        verbose_name='Data e Hora'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='agendada',
        verbose_name='Status'
    )
    valor = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        verbose_name='Valor (R$)'
    )
    
    # Pagamento
    status_pagamento = models.CharField(
        max_length=20,
        choices=PAGAMENTO_CHOICES,
        default='pendente',
        verbose_name='Status do Pagamento'
    )
    data_pagamento = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name='Data do Pagamento'
    )
    
    # Observações
    observacoes_agendamento = models.TextField(
        blank=True,
        null=True,
        verbose_name='Observações do Agendamento'
    )
    observacoes_sessao = models.TextField(
        blank=True,
        null=True,
        verbose_name='Observações da Sessão'
    )

    # Sessões online (Jitsi Meet) — ver SPEC_SESSOES_ONLINE_JITSI.md.
    # Guarda-se apenas o identificador, nunca a URL: a URL é derivada em
    # tempo de leitura a partir de JITSI_BASE_URL, permitindo trocar de
    # instância do Jitsi sem migração de dados.
    sala_uuid = models.UUIDField(
        null=True,
        blank=True,
        unique=True,
        editable=False,
        verbose_name='Identificador da Sala Online'
    )

    objects = SessaoManager()

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Sessão'
        verbose_name_plural = 'Sessões'
        ordering = ['-data_hora']
        indexes = [
            models.Index(fields=['data_hora']),
            models.Index(fields=['status']),
            models.Index(fields=['status_pagamento']),
        ]
    
    def __str__(self):
        return f"{self.paciente.user.first_name} - {self.data_hora.strftime('%d/%m/%Y %H:%M')}"
    
    def save(self, *args, **kwargs):
        # Se o valor não foi definido, usar o valor do tipo de sessão
        if not self.valor:
            self.valor = self.tipo_sessao.valor
        self._sync_sala_uuid()
        super().save(*args, **kwargs)

    def _sync_sala_uuid(self):
        """
        Mantém sala_uuid coerente com a modalidade da sessão.

        - presencial (ou tipo_sessao ausente): nunca tem sala.
        - online, na criação ou ao sair de presencial: gera sala nova.
        - online, ao remarcar (data_hora mudou): regenera a sala — limita a
          janela de exposição de um link possivelmente vazado, a custo zero,
          já que a remarcação já obriga a atualizar a agenda mesmo assim.
        - online sem mudança relevante: preserva a sala já existente.
        """
        is_online = bool(self.tipo_sessao_id and self.tipo_sessao.tipo == 'online')

        if not is_online:
            self.sala_uuid = None
            return

        if not settings.JITSI_ENABLED:
            # Não gera sala nova, mas não mexe em uma já existente (ex.: a
            # flag pode voltar a ser ligada sem precisar remarcar tudo).
            return

        anterior = None
        if self.pk:
            anterior = Sessao.objects.filter(pk=self.pk).select_related('tipo_sessao').first()

        era_online = bool(anterior and anterior.tipo_sessao_id and anterior.tipo_sessao.tipo == 'online')

        if not anterior or not era_online:
            self.sala_uuid = self._gerar_sala_uuid_unica()
        elif anterior.data_hora != self.data_hora:
            self.sala_uuid = self._gerar_sala_uuid_unica()
        elif not self.sala_uuid:
            self.sala_uuid = self._gerar_sala_uuid_unica()

    @staticmethod
    def _gerar_sala_uuid_unica():
        """Gera um UUID de sala, com retry no improvável caso de colisão."""
        for _ in range(5):
            candidato = uuid.uuid4()
            if not Sessao.objects.filter(sala_uuid=candidato).exists():
                return candidato
        return uuid.uuid4()

    @property
    def sala_url(self):
        """URL completa da sala, derivada de JITSI_BASE_URL. None se não aplicável."""
        if not self.sala_uuid or not settings.JITSI_ENABLED:
            return None
        base_url = settings.JITSI_BASE_URL.rstrip('/')
        return f"{base_url}/psicobem-{self.sala_uuid.hex}"

    def _duracao_sessao_minutos(self, padrao=60):
        if self.tipo_sessao and self.tipo_sessao.duracao_minutos:
            return self.tipo_sessao.duracao_minutos
        return padrao

    @property
    def sala_disponivel_em(self):
        """Início da janela de entrada (15 min antes do horário marcado)."""
        if not self.sala_url:
            return None
        return self.data_hora - timedelta(minutes=15)

    def pode_entrar_na_sala(self):
        """
        Janela de conveniência de interface (não é controle de segurança —
        quem tem a URL entra a qualquer momento; a mitigação real é a
        regeneração da sala na remarcação).
        """
        if not self.sala_url:
            return False
        if self.status not in ('agendada', 'confirmada', 'remarcada'):
            return False

        agora = timezone.now()
        inicio = self.data_hora - timedelta(minutes=15)
        fim = self.data_hora + timedelta(minutes=self._duracao_sessao_minutos()) + timedelta(minutes=30)
        return inicio <= agora <= fim

    @property
    def duracao_formatada(self):
        """Retorna a duração formatada"""
        return f"{self.tipo_sessao.duracao_minutos} min"
    
    @property
    def valor_formatado(self):
        """Retorna o valor formatado em moeda brasileira"""
        return f"R$ {self.valor:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
    
    # Métodos adicionais
    def clean(self):
        """Validações customizadas"""
        super().clean()
        
        # Não pode agendar no passado (exceto para edição)
        if self.data_hora and self.data_hora < timezone.now():
            if not self.pk:  # Apenas para novas sessões
                raise ValidationError({
                    'data_hora': 'Não é possível agendar sessões no passado.'
                })
        
        # Verificar conflito de horários para o psicólogo
        if self.data_hora and self.psicologo:
            conflitos = Sessao.objects.filter(
                psicologo=self.psicologo,
                data_hora=self.data_hora,
                status__in=['agendada', 'confirmada']
            ).exclude(pk=self.pk)
            
            if conflitos.exists():
                raise ValidationError({
                    'data_hora': 'Psicólogo já tem uma sessão agendada neste horário.'
                })
        
        # Verificar se paciente está vinculado ao psicólogo
        if self.paciente and self.psicologo:
            vinculo_ativo = VinculoPacientePsicologo.objects.filter(
                paciente=self.paciente,
                psicologo=self.psicologo,
                status='ativo'
            ).exists()
            
            if not vinculo_ativo:
                raise ValidationError({
                    'paciente': 'Paciente deve estar vinculado ao psicólogo para agendar sessão.'
                })
    
    def pode_ser_cancelada(self):
        """Verifica se a sessão pode ser cancelada"""
        return self.status in ['agendada', 'confirmada'] and self.data_hora > timezone.now()
    
    def pode_ser_remarcada(self):
        """Verifica se a sessão pode ser remarcada"""
        return self.status in ['agendada', 'confirmada', 'remarcada']
    
    def pode_ser_realizada(self):
        """Verifica se a sessão pode ser marcada como realizada"""
        return self.status in ['agendada', 'confirmada', 'remarcada']

    def pode_ser_marcada_falta(self):
        """Verifica se a sessão pode ser marcada como 'Paciente Faltou'"""
        return self.status in ['agendada', 'confirmada', 'remarcada']
    
    def confirmar_pagamento(self):
        """Confirma o pagamento da sessão"""
        if self.status == 'realizada' and self.status_pagamento == 'pendente':
            self.status_pagamento = 'pago'
            self.data_pagamento = timezone.now()
            self.save()

            # Notificar paciente via emit() para disparar push nativo
            data = timezone.localtime(self.data_hora).strftime("%d/%m/%Y")
            NotificationDomainService.emit(
                target=self.paciente.user,
                tipo='sistema',
                titulo='Pagamento Confirmado ✅',
                mensagem=f'Pagamento da sessão de {data} foi confirmado.',
                link_relacionado=f'/sessoes/{self.pk}',
                dados_extras=NotificationDomainService._routing_payload(
                    screen='DetalhesSessao',
                    params={'id': self.pk},
                    event='pagamento_confirmado',
                    session_id=self.pk,
                ),
            )
    
    @classmethod
    def estatisticas_psicologo(cls, psicologo, ano=None, mes=None):
        """Retorna estatísticas de sessões do psicólogo com filtros opcionais"""
        queryset = cls.objects.filter(psicologo=psicologo)
        
        if ano:
            queryset = queryset.filter(data_hora__year=ano)
        if mes:
            queryset = queryset.filter(data_hora__month=mes)
        
        # Pagamentos pendentes: 
        # 1. Sessões REALIZADAS que ainda não foram pagas.
        # 2. Sessões AGENDADAS/CONFIRMADAS (pois o psicólogo quer ver o que 'tem a receber').
        # O usuário relatou que os valores não aparecem, vamos garantir que buscamos pendentes de qualquer status ativo.
        pendentes_qs = queryset.filter(status_pagamento='pendente').exclude(status='cancelada')

        return {
            'total_sessoes': queryset.count(),
            'sessoes_realizadas': queryset.filter(status='realizada').count(),
            'sessoes_canceladas': queryset.filter(status='cancelada').count(),
            'receita_total': queryset.filter(
                status='realizada', 
                status_pagamento='pago'
            ).aggregate(Sum('valor'))['valor__sum'] or 0,
            'pagamentos_pendentes': pendentes_qs.aggregate(Sum('valor'))['valor__sum'] or 0
        }

##################################################################################################################################### 
