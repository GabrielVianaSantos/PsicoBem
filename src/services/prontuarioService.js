import api from './api';

export const prontuarioService = {
  async getProntuarios(pacienteId = null) {
    try {
      const url = pacienteId ? `/prontuarios/?paciente_id=${pacienteId}` : '/prontuarios/';
      const response = await api.get(url);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Erro getProntuarios:', error);
      return { success: false, message: this.extractErrorMessage(error) };
    }
  },

  async createProntuario(dados) {
    try {
      const response = await api.post('/prontuarios/', dados);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Erro createProntuario:', error);
      return { success: false, message: this.extractErrorMessage(error) };
    }
  },

  extractErrorMessage(error) {
    return error.response?.data?.detail || error.response?.data?.message || 'Erro inesperado. Tente novamente.';
  },
};
