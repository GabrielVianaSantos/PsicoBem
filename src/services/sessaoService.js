import api from './api';

export const sessaoService = {
  // ==================== TIPOS DE SESSÃO ====================
  
  // Listar tipos de sessão
  async getTiposSessao() {
    try {
      const response = await api.get('/api/tipos-sessao/');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('🔴 Erro ao buscar tipos de sessão:', error);
      return {
        success: false,
        message: error.response?.data?.detail || 'Erro ao buscar tipos de sessão',
        status: error.response?.status || 0
      };
    }
  },

  // Listar apenas tipos ativos
  async getTiposSessaoAtivos() {
    try {
      const response = await api.get('/api/tipos-sessao/ativos/');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('🔴 Erro ao buscar tipos de sessão ativos:', error);
      return {
        success: false,
        message: error.response?.data?.detail || 'Erro ao buscar tipos de sessão',
        status: error.response?.status || 0
      };
    }
  },

  // Criar tipo de sessão
  async createTipoSessao(tipoData) {
    try {
      const response = await api.post('/api/tipos-sessao/', tipoData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('🔴 Erro ao criar tipo de sessão:', error);
      return {
        success: false,
        message: this.handleErrorMessage(error),
        status: error.response?.status || 0,
        errors: error.response?.data
      };
    }
  },

  // Atualizar tipo de sessão
  async updateTipoSessao(id, tipoData) {
    try {
      const response = await api.put(`/api/tipos-sessao/${id}/`, tipoData);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('🔴 Erro ao atualizar tipo de sessão:', error);
      return {
        success: false,
        message: this.handleErrorMessage(error),
        status: error.response?.status || 0,
        errors: error.response?.data
      };
    }
  },

  // Deletar tipo de sessão
  async deleteTipoSessao(id) {
    try {
      await api.delete(`/api/tipos-sessao/${id}/`);
      return {
        success: true,
        message: 'Tipo de sessão deletado com sucesso'
      };
    } catch (error) {
      console.error('🔴 Erro ao deletar tipo de sessão:', error);
      return {
        success: false,
        message: error.response?.data?.detail || 'Erro ao deletar tipo de sessão',
        status: error.response?.status || 0
      };
    }
  },

  // ==================== SESSÕES ====================

  // Listar sessões
  async getSessoes() {
    try {
      const response = await api.get('/api/sessoes/');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('🔴 Erro ao buscar sessões:', error);
      return {
        success: false,
        message: error.response?.data?.detail || 'Erro ao buscar sessões',
        status: error.response?.status || 0
      };
    }
  },

  // Buscar sessão específica
  async getSessao(id) {
    try {
      const response = await api.get(`/api/sessoes/${id}/`);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('🔴 Erro ao buscar sessão:', error);
      return {
        success: false,
        message: error.response?.data?.detail || 'Erro ao buscar sessão',
        status: error.response?.status || 0
      };
    }
  },

  // Criar sessão
  async createSessao(sessaoData) {
    try {
      const response = await api.post('/api/sessoes/', sessaoData);
      return {
        success: true,
        data: response.data,
        message: 'Sessão criada com sucesso!'
      };
    } catch (error) {
      console.error('🔴 Erro ao criar sessão:', error);
      return {
        success: false,
        message: this.handleErrorMessage(error),
        status: error.response?.status || 0,
        errors: error.response?.data
      };
    }
  },

  // Atualizar sessão
  async updateSessao(id, sessaoData) {
    try {
      const response = await api.put(`/api/sessoes/${id}/`, sessaoData);
      return {
        success: true,
        data: response.data,
        message: 'Sessão atualizada com sucesso!'
      };
    } catch (error) {
      console.error('🔴 Erro ao atualizar sessão:', error);
      return {
        success: false,
        message: this.handleErrorMessage(error),
        status: error.response?.status || 0,
        errors: error.response?.data
      };
    }
  },

  // Cancelar sessão
  async cancelarSessao(id) {
    try {
      const response = await api.post(`/api/sessoes/${id}/cancelar/`);
      return {
        success: true,
        data: response.data,
        message: response.data.message || 'Sessão cancelada com sucesso!'
      };
    } catch (error) {
      console.error('🔴 Erro ao cancelar sessão:', error);
      return {
        success: false,
        message: error.response?.data?.error || 'Erro ao cancelar sessão',
        status: error.response?.status || 0
      };
    }
  },

  // Confirmar pagamento
  async confirmarPagamento(id) {
    try {
      const response = await api.post(`/api/sessoes/${id}/confirmar-pagamento/`);
      return {
        success: true,
        data: response.data,
        message: response.data.message || 'Pagamento confirmado com sucesso!'
      };
    } catch (error) {
      console.error('🔴 Erro ao confirmar pagamento:', error);
      return {
        success: false,
        message: error.response?.data?.error || 'Erro ao confirmar pagamento',
        status: error.response?.status || 0
      };
    }
  },

  // ==================== CONSULTAS ESPECÍFICAS ====================

  // Sessões de hoje
  async getSessoesHoje() {
    try {
      const response = await api.get('/api/sessoes/hoje/');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('🔴 Erro ao buscar sessões de hoje:', error);
      return {
        success: false,
        message: error.response?.data?.detail || 'Erro ao buscar sessões de hoje',
        status: error.response?.status || 0
      };
    }
  },

  // Sessões da semana
  async getSessoesSemana() {
    try {
      const response = await api.get('/api/sessoes/semana/');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('🔴 Erro ao buscar sessões da semana:', error);
      return {
        success: false,
        message: error.response?.data?.detail || 'Erro ao buscar sessões da semana',
        status: error.response?.status || 0
      };
    }
  },

  // Sessões do mês
  async getSessoesMes(ano = null, mes = null) {
    try {
      let url = '/api/sessoes/mes/';
      const params = new URLSearchParams();
      
      if (ano) params.append('ano', ano);
      if (mes) params.append('mes', mes);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await api.get(url);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('🔴 Erro ao buscar sessões do mês:', error);
      return {
        success: false,
        message: error.response?.data?.detail || 'Erro ao buscar sessões do mês',
        status: error.response?.status || 0
      };
    }
  },

  // Sessões pendentes de pagamento
  async getSessoesPendentesPagamento() {
    try {
      const response = await api.get('/api/sessoes/pendentes-pagamento/');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('🔴 Erro ao buscar sessões pendentes:', error);
      return {
        success: false,
        message: error.response?.data?.detail || 'Erro ao buscar sessões pendentes',
        status: error.response?.status || 0
      };
    }
  },

  // Estatísticas do psicólogo
  async getEstatisticas(ano = null, mes = null) {
    try {
      let url = '/api/sessoes/estatisticas/';
      const params = new URLSearchParams();
      
      if (ano) params.append('ano', ano);
      if (mes) params.append('mes', mes);
      
      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const response = await api.get(url);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('🔴 Erro ao buscar estatísticas:', error);
      return {
        success: false,
        message: error.response?.data?.detail || 'Erro ao buscar estatísticas',
        status: error.response?.status || 0
      };
    }
  },

  // Pacientes vinculados
  async getPacientesVinculados() {
    try {
      const response = await api.get('/api/sessoes/pacientes-vinculados/');
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('🔴 Erro ao buscar pacientes vinculados:', error);
      return {
        success: false,
        message: error.response?.data?.detail || 'Erro ao buscar pacientes vinculados',
        status: error.response?.status || 0
      };
    }
  },

  // ==================== UTILITÁRIOS ====================

  // Tratar mensagens de erro
  handleErrorMessage(error) {
    if (error.response?.data) {
      // Erros de validação do DRF
      const data = error.response.data;
      
      // Se é um objeto com campos, pegar a primeira mensagem
      if (typeof data === 'object' && !Array.isArray(data)) {
        const firstField = Object.keys(data)[0];
        if (firstField && Array.isArray(data[firstField])) {
          return data[firstField][0];
        } else if (firstField) {
          return data[firstField];
        }
      }
      
      // Se é uma mensagem de erro simples
      if (data.detail) return data.detail;
      if (data.message) return data.message;
      if (data.error) return data.error;
      
      // Se é um array, pegar primeiro item
      if (Array.isArray(data) && data.length > 0) {
        return data[0];
      }
    }
    
    // Fallback
    return 'Erro inesperado. Tente novamente.';
  },

  // Formatar data para envio à API
  formatDateForAPI(date) {
    if (!date) return null;
    
    // Se já é string no formato correto, retornar
    if (typeof date === 'string') return date;
    
    // Se é objeto Date, converter para ISO string
    if (date instanceof Date) {
      return date.toISOString();
    }
    
    return null;
  }
};