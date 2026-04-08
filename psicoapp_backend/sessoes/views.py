from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied
from django.utils import timezone
from sessoes.models import Sessao, TipoSessao
from sessoes.serializers import (
    TipoSessaoSerializer, TipoSessaoCreateSerializer,
    SessaoListSerializer, SessaoDetailSerializer,
    SessaoCreateSerializer, SessaoUpdateSerializer,
    EstatisticasSessaoSerializer
)
from core.models import VinculoPacientePsicologo
from core.serializers import PacienteBasicSerializer
from core.views import IsPsicologoOwner, IsPacienteOrPsicologoOwner


class TipoSessaoViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciar tipos de sessão"""
    permission_classes = [IsPsicologoOwner]

    def get_queryset(self):
        """Retorna apenas tipos de sessão do psicólogo logado"""
        return TipoSessao.objects.filter(psicologo=self.request.user.psicologo_profile)

    def get_serializer_class(self):
        if self.action == 'create':
            return TipoSessaoCreateSerializer
        return TipoSessaoSerializer

    def perform_create(self, serializer):
        """Associa o tipo de sessão ao psicólogo logado"""
        serializer.save(psicologo=self.request.user.psicologo_profile)

    @action(detail=False, methods=['get'])
    def ativos(self, request):
        """Retorna apenas tipos de sessão ativos"""
        tipos_ativos = self.get_queryset().filter(ativo=True)
        serializer = self.get_serializer(tipos_ativos, many=True)
        return Response(serializer.data)


class SessaoViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciar sessões"""
    permission_classes = [IsPacienteOrPsicologoOwner]

    def get_queryset(self):
        """Retorna sessões baseadas no tipo de usuário"""
        if hasattr(self.request.user, 'psicologo_profile'):
            return Sessao.objects.filter(
                psicologo=self.request.user.psicologo_profile
            ).select_related('paciente__user', 'tipo_sessao').order_by('-data_hora')

        elif hasattr(self.request.user, 'paciente_profile'):
            return Sessao.objects.filter(
                paciente=self.request.user.paciente_profile
            ).select_related('psicologo__user', 'tipo_sessao').order_by('-data_hora')

        return Sessao.objects.none()

    def get_serializer_class(self):
        if self.action == 'list':
            return SessaoListSerializer
        elif self.action == 'create':
            return SessaoCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return SessaoUpdateSerializer
        return SessaoDetailSerializer

    def perform_create(self, serializer):
        """Criar sessão associada ao psicólogo logado"""
        if not hasattr(self.request.user, 'psicologo_profile'):
            raise PermissionDenied("Apenas psicólogos podem criar sessões.")
        serializer.save()

    # ==================== ACTIONS CUSTOMIZADAS ====================

    @action(detail=False, methods=['get'])
    def hoje(self, request):
        """Retorna sessões de hoje"""
        hoje = timezone.now().date()
        sessoes_hoje = self.get_queryset().filter(data_hora__date=hoje)
        serializer = self.get_serializer(sessoes_hoje, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def semana(self, request):
        """Retorna sessões da semana atual"""
        hoje = timezone.now().date()
        inicio_semana = hoje - timezone.timedelta(days=hoje.weekday())
        fim_semana = inicio_semana + timezone.timedelta(days=6)

        sessoes_semana = self.get_queryset().filter(
            data_hora__date__range=[inicio_semana, fim_semana]
        )
        serializer = self.get_serializer(sessoes_semana, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def mes(self, request):
        """Retorna sessões do mês especificado ou atual"""
        ano = request.query_params.get('ano', timezone.now().year)
        mes = request.query_params.get('mes', timezone.now().month)

        try:
            ano = int(ano)
            mes = int(mes)
        except (ValueError, TypeError):
            return Response(
                {'error': 'Ano e mês devem ser números inteiros.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        sessoes_mes = self.get_queryset().filter(
            data_hora__year=ano,
            data_hora__month=mes
        )
        serializer = self.get_serializer(sessoes_mes, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def proxima(self, request):
        """Paciente: retorna a próxima sessão agendada."""
        if not hasattr(request.user, 'paciente_profile'):
            return Response(
                {'error': 'Apenas pacientes podem acessar este endpoint.'},
                status=status.HTTP_403_FORBIDDEN
            )
        proxima = self.get_queryset().filter(
            status__in=['agendada', 'confirmada'],
            data_hora__gte=timezone.now()
        ).order_by('data_hora').first()

        if not proxima:
            return Response({'detail': 'Nenhuma sessão agendada.'}, status=status.HTTP_404_NOT_FOUND)

        serializer = SessaoDetailSerializer(proxima)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def historico(self, request):
        """Paciente: histórico de sessões realizadas."""
        historico_qs = self.get_queryset().filter(status='realizada').order_by('-data_hora')
        serializer = self.get_serializer(historico_qs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='pendentes-pagamento')
    def pendentes_pagamento(self, request):
        """Retorna sessões com pagamento pendente"""
        if not hasattr(request.user, 'psicologo_profile'):
            return Response(
                {'error': 'Apenas psicólogos podem acessar esta informação.'},
                status=status.HTTP_403_FORBIDDEN
            )

        sessoes_pendentes = self.get_queryset().filter(
            status='realizada',
            status_pagamento='pendente'
        )
        serializer = self.get_serializer(sessoes_pendentes, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def cancelar(self, request, pk=None):
        """Cancela uma sessão específica"""
        sessao = self.get_object()

        if not sessao.pode_ser_cancelada():
            return Response(
                {'error': 'Esta sessão não pode ser cancelada.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        sessao.status = 'cancelada'
        sessao.save()

        # Issue 04: Notificação de cancelamento bidirecional
        from core.services import NotificationDomainService
        
        data_formatada = sessao.data_hora.strftime("%d/%m/%Y às %H:%M")
        route = NotificationDomainService._routing_payload(
            screen='DetalhesSessao',
            params={'id': sessao.pk},
            event='sessao_cancelada',
            session_id=sessao.pk,
        )

        if hasattr(request.user, 'psicologo_profile'):
            # Psicólogo cancelou → notifica paciente
            NotificationDomainService.emit(
                target=sessao.paciente.user,
                tipo='sessao_cancelada',
                titulo='Sessão Cancelada',
                mensagem=f'Sua sessão de {data_formatada} foi cancelada pelo psicólogo.',
                link_relacionado=f'/sessoes/{sessao.pk}',
                dados_extras=route,
            )
        else:
            # Paciente cancelou → notifica psicólogo
            NotificationDomainService.emit(
                target=sessao.psicologo.user,
                tipo='sessao_cancelada',
                titulo='Sessão Cancelada',
                mensagem=f'{sessao.paciente.user.first_name} cancelou a sessão de {data_formatada}.',
                link_relacionado=f'/sessoes/{sessao.pk}',
                dados_extras=route,
            )

        serializer = self.get_serializer(sessao)
        return Response({
            'message': 'Sessão cancelada com sucesso.',
            'sessao': serializer.data
        })

    @action(detail=True, methods=['post'])
    def realizar(self, request, pk=None):
        """Marca uma sessão como realizada"""
        sessao = self.get_object()

        if sessao.status == 'cancelada':
            return Response(
                {'error': 'Não é possível marcar uma sessão cancelada como realizada.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        sessao.status = 'realizada'
        sessao.save()

        # Issue 07: Notificar paciente sobre sessão realizada
        from core.services import NotificationDomainService
        NotificationDomainService.emit(
            target=sessao.paciente.user,
            tipo='sistema',
            titulo='Sessão Finalizada ✨',
            mensagem='Sua sessão foi concluída. Que tal registrar como você está se sentindo na Odisseia?',
            link_relacionado='/odisseia/novo',
            dados_extras=NotificationDomainService._routing_payload(
                screen='RegistrosOdisseia',
                event='sessao_realizada',
            ),
        )

        serializer = self.get_serializer(sessao)
        return Response({
            'message': 'Sessão marcada como realizada com sucesso.',
            'sessao': serializer.data
        })

    @action(detail=True, methods=['post'], url_path='confirmar-pagamento')
    def confirmar_pagamento(self, request, pk=None):
        """Confirma o pagamento de uma sessão"""
        if not hasattr(request.user, 'psicologo_profile'):
            return Response(
                {'error': 'Apenas psicólogos podem confirmar pagamentos.'},
                status=status.HTTP_403_FORBIDDEN
            )

        sessao = self.get_object()

        if sessao.status != 'realizada':
            return Response(
                {'error': 'Apenas sessões realizadas podem ter pagamento confirmado.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if sessao.status_pagamento == 'pago':
            return Response(
                {'error': 'Pagamento já foi confirmado.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        sessao.confirmar_pagamento()

        serializer = self.get_serializer(sessao)
        return Response({
            'message': 'Pagamento confirmado com sucesso.',
            'sessao': serializer.data
        })

    @action(detail=False, methods=['get'])
    def estatisticas(self, request):
        """Retorna estatísticas das sessões do psicólogo"""
        if not hasattr(request.user, 'psicologo_profile'):
            return Response(
                {'error': 'Apenas psicólogos podem acessar estatísticas.'},
                status=status.HTTP_403_FORBIDDEN
            )

        ano = request.query_params.get('ano')
        mes = request.query_params.get('mes')

        stats = Sessao.estatisticas_psicologo(
            self.request.user.psicologo_profile,
            ano=int(ano) if ano else None,
            mes=int(mes) if mes else None
        )

        serializer = EstatisticasSessaoSerializer(stats)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='pacientes-vinculados')
    def pacientes_vinculados(self, request):
        """Retorna pacientes vinculados ao psicólogo para agendamento"""
        if not hasattr(request.user, 'psicologo_profile'):
            return Response(
                {'error': 'Apenas psicólogos podem acessar esta informação.'},
                status=status.HTTP_403_FORBIDDEN
            )

        vinculos = VinculoPacientePsicologo.objects.filter(
            psicologo=request.user.psicologo_profile,
            status='ativo'
        ).select_related('paciente__user')

        pacientes = [vinculo.paciente for vinculo in vinculos]
        serializer = PacienteBasicSerializer(pacientes, many=True)
        return Response(serializer.data)

