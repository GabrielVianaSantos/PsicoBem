import api from './api';

export const authService = {
  // Login de usuário
  async login(email, password) {
    try {
      const response = await api.post('/auth/login/', {
        email,
        password,
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Cadastro de paciente
  async registerPaciente(userData) {
    try {
      const response = await api.post('/auth/register/paciente/', {
        user: {
          email: userData.email,
          username: userData.username || userData.email.split('@')[0],
          first_name: userData.nomeCompleto.split(' ')[0],
          last_name: userData.nomeCompleto.split(' ').slice(1).join(' '),
          password: userData.senha,
          password_confirm: userData.confirmaSenha,
          phone: userData.telefone,
        },
        cpf: userData.cpf,
        gender: userData.sexo === 'Masculino' ? 'M' : userData.sexo === 'Feminino' ? 'F' : 'O',
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Cadastro de psicólogo
  async registerPsicologo(userData) {
    try {
      const response = await api.post('/auth/register/psicologo/', {
        user: {
          email: userData.email,
          username: userData.username || userData.email.split('@')[0],
          first_name: userData.nomeCompleto.split(' ')[0],
          last_name: userData.nomeCompleto.split(' ').slice(1).join(' '),
          password: userData.senha,
          password_confirm: userData.confirmaSenha,
        },
        crp: userData.crp,
        specialization: userData.especialidade || '',
      });
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Buscar dados do usuário logado
  async getUserProfile() {
    try {
      const response = await api.get('/auth/profile/');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Atualizar perfil do usuário
  async updateUserProfile(userData) {
    try {
      const response = await api.put('/auth/profile/update/', userData);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  },

  // Tratamento de erros
  handleError(error) {
    if (error.response) {
      // Erro da API
      const message = error.response.data?.message || 
                     error.response.data?.detail ||
                     'Erro no servidor';
      return {
        message,
        status: error.response.status,
        data: error.response.data,
      };
    } else if (error.request) {
      // Erro de rede
      return {
        message: 'Erro de conexão. Verifique sua internet.',
        status: 0,
      };
    } else {
      // Outro erro
      return {
        message: 'Erro inesperado',
        status: -1,
      };
    }
  },
};