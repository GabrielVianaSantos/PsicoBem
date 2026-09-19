import api from './api';

/**
 * Normaliza o código curto digitado pelo paciente, espelhando
 * `authentication.services.normalizar_codigo_curto` do backend:
 * maiúsculas e hífen opcional (aceita "ana-4k7q", "ANA4K7Q" e "ANA-4K7Q"
 * como o mesmo código).
 */
export function normalizarCodigoConvite(valor) {
  const limpo = (valor || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (limpo.length === 7) {
    return `${limpo.slice(0, 3)}-${limpo.slice(3)}`;
  }
  return (valor || '').trim().toUpperCase();
}

export const conviteService = {
  async getMeuLink() {
    try {
      const response = await api.get('/convites/meu-link/');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Erro getMeuLink:', error);
      return { success: false, message: this.extractErrorMessage(error) };
    }
  },

  async criarConvite({ apelido } = {}) {
    try {
      const response = await api.post('/convites/', apelido ? { apelido } : {});
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Erro criarConvite:', error);
      return { success: false, message: this.extractErrorMessage(error) };
    }
  },

  async listarConvites() {
    try {
      const response = await api.get('/convites/');
      const data = response.data;
      return { success: true, data: Array.isArray(data) ? data : (data.results || []) };
    } catch (error) {
      console.error('Erro listarConvites:', error);
      return { success: false, message: this.extractErrorMessage(error) };
    }
  },

  async revogarConvite(conviteId) {
    try {
      const response = await api.post(`/convites/${conviteId}/revogar/`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Erro revogarConvite:', error);
      return { success: false, message: this.extractErrorMessage(error) };
    }
  },

  /** Só consulta — nada é criado no banco até `aceitarConvite`. */
  async resolverConvite({ codigo, slug } = {}) {
    try {
      const params = {};
      if (codigo) params.codigo = normalizarCodigoConvite(codigo);
      if (slug) params.slug = slug;

      const response = await api.get('/convites/resolver/', { params });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Erro resolverConvite:', error);
      return {
        success: false,
        message: this.extractErrorMessage(error),
        code: error.response?.data?.code,
      };
    }
  },

  /**
   * Sem `confirmarTroca`, o backend responde 409 quando o paciente já tem
   * vínculo ativo com outro profissional — junto vem um `resumo` do que
   * será perdido, para a tela exibir antes de pedir a confirmação.
   */
  async aceitarConvite({ codigo, slug, confirmarTroca = false } = {}) {
    try {
      const payload = {};
      if (codigo) payload.codigo = normalizarCodigoConvite(codigo);
      if (slug) payload.slug = slug;
      if (confirmarTroca) payload.confirmar_troca = true;

      const response = await api.post('/convites/aceitar/', payload);
      return { success: true, data: response.data };
    } catch (error) {
      const resumo = error.response?.data?.resumo;
      if (error.response?.status === 409 && resumo) {
        return { success: false, trocaNecessaria: true, resumo };
      }
      console.error('Erro aceitarConvite:', error);
      return {
        success: false,
        message: this.extractErrorMessage(error),
        code: error.response?.data?.code,
      };
    }
  },

  extractErrorMessage(error) {
    return error.response?.data?.detail || error.response?.data?.message || error.response?.data?.error || 'Erro inesperado. Tente novamente.';
  },
};
