from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import CustomUser, Paciente, Psicologo

class UserRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer para registro de usuários
    """
    password = serializers.CharField(write_only=True, min_length=6)
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = CustomUser
        fields = ('email', 'username', 'first_name', 'last_name', 'user_type', 'phone', 'password', 'password_confirm')
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("As senhas não coincidem")
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = CustomUser.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user

class PacienteRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer específico para registro de pacientes
    """
    user = UserRegistrationSerializer()
    
    class Meta:
        model = Paciente
        fields = ('user', 'cpf', 'gender')
    
    def create(self, validated_data):
        user_data = validated_data.pop('user')
        user_data['user_type'] = 'paciente'
        user = UserRegistrationSerializer().create(user_data)
        paciente = Paciente.objects.create(user=user, **validated_data)
        return paciente

class PsicologoRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer específico para registro de psicólogos
    """
    user = UserRegistrationSerializer()
    
    class Meta:
        model = Psicologo
        fields = ('user', 'crp', 'specialization')
    
    def create(self, validated_data):
        user_data = validated_data.pop('user')
        user_data['user_type'] = 'psicologo'
        user = UserRegistrationSerializer().create(user_data)
        psicologo = Psicologo.objects.create(user=user, **validated_data)
        return psicologo

class UserLoginSerializer(serializers.Serializer):
    """
    Serializer para login de usuários
    """
    email = serializers.EmailField()
    password = serializers.CharField()
    
    def validate(self, attrs):
        email = attrs.get('email')
        password = attrs.get('password')
        
        if email and password:
            user = authenticate(username=email, password=password)
            if not user:
                raise serializers.ValidationError('Credenciais inválidas')
            if not user.is_active:
                raise serializers.ValidationError('Conta desativada')
            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError('Email e senha são obrigatórios')

class PsicologoVinculadoSerializer(serializers.ModelSerializer):
    """Dados básicos do psicólogo vinculado — retornado no perfil do paciente"""
    nome_completo = serializers.SerializerMethodField()

    class Meta:
        model = Psicologo
        fields = ['id', 'crp', 'specialization', 'biography', 'nome_completo']

    def get_nome_completo(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip()


class UserSerializer(serializers.ModelSerializer):
    """
    Serializer para dados do usuário autenticado.
    Inclui paciente_id / psicologo_id e vínculo ativo (quando paciente).
    """
    paciente_id = serializers.SerializerMethodField()
    psicologo_id = serializers.SerializerMethodField()
    vinculo_ativo = serializers.SerializerMethodField()
    crp = serializers.CharField(source='psicologo_profile.crp', read_only=True)
    specialization = serializers.CharField(
        source='psicologo_profile.specialization',
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    biography = serializers.CharField(
        source='psicologo_profile.biography',
        required=False,
        allow_blank=True,
        allow_null=True,
    )

    class Meta:
        model = CustomUser
        fields = (
            'id', 'email', 'username', 'first_name', 'last_name',
            'user_type', 'phone', 'created_at',
            'paciente_id', 'psicologo_id', 'vinculo_ativo',
            'crp', 'specialization', 'biography',
        )
        read_only_fields = ('id', 'created_at')

    def get_paciente_id(self, obj):
        try:
            return obj.paciente_profile.id
        except Exception:
            return None

    def get_psicologo_id(self, obj):
        try:
            return obj.psicologo_profile.id
        except Exception:
            return None

    def get_vinculo_ativo(self, obj):
        """Retorna os dados do psicólogo vinculado ativo (apenas para pacientes)."""
        try:
            paciente = obj.paciente_profile
        except Exception:
            return None
        # Import lazy para evitar circular dependency
        from core.models import VinculoPacientePsicologo
        vinculo = VinculoPacientePsicologo.objects.filter(
            paciente=paciente,
            status='ativo'
        ).select_related('psicologo__user').first()
        if vinculo:
            return PsicologoVinculadoSerializer(vinculo.psicologo).data
        return None

    def update(self, instance, validated_data):
        psicologo_data = validated_data.pop('psicologo_profile', {})

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if hasattr(instance, 'psicologo_profile'):
            psicologo = instance.psicologo_profile
            if 'specialization' in psicologo_data:
                psicologo.specialization = psicologo_data.get('specialization')
            if 'biography' in psicologo_data:
                psicologo.biography = psicologo_data.get('biography')
            psicologo.save()

        return instance
