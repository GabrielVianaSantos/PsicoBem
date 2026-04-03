from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TipoSessaoViewSet, SessaoViewSet

router = DefaultRouter()
router.register(r'tipos-sessao', TipoSessaoViewSet, basename='tipossessao')
router.register(r'', SessaoViewSet, basename='sessoes')

urlpatterns = [
    path('', include(router.urls)),
]
