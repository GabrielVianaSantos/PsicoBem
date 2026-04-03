from django.db import models
from django.utils import timezone
from datetime import timedelta
from authentication.models import Paciente, Psicologo
from django.core.validators import MinValueValidator
from decimal import Decimal
from django.core.exceptions import ValidationError
from django.db.models import Sum
from core.models import VinculoPacientePsicologo, NotificacaoSistema

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
        ('primeira', 'Primeira Sessão'),
        ('urgencia', 'Urgência'),
        ('avulsa', 'Avulsa'),
        ('presencial', 'Presencial'),
        ('pacote', 'Pacote'),
        ('online', 'Online'),
        ('retorno', 'Retorno'),
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
        default='avulsa',
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
        super().save(*args, **kwargs)
    
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
    
    def confirmar_pagamento(self):
        """Confirma o pagamento da sessão"""
        if self.status == 'realizada' and self.status_pagamento == 'pendente':
            self.status_pagamento = 'pago'
            self.data_pagamento = timezone.now()
            self.save()
            
            # Criar notificação
            NotificacaoSistema.objects.create(
                paciente=self.paciente,
                tipo='sistema',
                titulo='Pagamento Confirmado',
                mensagem=f'Pagamento da sessão de {self.data_hora.strftime("%d/%m/%Y")} foi confirmado.'
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
