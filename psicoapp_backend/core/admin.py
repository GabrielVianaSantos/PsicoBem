from django.contrib import admin
from engajamentos.models import (
    CategoriaMensagem, SementeCuidado, MensagemPaciente,
    CategoriaOdisseia, RegistroOdisseia, ComentarioPsicologo, MetaOdisseia,
)
from .models import VinculoPacientePsicologo, NotificacaoSistema, Prontuario
    
###################################################################################################
# CATEGORIA MENSAGEM SEMENTES DO CUIDADO
###################################################################################################

@admin.register(CategoriaMensagem)
class CategoriaMensagemAdmin(admin.ModelAdmin):
    list_display = ('nome', 'psicologo', 'icone', 'cor', 'ativa')
    list_filter = ('ativa', 'icone', 'psicologo')
    search_fields = ('nome', 'psicologo__user__first_name', 'psicologo__user__last_name')
    ordering = ('psicologo', 'nome')
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('psicologo', 'nome', 'descricao')
        }),
        ('Aparência', {
            'fields': ('icone', 'cor', 'ativa')
        }),
    )

@admin.register(SementeCuidado)
class SementeCuidadoAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'psicologo', 'categoria', 'tipo', 'status', 'publica', 'total_visualizacoes', 'total_curtidas', 'created_at')
    list_filter = ('status', 'tipo', 'publica', 'categoria', 'psicologo', 'created_at')
    search_fields = ('titulo', 'conteudo', 'psicologo__user__first_name', 'psicologo__user__last_name')
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('psicologo', 'titulo', 'categoria', 'tipo')
        }),
        ('Conteúdo', {
            'fields': ('conteudo',)
        }),
        ('Configurações', {
            'fields': ('status', 'publica', 'data_programada', 'recorrente')
        }),
        ('Estatísticas', {
            'fields': ('total_visualizacoes', 'total_curtidas'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('total_visualizacoes', 'total_curtidas', 'created_at', 'updated_at')
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'psicologo__user', 
            'categoria'
        )

@admin.register(MensagemPaciente)
class MensagemPacienteAdmin(admin.ModelAdmin):
    list_display = ('semente', 'paciente', 'status', 'enviada_em', 'visualizada_em', 'avaliacao')
    list_filter = ('status', 'enviada_em', 'visualizada_em', 'avaliacao')
    search_fields = (
        'semente__titulo',
        'paciente__user__first_name',
        'paciente__user__last_name',
        'semente__psicologo__user__first_name'
    )
    date_hierarchy = 'enviada_em'
    ordering = ('-enviada_em',)
    
    fieldsets = (
        ('Relacionamentos', {
            'fields': ('semente', 'paciente')
        }),
        ('Status', {
            'fields': ('status', 'enviada_em', 'visualizada_em', 'curtida_em')
        }),
        ('Feedback', {
            'fields': ('feedback', 'avaliacao'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('enviada_em', 'visualizada_em', 'curtida_em')
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'semente__psicologo__user',
            'paciente__user',
            'semente'
        )
    
###################################################################################################
# CATEGORIA REGISTROS ODISSEIA
###################################################################################################

@admin.register(CategoriaOdisseia)
class CategoriaOdisseiaAdmin(admin.ModelAdmin):
    list_display = ('nome', 'icone', 'cor', 'ativa')
    list_filter = ('ativa', 'icone')
    search_fields = ('nome', 'descricao')
    ordering = ('nome',)

@admin.register(RegistroOdisseia)
class RegistroOdisseiaAdmin(admin.ModelAdmin):
    list_display = ('paciente', 'data_registro', 'hora_registro', 'humor_geral', 'intensidade_emocao', 'categoria', 'compartilhar_psicologo', 'privado')
    list_filter = ('humor_geral', 'intensidade_emocao', 'categoria', 'compartilhar_psicologo', 'privado', 'data_registro')
    search_fields = (
        'paciente__user__first_name',
        'paciente__user__last_name',
        'situacao',
        'pensamentos'
    )
    date_hierarchy = 'data_registro'
    ordering = ('-data_registro', '-hora_registro')
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('paciente', 'categoria', 'data_registro', 'hora_registro')
        }),
        ('Situação e Contexto', {
            'fields': ('situacao', 'local')
        }),
        ('Estado Emocional', {
            'fields': ('humor_geral', 'intensidade_emocao', 'nivel_ansiedade', 'nivel_estresse', 'nivel_energia')
        }),
        ('Pensamentos e Reflexões', {
            'fields': ('pensamentos', 'pensamentos_automaticos', 'gatilhos', 'aprendizados')
        }),
        ('Reações e Comportamentos', {
            'fields': ('reacoes_fisicas', 'comportamento', 'estrategias_enfrentamento')
        }),
        ('Configurações', {
            'fields': ('compartilhar_psicologo', 'privado', 'observacoes_adicionais')
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'paciente__user',
            'categoria'
        )

@admin.register(ComentarioPsicologo)
class ComentarioPsicologoAdmin(admin.ModelAdmin):
    list_display = ('registro', 'psicologo', 'tipo_comentario', 'importante', 'lido_paciente', 'created_at')
    list_filter = ('tipo_comentario', 'importante', 'lido_paciente', 'created_at')
    search_fields = (
        'registro__paciente__user__first_name',
        'psicologo__user__first_name',
        'comentario'
    )
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Relacionamentos', {
            'fields': ('registro', 'psicologo')
        }),
        ('Comentário', {
            'fields': ('comentario', 'tipo_comentario')
        }),
        ('Configurações', {
            'fields': ('importante', 'lido_paciente')
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')

@admin.register(MetaOdisseia)
class MetaOdisseiaAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'paciente', 'status', 'progresso', 'data_prevista', 'dias_para_conclusao', 'status_prazo')
    list_filter = ('status', 'data_criacao', 'data_prevista')
    search_fields = ('titulo', 'descricao', 'paciente__user__first_name', 'paciente__user__last_name')
    date_hierarchy = 'data_criacao'
    ordering = ('-data_criacao',)
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('paciente', 'titulo', 'descricao', 'status')
        }),
        ('Prazos', {
            'fields': ('data_prevista', 'data_conclusao')
        }),
        ('Acompanhamento', {
            'fields': ('progresso', 'observacoes_progresso')
        }),
    )
    
    readonly_fields = ('data_criacao',)
    
    def dias_para_conclusao(self, obj):
        return obj.dias_para_conclusao
    dias_para_conclusao.short_description = 'Dias para Conclusão'
    
    def status_prazo(self, obj):
        status = obj.status_prazo
        cores = {
            'concluida': '🟢',
            'no_prazo': '🟡',
            'urgente': '🟠',
            'atrasada': '🔴'
        }
        return f"{cores.get(status, '')} {status.replace('_', ' ').title()}"
    status_prazo.short_description = 'Status do Prazo'

