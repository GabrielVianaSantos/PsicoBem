from django.db import models
from django.core.validators import MinValueValidator
from decimal import Decimal
from authentication.models import Paciente, Psicologo
from django.utils import timezone
from datetime import datetime, date, timedelta
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.db.models import Q, Sum, Count, Avg
import uuid

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
        on_delete=models.PROTECT,
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
        return self.status in ['agendada', 'confirmada']
    
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
        """Retorna estatísticas de sessões do psicólogo"""
        queryset = cls.objects.filter(psicologo=psicologo)
        
        if ano and mes:
            queryset = queryset.filter(data_hora__year=ano, data_hora__month=mes)
        
        return {
            'total_sessoes': queryset.count(),
            'sessoes_realizadas': queryset.filter(status='realizada').count(),
            'sessoes_canceladas': queryset.filter(status='cancelada').count(),
            'receita_total': queryset.filter(
                status='realizada', 
                status_pagamento='pago'
            ).aggregate(Sum('valor'))['valor__sum'] or 0,
            'pagamentos_pendentes': queryset.filter(
                status='realizada',
                status_pagamento='pendente'
            ).aggregate(Sum('valor'))['valor__sum'] or 0
        }

##################################################################################################################################### 
# CATEGORIA MENSAGEM SEMENTES DO CUIDADO
#####################################################################################################################################

class SementeCuidadoManager(models.Manager):
    """Manager customizado para SementeCuidado"""
    
    def ativas(self):
        """Retorna apenas sementes ativas"""
        return self.filter(status='ativa')
    
    def publicas(self):
        """Retorna sementes públicas"""
        return self.filter(publica=True, status='ativa')
    
    def programadas_para_hoje(self):
        """Retorna sementes programadas para hoje"""
        hoje = timezone.now().date()
        return self.filter(
            status='programada',
            data_programada__date=hoje
        )
    
    def por_psicologo(self, psicologo):
        """Retorna sementes de um psicólogo específico"""
        return self.filter(psicologo=psicologo)

