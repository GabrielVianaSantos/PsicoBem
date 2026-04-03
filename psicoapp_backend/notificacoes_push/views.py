from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import DispositivoPush
from .serializers import DispositivoPushRegisterSerializer, DispositivoPushDeactivateSerializer


class RegisterDeviceView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = DispositivoPushRegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        dispositivo, created = DispositivoPush.objects.update_or_create(
            user=request.user,
            device_id=data["device_id"],
            provider=data["provider"],
            defaults={
                "push_token": data["push_token"],
                "platform": data["platform"],
                "timezone": data.get("timezone", "") or "",
                "app_version": data.get("app_version", "") or "",
                "permissao_status": data.get("permissao_status", DispositivoPush.PermissionStatus.UNDETERMINED),
                "ativo": True,
                "last_seen_at": timezone.now(),
            },
        )

        return Response(
            {
                "message": "Dispositivo registrado com sucesso.",
                "created": created,
                "device_id": dispositivo.device_id,
                "provider": dispositivo.provider,
                "ativo": dispositivo.ativo,
            },
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )


class DeactivateDeviceView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = DispositivoPushDeactivateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        updated = DispositivoPush.objects.filter(
            user=request.user,
            device_id=data["device_id"],
            provider=data.get("provider", DispositivoPush.Provider.EXPO),
        ).update(ativo=False, updated_at=timezone.now())

        return Response(
            {
                "message": "Dispositivo desativado com sucesso.",
                "updated": updated,
            },
            status=status.HTTP_200_OK,
        )
