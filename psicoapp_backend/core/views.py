from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import PermissionDenied
from rest_framework.throttling import UserRateThrottle, SimpleRateThrottle
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from django.db.models import Q
from datetime import datetime, date
from sessoes.models import Sessao, TipoSessao
from engajamentos.models import RegistroOdisseia
from .models import (
    VinculoPacientePsicologo, ConviteVinculo, NotificacaoSistema, Prontuario,
)
from . import serializers
from .serializers import (
    PacienteBasicSerializer,
    ProntuarioSerializer, VinculoPacientePsicologoSerializer,
    NotificacaoSerializer, ConviteVinculoSerializer,
)
from authentication.models import Paciente, Psicologo
from authentication.services import normalizar_codigo_curto


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

class VinculoViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet para gerenciar vínculos Paciente-Psicólogo.
    - Psicólogo: lista seus pacientes, altera status, vê resumo.
    - Paciente: vê seu psicólogo vinculado ativo.

    Somente leitura nas rotas genéricas do DRF: não existe caso de uso para
    criação/edição/remoção genérica de vínculo. Toda criação e transição de
    status passa por actions dedicadas, com verificação de perfil — nunca
    pelo PATCH/PUT/DELETE padrão (ver SPEC_VINCULO_CONVITE_E_SOLICITACAO.md,
    seção 3.3). Reintroduzir ModelViewSet aqui reabre a brecha do paciente
    auto-aprovar a própria solicitação.
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

    @action(detail=False, methods=['get'], url_path='solicitacoes-pendentes')
    def solicitacoes_pendentes(self, request):
        """
        Psicólogo: lista as solicitações de vínculo por CRP aguardando
        decisão (issue 06/09). Roda a expiração defensiva antes de listar,
        para que uma solicitação vencida nunca apareça como pendente
        mesmo que a task periódica não tenha rodado ainda.
        """
        if not hasattr(request.user, 'psicologo_profile'):
            return Response(
                {'error': 'Apenas psicólogos podem acessar esta lista.'},
                status=status.HTTP_403_FORBIDDEN
            )

        from core.services import expirar_solicitacoes_vencidas

        psicologo = request.user.psicologo_profile
        expirar_solicitacoes_vencidas(VinculoPacientePsicologo.objects.filter(psicologo=psicologo))

        vinculos = VinculoPacientePsicologo.objects.filter(
            psicologo=psicologo, status='pendente'
        ).select_related('paciente__user').order_by('data_solicitacao')
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

    @action(detail=False, methods=['get'], url_path='minha-solicitacao-pendente')
    def minha_solicitacao_pendente(self, request):
        """
        Paciente: estado da própria solicitação por CRP mais recente, para
        o card "Aguardando resposta do profissional" da HomePaciente
        (issue 11). Roda a expiração defensiva antes de responder.
        """
        if not hasattr(request.user, 'paciente_profile'):
            return Response(
                {'error': 'Apenas pacientes podem acessar este endpoint.'},
                status=status.HTTP_403_FORBIDDEN
            )

        from core.services import expirar_se_vencido

        paciente = request.user.paciente_profile
        vinculo = VinculoPacientePsicologo.objects.filter(
            paciente=paciente, status='pendente'
        ).select_related('psicologo__user').order_by('-data_solicitacao').first()

        if vinculo is None:
            return Response({'pendente': False})

        expirar_se_vencido(vinculo)
        if vinculo.status != 'pendente':
            return Response({'pendente': False})

        serializer = self.get_serializer(vinculo)
        return Response({'pendente': True, 'vinculo': serializer.data})

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

        # Notificar paciente sobre alteração no vínculo
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
            # Issue 02: event=vinculo_alterado → MeuPsicologo; params com status atual
            dados_extras=NotificationDomainService._routing_payload(
                screen='MeuPsicologo',
                params={'status': novo_status},
                event='vinculo_alterado',
                entity_type='vinculo',
                entity_id=vinculo.id,
            ),
        )

        return Response({
            'message': f'Vínculo atualizado para "{novo_status}".',
            'vinculo': serializer.data,
        })

    def _get_solicitacao_do_psicologo(self, request, pk):
        """
        Busca a solicitação `pk`, checando posse sem vazar pela rota
        genérica de queryset (403 quando não é do psicólogo, não 404 —
        mesmo padrão de `encerrar`). Retorna (vinculo, response_de_erro).
        """
        if not hasattr(request.user, 'psicologo_profile'):
            return None, Response(
                {'error': 'Apenas psicólogos podem decidir sobre uma solicitação.'},
                status=status.HTTP_403_FORBIDDEN
            )

        vinculo = VinculoPacientePsicologo.objects.filter(pk=pk).select_related(
            'paciente__user', 'psicologo__user'
        ).first()
        if vinculo is None:
            return None, Response({'detail': 'Solicitação não encontrada.'}, status=status.HTTP_404_NOT_FOUND)

        if vinculo.psicologo_id != request.user.psicologo_profile.id:
            return None, Response(
                {'error': 'Você não pode decidir sobre a solicitação de outro psicólogo.'},
                status=status.HTTP_403_FORBIDDEN
            )

        from core.services import expirar_se_vencido
        expirar_se_vencido(vinculo)
        if vinculo.status != 'pendente':
            return None, Response(
                {'error': 'Esta solicitação não está mais pendente.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        return vinculo, None

    @action(detail=True, methods=['post'])
    def aceitar(self, request, pk=None):
        """
        Psicólogo: aceita uma solicitação de vínculo por CRP (issue 06).
        Ativa o vínculo e, se o paciente tiver adquirido outro vínculo
        ativo nesse meio-tempo, encerra o anterior na mesma transação
        (reutiliza o serviço da issue 04 — não duplicar a lógica aqui).
        """
        vinculo, erro = self._get_solicitacao_do_psicologo(request, pk)
        if erro is not None:
            return erro

        from core.services import encerrar_vinculo_por_paciente

        paciente = vinculo.paciente
        with transaction.atomic():
            vinculo_atual = VinculoPacientePsicologo.objects.filter(
                paciente=paciente, status='ativo'
            ).exclude(pk=vinculo.pk).select_related('psicologo__user').first()
            if vinculo_atual is not None:
                encerrar_vinculo_por_paciente(vinculo_atual, novo_psicologo=vinculo.psicologo)

            vinculo.status = 'ativo'
            vinculo.save()

            from core.services import NotificationDomainService
            NotificationDomainService.emit(
                target=paciente.user,
                tipo='sistema',
                titulo='Solicitação Aceita! 🎉',
                mensagem=f'{vinculo.psicologo.user.first_name} aceitou seu pedido de vínculo.',
                link_relacionado='/meu-psicologo',
                dados_extras=NotificationDomainService._routing_payload(
                    screen='MeuPsicologo',
                    event='solicitacao_aceita',
                    entity_type='vinculo',
                    entity_id=vinculo.id,
                ),
            )

        serializer = self.get_serializer(vinculo)
        return Response({'message': 'Solicitação aceita.', 'vinculo': serializer.data})

    @action(detail=True, methods=['post'])
    def recusar(self, request, pk=None):
        """Psicólogo: recusa uma solicitação de vínculo por CRP (issue 06)."""
        vinculo, erro = self._get_solicitacao_do_psicologo(request, pk)
        if erro is not None:
            return erro

        from core.services import notificar_solicitacao_indisponivel

        vinculo.status = 'recusado'
        vinculo.save()
        notificar_solicitacao_indisponivel(vinculo)

        serializer = self.get_serializer(vinculo)
        return Response({'message': 'Solicitação recusada.', 'vinculo': serializer.data})

    @action(detail=True, methods=['post'])
    def encerrar(self, request, pk=None):
        """
        Paciente: encerra o próprio vínculo ativo (issue 04). Efeito
        idêntico ao de uma troca por convite — sessões futuras canceladas,
        prontuários apagados, psicólogo notificado — via
        `core.services.encerrar_vinculo_por_paciente`.
        """
        if not hasattr(request.user, 'paciente_profile'):
            return Response(
                {'error': 'Apenas pacientes podem encerrar um vínculo.'},
                status=status.HTTP_403_FORBIDDEN
            )

        vinculo = VinculoPacientePsicologo.objects.filter(pk=pk).select_related(
            'paciente__user', 'psicologo__user'
        ).first()
        if vinculo is None:
            return Response({'detail': 'Vínculo não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        if vinculo.paciente_id != request.user.paciente_profile.id:
            return Response(
                {'error': 'Você não pode encerrar o vínculo de outro paciente.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if vinculo.status != 'ativo':
            return Response(
                {'error': 'Este vínculo não está ativo.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        from core.services import resumo_perda_vinculo

        if not request.data.get('confirmar'):
            return Response({
                'error': 'Confirmação necessária.',
                'resumo': resumo_perda_vinculo(vinculo),
            }, status=status.HTTP_400_BAD_REQUEST)

        from core.services import encerrar_vinculo_por_paciente
        resultado = encerrar_vinculo_por_paciente(vinculo)

        return Response({
            'message': 'Vínculo encerrado com sucesso.',
            **resultado,
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
# CONVITES DE VÍNCULO
#####################################################################################################################################

class ConviteResolverUserThrottle(UserRateThrottle):
    """Limita tentativas de resgate/resolução de convite por usuário autenticado."""
    scope = 'convite_resolver_user'


class ConviteResolverIPThrottle(SimpleRateThrottle):
    """
    Limita por IP, independentemente do usuário — o espaço de códigos de
    convite é pequeno o suficiente para ser varrido por força bruta com
    contas diferentes (SPEC_VINCULO_CONVITE_E_SOLICITACAO.md, seção 5).
    """
    scope = 'convite_resolver_ip'

    def get_cache_key(self, request, view):
        return self.cache_format % {
            'scope': self.scope,
            'ident': self.get_ident(request),
        }


class ConviteInvalidoError(Exception):
    """Erro de resolução de convite — `code` é 'invalido', 'usado' ou 'revogado'."""
    def __init__(self, code):
        self.code = code
        super().__init__(code)


_CONVITE_ERRO_MENSAGENS = {
    # 'invalido' cobre tanto "não encontrado" quanto "expirado" de propósito:
    # devem ser indistinguíveis para quem está tentando adivinhar códigos.
    'invalido': 'Convite não encontrado ou expirado.',
    'usado': 'Este convite já foi utilizado.',
    'revogado': 'Este convite foi revogado.',
}


class ConviteViewSet(viewsets.GenericViewSet):
    """
    Convite de vínculo (SPEC_VINCULO_CONVITE_E_SOLICITACAO.md, seções 3.5–3.7):
    - Psicólogo: obtém o link/código permanente, gera, lista e revoga
      convites de uso único.
    - Paciente: resolve (só consulta) e aceita (cria o vínculo, já ativo).
    """
    serializer_class = ConviteVinculoSerializer
    permission_classes = [IsAuthenticated]

    MAX_CONVITES_ATIVOS = 20

    def get_queryset(self):
        if hasattr(self.request.user, 'psicologo_profile'):
            return ConviteVinculo.objects.filter(
                psicologo=self.request.user.psicologo_profile
            ).select_related('usado_por__user')
        return ConviteVinculo.objects.none()

    def list(self, request):
        """GET /api/convites/ — lista os convites de uso único do psicólogo."""
        if not hasattr(request.user, 'psicologo_profile'):
            return Response(
                {'error': 'Apenas psicólogos podem listar convites.'},
                status=status.HTTP_403_FORBIDDEN
            )
        serializer = self.get_serializer(self.get_queryset(), many=True)
        return Response(serializer.data)

    def create(self, request):
        """POST /api/convites/ — cria um convite de uso único (`apelido` opcional)."""
        if not hasattr(request.user, 'psicologo_profile'):
            return Response(
                {'error': 'Apenas psicólogos podem criar convites.'},
                status=status.HTTP_403_FORBIDDEN
            )

        psicologo = request.user.psicologo_profile
        convites_ativos = sum(1 for c in self.get_queryset() if c.valido)
        if convites_ativos >= self.MAX_CONVITES_ATIVOS:
            return Response({
                'error': f'Limite de {self.MAX_CONVITES_ATIVOS} convites ativos simultâneos atingido.'
            }, status=status.HTTP_400_BAD_REQUEST)

        apelido = (request.data.get('apelido') or '').strip() or None
        convite = ConviteVinculo.objects.create(psicologo=psicologo, apelido=apelido)
        serializer = self.get_serializer(convite)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'], url_path='meu-link')
    def meu_link(self, request):
        """GET /api/convites/meu-link/ — slug, código permanente, URL e conteúdo do QR."""
        if not hasattr(request.user, 'psicologo_profile'):
            return Response(
                {'error': 'Apenas psicólogos podem acessar o próprio link de convite.'},
                status=status.HTTP_403_FORBIDDEN
            )
        psicologo = request.user.psicologo_profile
        url = f'{settings.CONVITE_BASE_URL}/c/{psicologo.slug}'
        return Response({
            'slug': psicologo.slug,
            'codigo_convite': psicologo.codigo_convite,
            'url': url,
            'qr_content': url,
        })

    @action(detail=True, methods=['post'])
    def revogar(self, request, pk=None):
        """POST /api/convites/{id}/revogar/ — marca `revogado=True`."""
        if not hasattr(request.user, 'psicologo_profile'):
            return Response(
                {'error': 'Apenas psicólogos podem revogar convites.'},
                status=status.HTTP_403_FORBIDDEN
            )
        convite = self.get_queryset().filter(pk=pk).first()
        if convite is None:
            return Response({'detail': 'Convite não encontrado.'}, status=status.HTTP_404_NOT_FOUND)

        convite.revogado = True
        convite.save(update_fields=['revogado'])
        return Response(self.get_serializer(convite).data)

    # ---------- Lado paciente ----------

    def _resolver_convite(self, *, codigo=None, slug=None):
        """
        Retorna (tipo, psicologo, convite_unico_ou_None). `tipo` é
        'permanente' (slug ou codigo_convite do psicólogo) ou 'unico'
        (ConviteVinculo de uso único). Levanta ConviteInvalidoError caso
        contrário — nunca recebe o id do psicólogo por parâmetro.
        """
        if slug:
            psicologo = Psicologo.objects.filter(slug__iexact=slug.strip()).first()
            if psicologo is None:
                raise ConviteInvalidoError('invalido')
            return ('permanente', psicologo, None)

        codigo_normalizado = normalizar_codigo_curto(codigo or '')
        if not codigo_normalizado:
            raise ConviteInvalidoError('invalido')

        psicologo = Psicologo.objects.filter(codigo_convite__iexact=codigo_normalizado).first()
        if psicologo is not None:
            return ('permanente', psicologo, None)

        convite = ConviteVinculo.objects.select_related('psicologo__user').filter(
            codigo__iexact=codigo_normalizado
        ).first()
        if convite is None:
            raise ConviteInvalidoError('invalido')
        if convite.revogado:
            raise ConviteInvalidoError('revogado')
        if convite.usado_em is not None:
            raise ConviteInvalidoError('usado')
        if convite.expira_em <= timezone.now():
            raise ConviteInvalidoError('invalido')

        return ('unico', convite.psicologo, convite)

    @action(
        detail=False, methods=['get'],
        throttle_classes=[ConviteResolverUserThrottle, ConviteResolverIPThrottle],
    )
    def resolver(self, request):
        """
        GET /api/convites/resolver/?codigo=<x> ou ?slug=<y> — apenas
        resolve e descreve, sem criar nada.
        """
        if not hasattr(request.user, 'paciente_profile'):
            return Response(
                {'error': 'Apenas pacientes podem resolver convites.'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            tipo, psicologo, convite = self._resolver_convite(
                codigo=request.query_params.get('codigo'),
                slug=request.query_params.get('slug'),
            )
        except ConviteInvalidoError as exc:
            return Response(
                {'detail': _CONVITE_ERRO_MENSAGENS[exc.code], 'code': exc.code},
                status=status.HTTP_404_NOT_FOUND,
            )

        paciente = request.user.paciente_profile
        vinculo_atual = VinculoPacientePsicologo.objects.filter(
            paciente=paciente, status='ativo'
        ).select_related('psicologo__user').first()

        avisos = {'tem_vinculo_ativo': False}
        if vinculo_atual:
            from core.services import resumo_perda_vinculo
            avisos = {'tem_vinculo_ativo': True, **resumo_perda_vinculo(vinculo_atual)}

        return Response({
            'tipo': tipo,
            'psicologo': {
                'id': psicologo.id,
                'nome_completo': f'{psicologo.user.first_name} {psicologo.user.last_name}'.strip(),
                'crp': psicologo.crp,
                'specialization': psicologo.specialization,
                'biography': psicologo.biography,
            },
            'avisos': avisos,
        })

    @action(
        detail=False, methods=['post'],
        throttle_classes=[ConviteResolverUserThrottle, ConviteResolverIPThrottle],
    )
    def aceitar(self, request):
        """
        POST /api/convites/aceitar/ com `codigo` ou `slug` — cria o vínculo
        já ativo. Se o paciente já tiver vínculo ativo com outro
        profissional, exige `confirmar_troca: true` (senão `409`).
        """
        if not hasattr(request.user, 'paciente_profile'):
            return Response(
                {'error': 'Apenas pacientes podem aceitar convites.'},
                status=status.HTTP_403_FORBIDDEN
            )

        try:
            tipo, psicologo, convite = self._resolver_convite(
                codigo=request.data.get('codigo'),
                slug=request.data.get('slug'),
            )
        except ConviteInvalidoError as exc:
            return Response(
                {'detail': _CONVITE_ERRO_MENSAGENS[exc.code], 'code': exc.code},
                status=status.HTTP_404_NOT_FOUND,
            )

        paciente = request.user.paciente_profile
        vinculo_atual = VinculoPacientePsicologo.objects.filter(
            paciente=paciente, status='ativo'
        ).select_related('psicologo__user').first()

        if vinculo_atual and vinculo_atual.psicologo_id == psicologo.id:
            return Response({
                'message': 'Você já está vinculado a este profissional.',
                'vinculo_id': vinculo_atual.id,
                'criado': False,
            })

        from core.services import resumo_perda_vinculo

        if vinculo_atual and not request.data.get('confirmar_troca'):
            return Response({
                'error': 'Confirmação de troca necessária.',
                'resumo': resumo_perda_vinculo(vinculo_atual),
            }, status=status.HTTP_409_CONFLICT)

        origem = 'convite_link' if request.data.get('slug') else 'convite_codigo'

        with transaction.atomic():
            if vinculo_atual:
                from core.services import encerrar_vinculo_por_paciente
                encerrar_vinculo_por_paciente(vinculo_atual, novo_psicologo=psicologo)

            vinculo = VinculoPacientePsicologo.objects.create(
                paciente=paciente, psicologo=psicologo, status='ativo', origem=origem,
            )

            if convite is not None:
                convite.usado_em = timezone.now()
                convite.usado_por = paciente
                convite.save(update_fields=['usado_em', 'usado_por'])

            from core.services import NotificationDomainService
            NotificationDomainService.emit(
                target=psicologo.user,
                tipo='sistema',
                titulo='Novo Paciente Conectado 🤝',
                mensagem=f'{paciente.user.first_name} se conectou ao seu perfil via convite.',
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
            'message': 'Vínculo criado com sucesso.',
            'vinculo_id': vinculo.id,
            'criado': True,
        }, status=status.HTTP_201_CREATED)


#####################################################################################################################################
# PRONTUÁRIOS (GUIAS DE APOIO)
#####################################################################################################################################

class ProntuarioViewSet(viewsets.ModelViewSet):
    """
    ViewSet para Prontuários.
    - Psicólogo: CRUD completo de seus prontuários.
    - Paciente: NENHUM acesso. Prontuário é dado clínico sensível, de uso
      exclusivo do psicólogo autor — o paciente nunca deve ler, listar ou
      receber notificação com o conteúdo ou a existência de um prontuário.
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
        return Prontuario.objects.none()

    def perform_create(self, serializer):
        if not hasattr(self.request.user, 'psicologo_profile'):
            raise PermissionDenied("Apenas psicólogos podem criar prontuários.")
        serializer.save(psicologo=self.request.user.psicologo_profile)

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

    # Categorias exibidas como badge nos cards de menu das telas Home.
    # 'sessao_lembrete' é intencionalmente excluído: é um lembrete de algo
    # que o usuário já sabe, não uma novidade de estado.
    CATEGORIA_FILTROS = {
        'sementes': Q(tipo='nova_semente') | Q(dados_extras__event='semente_curtida'),
        'sessoes': (
            Q(tipo__in=['sessao_agendada', 'sessao_cancelada'])
            | Q(dados_extras__event__in=['sessao_realizada', 'sessao_nao_realizada'])
        ),
        'odisseia': Q(tipo__in=['novo_registro', 'comentario_psicologo']),
    }

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

    @action(detail=False, methods=['delete'], url_path='limpar-todas')
    def limpar_todas(self, request):
        """Remove todo o histórico de notificações do usuário logado."""
        count, _ = self.get_queryset().delete()
        return Response({'message': f'{count} notificação(ões) removida(s).'})

    @action(detail=False, methods=['get'], url_path='resumo-por-categoria')
    def resumo_por_categoria(self, request):
        """Indica, por assunto, se há notificação não lida — para acender os badges dos cards de menu."""
        base = self.get_queryset().filter(lida=False)
        return Response({
            categoria: base.filter(filtro).exists()
            for categoria, filtro in self.CATEGORIA_FILTROS.items()
        })

    @action(detail=False, methods=['post'], url_path='marcar-categoria-lida')
    def marcar_categoria_lida(self, request):
        """Marca como lidas as notificações não lidas de uma categoria (limpa o badge do card correspondente)."""
        categoria = request.data.get('categoria')
        filtro = self.CATEGORIA_FILTROS.get(categoria)
        if filtro is None:
            return Response({'error': 'Categoria inválida.'}, status=status.HTTP_400_BAD_REQUEST)

        self.get_queryset().filter(lida=False).filter(filtro).update(
            lida=True, data_leitura=timezone.now()
        )
        return Response(status=status.HTTP_204_NO_CONTENT)
