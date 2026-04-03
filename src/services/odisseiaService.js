import api from './api';

export const odisseiaService = {
  async getSementesCuidado() {
    try {
      const response = await api.get('/sementes-cuidado/');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Erro getSementesCuidado:', error);
      return { success: false, message: this.extractErrorMessage(error) };
    }
  },

  async createSementeCuidado(dados) {
    try {
      const response = await api.post('/sementes-cuidado/', dados);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Erro createSementeCuidado:', error);
      return { success: false, message: this.extractErrorMessage(error) };
    }
  },

  async getRegistrosOdisseia(pacienteId = null) {
    try {
      const url = pacienteId ? `/registros-odisseia/?paciente_id=${pacienteId}` : '/registros-odisseia/';
      const response = await api.get(url);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Erro getRegistrosOdisseia:', error);
      return { success: false, message: this.extractErrorMessage(error) };
    }
  },

  extractErrorMessage(error) {
    return error.response?.data?.detail || error.response?.data?.message || 'Erro inesperado. Tente novamente.';
  },
};
