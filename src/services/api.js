import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// URL base do seu backend Django
// const BASE_URL = 'http://127.0.0.1:8000/api';
const BASE_URL = 'http://192.168.15.85:8000/api';

// Criar instância do axios
const api = axios.create({
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

// Interceptor para tratar respostas e erros
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expirado, limpar dados do usuário
      await AsyncStorage.multiRemove(['@PsicoBem:token', '@PsicoBem:user']);
      // Aqui você pode redirecionar para tela de login se necessário
    }
    return Promise.reject(error);
  }
);

export default api;