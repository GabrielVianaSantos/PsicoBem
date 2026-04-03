from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('authentication.urls')),
    path('api/sessoes/', include('sessoes.urls')),
    path('api/', include('engajamentos.urls')),
    path('api/', include('core.urls')),
    path('api/', include('notificacoes_push.urls')),
]
