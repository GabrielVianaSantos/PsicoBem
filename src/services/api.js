import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

const BASE_URL = process.env.EXPO_PUBLIC_API_URL;

if (!BASE_URL) {
  throw new Error('EXPO_PUBLIC_API_URL não definida no ambiente.');
}

// Criar instância do axios
const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Cliente isolado (sem interceptors) usado exclusivamente para renovar o
// token. Evita que uma falha no próprio refresh reentre no laço de renovação.
const refreshClient = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token JWT automaticamente
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('@PsicoBem:token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      console.log('Erro ao buscar token:', error);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

async function clearSession() {
  await AsyncStorage.multiRemove([
    '@PsicoBem:user',
    '@PsicoBem:token',
    '@PsicoBem:refreshToken',
    '@PsicoBem:userType',
  ]);
}

// Fila de renovação: evita que N requisições em 401 simultâneo disparem
// N chamadas de refresh — a primeira renova, as demais aguardam o resultado.
let isRefreshing = false;
let refreshSubscribers = [];

function subscribeTokenRefresh(callback) {
  refreshSubscribers.push(callback);
}

function onRefreshed(newToken) {
  refreshSubscribers.forEach((callback) => callback(newToken));
  refreshSubscribers = [];
}

async function refreshAccessToken() {
  const refreshToken = await AsyncStorage.getItem('@PsicoBem:refreshToken');
  if (!refreshToken) {
    await clearSession();
    return null;
  }

  try {
    const response = await refreshClient.post('/auth/token/refresh/', { refresh: refreshToken });
    const { access, refresh } = response.data;

    const pairs = [['@PsicoBem:token', access]];
    if (refresh) {
      // ROTATE_REFRESH_TOKENS está ligado no backend: cada renovação
      // devolve um refresh token novo, que precisa ser persistido — senão
      // a sessão morre na renovação seguinte.
      pairs.push(['@PsicoBem:refreshToken', refresh]);
    }
    await AsyncStorage.multiSet(pairs);

    return access;
  } catch (error) {
    await clearSession();
    return null;
  }
}

// Interceptor para tratar respostas e erros
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config, response } = error;

    const isRefreshCall = config?.url?.includes('/auth/token/refresh/');
    if (response?.status !== 401 || isRefreshCall || config?._isRetryRequest) {
      return Promise.reject(error);
    }

    config._isRetryRequest = true;

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        subscribeTokenRefresh((newToken) => {
          if (!newToken) {
            reject(error);
            return;
          }
          config.headers.Authorization = `Bearer ${newToken}`;
          resolve(api(config));
        });
      });
    }

    isRefreshing = true;
    const newToken = await refreshAccessToken();
    isRefreshing = false;
    onRefreshed(newToken);

    if (!newToken) {
      return Promise.reject(error);
    }

    config.headers.Authorization = `Bearer ${newToken}`;
    return api(config);
  }
);

export default api;
