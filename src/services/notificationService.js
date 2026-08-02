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

// ─── Mapa de rotas disponíveis por perfil ────────────────────────────────────
// Rotas que existem no navigator de cada perfil.
// Atualizar ao registrar novas telas em routes.js.
const ROUTES_BY_PROFILE = {
  psicologo: new Set([
    'HomeBarNavigation', 'Home', 'Sessoes', 'AgendarSessao', 'DetalhesSessao',
    'TipoSessao', 'PerfilPsicologo', 'Prontuarios', 'SementesCuidado',
    'GuiasApoio', 'RegistrosOdisseia', 'RegistroCompleto', 'Navigation',
    'VinculosPacientes', 'Notificacoes', 'PerfilPaciente',
  ]),
  paciente: new Set([
    'HomePaciente', 'ConexaoTerapeutica', 'RegistrosOdisseia', 'PerfilPaciente',
    'RegistroCompleto', 'DetalhesSessao', 'MinhasSessoes', 'MeuPsicologo',
    'SementesPaciente', 'MeusProntuarios', 'Notificacoes',
  ]),
};

/**
 * Issue 03 — Resolve a rota canônica a partir de dados_extras da inbox ou
 * de data do push. Valida a rota contra o perfil autenticado do usuário.
 *
 * Suporta payload legado onde sessão era enviada com params.id em vez de
 * params.sessaoId.
 *
 * @param {object|null} dados - dados_extras (inbox) ou data (push).
 * @param {string} userType - 'psicologo' | 'paciente' | null.
 * @returns {{ screen: string, params: object }}
 */
export function resolveNotificationRoute(dados, userType) {
  const FALLBACK = { screen: 'Notificacoes', params: {} };

  if (!dados || typeof dados !== 'object') return FALLBACK;

  const screen = typeof dados.screen === 'string' && dados.screen.trim()
    ? dados.screen.trim()
    : null;

  if (!screen) return FALLBACK;

  // Normalizar params: garantir que sessões legadas (params.id) virem sessaoId
  let params = dados.params && typeof dados.params === 'object'
    ? { ...dados.params }
    : {};

  if (screen === 'DetalhesSessao' && params.id && !params.sessaoId) {
    // Compatibilidade com payload antigo — não remover 'id' para não quebrar
    // consumidores externos, mas garantir que sessaoId exista.
    params = { ...params, sessaoId: params.id };
  }

  // Verificar se a rota existe no perfil atual
  const allowedRoutes = ROUTES_BY_PROFILE[userType] || new Set();
  if (!allowedRoutes.has(screen)) {
    // Rota inválida para o perfil → fallback seguro
    console.warn(
      `[notificationService] Rota "${screen}" não disponível para perfil "${userType}". Redirecionando para Notificacoes.`
    );
    return FALLBACK;
  }

  return { screen, params };
}

/**
 * Issue 03 — Dispatcher compartilhado para push nativo e inbox interna.
 *
 * Responsabilidades:
 * 1. Resolver rota canônica com validação de perfil.
 * 2. Aguardar o NavigationContainer estar pronto (cold start / background).
 * 3. Marcar a notificação como lida quando notification_id estiver presente.
 * 4. Navegar para a tela ou para Notificacoes como fallback.
 * 5. Não duplicar navegação em toques repetidos (guard via Promise).
 *
 * @param {object|null} dados - dados_extras ou data do push.
 * @param {string} userType - 'psicologo' | 'paciente' | null.
 * @param {object} navigationRef - ref do NavigationContainer.
 * @param {{ alreadyRead?: boolean }} options
 */
export async function dispatchNotification(dados, userType, navigationRef, options = {}) {
  const { screen, params } = resolveNotificationRoute(dados, userType);

  // Marcar como lida se houver notification_id e ainda não estiver lida
  // notification_id pode vir de dados.notification_id (push) ou de options.notification_id (inbox)
  const notificationId = dados?.notification_id || options.notification_id;
  if (notificationId && !options.alreadyRead) {
    try {
      await api.post(`/notificacoes/${notificationId}/ler/`);
    } catch (e) {
      // Não bloquear navegação por falha na marcação de leitura
      console.warn('[notificationService] Falha ao marcar como lida:', e?.message);
    }
  }

  // Aguardar o NavigationContainer ficar pronto (cold start / background)
  // Tentativa com timeout de 8 s para evitar loop infinito
  const MAX_WAIT_MS = 8000;
  const POLL_INTERVAL_MS = 100;
  let elapsed = 0;

  while (!navigationRef?.current?.isReady?.()) {
    if (elapsed >= MAX_WAIT_MS) {
      console.warn('[notificationService] NavigationContainer não ficou pronto a tempo.');
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
    elapsed += POLL_INTERVAL_MS;
  }

  try {
    navigationRef.current.navigate(screen, params);
  } catch (e) {
    // Segurança extra: se a rota não existir de fato, navegar para fallback
    console.warn(`[notificationService] Erro ao navegar para "${screen}":`, e?.message);
    try {
      navigationRef.current.navigate('Notificacoes', {});
    } catch (_) {
      // Nada mais a fazer
    }
  }
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

  /**
   * Issue 03 — Configura os listeners de push usando o dispatcher compartilhado.
   *
   * @param {object} navigationRef - ref do NavigationContainer.
   * @param {{ getUserType?: () => string|null }} opts - função para obter o perfil atual.
   */
  setupNotificationListeners(navigationRef, opts = {}) {
    // Guard para evitar navegação duplicada em toque repetido
    let navigating = false;

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(
      async (response) => {
        if (navigating) return;
        navigating = true;
        try {
          const data = response?.notification?.request?.content?.data || {};
          const userType = typeof opts.getUserType === 'function' ? opts.getUserType() : null;
          await dispatchNotification(data, userType, navigationRef);
        } finally {
          // Liberar o guard após breve delay para evitar duplo clique
          setTimeout(() => { navigating = false; }, 500);
        }
      }
    );

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
