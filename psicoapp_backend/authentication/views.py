from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import CustomUser, Paciente, Psicologo
from .serializers import (
    UserRegistrationSerializer,
    PacienteRegistrationSerializer, 
    PsicologoRegistrationSerializer,
    UserLoginSerializer,
    UserSerializer
)

class PacienteRegistrationView(generics.CreateAPIView):
    """
    View para cadastro de pacientes
    """
    queryset = Paciente.objects.all()
    serializer_class = PacienteRegistrationSerializer
    permission_classes = [AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            paciente = serializer.save()
            
            # Gerar tokens JWT
            refresh = RefreshToken.for_user(paciente.user)
            
            return Response({
                'message': 'Paciente cadastrado com sucesso!',
                'user': UserSerializer(paciente.user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class PsicologoRegistrationView(generics.CreateAPIView):
    """
    View para cadastro de psicólogos
    """
    queryset = Psicologo.objects.all()
    serializer_class = PsicologoRegistrationSerializer
    permission_classes = [AllowAny]
    
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            psicologo = serializer.save()
            
            # Gerar tokens JWT
            refresh = RefreshToken.for_user(psicologo.user)
            
            return Response({
                'message': 'Psicólogo cadastrado com sucesso!',
                'user': UserSerializer(psicologo.user).data,
                'tokens': {
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                }
            }, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
@permission_classes([AllowAny])
def login_view(request):
    """
    View para login de usuários
    """
    serializer = UserLoginSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        
        # Gerar tokens JWT
        refresh = RefreshToken.for_user(user)
        
        return Response({
            'message': 'Login realizado com sucesso!',
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_profile_view(request):
    """
    View para obter dados do usuário autenticado
    """
    serializer = UserSerializer(request.user)
    return Response(serializer.data, status=status.HTTP_200_OK)

@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def user_update_view(request):
    """
    View para atualizar dados do usuário autenticado
    """
    serializer = UserSerializer(request.user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response({
            'message': 'Perfil atualizado com sucesso!',
            'user': serializer.data
        }, status=status.HTTP_200_OK)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)