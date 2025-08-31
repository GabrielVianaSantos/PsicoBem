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

class UserSerializer(serializers.ModelSerializer):
    """
    Serializer para dados do usuário autenticado
    """
    class Meta:
        model = CustomUser
        fields = ('id', 'email', 'username', 'first_name', 'last_name', 'user_type', 'phone', 'created_at')
        read_only_fields = ('id', 'created_at')