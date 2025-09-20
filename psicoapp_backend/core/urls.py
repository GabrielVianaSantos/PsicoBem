from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TipoSessaoViewSet, SessaoViewSet

# Criar router para ViewSets
router = DefaultRouter()
router.register(r'tipos-sessao', TipoSessaoViewSet, basename='tipossessao')
router.register(r'sessoes', SessaoViewSet, basename='sessoes')

# URLs da API
urlpatterns = [
    path('api/', include(router.urls)),
]

# URLs disponíveis:
# GET    /api/tipos-sessao/              - Listar tipos de sessão
# POST   /api/tipos-sessao/              - Criar tipo de sessão
# GET    /api/tipos-sessao/{id}/         - Detalhar tipo de sessão
# PUT    /api/tipos-sessao/{id}/         - Atualizar tipo de sessão
# DELETE /api/tipos-sessao/{id}/         - Deletar tipo de sessão
# GET    /api/tipos-sessao/ativos/       - Listar apenas tipos ativos

# GET    /api/sessoes/                   - Listar sessões
# POST   /api/sessoes/                   - Criar sessão
# GET    /api/sessoes/{id}/              - Detalhar sessão
# PUT    /api/sessoes/{id}/              - Atualizar sessão
# DELETE /api/sessoes/{id}/              - Deletar sessão
# GET    /api/sessoes/hoje/              - Sessões de hoje
# GET    /api/sessoes/semana/            - Sessões da semana
# GET    /api/sessoes/mes/               - Sessões do mês
# GET    /api/sessoes/pendentes-pagamento/ - Sessões com pagamento pendente
# POST   /api/sessoes/{id}/cancelar/     - Cancelar sessão
# POST   /api/sessoes/{id}/confirmar-pagamento/ - Confirmar pagamento
# GET    /api/sessoes/estatisticas/      - Estatísticas do psicólogo
# GET    /api/sessoes/pacientes-vinculados/ - Pacientes vinculados