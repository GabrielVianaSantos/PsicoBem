import api from './api';

export const sessaoService = {
  normalizeSessao(sessao) {
    if (!sessao) return null;

    const pacienteNome =
      sessao.paciente_nome ||
      sessao.paciente?.nome_completo ||
      [sessao.paciente?.user?.first_name, sessao.paciente?.user?.last_name].filter(Boolean).join(' ').trim();

    const psicologoNome =
      sessao.psicologo_nome ||
      sessao.psicologo?.nome_completo ||
      [sessao.psicologo?.user?.first_name, sessao.psicologo?.user?.last_name].filter(Boolean).join(' ').trim();

    const tipoSessaoNome = sessao.tipo_sessao_nome || sessao.tipo_sessao?.nome || sessao.tipo || null;

    return {
      ...sessao,
      paciente_nome: pacienteNome,
      psicologo_nome: psicologoNome,
      tipo_sessao_nome: tipoSessaoNome,
    };
  },

  normalizeCollection(data) {
    const items = Array.isArray(data) ? data : (data?.results || []);
    return items.map((item) => this.normalizeSessao(item));
  },

  async getTiposSessao() {
    try {
      const response = await api.get('/sessoes/tipos-sessao/');
      return { success: true, data: response.data };
    } catch (error) {
      return this.buildError(error, 'Erro ao buscar tipos de sessão');
    }
  },

  async getTiposSessaoAtivos() {
    try {
      const response = await api.get('/sessoes/tipos-sessao/ativos/');
      return { success: true, data: response.data };
    } catch (error) {
      return this.buildError(error, 'Erro ao buscar tipos de sessão');
    }
  },

  async createTipoSessao(tipoData) {
    try {
      const response = await api.post('/sessoes/tipos-sessao/', tipoData);
      return { success: true, data: response.data };
    } catch (error) {
      return this.buildError(error, 'Erro ao criar tipo de sessão');
    }
  },

  async updateTipoSessao(id, tipoData) {
    try {
      const response = await api.put(`/sessoes/tipos-sessao/${id}/`, tipoData);
      return { success: true, data: response.data };
    } catch (error) {
      return this.buildError(error, 'Erro ao atualizar tipo de sessão');
    }
  },

  async deleteTipoSessao(id) {
    try {
      await api.delete(`/sessoes/tipos-sessao/${id}/`);
      return { success: true, message: 'Tipo de sessão deletado com sucesso' };
    } catch (error) {
      return this.buildError(error, 'Erro ao deletar tipo de sessão');
    }
  },

  async getSessoes() {
    try {
      const response = await api.get('/sessoes/');
      return { success: true, data: this.normalizeCollection(response.data) };
    } catch (error) {
      return this.buildError(error, 'Erro ao buscar sessões');
    }
  },

  async getSessao(id) {
    try {
      const response = await api.get(`/sessoes/${id}/`);
      return { success: true, data: this.normalizeSessao(response.data) };
    } catch (error) {
      return this.buildError(error, 'Erro ao buscar sessão');
    }
  },

  async createSessao(sessaoData) {
    try {
      const response = await api.post('/sessoes/', sessaoData);
      return { success: true, data: response.data, message: 'Sessão criada com sucesso!' };
    } catch (error) {
      return this.buildError(error, 'Erro ao criar sessão');
    }
  },

  async updateSessao(id, sessaoData) {
    try {
      const response = await api.put(`/sessoes/${id}/`, sessaoData);
      return { success: true, data: response.data, message: 'Sessão atualizada com sucesso!' };
    } catch (error) {
      return this.buildError(error, 'Erro ao atualizar sessão');
    }
  },

  async cancelarSessao(id) {
    try {
      const response = await api.post(`/sessoes/${id}/cancelar/`);
      return { success: true, data: response.data, message: response.data.message || 'Sessão cancelada com sucesso!' };
    } catch (error) {
      return this.buildError(error, 'Erro ao cancelar sessão');
    }
  },

  async confirmarRealizacao(id) {
    try {
      const response = await api.post(`/sessoes/${id}/realizar/`);
      return { success: true, data: response.data, message: response.data.message || 'Sessão marcada como realizada!' };
    } catch (error) {
      return this.buildError(error, 'Erro ao realizar sessão');
    }
  },

  async confirmarPagamento(id) {
    try {
      const response = await api.post(`/sessoes/${id}/confirmar-pagamento/`);
      return { success: true, data: response.data, message: response.data.message || 'Pagamento confirmado com sucesso!' };
    } catch (error) {
      return this.buildError(error, 'Erro ao confirmar pagamento');
    }
  },

  async getSessoesHoje() {
    try {
      const response = await api.get('/sessoes/hoje/');
      return { success: true, data: this.normalizeCollection(response.data) };
    } catch (error) {
      return this.buildError(error, 'Erro ao buscar sessões de hoje');
    }
  },

  async getSessoesSemana() {
    try {
      const response = await api.get('/sessoes/semana/');
      return { success: true, data: this.normalizeCollection(response.data) };
    } catch (error) {
      return this.buildError(error, 'Erro ao buscar sessões da semana');
    }
  },

  async getSessoesMes(ano = null, mes = null) {
    try {
      let url = '/sessoes/mes/';
      const params = new URLSearchParams();
      if (ano) params.append('ano', ano);
      if (mes) params.append('mes', mes);
      if (params.toString()) url += `?${params.toString()}`;
      const response = await api.get(url);
      return { success: true, data: this.normalizeCollection(response.data) };
    } catch (error) {
      return this.buildError(error, 'Erro ao buscar sessões do mês');
    }
  },

  async getSessoesPendentesPagamento() {
    try {
      const response = await api.get('/sessoes/pendentes-pagamento/');
      return { success: true, data: this.normalizeCollection(response.data) };
    } catch (error) {
      return this.buildError(error, 'Erro ao buscar sessões pendentes');
    }
  },

  async getEstatisticas(ano = null, mes = null) {
    try {
      let url = '/sessoes/estatisticas/';
      const params = new URLSearchParams();
      if (ano) params.append('ano', ano);
      if (mes) params.append('mes', mes);
      if (params.toString()) url += `?${params.toString()}`;
      const response = await api.get(url);
      return { success: true, data: response.data };
    } catch (error) {
      return this.buildError(error, 'Erro ao buscar estatísticas');
    }
  },

  formatDateForAPI(date) {
    if (!date) return null;
    if (typeof date === 'string') return date;
    if (date instanceof Date) return date.toISOString();
    return null;
  },

  buildError(error, fallbackMessage) {
    return {
      success: false,
      message: error.response?.data?.detail || error.response?.data?.message || fallbackMessage,
      status: error.response?.status || 0,
      errors: error.response?.data,
    };
  },
};
