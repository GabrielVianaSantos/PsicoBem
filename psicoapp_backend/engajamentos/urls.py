from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SementeCuidadoViewSet, RegistroOdisseiaViewSet

router = DefaultRouter()
router.register(r'sementes-cuidado', SementeCuidadoViewSet, basename='sementescuidado')
router.register(r'registros-odisseia', RegistroOdisseiaViewSet, basename='registrosodisseia')

urlpatterns = [
    path('', include(router.urls)),
]
