from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ProntuarioViewSet,
    VinculoViewSet, NotificacaoViewSet,
)

# Criar router para ViewSets
router = DefaultRouter()
router.register(r'prontuarios', ProntuarioViewSet, basename='prontuarios')
router.register(r'vinculos', VinculoViewSet, basename='vinculos')
router.register(r'notificacoes', NotificacaoViewSet, basename='notificacoes')

# URLs da API
urlpatterns = [
    path('', include(router.urls)),
]

# ============================================================
# REFERÊNCIA DE ENDPOINTS (Estado final)
# ============================================================
#
# TIPOS DE SESSÃO (psicólogo)
# GET    /api/tipos-sessao/              - Listar
# POST   /api/tipos-sessao/              - Criar
# GET    /api/tipos-sessao/{id}/         - Detalhar
# PUT    /api/tipos-sessao/{id}/         - Atualizar
# DELETE /api/tipos-sessao/{id}/         - Deletar
# GET    /api/tipos-sessao/ativos/       - Apenas ativos
#
# SESSÕES (ambos)
# GET    /api/sessoes/                   - Listar (paciente vê as suas; psicólogo vê as dele)
# POST   /api/sessoes/                   - Criar (somente psicólogo)
# GET    /api/sessoes/{id}/              - Detalhar
# GET    /api/sessoes/hoje/              - Sessões de hoje
# GET    /api/sessoes/semana/            - Sessões da semana
# GET    /api/sessoes/mes/               - Sessões do mês
# GET    /api/sessoes/proxima/           - Próxima sessão (paciente)
# GET    /api/sessoes/historico/         - Histórico realizado (paciente)
# GET    /api/sessoes/pendentes-pagamento/ - Pendentes de pagamento
# POST   /api/sessoes/{id}/cancelar/    - Cancelar
# POST   /api/sessoes/{id}/realizar/    - Marcar como realizada
# POST   /api/sessoes/{id}/confirmar-pagamento/ - Confirmar pagamento
# GET    /api/sessoes/estatisticas/      - Estatísticas (psicólogo)
# GET    /api/sessoes/pacientes-vinculados/ - Lista para agendamento
#
# PRONTUÁRIOS
# GET    /api/prontuarios/               - Listar (psicólogo: seus; paciente: os seus escritos pelo psicólogo)
# POST   /api/prontuarios/               - Criar (somente psicólogo)
# GET    /api/prontuarios/{id}/          - Detalhar
# PUT    /api/prontuarios/{id}/          - Atualizar (somente psicólogo)
# DELETE /api/prontuarios/{id}/          - Deletar (somente psicólogo)
#
# SEMENTES DO CUIDADO
# GET    /api/sementes-cuidado/          - Listar
# POST   /api/sementes-cuidado/          - Criar (somente psicólogo)
# POST   /api/sementes-cuidado/{id}/visualizar/ - Marcar visualização (paciente)
# POST   /api/sementes-cuidado/{id}/curtir/     - Curtir (paciente)
#
# REGISTROS ODISSEIA
# GET    /api/registros-odisseia/        - Listar (paciente: os seus; psicólogo: de seus pacientes)
# POST   /api/registros-odisseia/        - Criar (somente paciente)
# GET    /api/registros-odisseia/resumo/ - Estatísticas rápidas (paciente)
#
# VÍNCULOS
# GET    /api/vinculos/                  - Listar (psicólogo: seus pacientes; paciente: seus psicólogos)
# GET    /api/vinculos/ativos/           - Somente ativos (psicólogo)
# GET    /api/vinculos/meu-psicologo/    - Psicólogo vinculado ativo (paciente)
# POST   /api/vinculos/{id}/alterar-status/ - Alterar status (psicólogo)
# GET    /api/vinculos/{id}/resumo/      - Resumo do paciente (psicólogo)
#
# NOTIFICAÇÕES
# GET    /api/notificacoes/              - Listar notificações do usuário
# GET    /api/notificacoes/nao-lidas/    - Contagem de não lidas
# POST   /api/notificacoes/{id}/ler/     - Marcar como lida
# POST   /api/notificacoes/ler-todas/    - Marcar todas como lidas