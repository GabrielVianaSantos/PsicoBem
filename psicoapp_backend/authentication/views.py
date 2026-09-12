from rest_framework import status, generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings
from django.contrib.auth import authenticate, update_session_auth_hash
from django.contrib.auth.tokens import default_token_generator
from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from .models import CustomUser, Paciente, Psicologo
from .serializers import (
    UserRegistrationSerializer,
    PacienteRegistrationSerializer,
    PsicologoRegistrationSerializer,
    UserLoginSerializer,
    UserSerializer,
    GoogleCompleteRegistrationSerializer,
)
from .services import (
    GoogleAuthError,
    decode_purpose_token,
    generate_unique_username,
    issue_purpose_token,
    verify_google_id_token,
)


def _auth_success_response(user, message, http_status=status.HTTP_200_OK):
    """
    Monta a resposta padrão de autenticação bem-sucedida (tokens JWT + user).
    Único ponto que gera `RefreshToken.for_user(user)` para login/cadastro.
    """
    refresh = RefreshToken.for_user(user)
    return Response({
        'status': 'authenticated',
        'message': message,
        'user': UserSerializer(user).data,
        'tokens': {
            'refresh': str(refresh),
            'access': str(refresh.access_token),
        }
    }, status=http_status)

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
            return _auth_success_response(
                paciente.user, 'Paciente cadastrado com sucesso!', status.HTTP_201_CREATED
            )

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
            return _auth_success_response(
                psicologo.user, 'Psicólogo cadastrado com sucesso!', status.HTTP_201_CREATED
            )

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
        return _auth_success_response(user, 'Login realizado com sucesso!')

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