class CategoriaMensagem(models.Model):
    """
    Categorias para as mensagens motivacionais
    Ex: Motivação, Relaxamento, Reflexão, Exercícios, Dicas
    """
    ICONE_CHOICES = [
        ('heart', 'Coração'),
        ('star', 'Estrela'),
        ('leaf', 'Folha'),
        ('sun', 'Sol'),
        ('moon', 'Lua'),
        ('flower', 'Flor'),
        ('butterfly', 'Borboleta'),
        ('rainbow', 'Arco-íris'),
        ('peace', 'Paz'),
        ('smile', 'Sorriso'),
    ]
    
    COR_CHOICES = [
        ('#11B5A4', 'Verde Principal'),
        ('#4F9785', 'Verde Escuro'),
        ('#89D4CE', 'Verde Claro'),
        ('#FFB74D', 'Laranja'),
        ('#64B5F6', 'Azul'),
        ('#BA68C8', 'Roxo'),
        ('#FF8A65', 'Coral'),
        ('#A5D6A7', 'Verde Suave'),
        ('#FFCC80', 'Amarelo Suave'),
        ('#F8BBD9', 'Rosa'),
    ]
    
    psicologo = models.ForeignKey(
        Psicologo,
        on_delete=models.CASCADE,
        related_name='categorias_mensagem',
        verbose_name='Psicólogo'
    )
    nome = models.CharField(
        max_length=50,
        verbose_name='Nome da Categoria'
    )
    descricao = models.TextField(
        blank=True,
        null=True,
        verbose_name='Descrição'
    )
    icone = models.CharField(
        max_length=20,
        choices=ICONE_CHOICES,
        default='heart',
        verbose_name='Ícone'
    )
    cor = models.CharField(
        max_length=7,
        choices=COR_CHOICES,
        default='#11B5A4',
        verbose_name='Cor'
    )
    ativa = models.BooleanField(
        default=True,
        verbose_name='Ativa'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Categoria de Mensagem'
        verbose_name_plural = 'Categorias de Mensagem'
        ordering = ['nome']
        unique_together = ['psicologo', 'nome']
    
    def __str__(self):
        return f"{self.nome} ({self.psicologo.user.first_name})"

class SementeCuidado(models.Model):
    """
    Modelo para as mensagens motivacionais (Sementes do Cuidado)
    """
    TIPO_CHOICES = [
        ('motivacional', 'Motivacional'),
        ('reflexao', 'Reflexão'),
        ('exercicio', 'Exercício'),
        ('dica', 'Dica'),
        ('lembrete', 'Lembrete'),
        ('gratidao', 'Gratidão'),
        ('mindfulness', 'Mindfulness'),
        ('autoestima', 'Autoestima'),
        ('respiracao', 'Respiração'),
        ('meditacao', 'Meditação'),
    ]
    
    STATUS_CHOICES = [
        ('rascunho', 'Rascunho'),
        ('ativa', 'Ativa'),
        ('programada', 'Programada'),
        ('pausada', 'Pausada'),
        ('arquivada', 'Arquivada'),
    ]
    
    # Relacionamentos
    psicologo = models.ForeignKey(
        Psicologo,
        on_delete=models.CASCADE,
        related_name='sementes_cuidado',
        verbose_name='Psicólogo'
    )
    categoria = models.ForeignKey(
        CategoriaMensagem,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='mensagens',
        verbose_name='Categoria'
    )
    
    # Conteúdo da mensagem
    titulo = models.CharField(
        max_length=100,
        verbose_name='Título'
    )
    conteudo = models.TextField(
        verbose_name='Conteúdo da Mensagem'
    )
    tipo = models.CharField(
        max_length=20,
        choices=TIPO_CHOICES,
        default='motivacional',
        verbose_name='Tipo'
    )
    
    # Configurações de envio
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='ativa',
        verbose_name='Status'
    )
    publica = models.BooleanField(
        default=False,
        verbose_name='Mensagem Pública',
        help_text='Se marcado, todos os pacientes receberão esta mensagem'
    )
    
    # Programação (opcional)
    data_programada = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name='Data Programada para Envio'
    )
    recorrente = models.BooleanField(
        default=False,
        verbose_name='Mensagem Recorrente'
    )
    
    # Estatísticas
    total_visualizacoes = models.PositiveIntegerField(
        default=0,
        verbose_name='Total de Visualizações'
    )
    total_curtidas = models.PositiveIntegerField(
        default=0,
        verbose_name='Total de Curtidas'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = SementeCuidadoManager()
    
    class Meta:
        verbose_name = 'Semente do Cuidado'
        verbose_name_plural = 'Sementes do Cuidado'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['tipo']),
            models.Index(fields=['data_programada']),
        ]
    
    def __str__(self):
        return f"{self.titulo} - {self.psicologo.user.first_name}"
    
    @property
    def preview_conteudo(self):
        """Retorna uma prévia do conteúdo (primeiros 100 caracteres)"""
        if len(self.conteudo) > 100:
            return f"{self.conteudo[:100]}..."
        return self.conteudo
    
    @property
    def deve_ser_enviada(self):
        """Verifica se a mensagem deve ser enviada agora"""
        if self.status != 'programada':
            return False
        if self.data_programada and self.data_programada <= timezone.now():
            return True
        return False
    
    def enviar_para_pacientes(self, pacientes=None):
        """Envia semente para pacientes específicos ou todos vinculados"""
        if not pacientes:
            # Buscar todos os pacientes vinculados ao psicólogo
            vinculos = VinculoPacientePsicologo.objects.filter(
                psicologo=self.psicologo,
                status='ativo'
            )
            pacientes = [v.paciente for v in vinculos]
        
        envios_criados = []
        for paciente in pacientes:
            envio, created = MensagemPaciente.objects.get_or_create(
                semente=self,
                paciente=paciente,
                defaults={'status': 'enviada'}
            )
            
            if created:
                envios_criados.append(envio)
                
                # Criar notificação
                NotificacaoSistema.objects.create(
                    paciente=paciente,
                    tipo='nova_semente',
                    titulo='Nova Semente do Cuidado',
                    mensagem=f'Você recebeu uma nova mensagem: "{self.titulo}"',
                    link_relacionado=f'/sementes/{self.pk}'
                )
        
        return envios_criados
    
    def agendar_envio(self, data_envio, pacientes=None):
        """Agenda envio da semente para uma data específica"""
        self.data_programada = data_envio
        self.status = 'programada'
        self.save()
        
        # Aqui você pode implementar uma task para Celery ou similar
        # para processar envios programados
    
    @classmethod
    def estatisticas_psicologo(cls, psicologo):
        """Retorna estatísticas das sementes do psicólogo"""
        sementes = cls.objects.filter(psicologo=psicologo)
        
        return {
            'total_sementes': sementes.count(),
            'sementes_ativas': sementes.filter(status='ativa').count(),
            'total_visualizacoes': sementes.aggregate(
                Sum('total_visualizacoes')
            )['total_visualizacoes__sum'] or 0,
            'total_curtidas': sementes.aggregate(
                Sum('total_curtidas')
            )['total_curtidas__sum'] or 0,
            'semente_mais_vista': sementes.order_by('-total_visualizacoes').first(),
            'semente_mais_curtida': sementes.order_by('-total_curtidas').first()
        }

