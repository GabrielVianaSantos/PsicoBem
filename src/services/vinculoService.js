import api from './api';

export const vinculoService = {
  normalizePaciente(paciente) {
    if (!paciente) return null;
    return {
      ...paciente,
      nome_completo:
        paciente.nome_completo ||
        [paciente.user?.first_name, paciente.user?.last_name].filter(Boolean).join(' ').trim(),
      email: paciente.email || paciente.user?.email || '',
    };
  },

  normalizeVinculo(vinculo) {
    if (!vinculo) return null;
    return {
      ...vinculo,
      paciente: this.normalizePaciente(vinculo.paciente),
      psicologo: vinculo.psicologo
        ? {
            ...vinculo.psicologo,
            email: vinculo.psicologo.email || vinculo.psicologo.user?.email || '',
          }
        : null,
    };
  },

  async getVinculos() {
    try {
      const response = await api.get('/vinculos/');
      const data = response.data;
      const items = Array.isArray(data) ? data : (data.results || []);
      return { success: true, data: items.map((item) => this.normalizeVinculo(item)) };
    } catch (error) {
      console.error('Erro getVinculos:', error);
      return { success: false, message: this.extractErrorMessage(error) };
    }
  },

  async getVinculosAtivos() {
    try {
      const response = await api.get('/vinculos/ativos/');
      const data = response.data;
      const items = Array.isArray(data) ? data : (data.results || []);
      return { success: true, data: items.map((item) => this.normalizeVinculo(item)) };
    } catch (error) {
      console.error('Erro getVinculosAtivos:', error);
      return { success: false, message: this.extractErrorMessage(error) };
    }
  },

  async getPacientesVinculados() {
    const result = await this.getVinculosAtivos();
    if (!result.success) return result;

    return {
      success: true,
      data: result.data
        .map((vinculo) => vinculo.paciente)
        .filter(Boolean),
    };
  },

  async alterarStatusVinculo(id, novoStatus) {
    try {
      const response = await api.post(`/vinculos/${id}/alterar-status/`, { status: novoStatus });
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Erro alterarStatusVinculo:', error);
      return { success: false, message: this.extractErrorMessage(error) };
    }
  },

  async getResumoVinculo(id) {
    try {
      const response = await api.get(`/vinculos/${id}/resumo/`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Erro getResumoVinculo:', error);
      return { success: false, message: this.extractErrorMessage(error) };
    }
  },

  // ==================== SOLICITAÇÕES POR CRP (SPEC_VINCULO_CONVITE_E_SOLICITACAO.md) ====================

  async getSolicitacoesPendentes() {
    try {
      const response = await api.get('/vinculos/solicitacoes-pendentes/');
      const data = response.data;
      const items = Array.isArray(data) ? data : (data.results || []);
      return { success: true, data: items.map((item) => this.normalizeVinculo(item)) };
    } catch (error) {
      console.error('Erro getSolicitacoesPendentes:', error);
      return { success: false, message: this.extractErrorMessage(error) };
    }
  },

  async getMinhaSolicitacaoPendente() {
    try {
      const response = await api.get('/vinculos/minha-solicitacao-pendente/');
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Erro getMinhaSolicitacaoPendente:', error);
      return { success: false, message: this.extractErrorMessage(error) };
    }
  },

  async aceitarSolicitacao(vinculoId) {
    try {
      const response = await api.post(`/vinculos/${vinculoId}/aceitar/`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Erro aceitarSolicitacao:', error);
      return { success: false, message: this.extractErrorMessage(error) };
    }
  },

  async recusarSolicitacao(vinculoId) {
    try {
      const response = await api.post(`/vinculos/${vinculoId}/recusar/`);
      return { success: true, data: response.data };
    } catch (error) {
      console.error('Erro recusarSolicitacao:', error);
      return { success: false, message: this.extractErrorMessage(error) };
    }
  },

  // ==================== ENCERRAMENTO (paciente) ====================

  /**
   * Sem `confirmar`, o backend responde 400 com um `resumo` (sessões
   * futuras + prontuários) do que será perdido — a tela usa isso para
   * montar o aviso antes de pedir a confirmação explícita do paciente.
   */
  async encerrarVinculo(vinculoId, { confirmar = false } = {}) {
    try {
      const response = await api.post(`/vinculos/${vinculoId}/encerrar/`, { confirmar });
      return { success: true, data: response.data };
    } catch (error) {
      const resumo = error.response?.data?.resumo;
      if (error.response?.status === 400 && resumo) {
        return { success: false, confirmacaoNecessaria: true, resumo };
      }
      console.error('Erro encerrarVinculo:', error);
      return { success: false, message: this.extractErrorMessage(error) };
    }
  },

  extractErrorMessage(error) {
    return error.response?.data?.detail || error.response?.data?.message || 'Erro inesperado. Tente novamente.';
  },
};
