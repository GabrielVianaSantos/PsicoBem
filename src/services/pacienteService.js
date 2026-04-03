import api from './api';
import { sessaoService } from './sessaoService';

export const pacienteService = {

  // ==================== DASHBOARD ====================

  async getDashboard() {
    try {
      const response = await api.get('/auth/paciente/dashboard/');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Erro getDashboard:', error);
      return { success: false, message: this._extractError(error) };
    }
  },

  // ==================== VÍNCULOS ====================

  async getMeuPsicologo() {
    try {
      const response = await api.get('/vinculos/meu-psicologo/');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Erro getMeuPsicologo:', error);
      return { success: false, message: this._extractError(error) };
    }
  },

  // ==================== SESSÕES ====================

  async getMinhasSessoes() {
    try {
      const response = await api.get('/sessoes/');
      return { success: true, data: sessaoService.normalizeCollection(response.data) };
    } catch (error) {
      console.error('Erro getMinhasSessoes:', error);
      return { success: false, message: this._extractError(error) };
    }
  },

  async getProximaSessao() {
    try {
      const response = await api.get('/sessoes/proxima/');
      return { success: true, data: sessaoService.normalizeSessao(response.data) };
    } catch (error) {
      if (error.response?.status === 404) return { success: true, data: null };
      console.error('Erro getProximaSessao:', error);
      return { success: false, message: this._extractError(error) };
    }
  },

  async getHistoricoSessoes() {
    try {
      const response = await api.get('/sessoes/historico/');
      const data = response.data;
      return { success: true, data: Array.isArray(data) ? data : (data.results || []) };
    } catch (error) {
      console.error('Erro getHistoricoSessoes:', error);
      return { success: false, message: this._extractError(error) };
    }
  },

  // ==================== PRONTUÁRIOS ====================

  async getMeusProntuarios() {
    try {
      const response = await api.get('/prontuarios/');
      const data = response.data;
      return { success: true, data: Array.isArray(data) ? data : (data.results || []) };
    } catch (error) {
      console.error('Erro getMeusProntuarios:', error);
      return { success: false, message: this._extractError(error) };
    }
  },

  // ==================== SEMENTES DO CUIDADO ====================

  async getSementesDisponiveis() {
    try {
      const response = await api.get('/sementes-cuidado/');
      const data = response.data;
      return { success: true, data: Array.isArray(data) ? data : (data.results || []) };
    } catch (error) {
      console.error('Erro getSementesDisponiveis:', error);
      return { success: false, message: this._extractError(error) };
    }
  },

  async curtirSemente(id) {
    try {
      const response = await api.post(`/sementes-cuidado/${id}/curtir/`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Erro curtirSemente:', error);
      return { success: false, message: this._extractError(error) };
    }
  },

  async visualizarSemente(id) {
    try {
      const response = await api.post(`/sementes-cuidado/${id}/visualizar/`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Erro visualizarSemente:', error);
      return { success: false, message: this._extractError(error) };
    }
  },

  // ==================== REGISTROS ODISSEIA ====================

  async getMeusRegistros() {
    try {
      const response = await api.get('/registros-odisseia/');
      const data = response.data;
      return { success: true, data: Array.isArray(data) ? data : (data.results || []) };
    } catch (error) {
      console.error('Erro getMeusRegistros:', error);
      return { success: false, message: this._extractError(error) };
    }
  },

  async getResumoRegistros() {
    try {
      const response = await api.get('/registros-odisseia/resumo/');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Erro getResumoRegistros:', error);
      return { success: false, message: this._extractError(error) };
    }
  },

  async criarRegistroOdisseia(dados) {
    try {
      const response = await api.post('/registros-odisseia/', dados);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Erro criarRegistroOdisseia:', error);
      return { success: false, message: this._extractError(error), errors: error.response?.data };
    }
  },

  // ==================== NOTIFICAÇÕES ====================

  async getNotificacoes() {
    try {
      const response = await api.get('/notificacoes/');
      const data = response.data;
      return { success: true, data: Array.isArray(data) ? data : (data.results || []) };
    } catch (error) {
      console.error('Erro getNotificacoes:', error);
      return { success: false, message: this._extractError(error) };
    }
  },

  async getNaoLidas() {
    try {
      const response = await api.get('/notificacoes/nao-lidas/');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Erro getNaoLidas:', error);
      return { success: false, message: this._extractError(error) };
    }
  },

  async lerNotificacao(id) {
    try {
      const response = await api.post(`/notificacoes/${id}/ler/`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Erro lerNotificacao:', error);
      return { success: false, message: this._extractError(error) };
    }
  },

  async lerTodasNotificacoes() {
    try {
      const response = await api.post('/notificacoes/ler-todas/');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Erro lerTodasNotificacoes:', error);
      return { success: false, message: this._extractError(error) };
    }
  },

  // ==================== UTILIDADES ====================

  _extractError(error) {
    if (error.response?.data) {
      const d = error.response.data;
      if (d.detail) return d.detail;
      if (d.message) return d.message;
      if (d.error) return d.error;
      const first = Object.keys(d)[0];
      if (first && Array.isArray(d[first])) return d[first][0];
    }
    if (error.request) return 'Erro de conexão. Verifique sua internet.';
    return 'Erro inesperado. Tente novamente.';
  },
};
