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
      // ✅ CORREÇÃO: Criar um Error real com a mensagem tratada
      const errorInfo = this.handleError(error);
      const errorToThrow = new Error(errorInfo.message);
      errorToThrow.status = errorInfo.status;
      errorToThrow.data = errorInfo.data;
      throw errorToThrow;
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
          user_type: 'paciente',
        },
        cpf: userData.cpf,
        gender: userData.sexo === 'Masculino' ? 'M' : userData.sexo === 'Feminino' ? 'F' : 'O',
      });
      return response.data;
    } catch (error) {
      const errorInfo = this.handleError(error);
      const errorToThrow = new Error(errorInfo.message);
      errorToThrow.status = errorInfo.status;
      errorToThrow.data = errorInfo.data;
      throw errorToThrow;
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
          user_type: 'psicologo',
        },
        crp: userData.crp,
        specialization: userData.especialidade || '',
      });
      return response.data;
    } catch (error) {
      const errorInfo = this.handleError(error);
      const errorToThrow = new Error(errorInfo.message);
      errorToThrow.status = errorInfo.status;
      errorToThrow.data = errorInfo.data;
      throw errorToThrow;
    }
  },

  // Buscar dados do usuário logado
  async getUserProfile() {
    try {
      const response = await api.get('/auth/profile/');
      return response.data;
    } catch (error) {
      const errorInfo = this.handleError(error);
      const errorToThrow = new Error(errorInfo.message);
      errorToThrow.status = errorInfo.status;
      errorToThrow.data = errorInfo.data;
      throw errorToThrow;
    }
  },

  // Atualizar perfil do usuário
  async updateUserProfile(userData) {
    try {
      const response = await api.put('/auth/profile/update/', userData);
      return response.data;
    } catch (error) {
      const errorInfo = this.handleError(error);
      const errorToThrow = new Error(errorInfo.message);
      errorToThrow.status = errorInfo.status;
      errorToThrow.data = errorInfo.data;
      throw errorToThrow;
    }
  },

  // ✅ MELHORADO: Tratamento de erros mais específico
  handleError(error) {
    console.log('🔍 Erro completo:', error);
    
    if (error.response) {
      // Erro da API (Backend respondeu com erro)
      console.log('📡 Erro da API:', error.response.status, error.response.data);
      
      let message = 'Erro no servidor';
      
      // Tratar diferentes tipos de resposta do Django
      if (error.response.data) {

        if (error.response.data.crp) {
          if (Array.isArray(error.response.data.crp)) {
            const crpError = error.response.data.crp[0];
            if (crpError.includes('já existe') || crpError.includes('already exists')) {
              message = 'CRP já cadastrado.';
            } else {
              message = `CRP: ${crpError}`;
            }
          } else if (error.response.data.crp === 'psicologo com este crp já existe.') {
            message = 'CRP já cadastrado.';
          }
        }

        else if (error.response.data.cpf) {
          if (Array.isArray(error.response.data.cpf)) {
            const cpfError = error.response.data.cpf[0];
            if (cpfError.includes('já existe') || cpfError.includes('already exists')) {
              message = 'CPF já cadastrado.';
            } else {
              message = `CPF: ${cpfError}`;
            }
          } else if (error.response.data.cpf.includes('já existe')) {
            message = 'CPF já cadastrado.';
          }
        }

        else if (error.response.data.user) {
          const userErrors = error.response.data.user;
          
          // Email duplicado
          if (userErrors.email) {
            if (Array.isArray(userErrors.email)) {
              const emailError = userErrors.email[0];
              if (emailError.includes('já existe') || emailError.includes('already exists')) {
                message = 'Email já cadastrado.';
              } else {
                message = `Email: ${emailError}`;
              }
            } else if (userErrors.email === 'psicologo com este email já existe.' || 
                      userErrors.email === 'paciente com este email já existe.') {
              message = 'Email já cadastrado.';
            }
          }

          // Username duplicado
          else if (userErrors.username) {
            if (Array.isArray(userErrors.username)) {
              const usernameError = userErrors.username[0];
              if (usernameError.includes('já existe') || usernameError.includes('already exists')) {
                message = 'Nome de usuário já existe.';
              } else {
                message = `Username: ${usernameError}`;
              }
            }
          }
          else {
              message = 'Dados do usuário inválidos';
            }
          }
        // Verificar erros não aninhados (nível raiz)
        else if (error.response.data.email) {
          if (Array.isArray(error.response.data.email)) {
            const emailError = error.response.data.email[0];
            if (emailError.includes('já existe') || emailError.includes('already exists')) {
              message = 'Email já cadastrado.';
            } else {
              message = `Email: ${emailError}`;
            }
          }
        }
        else if (error.response.data.password) {
          if (Array.isArray(error.response.data.password)) {
            message = `Senha: ${error.response.data.password[0]}`;
          }
        }
        // Erros gerais
        else if (typeof error.response.data === 'string') {
          message = error.response.data;
        } else if (error.response.data.detail) {
          message = error.response.data.detail;
        } else if (error.response.data.message) {
          message = error.response.data.message;
        } else if (error.response.data.non_field_errors) {
          if (Array.isArray(error.response.data.non_field_errors)) {
            message = error.response.data.non_field_errors[0];
          } else {
            message = error.response.data.non_field_errors;
          }
        } 
      }
      // Mensagens específicas por status
      if (error.response.status === 401) {
        message = 'Credenciais inválidas. Verifique email e senha.';
      } else if (error.response.status === 400) {
        message = message || 'Dados inválidos. Verifique as informações.';
      } else if (error.response.status === 500) {
        message = 'Erro interno do servidor. Tente novamente.';
      }
      
      return {
        message,
        status: error.response.status,
        data: error.response.data,
      };
    } else if (error.request) {
      // Erro de rede (não conseguiu se conectar ao backend)
      console.log('🌐 Erro de rede: (O servidor está rodando ?)', error.request);
      return {
        message: 'Erro de conexão. Verifique sua internet!',
        status: 0,
      };
    } else {
      // Outro erro
      console.log('❌ Erro inesperado:', error.message);
      return {
        message: error.message || 'Erro inesperado',
        status: -1,
      };
    }
  },
};