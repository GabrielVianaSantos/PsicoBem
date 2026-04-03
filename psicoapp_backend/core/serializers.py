from rest_framework import serializers
from authentication.models import CustomUser, Paciente, Psicologo
from .models import (
    VinculoPacientePsicologo,
    NotificacaoSistema,
    Prontuario,
)

# ==================== SERIALIZERS PARA USUÁRIOS ====================

class UserBasicSerializer(serializers.ModelSerializer):
    """Serializer básico para dados do usuário"""
    class Meta:
        model = CustomUser
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

# PRONTUÁRIOS (GUIAS DE APOIO)
#####################################################################################################################################

class ProntuarioSerializer(serializers.ModelSerializer):
    paciente_nome = serializers.CharField(source='paciente.user.first_name', read_only=True)
    psicologo_nome = serializers.CharField(source='psicologo.user.first_name', read_only=True)

    class Meta:
        model = Prontuario
        fields = ['id', 'psicologo', 'psicologo_nome', 'paciente', 'paciente_nome', 
                  'titulo', 'anotacao', 'created_at', 'updated_at']
        read_only_fields = ['id', 'psicologo', 'created_at', 'updated_at']

#####################################################################################################################################
# VÍNCULO PACIENTE-PSICÓLOGO
#####################################################################################################################################

class VinculoPacientePsicologoSerializer(serializers.ModelSerializer):
    paciente = PacienteBasicSerializer(read_only=True)
    psicologo = PsicologoBasicSerializer(read_only=True)
    duracao_tratamento = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model = VinculoPacientePsicologo
        fields = [
            'id', 'paciente', 'psicologo', 'status', 'status_display',
            'data_vinculo', 'data_inicio_tratamento', 'data_fim_tratamento',
            'motivo_vinculo', 'observacoes',
            'permite_visualizar_registros', 'permite_comentarios', 'permite_metas',
            'duracao_tratamento', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'psicologo', 'data_vinculo', 'created_at', 'updated_at']

    def get_duracao_tratamento(self, obj):
        return obj.duracao_tratamento


#####################################################################################################################################
# NOTIFICAÇÕES
#####################################################################################################################################

class NotificacaoSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source='get_tipo_display', read_only=True)

    class Meta:
        model = NotificacaoSistema
        fields = [
            'id', 'tipo', 'tipo_display', 'titulo', 'mensagem',
            'lida', 'data_leitura', 'link_relacionado', 'dados_extras', 'created_at',
        ]
        read_only_fields = ['id', 'created_at', 'data_leitura']