@admin.register(VinculoPacientePsicologo)
class VinculoPacientePsicologoAdmin(admin.ModelAdmin):
    list_display = ('paciente', 'psicologo', 'status', 'data_vinculo', 'data_inicio_tratamento', 'duracao_tratamento')
    list_filter = ('status', 'data_vinculo', 'data_inicio_tratamento')
    search_fields = (
        'paciente__user__first_name',
        'paciente__user__last_name',
        'psicologo__user__first_name',
        'psicologo__user__last_name'
    )
    date_hierarchy = 'data_vinculo'
    ordering = ('-data_vinculo',)
    
    fieldsets = (
        ('Relacionamento', {
            'fields': ('paciente', 'psicologo', 'status')
        }),
        ('Datas', {
            'fields': ('data_inicio_tratamento', 'data_fim_tratamento')
        }),
        ('Informações Adicionais', {
            'fields': ('motivo_vinculo', 'observacoes')
        }),
        ('Permissões', {
            'fields': ('permite_visualizar_registros', 'permite_comentarios', 'permite_metas'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('data_vinculo', 'created_at', 'updated_at')
    
    def duracao_tratamento(self, obj):
        return f"{obj.duracao_tratamento} dias"
    duracao_tratamento.short_description = 'Duração do Tratamento'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'paciente__user',
            'psicologo__user'
        )

@admin.register(NotificacaoSistema)
class NotificacaoSistemaAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'destinatario', 'tipo', 'lida', 'created_at')
    list_filter = ('tipo', 'lida', 'created_at')
    search_fields = (
        'titulo',
        'mensagem',
        'paciente__user__first_name',
        'psicologo__user__first_name'
    )
    date_hierarchy = 'created_at'
    ordering = ('-created_at',)
    
    fieldsets = (
        ('Destinatário', {
            'fields': ('paciente', 'psicologo')
        }),
        ('Conteúdo', {
            'fields': ('tipo', 'titulo', 'mensagem')
        }),
        ('Status', {
            'fields': ('lida', 'data_leitura')
        }),
        ('Metadados', {
            'fields': ('link_relacionado', 'dados_extras'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('created_at', 'data_leitura')
    
    def destinatario(self, obj):
        if obj.paciente:
            return f"Paciente: {obj.paciente.user.first_name}"
        elif obj.psicologo:
            return f"Psicólogo: {obj.psicologo.user.first_name}"
        return "Sem destinatário"
    destinatario.short_description = 'Destinatário'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'paciente__user',
            'psicologo__user'
        )