class MensagemPaciente(models.Model):
    """
    Relacionamento entre mensagens e pacientes - controla quem recebeu o quê
    """
    STATUS_CHOICES = [
        ('enviada', 'Enviada'),
        ('visualizada', 'Visualizada'),
        ('curtida', 'Curtida'),
        ('arquivada', 'Arquivada'),
    ]
    
    # Relacionamentos
    semente = models.ForeignKey(
        SementeCuidado,
        on_delete=models.CASCADE,
        related_name='envios',
        verbose_name='Semente do Cuidado'
    )
    paciente = models.ForeignKey(
        Paciente,
        on_delete=models.CASCADE,
        related_name='mensagens_recebidas',
        verbose_name='Paciente'
    )
    
    # Status do envio
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='enviada',
        verbose_name='Status'
    )
    
    # Timestamps
    enviada_em = models.DateTimeField(auto_now_add=True)
    visualizada_em = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name='Visualizada em'
    )
    curtida_em = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name='Curtida em'
    )
    
    # Feedback do paciente (opcional)
    feedback = models.TextField(
        blank=True,
        null=True,
        verbose_name='Feedback do Paciente'
    )
    avaliacao = models.PositiveSmallIntegerField(
        blank=True,
        null=True,
        verbose_name='Avaliação (1-5)',
        help_text='Avaliação de 1 a 5 estrelas'
    )
    
    class Meta:
        verbose_name = 'Mensagem do Paciente'
        verbose_name_plural = 'Mensagens dos Pacientes'
        ordering = ['-enviada_em']
        unique_together = ['semente', 'paciente']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['enviada_em']),
        ]
    
    def __str__(self):
        return f"{self.semente.titulo} → {self.paciente.user.first_name}"
    
    def marcar_como_visualizada(self):
        """Marca a mensagem como visualizada"""
        if self.status == 'enviada':
            self.status = 'visualizada'
            self.visualizada_em = timezone.now()
            self.save()
            
            # Atualizar estatísticas da semente
            self.semente.total_visualizacoes += 1
            self.semente.save()
    
    def marcar_como_curtida(self):
        """Marca a mensagem como curtida"""
        if self.status in ['enviada', 'visualizada']:
            self.status = 'curtida'
            self.curtida_em = timezone.now()
            if not self.visualizada_em:
                self.visualizada_em = timezone.now()
            self.save()
            
            # Atualizar estatísticas da semente
            if not self.visualizada_em:
                self.semente.total_visualizacoes += 1
            self.semente.total_curtidas += 1
            self.semente.save()

#####################################################################################################
# MODELO REGISTROS ODISSEIA
#####################################################################################################

class RegistroOdisseiaManager(models.Manager):
    """Manager customizado para RegistroOdisseia"""
    
    def compartilhados(self):
        """Retorna apenas registros compartilhados com psicólogo"""
        return self.filter(compartilhar_psicologo=True, privado=False)
    
    def por_periodo(self, data_inicio, data_fim):
        """Retorna registros de um período específico"""
        return self.filter(data_registro__range=[data_inicio, data_fim])
    
    def por_humor(self, humor):
        """Retorna registros por humor específico"""
        return self.filter(humor_geral=humor)
    
    def estatisticas_paciente(self, paciente, data_inicio=None, data_fim=None):
        """Retorna estatísticas de um paciente"""
        queryset = self.filter(paciente=paciente)
        
        if data_inicio and data_fim:
            queryset = queryset.filter(data_registro__range=[data_inicio, data_fim])
        
        return queryset.aggregate(
            total_registros=Count('id'),
            nivel_ansiedade_medio=Avg('nivel_ansiedade'),
            nivel_estresse_medio=Avg('nivel_estresse'),
            nivel_energia_medio=Avg('nivel_energia')
        )

