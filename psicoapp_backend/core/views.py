from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q
from datetime import datetime, date
from sessoes.models import Sessao, TipoSessao
from engajamentos.models import RegistroOdisseia
from .models import (
    VinculoPacientePsicologo, NotificacaoSistema, Prontuario,
)
from . import serializers
from .serializers import (
    PacienteBasicSerializer,
    ProntuarioSerializer, VinculoPacientePsicologoSerializer,
    NotificacaoSerializer,
)
from authentication.models import Paciente


# ==================== PERMISSIONS CUSTOMIZADAS ====================

class IsPsicologoOwner(permissions.BasePermission):
    """
    Permissão customizada para verificar se o usuário é psicólogo
    e é o dono do objeto
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            hasattr(request.user, 'psicologo_profile')
        )

    def has_object_permission(self, request, view, obj):
        if hasattr(obj, 'psicologo'):
            return obj.psicologo == request.user.psicologo_profile
        return False


class IsPacienteOrPsicologoOwner(permissions.BasePermission):
    """
    Permissão para pacientes verem suas próprias sessões
    ou psicólogos verem sessões de seus pacientes
    """
    def has_permission(self, request, view):
        return (
            request.user and
            request.user.is_authenticated and
            (hasattr(request.user, 'psicologo_profile') or hasattr(request.user, 'paciente_profile'))
        )

    def has_object_permission(self, request, view, obj):
        if hasattr(request.user, 'psicologo_profile'):
            return obj.psicologo == request.user.psicologo_profile
        elif hasattr(request.user, 'paciente_profile'):
            return obj.paciente == request.user.paciente_profile
        return False


# ==================== VIEWSETS ====================

#####################################################################################################################################
# VÍNCULOS PACIENTE-PSICÓLOGO
#####################################################################################################################################

class VinculoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para gerenciar vínculos Paciente-Psicólogo.
    - Psicólogo: lista seus pacientes, altera status, vê resumo.
    - Paciente: vê seu psicólogo vinculado ativo.
    """
    permission_classes = [IsAuthenticated]
    serializer_class = VinculoPacientePsicologoSerializer

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'psicologo_profile'):
            return VinculoPacientePsicologo.objects.filter(
                psicologo=user.psicologo_profile
            ).select_related('paciente__user')
        elif hasattr(user, 'paciente_profile'):
            return VinculoPacientePsicologo.objects.filter(
                paciente=user.paciente_profile
            ).select_related('psicologo__user')
        return VinculoPacientePsicologo.objects.none()

    @action(detail=False, methods=['get'])
    def ativos(self, request):
        """Psicólogo: lista apenas vínculos com pacientes ativos."""
        if not hasattr(request.user, 'psicologo_profile'):
            return Response(
                {'error': 'Apenas psicólogos podem acessar esta lista.'},
                status=status.HTTP_403_FORBIDDEN
            )
        vinculos = self.get_queryset().filter(status='ativo')
        serializer = self.get_serializer(vinculos, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='meu-psicologo')
    def meu_psicologo(self, request):
        """Paciente: retorna os dados completos do psicólogo vinculado ativo."""
        if not hasattr(request.user, 'paciente_profile'):
            return Response(
                {'error': 'Apenas pacientes podem acessar este endpoint.'},
                status=status.HTTP_403_FORBIDDEN
            )

        vinculo = VinculoPacientePsicologo.objects.filter(
            paciente=request.user.paciente_profile,
            status='ativo'
        ).select_related('psicologo__user').first()

        if not vinculo:
            return Response({'detail': 'Nenhum psicólogo vinculado.'}, status=status.HTTP_404_NOT_FOUND)

        p = vinculo.psicologo
        return Response({
            'vinculo_id': vinculo.id,
            'data_inicio': vinculo.data_inicio_tratamento,
            'duracao_dias': vinculo.duracao_tratamento,
            'status': vinculo.status,
            'permite_visualizar_registros': vinculo.permite_visualizar_registros,
            'permite_comentarios': vinculo.permite_comentarios,
            'psicologo': {
                'id': p.id,
                'nome_completo': f"{p.user.first_name} {p.user.last_name}".strip(),
                'crp': p.crp,
                'specialization': p.specialization,
                'biography': p.biography,
                'email': p.user.email,
            },
        })

    @action(detail=True, methods=['post'], url_path='alterar-status')
    def alterar_status(self, request, pk=None):
        """Psicólogo: altera o status de um vínculo (inativar, suspender, finalizar)."""
        if not hasattr(request.user, 'psicologo_profile'):
            return Response(
                {'error': 'Apenas psicólogos podem alterar vínculos.'},
                status=status.HTTP_403_FORBIDDEN
            )

        vinculo = self.get_object()
        novo_status = request.data.get('status')
        status_validos = ['ativo', 'inativo', 'suspenso', 'finalizado']

        if novo_status not in status_validos:
            return Response(
                {'error': f'Status inválido. Opções: {", ".join(status_validos)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        vinculo.status = novo_status
        if novo_status == 'finalizado' and not vinculo.data_fim_tratamento:
            vinculo.data_fim_tratamento = date.today()
        vinculo.save()

        serializer = self.get_serializer(vinculo)

        # Issue 10: Notificar paciente sobre alteração no vínculo
        from core.services import NotificationDomainService
        status_display = {
            'ativo': 'Ativado',
            'inativo': 'Inativado',
            'suspenso': 'Suspenso',
            'finalizado': 'Finalizado'
        }.get(novo_status, novo_status)

        NotificationDomainService.emit(
            target=vinculo.paciente.user,
            tipo='sistema',
            titulo='Vínculo Atualizado 🔄',
            mensagem=f'O status do seu vínculo com {vinculo.psicologo.user.first_name} foi alterado para: {status_display}.',
            link_relacionado='/meu-psicologo',
            dados_extras=NotificationDomainService._routing_payload(
                screen='MeuPsicologo',
                event='vinculo_alterado',
                status=novo_status,
            ),
        )

        return Response({
            'message': f'Vínculo atualizado para "{novo_status}".',
            'vinculo': serializer.data,
        })

    @action(detail=True, methods=['get'])
    def resumo(self, request, pk=None):
        """Psicólogo: resumo clínico completo de um paciente vinculado."""
        if not hasattr(request.user, 'psicologo_profile'):
            return Response(
                {'error': 'Apenas psicólogos podem ver este resumo.'},
                status=status.HTTP_403_FORBIDDEN
            )

        vinculo = self.get_object()
        paciente = vinculo.paciente
        psicologo = request.user.psicologo_profile

        sessoes = Sessao.objects.filter(paciente=paciente, psicologo=psicologo)
        registros = RegistroOdisseia.objects.filter(
            paciente=paciente, compartilhar_psicologo=True
        ).order_by('-data_registro')

        return Response({
            'paciente': {
                'id': paciente.id,
                'nome_completo': f"{paciente.user.first_name} {paciente.user.last_name}".strip(),
                'email': paciente.user.email,
                'cpf': paciente.cpf,
                'gender': paciente.gender,
                'birth_date': paciente.birth_date,
            },
            'vinculo': {
                'status': vinculo.status,
                'data_inicio': vinculo.data_inicio_tratamento,
                'duracao_dias': vinculo.duracao_tratamento,
                'motivo': vinculo.motivo_vinculo,
            },
            'sessoes_resumo': {
                'total': sessoes.count(),
                'realizadas': sessoes.filter(status='realizada').count(),
                'agendadas': sessoes.filter(status__in=['agendada', 'confirmada']).count(),
                'canceladas': sessoes.filter(status='cancelada').count(),
            },
            'registros_odisseia_total': registros.count(),
        })


#####################################################################################################################################
# PRONTUÁRIOS (GUIAS DE APOIO)
#####################################################################################################################################

class ProntuarioViewSet(viewsets.ModelViewSet):
    """
    ViewSet para Prontuários.
    - Psicólogo: CRUD completo de seus prontuários.
    - Paciente: apenas leitura dos prontuários escritos pelo seu psicólogo vinculado.
    """
    serializer_class = ProntuarioSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'psicologo_profile'):
            paciente_id = self.request.query_params.get('paciente_id')
            qs = Prontuario.objects.filter(psicologo=user.psicologo_profile)
            if paciente_id:
                qs = qs.filter(paciente_id=paciente_id)
            return qs
        elif hasattr(user, 'paciente_profile'):
            # Paciente vê apenas prontuários do seu psicólogo com vínculo ativo
            vinculo = VinculoPacientePsicologo.objects.filter(
                paciente=user.paciente_profile, status='ativo'
            ).first()
            if vinculo:
                return Prontuario.objects.filter(
                    paciente=user.paciente_profile,
                    psicologo=vinculo.psicologo
                ).order_by('-created_at')
        return Prontuario.objects.none()

    def perform_create(self, serializer):
        if not hasattr(self.request.user, 'psicologo_profile'):
            raise PermissionDenied("Apenas psicólogos podem criar prontuários.")
        prontuario = serializer.save(psicologo=self.request.user.psicologo_profile)

        # Issue 08: Notificar paciente sobre novo prontuário
        from core.services import NotificationDomainService
        NotificationDomainService.emit(
            target=prontuario.paciente.user,
            tipo='sistema',
            titulo='Novo Prontuário Disponível 📝',
            mensagem='Seu psicólogo disponibilizou uma nova guia ou prontuário para você.',
            link_relacionado='/prontuarios',
            dados_extras=NotificationDomainService._routing_payload(
                screen='MeusProntuarios',
                event='prontuario_criado',
                prontuario_id=prontuario.pk,
            ),
        )

    def update(self, request, *args, **kwargs):
        if not hasattr(request.user, 'psicologo_profile'):
            raise PermissionDenied("Apenas psicólogos podem editar prontuários.")
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        if not hasattr(request.user, 'psicologo_profile'):
            raise PermissionDenied("Apenas psicólogos podem excluir prontuários.")
        return super().destroy(request, *args, **kwargs)


#####################################################################################################################################
# NOTIFICAÇÕES
#####################################################################################################################################

class NotificacaoViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para notificações.
    Retorna notificações do usuário logado (paciente ou psicólogo).
    """
    serializer_class = NotificacaoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'paciente_profile'):
            return NotificacaoSistema.objects.filter(paciente=user.paciente_profile)
        elif hasattr(user, 'psicologo_profile'):
            return NotificacaoSistema.objects.filter(psicologo=user.psicologo_profile)
        return NotificacaoSistema.objects.none()

    @action(detail=False, methods=['get'], url_path='nao-lidas')
    def nao_lidas(self, request):
        """Retorna a contagem de notificações não lidas."""
        count = self.get_queryset().filter(lida=False).count()
        return Response({'nao_lidas': count})

    @action(detail=True, methods=['post'])
    def ler(self, request, pk=None):
        """Marca uma notificação específica como lida."""
        notificacao = self.get_object()
        notificacao.marcar_como_lida()
        return Response({'message': 'Notificação marcada como lida.'})

    @action(detail=False, methods=['post'], url_path='ler-todas')
    def ler_todas(self, request):
        """Marca todas as notificações não lidas do usuário como lidas."""
        qs = self.get_queryset().filter(lida=False)
        count = qs.count()
        qs.update(lida=True, data_leitura=timezone.now())
        return Response({'message': f'{count} notificação(ões) marcada(s) como lida(s).'})
