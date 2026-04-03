from django.contrib import admin
from sessoes.models import TipoSessao, Sessao

###################################################################################################
# CATEGORIA TIPO SESSAO
###################################################################################################

@admin.register(TipoSessao)
class TipoSessaoAdmin(admin.ModelAdmin):
    list_display = ('nome', 'psicologo', 'tipo', 'valor', 'duracao_minutos', 'ativo')
    list_filter = ('tipo', 'ativo', 'psicologo')
    search_fields = ('nome', 'psicologo__user__first_name', 'psicologo__user__last_name')
    ordering = ('psicologo', 'nome')
    
    fieldsets = (
        ('Informações Básicas', {
            'fields': ('psicologo', 'nome', 'tipo')
        }),
        ('Configurações', {
            'fields': ('valor', 'duracao_minutos', 'ativo')
        }),
        ('Descrição', {
            'fields': ('descricao',),
            'classes': ('collapse',)
        }),
    )

@admin.register(Sessao)
class SessaoAdmin(admin.ModelAdmin):
    list_display = ('paciente', 'psicologo', 'data_hora', 'tipo_sessao', 'status', 'status_pagamento', 'valor_formatado', 'pode_cancelar')
    list_filter = ('status', 'status_pagamento', 'data_hora', 'psicologo', 'tipo_sessao')
    search_fields = (
        'paciente__user__first_name', 
        'paciente__user__last_name',
        'psicologo__user__first_name',
        'psicologo__user__last_name'
    )
    date_hierarchy = 'data_hora'
    ordering = ('-data_hora',)
    
    fieldsets = (
        ('Participantes', {
            'fields': ('paciente', 'psicologo', 'tipo_sessao')
        }),
        ('Agendamento', {
            'fields': ('data_hora', 'status', 'valor')
        }),
        ('Pagamento', {
            'fields': ('status_pagamento', 'data_pagamento')
        }),
        ('Observações', {
            'fields': ('observacoes_agendamento', 'observacoes_sessao'),
            'classes': ('collapse',)
        }),
    )
    
    readonly_fields = ('created_at', 'updated_at')
    
    def valor_formatado(self, obj):
        return obj.valor_formatado
    valor_formatado.short_description = 'Valor'
    
    def pode_cancelar(self, obj):
        return "✅" if obj.pode_ser_cancelada() else "❌"
    pode_cancelar.short_description = 'Pode Cancelar'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related(
            'paciente__user', 
            'psicologo__user', 
            'tipo_sessao'
        )
    
    actions = ['confirmar_pagamento', 'cancelar_sessoes']
    
    def confirmar_pagamento(self, request, queryset):
        count = 0
        for sessao in queryset:
            if sessao.status == 'realizada' and sessao.status_pagamento == 'pendente':
                sessao.confirmar_pagamento()
                count += 1
        self.message_user(request, f'{count} pagamentos confirmados.')
    confirmar_pagamento.short_description = 'Confirmar pagamento das sessões selecionadas'
    
    def cancelar_sessoes(self, request, queryset):
        count = 0
        for sessao in queryset:
            if sessao.pode_ser_cancelada():
                sessao.status = 'cancelada'
                sessao.save()
                count += 1
        self.message_user(request, f'{count} sessões canceladas.')
    cancelar_sessoes.short_description = 'Cancelar sessões selecionadas'
    