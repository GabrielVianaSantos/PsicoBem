from rest_framework import serializers
from .models import DispositivoPush


class DispositivoPushRegisterSerializer(serializers.Serializer):
    push_token = serializers.CharField(max_length=255)
    provider = serializers.ChoiceField(choices=DispositivoPush.Provider.choices, default=DispositivoPush.Provider.EXPO)
    platform = serializers.ChoiceField(choices=DispositivoPush.Platform.choices)
    device_id = serializers.CharField(max_length=100)
    timezone = serializers.CharField(max_length=100, required=False, allow_blank=True)
    app_version = serializers.CharField(max_length=50, required=False, allow_blank=True)
    permissao_status = serializers.ChoiceField(
        choices=DispositivoPush.PermissionStatus.choices,
        required=False,
        default=DispositivoPush.PermissionStatus.UNDETERMINED,
    )


class DispositivoPushDeactivateSerializer(serializers.Serializer):
    device_id = serializers.CharField(max_length=100)
    provider = serializers.ChoiceField(choices=DispositivoPush.Provider.choices, required=False, default=DispositivoPush.Provider.EXPO)
