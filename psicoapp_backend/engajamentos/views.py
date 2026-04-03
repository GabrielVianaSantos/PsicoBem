from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from engajamentos.models import (
    SementeCuidado, CategoriaMensagem, MensagemPaciente,
    CategoriaOdisseia, RegistroOdisseia, ComentarioPsicologo, MetaOdisseia
)
from engajamentos.serializers import SementeCuidadoSerializer, RegistroOdisseiaSerializer
from core.models import VinculoPacientePsicologo
from core.serializers import PacienteBasicSerializer

#####################################################################################################################################
# SEMENTES DO CUIDADO
#####################################################################################################################################

class SementeCuidadoViewSet(viewsets.ModelViewSet):
    """
    ViewSet para Sementes do Cuidado.
    - Psicólogo: CRUD completo de suas sementes.
    - Paciente: leitura das sementes do seu psicólogo vinculado + curtir/visualizar.
    """
    serializer_class = SementeCuidadoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'psicologo_profile'):
            return SementeCuidado.objects.filter(psicologo=user.psicologo_profile)
        elif hasattr(user, 'paciente_profile'):
            # Paciente vê sementes do SEU psicólogo vinculado ativo (públicas e ativas)
            vinculo = VinculoPacientePsicologo.objects.filter(
                paciente=user.paciente_profile, status='ativo'
            ).first()
            if vinculo:
                return SementeCuidado.objects.filter(
                    psicologo=vinculo.psicologo,
                    publica=True,
                    status='ativa'
                )
        return SementeCuidado.objects.none()

    def perform_create(self, serializer):
        if not hasattr(self.request.user, 'psicologo_profile'):
            raise PermissionDenied("Apenas psicólogos podem criar Sementes do Cuidado.")
        serializer.save(psicologo=self.request.user.psicologo_profile)

    @action(detail=True, methods=['post'])
    def visualizar(self, request, pk=None):
        """Paciente: marca uma semente como visualizada."""
        if not hasattr(request.user, 'paciente_profile'):
            return Response(
                {'error': 'Apenas pacientes podem usar este endpoint.'},
                status=status.HTTP_403_FORBIDDEN
            )
        semente = self.get_object()
        msg, _ = MensagemPaciente.objects.get_or_create(
            semente=semente,
            paciente=request.user.paciente_profile,
            defaults={'status': 'enviada'}
        )
        msg.marcar_como_visualizada()
        return Response({'message': 'Semente marcada como visualizada.'})

    @action(detail=True, methods=['post'])
    def curtir(self, request, pk=None):
        """Paciente: curte uma semente."""
        if not hasattr(request.user, 'paciente_profile'):
            return Response(
                {'error': 'Apenas pacientes podem usar este endpoint.'},
                status=status.HTTP_403_FORBIDDEN
            )
        semente = self.get_object()
        msg, _ = MensagemPaciente.objects.get_or_create(
            semente=semente,
            paciente=request.user.paciente_profile,
            defaults={'status': 'enviada'}
        )
        msg.marcar_como_curtida()
        return Response({'message': 'Semente curtida com sucesso!'})


#####################################################################################################################################
# REGISTROS ODISSEIA
#####################################################################################################################################

class RegistroOdisseiaViewSet(viewsets.ModelViewSet):
    """
    ViewSet para Registros Odisseia.
    - Paciente: CRUD dos seus próprios registros.
    - Psicólogo: leitura dos registros de seus pacientes vinculados (compartilhados).
    """
    serializer_class = RegistroOdisseiaSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if hasattr(user, 'paciente_profile'):
            return RegistroOdisseia.objects.filter(paciente=user.paciente_profile)
        elif hasattr(user, 'psicologo_profile'):
            paciente_id = self.request.query_params.get('paciente_id')
            if paciente_id:
                vinculo = VinculoPacientePsicologo.objects.filter(
                    psicologo=user.psicologo_profile,
                    paciente_id=paciente_id,
                    status='ativo'
                ).exists()
                if vinculo:
                    return RegistroOdisseia.objects.filter(
                        paciente_id=paciente_id,
                        compartilhar_psicologo=True
                    )
                return RegistroOdisseia.objects.none()
            else:
                vinculos = VinculoPacientePsicologo.objects.filter(
                    psicologo=user.psicologo_profile, status='ativo'
                )
                return RegistroOdisseia.objects.filter(
                    paciente__in=[v.paciente for v in vinculos],
                    compartilhar_psicologo=True
                )
        return RegistroOdisseia.objects.none()

    def perform_create(self, serializer):
        if not hasattr(self.request.user, 'paciente_profile'):
            raise PermissionDenied("Apenas pacientes podem criar Registros de Odisseia.")
        serializer.save(paciente=self.request.user.paciente_profile)

    @action(detail=False, methods=['get'])
    def resumo(self, request):
        """Paciente: estatísticas rápidas dos registros de humor."""
        if not hasattr(request.user, 'paciente_profile'):
            return Response(
                {'error': 'Apenas pacientes podem acessar este endpoint.'},
                status=status.HTTP_403_FORBIDDEN
            )
        from django.db.models import Avg, Count
        paciente = request.user.paciente_profile
        qs = RegistroOdisseia.objects.filter(paciente=paciente)

        stats = qs.aggregate(
            total=Count('id'),
            ansiedade_media=Avg('nivel_ansiedade'),
            estresse_medio=Avg('nivel_estresse'),
            energia_media=Avg('nivel_energia'),
        )

        ultimo = qs.order_by('-data_registro', '-hora_registro').first()
        humor_predominante = qs.values('humor_geral').annotate(
            count=Count('humor_geral')
        ).order_by('-count').first()

        return Response({
            **stats,
            'humor_predominante': humor_predominante,
            'ultimo_registro': {
                'data': ultimo.data_registro if ultimo else None,
                'humor': ultimo.get_humor_geral_display() if ultimo else None,
                'emoji': ultimo.get_emoji_humor() if ultimo else None,
            },
        })


