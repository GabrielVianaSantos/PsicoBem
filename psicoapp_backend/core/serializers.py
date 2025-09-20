from rest_framework import serializers
from django.contrib.auth.models import User
from authentication.models import Paciente, Psicologo
from .models import (
    TipoSessao, Sessao, VinculoPacientePsicologo,
    CategoriaMensagem, SementeCuidado, MensagemPaciente,
    CategoriaOdisseia, RegistroOdisseia, ComentarioPsicologo,
    MetaOdisseia, NotificacaoSistema
)
from django.utils import timezone
from datetime import datetime

# ==================== SERIALIZERS PARA USUÁRIOS ====================

class UserBasicSerializer(serializers.ModelSerializer):
    """Serializer básico para dados do usuário"""
    class Meta:
        model = User
        fields = ['id', 'first_name', 'last_name', 'email']

class PacienteBasicSerializer(serializers.ModelSerializer):
    """Serializer básico para Paciente"""
    user = UserBasicSerializer(read_only=True)
    nome_completo = serializers.SerializerMethodField()
    
    class Meta:
        model = Paciente
        fields = ['id', 'user', 'cpf', 'gender', 'nome_completo']
    
    def get_nome_completo(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip()

class PsicologoBasicSerializer(serializers.ModelSerializer):
    """Serializer básico para Psicólogo"""
    user = UserBasicSerializer(read_only=True)
    nome_completo = serializers.SerializerMethodField()
    
    class Meta:
        model = Psicologo
        fields = ['id', 'user', 'crp', 'specialization', 'nome_completo']
    
    def get_nome_completo(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip()

# ==================== SERIALIZERS PARA TIPO SESSÃO ====================

class TipoSessaoSerializer(serializers.ModelSerializer):
    """Serializer completo para TipoSessao"""
    psicologo = PsicologoBasicSerializer(read_only=True)
    valor_formatado = serializers.SerializerMethodField()
    duracao_formatada = serializers.SerializerMethodField()
    
    class Meta:
        model = TipoSessao
        fields = [
            'id', 'psicologo', 'nome', 'tipo', 'valor', 'duracao_minutos',
            'descricao', 'ativo', 'created_at', 'updated_at',
            'valor_formatado', 'duracao_formatada'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_valor_formatado(self, obj):
        return f"R$ {obj.valor:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
    
    def get_duracao_formatada(self, obj):
        return f"{obj.duracao_minutos} min"

class TipoSessaoCreateSerializer(serializers.ModelSerializer):
    """Serializer para criar TipoSessao"""
    
    class Meta:
        model = TipoSessao
        fields = ['nome', 'tipo', 'valor', 'duracao_minutos', 'descricao', 'ativo']
    
    def validate_valor(self, value):
        if value < 0:
            raise serializers.ValidationError("Valor não pode ser negativo.")
        return value
    
    def validate_duracao_minutos(self, value):
        if value <= 0:
            raise serializers.ValidationError("Duração deve ser maior que zero.")
        if value > 480:  # 8 horas máximo
            raise serializers.ValidationError("Duração não pode exceder 8 horas.")
        return value
    
    def validate_nome(self, value):
        # Verificar se já existe um tipo com mesmo nome para o mesmo psicólogo
        psicologo = self.context['request'].user.psicologo
        if TipoSessao.objects.filter(psicologo=psicologo, nome=value).exists():
            raise serializers.ValidationError("Já existe um tipo de sessão com este nome.")
        return value

# ==================== SERIALIZERS PARA SESSÃO ====================

class SessaoListSerializer(serializers.ModelSerializer):
    """Serializer para listagem de sessões (dados resumidos)"""
    paciente = PacienteBasicSerializer(read_only=True)
    psicologo = PsicologoBasicSerializer(read_only=True)
    tipo_sessao = TipoSessaoSerializer(read_only=True)
    valor_formatado = serializers.SerializerMethodField()
    data_hora_formatada = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    status_pagamento_display = serializers.CharField(source='get_status_pagamento_display', read_only=True)
    pode_cancelar = serializers.SerializerMethodField()
    pode_remarcar = serializers.SerializerMethodField()
    
    class Meta:
        model = Sessao
        fields = [
            'id', 'paciente', 'psicologo', 'tipo_sessao', 'data_hora', 'status',
            'status_pagamento', 'valor', 'data_hora_formatada', 'valor_formatado',
            'status_display', 'status_pagamento_display', 'pode_cancelar', 'pode_remarcar'
        ]
    
    def get_valor_formatado(self, obj):
        return obj.valor_formatado
    
    def get_data_hora_formatada(self, obj):
        return obj.data_hora.strftime('%d/%m/%Y às %H:%M')
    
    def get_pode_cancelar(self, obj):
        return obj.pode_ser_cancelada()
    
    def get_pode_remarcar(self, obj):
        return obj.pode_ser_remarcada()

class SessaoDetailSerializer(serializers.ModelSerializer):
    """Serializer completo para detalhes da sessão"""
    paciente = PacienteBasicSerializer(read_only=True)
    psicologo = PsicologoBasicSerializer(read_only=True)
    tipo_sessao = TipoSessaoSerializer(read_only=True)
    valor_formatado = serializers.SerializerMethodField()
    data_hora_formatada = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    status_pagamento_display = serializers.CharField(source='get_status_pagamento_display', read_only=True)
    pode_cancelar = serializers.SerializerMethodField()
    pode_remarcar = serializers.SerializerMethodField()
    
    class Meta:
        model = Sessao
        fields = [
            'id', 'paciente', 'psicologo', 'tipo_sessao', 'data_hora', 'status',
            'status_pagamento', 'valor', 'observacoes_agendamento', 'observacoes_sessao',
            'data_pagamento', 'created_at', 'updated_at', 'data_hora_formatada',
            'valor_formatado', 'status_display', 'status_pagamento_display',
            'pode_cancelar', 'pode_remarcar'
        ]
        read_only_fields = ['created_at', 'updated_at', 'data_pagamento']
    
    def get_valor_formatado(self, obj):
        return obj.valor_formatado
    
    def get_data_hora_formatada(self, obj):
        return obj.data_hora.strftime('%d/%m/%Y às %H:%M')
    
    def get_pode_cancelar(self, obj):
        return obj.pode_ser_cancelada()
    
    def get_pode_remarcar(self, obj):
        return obj.pode_ser_remarcada()

class SessaoCreateSerializer(serializers.ModelSerializer):
    """Serializer para criar sessões"""
    paciente_id = serializers.IntegerField(write_only=True)
    tipo_sessao_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = Sessao
        fields = [
            'paciente_id', 'tipo_sessao_id', 'data_hora', 'status',
            'observacoes_agendamento'
        ]
    
    def validate_data_hora(self, value):
        # Não pode agendar no passado
        if value < timezone.now():
            raise serializers.ValidationError("Não é possível agendar sessões no passado.")
        return value
    
    def validate_paciente_id(self, value):
        try:
            paciente = Paciente.objects.get(id=value)
        except Paciente.DoesNotExist:
            raise serializers.ValidationError("Paciente não encontrado.")
        
        # Verificar se paciente está vinculado ao psicólogo
        psicologo = self.context['request'].user.psicologo
        vinculo_ativo = VinculoPacientePsicologo.objects.filter(
            paciente=paciente,
            psicologo=psicologo,
            status='ativo'
        ).exists()
        
        if not vinculo_ativo:
            raise serializers.ValidationError("Paciente deve estar vinculado ao psicólogo.")
        
        return value
    
    def validate_tipo_sessao_id(self, value):
        try:
            tipo_sessao = TipoSessao.objects.get(id=value)
        except TipoSessao.DoesNotExist:
            raise serializers.ValidationError("Tipo de sessão não encontrado.")
        
        # Verificar se o tipo de sessão pertence ao psicólogo
        psicologo = self.context['request'].user.psicologo
        if tipo_sessao.psicologo != psicologo:
            raise serializers.ValidationError("Tipo de sessão não pertence ao psicólogo.")
        
        return value
    
    def validate(self, attrs):
        # Validar conflito de horários
        psicologo = self.context['request'].user.psicologo
        data_hora = attrs['data_hora']
        
        conflitos = Sessao.objects.filter(
            psicologo=psicologo,
            data_hora=data_hora,
            status__in=['agendada', 'confirmada']
        )
        
        if conflitos.exists():
            raise serializers.ValidationError({
                'data_hora': 'Psicólogo já tem uma sessão agendada neste horário.'
            })
        
        return attrs
    
    def create(self, validated_data):
        # Extrair IDs e buscar objetos
        paciente_id = validated_data.pop('paciente_id')
        tipo_sessao_id = validated_data.pop('tipo_sessao_id')
        
        paciente = Paciente.objects.get(id=paciente_id)
        tipo_sessao = TipoSessao.objects.get(id=tipo_sessao_id)
        psicologo = self.context['request'].user.psicologo
        
        # Criar sessão
        sessao = Sessao.objects.create(
            paciente=paciente,
            psicologo=psicologo,
            tipo_sessao=tipo_sessao,
            valor=tipo_sessao.valor,  # Usar valor do tipo de sessão
            **validated_data
        )
        
        return sessao

class SessaoUpdateSerializer(serializers.ModelSerializer):
    """Serializer para atualizar sessões"""
    
    class Meta:
        model = Sessao
        fields = [
            'data_hora', 'status', 'status_pagamento', 'observacoes_agendamento',
            'observacoes_sessao'
        ]
    
    def validate_data_hora(self, value):
        # Verificar se pode alterar data/hora
        if self.instance.status in ['realizada', 'cancelada']:
            raise serializers.ValidationError("Não é possível alterar data/hora de sessão realizada ou cancelada.")
        
        # Não pode agendar no passado
        if value < timezone.now():
            raise serializers.ValidationError("Não é possível agendar sessões no passado.")
        
        return value
    
    def validate_status(self, value):
        # Regras de transição de status
        current_status = self.instance.status
        
        # Não pode voltar de realizada/cancelada para agendada
        if current_status in ['realizada', 'cancelada'] and value == 'agendada':
            raise serializers.ValidationError("Não é possível reverter status de sessão realizada ou cancelada.")
        
        return value
    
    def validate(self, attrs):
        # Validar conflito de horários se data_hora foi alterada
        if 'data_hora' in attrs:
            data_hora = attrs['data_hora']
            psicologo = self.instance.psicologo
            
            conflitos = Sessao.objects.filter(
                psicologo=psicologo,
                data_hora=data_hora,
                status__in=['agendada', 'confirmada']
            ).exclude(id=self.instance.id)
            
            if conflitos.exists():
                raise serializers.ValidationError({
                    'data_hora': 'Psicólogo já tem uma sessão agendada neste horário.'
                })
        
        return attrs

# ==================== SERIALIZERS PARA ESTATÍSTICAS ====================

class EstatisticasSessaoSerializer(serializers.Serializer):
    """Serializer para estatísticas de sessões"""
    total_sessoes = serializers.IntegerField()
    sessoes_realizadas = serializers.IntegerField()
    sessoes_canceladas = serializers.IntegerField()
    receita_total = serializers.DecimalField(max_digits=10, decimal_places=2)
    pagamentos_pendentes = serializers.DecimalField(max_digits=10, decimal_places=2)
    receita_formatada = serializers.SerializerMethodField()
    pagamentos_pendentes_formatado = serializers.SerializerMethodField()
    taxa_realizacao = serializers.SerializerMethodField()
    
    def get_receita_formatada(self, obj):
        valor = obj['receita_total']
        return f"R$ {valor:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
    
    def get_pagamentos_pendentes_formatado(self, obj):
        valor = obj['pagamentos_pendentes']
        return f"R$ {valor:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')
    
    def get_taxa_realizacao(self, obj):
        total = obj['total_sessoes']
        realizadas = obj['sessoes_realizadas']
        if total > 0:
            return round((realizadas / total) * 100, 1)
        return 0.0