from django.urls import path
from .views import RegisterDeviceView, DeactivateDeviceView

urlpatterns = [
    path("push/devices/register/", RegisterDeviceView.as_view(), name="push-devices-register"),
    path("push/devices/deactivate/", DeactivateDeviceView.as_view(), name="push-devices-deactivate"),
]