@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_request_view(request):
    """
    View para solicitar redefinição de senha
    """
    email = request.data.get('email')
    if not email:
        return Response({'email': 'Este campo é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = CustomUser.objects.get(email=email)
        token = default_token_generator.make_token(user)
        uid = urlsafe_base64_encode(force_bytes(user.pk))
        
        # Log do token para desenvolvimento (já que não há e-mail)
        print(f"--- RESET PASSWORD TOKEN FOR {email} ---")
        print(f"UID: {uid}")
        print(f"TOKEN: {token}")
        print("------------------------------------------")
        
        return Response({
            'message': 'Link de redefinição gerado.',
            'uid': uid,
            'token': token # Retornando token para facilitar o dev agora
        }, status=status.HTTP_200_OK)
    except CustomUser.DoesNotExist:
        # Por segurança, não confirmamos se o email existe ou não
        return Response({'message': 'Se o email estiver cadastrado, você receberá um link.'}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([AllowAny])
def password_reset_confirm_view(request):
    """
    View para confirmar redefinição de senha usando token
    """
    uidb64 = request.data.get('uid')
    token = request.data.get('token')
    new_password = request.data.get('new_password')
    
    if not all([uidb64, token, new_password]):
        return Response({'detail': 'Dados incompletos.'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        uid = force_str(urlsafe_base64_decode(uidb64))
        user = CustomUser.objects.get(pk=uid)
    except (TypeError, ValueError, OverflowError, CustomUser.DoesNotExist):
        user = None
    
    if user is not None and default_token_generator.check_token(user, token):
        user.set_password(new_password)
        user.save()
        return Response({'message': 'Senha alterada com sucesso!'}, status=status.HTTP_200_OK)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def conecta_psicologo_view(request):
    """
    Vincula o paciente a um psicólogo via CRP.
    Cria (ou reativa) o VinculoPacientePsicologo.
    """
    crp = request.data.get('crp')
    if not crp:
        return Response({'crp': 'O CRP é obrigatório.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        psicologo = Psicologo.objects.get(crp=crp)
    except Psicologo.DoesNotExist:
        return Response({'detail': 'Profissional não encontrado com este CRP.'}, status=status.HTTP_404_NOT_FOUND)

    try:
        paciente = request.user.paciente_profile
    except AttributeError:
        return Response({'detail': 'Apenas pacientes podem se conectar a um psicólogo.'}, status=status.HTTP_403_FORBIDDEN)

    # Atualizar campo legado no Paciente (compatibilidade)
    paciente.psicologo = psicologo
    paciente.save()

    # Criar ou reativar VinculoPacientePsicologo
    from core.models import VinculoPacientePsicologo
    vinculo, created = VinculoPacientePsicologo.objects.get_or_create(
        paciente=paciente,
        psicologo=psicologo,
        defaults={
            'status': 'ativo',
            'motivo_vinculo': 'Busca via CRP',
        }
    )

    if not created and vinculo.status != 'ativo':
        vinculo.status = 'ativo'
        vinculo.data_fim_tratamento = None
        vinculo.save()

    # Issue 02: Notificar psicólogo sobre novo vínculo com pacienteId canônico
    from core.services import NotificationDomainService
    NotificationDomainService.emit(
        target=psicologo.user,
        tipo='sistema',
        titulo='Novo Paciente Conectado 🤝',
        mensagem=f'{request.user.first_name} se conectou ao seu perfil via CRP.',
        link_relacionado='/pacientes',
        dados_extras=NotificationDomainService._routing_payload(
            screen='VinculosPacientes',
            params={'pacienteId': paciente.pk},
            event='novo_vinculo',
            entity_type='paciente',
            entity_id=paciente.pk,
        ),
    )

    return Response({
        'message': 'Conexão realizada com sucesso!',
        'psicologo': {
            'nome': f"{psicologo.user.first_name} {psicologo.user.last_name}".strip(),
            'crp': psicologo.crp,
            'specialization': psicologo.specialization,
        },
        'vinculo_id': vinculo.id,
        'criado': created,
    }, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def paciente_dashboard_view(request):
    """
    Dashboard completo do paciente — retorna todos os dados necessários
    para a HomePaciente em uma única request.
    """
    try:
        paciente = request.user.paciente_profile
    except AttributeError:
        return Response({'detail': 'Apenas pacientes podem acessar o dashboard.'}, status=status.HTTP_403_FORBIDDEN)

    from core.models import VinculoPacientePsicologo, NotificacaoSistema
    from sessoes.models import Sessao
    from engajamentos.models import RegistroOdisseia
    from django.utils import timezone as tz

    # Psicólogo vinculado
    vinculo = VinculoPacientePsicologo.objects.filter(
        paciente=paciente, status='ativo'
    ).select_related('psicologo__user').first()

    psicologo_data = None
    if vinculo:
        p = vinculo.psicologo
        psicologo_data = {
            'id': p.id,
            'nome_completo': f"{p.user.first_name} {p.user.last_name}".strip(),
            'crp': p.crp,
            'specialization': p.specialization,
            'biography': p.biography,
        }

    # Próxima sessão
    proxima = Sessao.objects.filter(
        paciente=paciente,
        status__in=['agendada', 'confirmada'],
        data_hora__gte=tz.now()
    ).order_by('data_hora').first()

    proxima_data = None
    if proxima:
        proxima_data = {
            'id': proxima.id,
            'data_hora': proxima.data_hora,
            'data_hora_formatada': tz.localtime(proxima.data_hora).strftime('%d/%m/%Y às %H:%M'),
            'tipo': proxima.tipo_sessao.nome if proxima.tipo_sessao else 'Sessão',
            'status': proxima.status,
        }

    # Último registro odisseia
    ultimo_registro = RegistroOdisseia.objects.filter(
        paciente=paciente
    ).order_by('-data_registro', '-hora_registro').first()

    ultimo_registro_data = None
    if ultimo_registro:
        ultimo_registro_data = {
            'id': ultimo_registro.id,
            'data_registro': ultimo_registro.data_registro,
            'humor_geral': ultimo_registro.humor_geral,
            'humor_display': ultimo_registro.get_humor_geral_display(),
            'emoji': ultimo_registro.get_emoji_humor(),
        }

    # Notificações não lidas
    nao_lidas = NotificacaoSistema.objects.filter(paciente=paciente, lida=False).count()

    return Response({
        'psicologo_vinculado': psicologo_data,
        'proxima_sessao': proxima_data,
        'ultimo_registro_odisseia': ultimo_registro_data,
        'notificacoes_nao_lidas': nao_lidas,
    })

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def password_change_view(request):
    """
    View para alteração de senha (logado).
    Conta sem senha utilizável (ex.: criada via Google) pode definir uma
    senha sem informar "senha atual".
    """
    new_password = request.data.get('new_password')

    if not new_password or len(new_password) < 6:
        return Response(
            {'new_password': 'A senha deve ter no mínimo 6 caracteres.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    if not request.user.has_usable_password():
        request.user.set_password(new_password)
        request.user.save()
        update_session_auth_hash(request, request.user)
        return Response({'message': 'Senha criada com sucesso!'}, status=status.HTTP_200_OK)

    old_password = request.data.get('old_password')

    if not authenticate(email=request.user.email, password=old_password):
        return Response({'old_password': 'Senha atual incorreta.'}, status=status.HTTP_400_BAD_REQUEST)

    request.user.set_password(new_password)
    request.user.save()
    update_session_auth_hash(request, request.user)

    return Response({'message': 'Senha alterada com sucesso!'}, status=status.HTTP_200_OK)


def _google_auth_not_configured_response():
    return Response(
        {'detail': 'Login com Google não está configurado.', 'code': 'google_auth_not_configured'},
        status=status.HTTP_503_SERVICE_UNAVAILABLE,
    )


@api_view(['POST'])
@permission_classes([AllowAny])
def google_auth_view(request):
    """
    Recebe o id_token do Google e decide entre login direto, vínculo
    (conta local com senha já existente) ou cadastro (e-mail desconhecido).
    """
    if not settings.GOOGLE_AUTH_ENABLED:
        return _google_auth_not_configured_response()

    raw_token = request.data.get('id_token')
    if not raw_token:
        return Response(
            {'detail': 'id_token é obrigatório.', 'code': 'invalid_google_token'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        payload = verify_google_id_token(raw_token)
    except GoogleAuthError as e:
        return Response({'detail': e.message, 'code': e.code}, status=e.http_status)

    google_sub = payload['sub']
    email = payload['email']
    first_name = payload.get('given_name', '') or ''
    last_name = payload.get('family_name', '') or ''
    picture = payload.get('picture', '') or ''

    user = CustomUser.objects.filter(google_sub=google_sub).first()
    if user is not None:
        if not user.is_active:
            return Response(
                {'detail': 'Conta desativada.', 'code': 'account_disabled'},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        return _auth_success_response(user, 'Login realizado com sucesso!')

    user = CustomUser.objects.filter(email=email).first()
    if user is not None:
        if not user.is_active:
            return Response(
                {'detail': 'Conta desativada.', 'code': 'account_disabled'},
                status=status.HTTP_401_UNAUTHORIZED,
            )

        if user.has_usable_password():
            link_token, ttl = issue_purpose_token(
                'link', {'sub': google_sub, 'email': email, 'picture': picture}
            )
            return Response({
                'status': 'link_confirmation_required',
                'link_token': link_token,
                'expires_in': ttl,
                'email': email,
            }, status=status.HTTP_200_OK)

        user.google_sub = google_sub
        user.email_verified = True
        if not user.avatar_url:
            user.avatar_url = picture
        user.save()
        return _auth_success_response(user, 'Login realizado com sucesso!')

    registration_token, ttl = issue_purpose_token(
        'registration', {'sub': google_sub, 'email': email, 'picture': picture}
    )
    return Response({
        'status': 'registration_required',
        'registration_token': registration_token,
        'expires_in': ttl,
        'prefill': {
            'email': email,
            'first_name': first_name,
            'last_name': last_name,
            'picture': picture,
        },
    }, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def google_link_view(request):
    """
    Confirma a vinculação de uma conta local existente (com senha) à
    identidade Google, mediante confirmação da senha atual.
    """
    if not settings.GOOGLE_AUTH_ENABLED:
        return _google_auth_not_configured_response()

    link_token = request.data.get('link_token')
    password = request.data.get('password')

    try:
        claims = decode_purpose_token(link_token, 'link')
    except GoogleAuthError:
        return Response(
            {'detail': 'Token expirado ou inválido.', 'code': 'link_token_expired'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    email = claims['email']
    google_sub = claims['sub']
    picture = claims.get('picture', '') or ''

    user = CustomUser.objects.filter(email=email).first()
    if user is None:
        return Response(
            {'detail': 'Token expirado ou inválido.', 'code': 'link_token_expired'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    if not user.check_password(password):
        return Response(
            {'password': ['Senha incorreta.'], 'code': 'invalid_password'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user.google_sub = google_sub
    user.email_verified = True
    if not user.avatar_url:
        user.avatar_url = picture
    user.save()

    return _auth_success_response(user, 'Login realizado com sucesso!')


@api_view(['POST'])
@permission_classes([AllowAny])
def google_complete_registration_view(request):
    """
    Completa o cadastro (paciente ou psicólogo) de uma conta iniciada via
    Google. `email` e `google_sub` vêm exclusivamente do registration_token.
    """
    if not settings.GOOGLE_AUTH_ENABLED:
        return _google_auth_not_configured_response()

    registration_token = request.data.get('registration_token')

    try:
        claims = decode_purpose_token(registration_token, 'registration')
    except GoogleAuthError:
        return Response(
            {'detail': 'Token expirado ou inválido.', 'code': 'registration_token_expired'},
            status=status.HTTP_401_UNAUTHORIZED,
        )

    email = claims['email']
    google_sub = claims['sub']
    picture = claims.get('picture', '') or ''

    body_email = request.data.get('email')
    if body_email and body_email != email:
        return Response(
            {'detail': 'E-mail não corresponde ao token.', 'code': 'invalid_google_token'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Idempotência: checar ANTES de validar o serializer, pois num retry o
    # CPF/CRP já pertence à conta recém-criada e falharia na validação de
    # unicidade sem ser de fato um conflito.
    existing = CustomUser.objects.filter(google_sub=google_sub).first()
    if existing is not None:
        return _auth_success_response(existing, 'Login realizado com sucesso!')

    serializer = GoogleCompleteRegistrationSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data
    user_type = data['user_type']

    with transaction.atomic():
        conflict = CustomUser.objects.filter(Q(email=email) | Q(google_sub=google_sub)).first()
        if conflict is not None:
            if conflict.google_sub == google_sub:
                # Idempotência: duplo submit / retry de rede já processado.
                return _auth_success_response(conflict, 'Login realizado com sucesso!')
            return Response(
                {'detail': 'E-mail já está em uso.', 'code': 'email_taken'},
                status=status.HTTP_409_CONFLICT,
            )

        username = generate_unique_username(email)
        try:
            user = CustomUser.objects.create_user(
                email=email,
                username=username,
                first_name=data['first_name'],
                last_name=data.get('last_name', ''),
                phone=data.get('phone', ''),
                user_type=user_type,
            )
        except IntegrityError:
            username = generate_unique_username(email)
            user = CustomUser.objects.create_user(
                email=email,
                username=username,
                first_name=data['first_name'],
                last_name=data.get('last_name', ''),
                phone=data.get('phone', ''),
                user_type=user_type,
            )

        user.set_unusable_password()
        user.google_sub = google_sub
        user.email_verified = True
        user.auth_provider = 'google'
        user.avatar_url = picture
        user.save()

        if user_type == 'paciente':
            Paciente.objects.create(user=user, cpf=data['cpf'], gender=data['gender'])
        else:
            Psicologo.objects.create(
                user=user, crp=data['crp'], specialization=data.get('specialization', '')
            )

    return _auth_success_response(user, 'Cadastro realizado com sucesso!', status.HTTP_201_CREATED)