class CategoriaOdisseia(models.Model):
    """
    Categorias para classificar os registros de odisseia
    Ex: Ansiedade, Depressão, Alegria, Conquistas, Desafios
    """
    ICONE_CHOICES = [
        ('happy', 'Feliz'),
        ('sad', 'Triste'),
        ('angry', 'Bravo'),
        ('anxious', 'Ansioso'),
        ('calm', 'Calmo'),
        ('excited', 'Animado'),
        ('confused', 'Confuso'),
        ('grateful', 'Grato'),
        ('hopeful', 'Esperançoso'),
        ('frustrated', 'Frustrado'),
    ]
    
    COR_CHOICES = [
        ('#FFD700', 'Dourado - Alegria'),
        ('#FF6B6B', 'Vermelho - Raiva'),
        ('#4ECDC4', 'Azul Claro - Calma'),
        ('#45B7D1', 'Azul - Tristeza'),
        ('#96CEB4', 'Verde - Esperança'),
        ('#FFEAA7', 'Amarelo - Ansiedade'),
        ('#DDA0DD', 'Roxo - Reflexão'),
        ('#F0A3FF', 'Rosa - Amor'),
        ('#FFA07A', 'Salmão - Gratidão'),
        ('#98D8C8', 'Verde Água - Paz'),
    ]
    
    nome = models.CharField(
        max_length=50,
        verbose_name='Nome da Categoria'
    )
    descricao = models.TextField(
        blank=True,
        null=True,
        verbose_name='Descrição'
    )
    icone = models.CharField(
        max_length=20,
        choices=ICONE_CHOICES,
        default='happy',
        verbose_name='Ícone'
    )
    cor = models.CharField(
        max_length=7,
        choices=COR_CHOICES,
        default='#FFD700',
        verbose_name='Cor'
    )
    ativa = models.BooleanField(
        default=True,
        verbose_name='Ativa'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Categoria de Odisseia'
        verbose_name_plural = 'Categorias de Odisseia'
        ordering = ['nome']
    
    def __str__(self):
        return self.nome

class RegistroOdisseia(models.Model):
    """
    Modelo para os registros emocionais dos pacientes
    """
    INTENSIDADE_CHOICES = [
        (1, 'Muito Baixa'),
        (2, 'Baixa'),
        (3, 'Moderada'),
        (4, 'Alta'),
        (5, 'Muito Alta'),
    ]
    
    HUMOR_CHOICES = [
        ('muito_triste', 'Muito Triste 😢'),
        ('triste', 'Triste 😔'),
        ('neutro', 'Neutro 😐'),
        ('feliz', 'Feliz 🙂'),
        ('muito_feliz', 'Muito Feliz 😄'),
    ]
    
    # Relacionamentos
    paciente = models.ForeignKey(
        Paciente,
        on_delete=models.CASCADE,
        related_name='registros_odisseia',
        verbose_name='Paciente'
    )
    categoria = models.ForeignKey(
        CategoriaOdisseia,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='registros',
        verbose_name='Categoria'
    )
    
    # Informações temporais
    data_registro = models.DateField(
        verbose_name='Data do Registro'
    )
    hora_registro = models.TimeField(
        verbose_name='Hora do Registro'
    )
    
    # Situação e contexto
    situacao = models.TextField(
        verbose_name='Situação',
        help_text='Descreva o que estava acontecendo'
    )
    local = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name='Local',
        help_text='Onde você estava?'
    )
    
    # Estado emocional
    humor_geral = models.CharField(
        max_length=20,
        choices=HUMOR_CHOICES,
        default='neutro',
        verbose_name='Humor Geral'
    )
    intensidade_emocao = models.PositiveSmallIntegerField(
        choices=INTENSIDADE_CHOICES,
        default=3,
        verbose_name='Intensidade da Emoção'
    )
    
    # Pensamentos e reflexões
    pensamentos = models.TextField(
        verbose_name='Pensamentos',
        help_text='O que passou pela sua cabeça?'
    )
    pensamentos_automaticos = models.TextField(
        blank=True,
        null=True,
        verbose_name='Pensamentos Automáticos',
        help_text='Pensamentos que surgiram automaticamente'
    )
    
    # Reações físicas e comportamentais
    reacoes_fisicas = models.TextField(
        blank=True,
        null=True,
        verbose_name='Reações Físicas',
        help_text='Como seu corpo reagiu? (tensão, respiração, etc.)'
    )
    comportamento = models.TextField(
        blank=True,
        null=True,
        verbose_name='Comportamento',
        help_text='Como você agiu nesta situação?'
    )
    
    # Avaliações e insights
    gatilhos = models.TextField(
        blank=True,
        null=True,
        verbose_name='Gatilhos Identificados',
        help_text='O que pode ter desencadeado essas emoções?'
    )
    estrategias_enfrentamento = models.TextField(
        blank=True,
        null=True,
        verbose_name='Estratégias de Enfrentamento',
        help_text='O que você fez para lidar com a situação?'
    )
    aprendizados = models.TextField(
        blank=True,
        null=True,
        verbose_name='Aprendizados',
        help_text='O que você aprendeu com esta experiência?'
    )
    
    # Escalas de avaliação
    nivel_ansiedade = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(10)],
        default=0,
        verbose_name='Nível de Ansiedade (0-10)'
    )
    nivel_estresse = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(10)],
        default=0,
        verbose_name='Nível de Estresse (0-10)'
    )
    nivel_energia = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(10)],
        default=5,
        verbose_name='Nível de Energia (0-10)'
    )
    
    # Observações adicionais
    observacoes_adicionais = models.TextField(
        blank=True,
        null=True,
        verbose_name='Observações Adicionais'
    )
    
    # Flags de acompanhamento
    compartilhar_psicologo = models.BooleanField(
        default=True,
        verbose_name='Compartilhar com Psicólogo',
        help_text='Permitir que o psicólogo veja este registro'
    )
    privado = models.BooleanField(
        default=False,
        verbose_name='Registro Privado',
        help_text='Registro apenas para reflexão pessoal'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    objects = RegistroOdisseiaManager()

    class Meta:
        verbose_name = 'Registro de Odisseia'
        verbose_name_plural = 'Registros de Odisseia'
        ordering = ['-data_registro', '-hora_registro']
        indexes = [
            models.Index(fields=['data_registro']),
            models.Index(fields=['humor_geral']),
            models.Index(fields=['intensidade_emocao']),
        ]
        unique_together = ['paciente', 'data_registro', 'hora_registro']
    
    def __str__(self):
        return f"{self.paciente.user.first_name} - {self.data_registro.strftime('%d/%m/%Y')} - {self.get_humor_geral_display()}"
    
    @property
    def data_hora_completa(self):
        """Retorna data e hora formatadas"""
        from datetime import datetime, time
        dt = datetime.combine(self.data_registro, self.hora_registro)
        return dt.strftime('%d/%m/%Y às %H:%M')
    
    @property
    def resumo_situacao(self):
        """Retorna um resumo da situação (primeiros 100 caracteres)"""
        if len(self.situacao) > 100:
            return f"{self.situacao[:100]}..."
        return self.situacao
    
    @property
    def media_niveis(self):
        """Calcula a média dos níveis de ansiedade, estresse e energia"""
        return round((self.nivel_ansiedade + self.nivel_estresse + (10 - self.nivel_energia)) / 3, 1)
    
    def get_emoji_humor(self):
        """Retorna o emoji correspondente ao humor"""
        emojis = {
            'muito_triste': '😢',
            'triste': '😔',
            'neutro': '😐',
            'feliz': '🙂',
            'muito_feliz': '😄'
        }
        return emojis.get(self.humor_geral, '😐')
    
    def clean(self):
        """Validações customizadas"""
        super().clean()
        
        # Validar que data não é no futuro
        if self.data_registro > date.today():
            raise ValidationError({
                'data_registro': 'Data do registro não pode ser no futuro.'
            })
        
        # Validar níveis (0-10)
        for campo in ['nivel_ansiedade', 'nivel_estresse', 'nivel_energia']:
            valor = getattr(self, campo)
            if valor < 0 or valor > 10:
                raise ValidationError({
                    campo: 'Nível deve estar entre 0 e 10.'
                })
    
    def gerar_insights(self):
        """Gera insights baseados no registro"""
        insights = []
        
        # Insights sobre ansiedade
        if self.nivel_ansiedade >= 8:
            insights.append("Nível de ansiedade muito alto. Considere técnicas de respiração.")
        elif self.nivel_ansiedade <= 2:
            insights.append("Excelente controle da ansiedade!")
        
        # Insights sobre energia
        if self.nivel_energia <= 3:
            insights.append("Energia baixa. Que tal uma caminhada ou exercício leve?")
        elif self.nivel_energia >= 8:
            insights.append("Ótimo nível de energia! Aproveite para atividades produtivas.")
        
        # Insights sobre padrões
        registros_recentes = RegistroOdisseia.objects.filter(
            paciente=self.paciente,
            data_registro__gte=self.data_registro - timedelta(days=7)
        ).exclude(pk=self.pk)
        
        if registros_recentes.count() >= 3:
            ansiedade_media = registros_recentes.aggregate(
                Avg('nivel_ansiedade')
            )['nivel_ansiedade__avg']
            
            if ansiedade_media and self.nivel_ansiedade > ansiedade_media + 2:
                insights.append("Ansiedade acima da média da semana. Observe os gatilhos.")
        
        return insights
    
    @classmethod
    def relatorio_evolucao(cls, paciente, periodo_dias=30):
        """Gera relatório de evolução do paciente"""
        data_inicio = date.today() - timedelta(days=periodo_dias)
        registros = cls.objects.filter(
            paciente=paciente,
            data_registro__gte=data_inicio,
            compartilhar_psicologo=True
        ).order_by('data_registro')
        
        if not registros.exists():
            return None
        
        primeiro = registros.first()
        ultimo = registros.last()
        
        return {
            'periodo': f"{primeiro.data_registro} a {ultimo.data_registro}",
            'total_registros': registros.count(),
            'evolucao_ansiedade': ultimo.nivel_ansiedade - primeiro.nivel_ansiedade,
            'evolucao_estresse': ultimo.nivel_estresse - primeiro.nivel_estresse,
            'evolucao_energia': ultimo.nivel_energia - primeiro.nivel_energia,
            'humor_predominante': registros.values('humor_geral').annotate(
                count=Count('humor_geral')
            ).order_by('-count').first(),
            'insights': ultimo.gerar_insights()
        }

class ComentarioPsicologo(models.Model):
    """
    Modelo para comentários do psicólogo nos registros de odisseia
    """
    registro = models.ForeignKey(
        RegistroOdisseia,
        on_delete=models.CASCADE,
        related_name='comentarios_psicologo',
        verbose_name='Registro'
    )
    psicologo = models.ForeignKey(
        Psicologo,
        on_delete=models.CASCADE,
        related_name='comentarios_registros',
        verbose_name='Psicólogo'
    )
    
    # Conteúdo do comentário
    comentario = models.TextField(
        verbose_name='Comentário'
    )
    tipo_comentario = models.CharField(
        max_length=20,
        choices=[
            ('observacao', 'Observação'),
            ('orientacao', 'Orientação'),
            ('reflexao', 'Reflexão'),
            ('elogio', 'Elogio'),
            ('sugestao', 'Sugestão'),
        ],
        default='observacao',
        verbose_name='Tipo de Comentário'
    )
    
    # Flags
    importante = models.BooleanField(
        default=False,
        verbose_name='Comentário Importante'
    )
    lido_paciente = models.BooleanField(
        default=False,
        verbose_name='Lido pelo Paciente'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Comentário do Psicólogo'
        verbose_name_plural = 'Comentários do Psicólogo'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Comentário de {self.psicologo.user.first_name} em {self.registro}"

class MetaOdisseia(models.Model):
    """
    Modelo para metas e objetivos dos pacientes
    """
    STATUS_CHOICES = [
        ('em_andamento', 'Em Andamento'),
        ('concluida', 'Concluída'),
        ('pausada', 'Pausada'),
        ('cancelada', 'Cancelada'),
    ]
    
    paciente = models.ForeignKey(
        Paciente,
        on_delete=models.CASCADE,
        related_name='metas_odisseia',
        verbose_name='Paciente'
    )
    
    # Informações da meta
    titulo = models.CharField(
        max_length=100,
        verbose_name='Título da Meta'
    )
    descricao = models.TextField(
        verbose_name='Descrição da Meta'
    )
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='em_andamento',
        verbose_name='Status'
    )
    
    # Datas
    data_criacao = models.DateField(auto_now_add=True)
    data_prevista = models.DateField(
        verbose_name='Data Prevista para Conclusão'
    )
    data_conclusao = models.DateField(
        blank=True,
        null=True,
        verbose_name='Data de Conclusão'
    )
    
    # Acompanhamento
    progresso = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        default=0,
        verbose_name='Progresso (%)'
    )
    observacoes_progresso = models.TextField(
        blank=True,
        null=True,
        verbose_name='Observações sobre o Progresso'
    )
    
    class Meta:
        verbose_name = 'Meta de Odisseia'
        verbose_name_plural = 'Metas de Odisseia'
        ordering = ['-data_criacao']
    
    def __str__(self):
        return f"{self.titulo} - {self.paciente.user.first_name}"
    
    @property
    def dias_para_conclusao(self):
        """Calcula quantos dias faltam para a data prevista"""
        from datetime import date
        if self.status == 'concluida':
            return 0
        diferenca = self.data_prevista - date.today()
        return diferenca.days
    
    @property
    def status_prazo(self):
        """Retorna se a meta está no prazo, atrasada ou concluída"""
        dias = self.dias_para_conclusao
        if self.status == 'concluida':
            return 'concluida'
        elif dias < 0:
            return 'atrasada'
        elif dias <= 7:
            return 'urgente'
        else:
            return 'no_prazo'
        
