from django.utils import timezone
from rest_framework import serializers
from authentication.models import CustomUser, Paciente, Psicologo
from .models import (
    VinculoPacientePsicologo,
    ConviteVinculo,
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
    dias_restantes_solicitacao = serializers.SerializerMethodField()

    class Meta:
        model = VinculoPacientePsicologo
        fields = [
            'id', 'paciente', 'psicologo', 'status', 'status_display',
            'origem', 'data_solicitacao', 'dias_restantes_solicitacao',
            'data_vinculo', 'data_inicio_tratamento', 'data_fim_tratamento',
            'motivo_vinculo', 'observacoes',
            'permite_visualizar_registros', 'permite_comentarios', 'permite_metas',
            'duracao_tratamento', 'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'psicologo', 'paciente', 'status', 'origem', 'data_solicitacao',
            'data_vinculo', 'created_at', 'updated_at',
        ]

    def get_duracao_tratamento(self, obj):
        return obj.duracao_tratamento

    def get_dias_restantes_solicitacao(self, obj):
        """Dias até a solicitação pendente expirar (5 no total) — None fora do contexto de solicitação."""
        if obj.status != 'pendente' or obj.data_solicitacao is None:
            return None
        from core.services import PRAZO_EXPIRACAO_SOLICITACAO
        prazo_final = obj.data_solicitacao + PRAZO_EXPIRACAO_SOLICITACAO
        restante = prazo_final - timezone.now()
        return max(restante.days, 0)


#####################################################################################################################################
# CONVITES DE VÍNCULO
#####################################################################################################################################

class ConviteVinculoSerializer(serializers.ModelSerializer):
    """Convites de uso único do psicólogo — usado em listar/criar/revogar."""
    estado = serializers.CharField(read_only=True)
    usado_por_nome = serializers.SerializerMethodField()

    class Meta:
        model = ConviteVinculo
        fields = [
            'id', 'codigo', 'apelido', 'criado_em', 'expira_em',
            'usado_em', 'usado_por_nome', 'revogado', 'estado',
        ]
        read_only_fields = fields

    def get_usado_por_nome(self, obj):
        if obj.usado_por_id:
            return f'{obj.usado_por.user.first_name} {obj.usado_por.user.last_name}'.strip()
        return None


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
