import re

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

# Aceita com ou sem esquema/www — apps de compartilhamento (principalmente
# no celular) costumam colar só "meet.google.com/xxx-yyyy-zzz", sem
# "https://" na frente.
MEET_LINK_REGEX = re.compile(r'^(?:https?://)?(?:www\.)?meet\.google\.com(/\S+)$', re.IGNORECASE)


def normalizar_link_meet(value):
    """Retorna a URL normalizada (sempre com https://) ou None se não for um link do Meet
    com um código de sala (exige algo depois de "meet.google.com/")."""
    value = (value or '').strip()
    match = MEET_LINK_REGEX.match(value)
    if not match:
        return None
    return f'https://meet.google.com{match.group(1)}'


def validar_link_sala_video(value):
    normalizado = normalizar_link_meet(value)
    if not normalizado:
        raise serializers.ValidationError(
            'Informe o link da sua sala do Google Meet (crie uma em meet.google.com/new).'
        )
    return normalizado


class PsicologoRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer específico para registro de psicólogos
    """
    user = UserRegistrationSerializer()
    link_sala_video = serializers.CharField()

    class Meta:
        model = Psicologo
        fields = ('user', 'crp', 'specialization', 'link_sala_video')

    def validate_link_sala_video(self, value):
        return validar_link_sala_video(value)

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
                existing = CustomUser.objects.filter(email=email).first()
                if existing is not None and not existing.has_usable_password():
                    raise serializers.ValidationError(
                        'Esta conta foi criada com o Google. Use o botão "Entre com o Google".'
                    )
                raise serializers.ValidationError('Credenciais inválidas')
            if not user.is_active:
                raise serializers.ValidationError('Conta desativada')
            attrs['user'] = user
            return attrs
        else:
            raise serializers.ValidationError('Email e senha são obrigatórios')

class GoogleCompleteRegistrationSerializer(serializers.Serializer):
    """
    Completa o cadastro iniciado via Google. `email` e `google_sub` NÃO
    entram aqui de propósito — vêm exclusivamente do registration_token
    assinado, decodificado na view antes desta validação.
    """
    CPF_REGEX = re.compile(r'^\d{3}\.\d{3}\.\d{3}-\d{2}$')
    CRP_REGEX = re.compile(r'^\d{2}/\d{4,6}$')

    user_type = serializers.ChoiceField(choices=CustomUser.USER_TYPE_CHOICES)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True, default='')
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, allow_null=True, default='')
    cpf = serializers.CharField(required=False, allow_blank=True)
    gender = serializers.CharField(required=False, allow_blank=True)
    crp = serializers.CharField(required=False, allow_blank=True)
    specialization = serializers.CharField(required=False, allow_blank=True, allow_null=True, default='')
    link_sala_video = serializers.CharField(required=False, allow_blank=True, default='')

    def validate(self, attrs):
        user_type = attrs.get('user_type')
        errors = {}

        if user_type == 'paciente':
            cpf = attrs.get('cpf', '')
            if not self.CPF_REGEX.match(cpf or ''):
                errors['cpf'] = ['Informe um CPF válido no formato XXX.XXX.XXX-XX.']
            elif Paciente.objects.filter(cpf=cpf).exists():
                errors['cpf'] = ['Paciente com este CPF já existe.']

            gender = attrs.get('gender', '')
            if gender not in ('M', 'F', 'O'):
                errors['gender'] = ['Informe um gênero válido (M, F ou O).']

        elif user_type == 'psicologo':
            crp = attrs.get('crp', '')
            if not self.CRP_REGEX.match(crp or ''):
                errors['crp'] = ['Informe um CRP válido no formato XX/XXXXX.']
            elif Psicologo.objects.filter(crp=crp).exists():
                errors['crp'] = ['Psicólogo com este CRP já existe.']

            link_normalizado = normalizar_link_meet(attrs.get('link_sala_video'))
            if not link_normalizado:
                errors['link_sala_video'] = [
                    'Informe o link da sua sala do Google Meet (crie uma em meet.google.com/new).'
                ]
            else:
                attrs['link_sala_video'] = link_normalizado

        if errors:
            raise serializers.ValidationError(errors)
        return attrs


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
    cpf = serializers.CharField(source='paciente_profile.cpf', read_only=True)
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
    link_sala_video = serializers.CharField(
        source='psicologo_profile.link_sala_video',
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    has_password = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = (
            'id', 'email', 'username', 'first_name', 'last_name',
            'user_type', 'phone', 'created_at',
            'paciente_id', 'psicologo_id', 'vinculo_ativo',
            'crp', 'cpf', 'specialization', 'biography', 'link_sala_video',
            'auth_provider', 'email_verified', 'avatar_url', 'has_password',
        )
        read_only_fields = (
            'id', 'email', 'created_at',
            'auth_provider', 'email_verified', 'avatar_url', 'has_password',
        )

    def get_has_password(self, obj):
        return obj.has_usable_password()

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

    def validate_link_sala_video(self, value):
        value = (value or '').strip()
        if not value:
            return value
        normalizado = normalizar_link_meet(value)
        if not normalizado:
            raise serializers.ValidationError(
                'Informe o link da sua sala do Google Meet (crie uma em meet.google.com/new).'
            )
        return normalizado

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
            if 'link_sala_video' in psicologo_data:
                psicologo.link_sala_video = psicologo_data.get('link_sala_video')
            psicologo.save()

        return instance
