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
        # SPEC_VINCULO_CONVITE_E_SOLICITACAO.md, seção 3.1 — solicitação por
        # CRP, que agora exige aceite do psicólogo em vez de nascer ativa.
        ('pendente', 'Pendente'),
        ('recusado', 'Recusado'),
        ('expirado', 'Expirado'),
    ]

    ORIGEM_CHOICES = [
        ('convite_link', 'Convite (link permanente)'),
        ('convite_codigo', 'Convite (código de uso único)'),
        ('crp', 'CRP'),
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
    # Marcação estruturada de origem (motivo_vinculo permanece como texto
    # livre). Default 'crp' cobre o backfill dos registros existentes — até
    # esta feature, todo vínculo nascia via CRP.
    origem = models.CharField(
        max_length=20,
        choices=ORIGEM_CHOICES,
        default='crp',
        verbose_name='Origem',
    )
    # Base do cálculo de expiração de 5 dias das solicitações por CRP
    # (seção 3.9). Null para vínculos que nunca foram uma solicitação
    # pendente (convite, ou registros anteriores a esta feature).
    data_solicitacao = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Data da Solicitação',
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
            # Um paciente só pode ter um vínculo ativo por vez, ponto — não
            # apenas um por par paciente+psicólogo. O constraint anterior
            # (por par) permitia que uma troca de profissional deixasse
            # dois vínculos ativos ao mesmo tempo (o psicólogo anterior
            # nunca era inativado). Ver SPEC_VINCULO_CONVITE_E_SOLICITACAO.md,
            # seção 3.2.
            models.UniqueConstraint(
                fields=['paciente'],
                condition=Q(status='ativo'),
                name='unique_vinculo_ativo_por_paciente'
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
        self._sync_legacy_paciente_psicologo()

    def _sync_legacy_paciente_psicologo(self):
        """
        Mantém Paciente.psicologo sincronizado enquanto o campo legado existir.
        A fonte principal de verdade continua sendo VinculoPacientePsicologo.
        """
        paciente = self.paciente
        vinculo_ativo = VinculoPacientePsicologo.objects.filter(
            paciente=paciente,
            status='ativo'
        ).select_related('psicologo').order_by('-updated_at', '-data_vinculo').first()

        psicologo_ativo_id = vinculo_ativo.psicologo_id if vinculo_ativo else None
        if paciente.psicologo_id != psicologo_ativo_id:
            paciente.psicologo_id = psicologo_ativo_id
            paciente.save(update_fields=['psicologo'])
    
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
            'finalizado': '#9E9E9E',
            'pendente': '#2196F3',
            'recusado': '#F44336',
            'expirado': '#9E9E9E',
        }
        return colors.get(self.status, '#9E9E9E')


class ConviteVinculo(models.Model):
    """
    Convite de uso único emitido pelo psicólogo (SPEC_VINCULO_CONVITE_E_SOLICITACAO.md,
    seção 3.5). Diferente do convite permanente (`Psicologo.slug`/`codigo_convite`),
    expira em 7 dias e só pode ser resgatado uma vez.
    """
    psicologo = models.ForeignKey(
        Psicologo,
        on_delete=models.CASCADE,
        related_name='convites_vinculo',
        verbose_name='Psicólogo',
    )
    codigo = models.CharField(max_length=9, unique=True, db_index=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    expira_em = models.DateTimeField()
    usado_em = models.DateTimeField(null=True, blank=True)
    usado_por = models.ForeignKey(
        Paciente,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='convites_resgatados',
        verbose_name='Usado por',
    )
    revogado = models.BooleanField(default=False)
    apelido = models.CharField(
        max_length=100, blank=True, null=True,
        verbose_name='Apelido',
        help_text='Anotação do psicólogo para localizar o convite na lista (ex.: "João, indicação da Dra. Marta").',
    )

    class Meta:
        verbose_name = 'Convite de Vínculo'
        verbose_name_plural = 'Convites de Vínculo'
        ordering = ['-criado_em']
        indexes = [
            models.Index(fields=['psicologo', 'revogado', 'usado_em']),
        ]

    def __str__(self):
        return f"Convite {self.codigo} de {self.psicologo.user.first_name} ({self.estado})"

    def save(self, *args, **kwargs):
        if not self.expira_em:
            self.expira_em = timezone.now() + timedelta(days=7)
        if not self.codigo:
            from authentication.services import gerar_codigo_curto_unico
            self.codigo = gerar_codigo_curto_unico(
                ConviteVinculo, 'codigo', self.psicologo.user.first_name
            )
        super().save(*args, **kwargs)

    @property
    def valido(self):
        return not self.revogado and self.usado_em is None and self.expira_em > timezone.now()

    @property
    def estado(self):
        """Estado derivado exibido na lista de convites do psicólogo."""
        if self.revogado:
            return 'revogado'
        if self.usado_em is not None:
            return 'usado'
        if self.expira_em <= timezone.now():
            return 'expirado'
        return 'ativo'


class NotificacaoSistema(models.Model):
    """
    Sistema de notificações para pacientes e psicólogos
    """
    TIPO_CHOICES = [
        ('sessao_agendada', 'Sessão Agendada'),
        ('sessao_cancelada', 'Sessão Cancelada'),
        ('sessao_lembrete', 'Lembrete de Sessão'),
        ('sessao_confirmacao', 'Confirmação Pós-Sessão'),
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

#####################################################################################################################################
# PRONTUÁRIOS (GUIAS DE APOIO)
#####################################################################################################################################

class Prontuario(models.Model):
    """
    Relatórios e notas clínicas feitas pelo psicólogo sobre um paciente (Guias de Apoio).

    `paciente` é CASCADE: se o paciente excluir a própria conta
    (SPEC_EXCLUSAO_CONTA.md), os prontuários dele são apagados junto —
    mesma regra de cascata total já aplicada do lado do psicólogo.
    """
    psicologo = models.ForeignKey(
        Psicologo,
        on_delete=models.CASCADE,
        related_name='prontuarios_criados'
    )
    paciente = models.ForeignKey(
        Paciente,
        on_delete=models.CASCADE,
        related_name='prontuarios'
    )
    titulo = models.CharField(
        max_length=255,
        blank=True,
        default='',
        verbose_name="Título"
    )
    anotacao = models.TextField(
        verbose_name="Anotação / Relatório Clínico"
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Prontuário'
        verbose_name_plural = 'Prontuários'
        ordering = ['-created_at']

    def __str__(self):
        return f"Prontuário de {self.paciente.user.first_name} por {self.psicologo.user.first_name}"
