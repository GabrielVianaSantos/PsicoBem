from rest_framework import serializers
from authentication.models import Paciente, Psicologo
from engajamentos.models import (
    SementeCuidado, CategoriaMensagem, MensagemPaciente,
    CategoriaOdisseia, RegistroOdisseia, ComentarioPsicologo, MetaOdisseia
)


# ==================== ODISSEIA E SEMENTES DO CUIDADO ====================

class SementeCuidadoSerializer(serializers.ModelSerializer):
    psicologo_nome = serializers.CharField(source='psicologo.user.first_name', read_only=True)
    
    class Meta:
        model = SementeCuidado
        fields = '__all__'
        read_only_fields = ['id', 'psicologo', 'created_at', 'updated_at', 'total_visualizacoes', 'total_curtidas']

class RegistroOdisseiaSerializer(serializers.ModelSerializer):
    paciente_nome = serializers.CharField(source='paciente.user.first_name', read_only=True)
    paciente_humor = serializers.CharField(source='humor_geral', read_only=True)
    humor_display = serializers.CharField(source='get_humor_geral_display', read_only=True)

    class Meta:
        model = RegistroOdisseia
        fields = '__all__'
        read_only_fields = ['id', 'paciente', 'created_at']

