from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q
from datetime import datetime, date
from .models import TipoSessao, Sessao, VinculoPacientePsicologo
from .serializers import (
    TipoSessaoSerializer, TipoSessaoCreateSerializer,
    SessaoListSerializer, SessaoDetailSerializer, 
    SessaoCreateSerializer, SessaoUpdateSerializer,
    EstatisticasSessaoSerializer, PacienteBasicSerializer
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
            hasattr(request.user, 'psicologo')
        )
    
    def has_object_permission(self, request, view, obj):
        # Para TipoSessao, verificar se pertence ao psicólogo
        if hasattr(obj, 'psicologo'):
            return obj.psicologo == request.user.psicologo
        # Para Sessao, verificar se o psicólogo é o responsável
        elif hasattr(obj, 'psicologo'):
            return obj.psicologo == request.user.psicologo
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
            (hasattr(request.user, 'psicologo') or hasattr(request.user, 'paciente'))
        )
    
    def has_object_permission(self, request, view, obj):
        # Se é psicólogo, pode ver sessões que ele conduz
        if hasattr(request.user, 'psicologo'):
            return obj.psicologo == request.user.psicologo
        # Se é paciente, pode ver apenas suas próprias sessões
        elif hasattr(request.user, 'paciente'):
            return obj.paciente == request.user.paciente
        return False

# ==================== VIEWSETS ====================

class TipoSessaoViewSet(viewsets.ModelViewSet):
    """ViewSet para gerenciar tipos de sessão"""
    permission_classes = [IsPsicologoOwner]
    
    def get_queryset(self):
        """Retorna apenas tipos de sessão do psicólogo logado"""
        return TipoSessao.objects.filter(psicologo=self.request.user.psicologo)
    
    def get_serializer_class(self):
        if self.action == 'create':
            return TipoSessaoCreateSerializer
        return TipoSessaoSerializer
    
    def perform_create(self, serializer):
        """Associa o tipo de sessão ao psicólogo logado"""
        serializer.save(psicologo=self.request.user.psicologo)
    
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
        if hasattr(self.request.user, 'psicologo'):
            # Psicólogos veem todas as suas sessões
            return Sessao.objects.filter(
                psicologo=self.request.user.psicologo
            ).select_related('paciente__user', 'tipo_sessao').order_by('-data_hora')
        
        elif hasattr(self.request.user, 'paciente'):
            # Pacientes veem apenas suas próprias sessões
            return Sessao.objects.filter(
                paciente=self.request.user.paciente
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
        if not hasattr(self.request.user, 'psicologo'):
            raise PermissionError("Apenas psicólogos podem criar sessões.")
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
    def pendentes_pagamento(self, request):
        """Retorna sessões com pagamento pendente"""
        if not hasattr(request.user, 'psicologo'):
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
        
        serializer = self.get_serializer(sessao)
        return Response({
            'message': 'Sessão cancelada com sucesso.',
            'sessao': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def confirmar_pagamento(self, request, pk=None):
        """Confirma o pagamento de uma sessão"""
        if not hasattr(request.user, 'psicologo'):
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
        if not hasattr(request.user, 'psicologo'):
            return Response(
                {'error': 'Apenas psicólogos podem acessar estatísticas.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Parâmetros opcionais para filtrar por período
        ano = request.query_params.get('ano')
        mes = request.query_params.get('mes')
        
        stats = Sessao.estatisticas_psicologo(
            self.request.user.psicologo, 
            ano=int(ano) if ano else None,
            mes=int(mes) if mes else None
        )
        
        serializer = EstatisticasSessaoSerializer(stats)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def pacientes_vinculados(self, request):
        """Retorna pacientes vinculados ao psicólogo para agendamento"""
        if not hasattr(request.user, 'psicologo'):
            return Response(
                {'error': 'Apenas psicólogos podem acessar esta informação.'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        vinculos = VinculoPacientePsicologo.objects.filter(
            psicologo=request.user.psicologo,
            status='ativo'
        ).select_related('paciente__user')
        
        pacientes = [vinculo.paciente for vinculo in vinculos]
        serializer = PacienteBasicSerializer(pacientes, many=True)
        return Response(serializer.data)