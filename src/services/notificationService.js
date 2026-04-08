import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

import api from './api';

const DEVICE_ID_KEY = '@PsicoBem:deviceId';

function getProjectId() {
  return Constants.expoConfig?.extra?.eas?.projectId
    || Constants.easConfig?.projectId
    || Constants.expoConfig?.projectId
    || null;
}

async function getDeviceId() {
  const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const generated = `device-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  await AsyncStorage.setItem(DEVICE_ID_KEY, generated);
  return generated;
}

async function getExpoPushTokenSafe() {
  const projectId = getProjectId();
  if (!projectId) {
    throw new Error('projectId não encontrado para Expo push token.');
  }

  const response = await Notifications.getExpoPushTokenAsync({ projectId });
  return response.data;
}

export const notificationService = {
  setupNotificationHandler() {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  },

  async updateBadge(count) {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.warn('Erro ao atualizar badge:', error);
    }
  },

  setupNotificationListeners(navigationRef) {
    const responseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = response?.notification?.request?.content?.data || {};
      const screen = data.screen || 'Notificacoes';
      const params = data.params || {};

      if (navigationRef?.current?.isReady?.()) {
        navigationRef.current.navigate(screen, params);
      }
    });

    const receivedSubscription = Notifications.addNotificationReceivedListener(() => {
      // Foreground notification: o handler já define apresentação nativa.
    });

    return () => {
      responseSubscription.remove();
      receivedSubscription.remove();
    };
  },

  async registerDevice() {
    if (!Device.isDevice) {
      return { success: false, skipped: true, message: 'Push nativo requer dispositivo físico.' };
    }

    const permission = await Notifications.getPermissionsAsync();
    let finalStatus = permission.status;

    if (finalStatus !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      finalStatus = requested.status;
    }

    if (finalStatus !== 'granted') {
      return { success: false, skipped: true, message: 'Permissão de notificação não concedida.' };
    }

    const pushToken = await getExpoPushTokenSafe();
    const deviceId = await getDeviceId();

    const payload = {
      push_token: pushToken,
      provider: 'expo',
      platform: Platform.OS,
      device_id: deviceId,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      app_version: Constants.expoConfig?.version || '',
      permissao_status: finalStatus,
    };

    const response = await api.post('/push/devices/register/', payload);
    return { success: true, data: response.data };
  },

  async deactivateDevice() {
    const deviceId = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
      return { success: false, skipped: true, message: 'Device não registrado localmente.' };
    }

    const response = await api.post('/push/devices/deactivate/', {
      device_id: deviceId,
      provider: 'expo',
    });

    return { success: true, data: response.data };
  },
};