#######################################################################################################
# VINCULO PACIENTE PSICOLOGO
#######################################################################################################

class VinculoPacientePsicologo(models.Model):
    """
    Modelo para relacionamento many-to-many personalizado entre paciente e psicólogo
    Um paciente pode ter vários psicólogos ao longo do tempo, mas apenas um ativo
    """
    STATUS_CHOICES = [
        ('ativo', 'Ativo'),
        ('inativo', 'Inativo'),
        ('suspenso', 'Suspenso'),
        ('finalizado', 'Finalizado'),
    ]
    
    # Relacionamentos
    paciente = models.ForeignKey(
        Paciente,
        on_delete=models.CASCADE,
        related_name='vinculos_psicologo',
        verbose_name='Paciente'
    )
    psicologo = models.ForeignKey(
        Psicologo,
        on_delete=models.CASCADE,
        related_name='vinculos_paciente',
        verbose_name='Psicólogo'
    )
    
    # Informações do vínculo
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default='ativo',
        verbose_name='Status'
    )
    data_vinculo = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Data do Vínculo'
    )
    data_inicio_tratamento = models.DateField(
        default=date.today,
        verbose_name='Data de Início do Tratamento'
    )
    data_fim_tratamento = models.DateField(
        blank=True,
        null=True,
        verbose_name='Data de Fim do Tratamento'
    )
    
    # Informações adicionais
    motivo_vinculo = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name='Motivo do Vínculo',
        help_text='Ex: Busca via CRP, Indicação, etc.'
    )
    observacoes = models.TextField(
        blank=True,
        null=True,
        verbose_name='Observações'
    )
    
    # Configurações
    permite_visualizar_registros = models.BooleanField(
        default=True,
        verbose_name='Permite Visualizar Registros de Odisseia'
    )
    permite_comentarios = models.BooleanField(
        default=True,
        verbose_name='Permite Comentários do Psicólogo'
    )
    permite_metas = models.BooleanField(
        default=True,
        verbose_name='Permite Criar Metas'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Vínculo Paciente-Psicólogo'
        verbose_name_plural = 'Vínculos Paciente-Psicólogo'
        ordering = ['-data_vinculo']
        constraints = [
            # Um paciente só pode ter um vínculo ativo por vez com cada psicólogo
            models.UniqueConstraint(
                fields=['paciente', 'psicologo'],
                condition=Q(status='ativo'),
                name='unique_vinculo_ativo_paciente_psicologo'
            )
        ]
        indexes = [
            models.Index(fields=['status', 'data_vinculo']),
            models.Index(fields=['paciente', 'status']),
            models.Index(fields=['psicologo', 'status']),
        ]
    
    def __str__(self):
        return f"{self.paciente.user.first_name} ↔ {self.psicologo.user.first_name} ({self.get_status_display()})"
    
    def clean(self):
        """Validações customizadas"""
        # Verificar se as datas são coerentes
        if self.data_fim_tratamento and self.data_inicio_tratamento:
            if self.data_fim_tratamento < self.data_inicio_tratamento:
                raise ValidationError({
                    'data_fim_tratamento': 'Data de fim não pode ser anterior à data de início.'
                })
        
        # Se status é finalizado, deve ter data de fim
        if self.status == 'finalizado' and not self.data_fim_tratamento:
            raise ValidationError({
                'data_fim_tratamento': 'Data de fim é obrigatória quando status é "Finalizado".'
            })
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
    
    @property
    def duracao_tratamento(self):
        """Calcula duração do tratamento em dias"""
        fim = self.data_fim_tratamento or date.today()
        return (fim - self.data_inicio_tratamento).days
    
    @property
    def status_badge_color(self):
        """Retorna cor para badges de status"""
        colors = {
            'ativo': '#4CAF50',
            'inativo': '#FFC107',
            'suspenso': '#FF9800',
            'finalizado': '#9E9E9E'
        }
        return colors.get(self.status, '#9E9E9E')

class NotificacaoSistema(models.Model):
    """
    Sistema de notificações para pacientes e psicólogos
    """
    TIPO_CHOICES = [
        ('sessao_agendada', 'Sessão Agendada'),
        ('sessao_cancelada', 'Sessão Cancelada'),
        ('sessao_lembrete', 'Lembrete de Sessão'),
        ('nova_semente', 'Nova Semente do Cuidado'),
        ('novo_registro', 'Novo Registro de Odisseia'),
        ('comentario_psicologo', 'Comentário do Psicólogo'),
        ('meta_vencendo', 'Meta Próxima do Vencimento'),
        ('pagamento_pendente', 'Pagamento Pendente'),
        ('sistema', 'Notificação do Sistema'),
    ]
    
    # Relacionamentos (pode ser para paciente OU psicólogo)
    paciente = models.ForeignKey(
        Paciente,
        on_delete=models.CASCADE,
        related_name='notificacoes',
        blank=True,
        null=True,
        verbose_name='Paciente'
    )
    psicologo = models.ForeignKey(
        Psicologo,
        on_delete=models.CASCADE,
        related_name='notificacoes',
        blank=True,
        null=True,
        verbose_name='Psicólogo'
    )
    
    # Conteúdo da notificação
    tipo = models.CharField(
        max_length=30,
        choices=TIPO_CHOICES,
        verbose_name='Tipo'
    )
    titulo = models.CharField(
        max_length=100,
        verbose_name='Título'
    )
    mensagem = models.TextField(
        verbose_name='Mensagem'
    )
    
    # Status
    lida = models.BooleanField(
        default=False,
        verbose_name='Lida'
    )
    data_leitura = models.DateTimeField(
        blank=True,
        null=True,
        verbose_name='Data de Leitura'
    )
    
    # Metadados opcionais
    link_relacionado = models.CharField(
        max_length=200,
        blank=True,
        null=True,
        verbose_name='Link Relacionado',
        help_text='URL ou identificador para navegar'
    )
    dados_extras = models.JSONField(
        blank=True,
        null=True,
        verbose_name='Dados Extras',
        help_text='Dados adicionais em formato JSON'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Notificação'
        verbose_name_plural = 'Notificações'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['paciente', 'lida']),
            models.Index(fields=['psicologo', 'lida']),
            models.Index(fields=['tipo', 'created_at']),
        ]
    
    def __str__(self):
        destinatario = self.paciente.user.first_name if self.paciente else self.psicologo.user.first_name
        return f"{self.titulo} → {destinatario}"
    
    def clean(self):
        """Validação: deve ter paciente OU psicólogo, não ambos ou nenhum"""
        if not self.paciente and not self.psicologo:
            raise ValidationError('Notificação deve ter um paciente OU um psicólogo.')
        if self.paciente and self.psicologo:
            raise ValidationError('Notificação não pode ter paciente E psicólogo ao mesmo tempo.')
    
    def marcar_como_lida(self):
        """Marca notificação como lida"""
        if not self.lida:
            self.lida = True
            self.data_leitura = timezone.now()
            self.save()