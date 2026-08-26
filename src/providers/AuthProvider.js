import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/authService';
import { notificationService } from '../services/notificationService';
import { configureGoogleSignIn, googleSignOut, signInWithGoogle } from '../services/googleAuth';

export const AuthContext = createContext({});

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [initializing, setInitializing] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Carregar dados do usuário ao iniciar o app
  useEffect(() => {
    configureGoogleSignIn();
    loadStorageData();
  }, []);

  async function loadStorageData() {
    try {
      const [storedUser, storedToken, storedUserType] = await AsyncStorage.multiGet([
        '@PsicoBem:user',
        '@PsicoBem:token',
        '@PsicoBem:userType'
      ]);

      if (storedUser[1] && storedToken[1]) {
        setUser(JSON.parse(storedUser[1]));
        setUserType(storedUserType[1]);
        setIsAuthenticated(true);

        // Verificar se o token ainda é válido
        try {
          const profileResponse = await authService.getUserProfile();
          if (profileResponse.success) {
            await AsyncStorage.setItem('@PsicoBem:user', JSON.stringify(profileResponse.data));
            setUser(profileResponse.data);
            setUserType(profileResponse.data.user_type);
          }
        } catch (error) {
          // Token inválido, fazer logout
          await logout();
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados do storage:', error);
    } finally {
      setInitializing(false);
    }
  }

  // Único ponto que grava as quatro chaves do AsyncStorage e atualiza o
  // estado de autenticação. Reaproveitado por login, cadastro (paciente e
  // psicólogo) e pelos três fluxos de autenticação via Google.
  async function persistSession(response, fallbackUserType) {
    const userData = authService.normalizeUserProfile(response.user);
    const token = response.tokens.access;
    const refreshToken = response.tokens.refresh;
    const resolvedUserType = userData.user_type || fallbackUserType;

    await AsyncStorage.multiSet([
      ['@PsicoBem:user', JSON.stringify(userData)],
      ['@PsicoBem:token', token],
      ['@PsicoBem:refreshToken', refreshToken],
      ['@PsicoBem:userType', resolvedUserType]
    ]);

    setUser(userData);
    setUserType(resolvedUserType);
    setIsAuthenticated(true);

    try {
      await notificationService.registerDevice();
    } catch (pushError) {
      console.error('Erro ao registrar dispositivo push:', pushError);
    }

    return userData;
  }

  async function login(email, password) {
    try {
      const response = await authService.login(email, password);
      const userData = await persistSession(response);

      return { success: true, user: userData };
    } catch (error) {
      console.error('❌ Erro no AuthProvider login:', error);

      // ✅ MELHORADO: Agora error.message terá a mensagem correta
      return {
        success: false,
        message: error.message || 'Erro ao fazer login',
        status: error.status || -1,
        data: error.data
      };
    }
  }

  async function registerPaciente(userData) {
    try {
      const response = await authService.registerPaciente(userData);
      const user = await persistSession(response, 'paciente');

      return { success: true, user };
    } catch (error) {
      console.error('Erro no cadastro de paciente:', error);
      return {
        success: false,
        message: error.message || 'Erro ao cadastrar paciente',
        data: error.data
      };
    }
  }

  async function registerPsicologo(userData) {
    try {
      const response = await authService.registerPsicologo(userData);
      const user = await persistSession(response, 'psicologo');

      return { success: true, user };
    } catch (error) {
      console.error('Erro no cadastro de psicólogo:', error);
      return {
        success: false,
        message: error.message || 'Erro ao cadastrar psicólogo',
        data: error.data
      };
    }
  }

  // Fluxo Google — decide entre login direto, vínculo de conta existente
  // ou cadastro novo. `registrationToken`/`linkToken` nunca são persistidos
  // no AsyncStorage: trafegam apenas como parâmetro de navegação.
  async function loginWithGoogle() {
    const result = await signInWithGoogle();

    if (!result.ok) {
      if (result.cancelled) {
        return { success: false, cancelled: true };
      }
      return {
        success: false,
        message: result.message || 'Não foi possível entrar com o Google.',
        code: result.code,
      };
    }

    try {
      const response = await authService.loginWithGoogle(result.idToken);

      if (response.status === 'authenticated') {
        await persistSession(response);
        return { success: true, status: 'authenticated' };
      }

      if (response.status === 'registration_required') {
        return {
          success: true,
          status: 'registration_required',
          registrationToken: response.registration_token,
          prefill: response.prefill,
        };
      }

      if (response.status === 'link_confirmation_required') {
        return {
          success: true,
          status: 'link_confirmation_required',
          linkToken: response.link_token,
          email: response.email,
        };
      }

      return { success: false, message: 'Resposta inesperada do servidor.' };
    } catch (error) {
      console.error('❌ Erro no login com Google:', error);
      return {
        success: false,
        message: error.message || 'Erro ao entrar com o Google',
        status: error.status || -1,
        code: error.code,
        data: error.data,
      };
    }
  }

  async function linkGoogleAccount({ linkToken, password }) {
    try {
      const response = await authService.linkGoogleAccount({ linkToken, password });
      const userData = await persistSession(response);

      return { success: true, user: userData };
    } catch (error) {
      console.error('Erro ao vincular conta Google:', error);
      return {
        success: false,
        message: error.message || 'Erro ao vincular conta',
        status: error.status || -1,
        code: error.code,
        data: error.data,
      };
    }
  }

  async function completeGoogleSignUp({ registrationToken, userType: novoUserType, ...campos }) {
    try {
      const response = await authService.completeGoogleRegistration({
        registration_token: registrationToken,
        user_type: novoUserType,
        ...campos,
      });
      const userData = await persistSession(response, novoUserType);

      return { success: true, user: userData };
    } catch (error) {
      console.error('Erro ao completar cadastro com Google:', error);
      return {
        success: false,
        message: error.message || 'Erro ao completar cadastro',
        status: error.status || -1,
        code: error.code,
        data: error.data,
      };
    }
  }

  async function logout() {
    try {
      try {
        await notificationService.deactivateDevice();
      } catch (pushError) {
        console.error('Erro ao desativar dispositivo push:', pushError);
      }

      try {
        await googleSignOut();
      } catch (googleError) {
        console.error('Erro ao encerrar sessão do Google:', googleError);
      }

      await AsyncStorage.multiRemove([
        '@PsicoBem:user',
        '@PsicoBem:token',
        '@PsicoBem:refreshToken',
        '@PsicoBem:userType'
      ]);

      setUser(null);
      setUserType(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Erro no logout:', error);
    }
  }

  async function updateProfile(userData) {
    try {
      const response = await authService.updateUserProfile(userData);

      // Atualizar dados locais
      const updatedUser = { ...user, ...response.data };
      await AsyncStorage.setItem('@PsicoBem:user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      return {
        success: false,
        message: error.message || 'Erro ao atualizar perfil'
      };
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userType,
        initializing,
        isAuthenticated,
        login,
        logout,
        registerPaciente,
        registerPsicologo,
        updateProfile,
        loginWithGoogle,
        linkGoogleAccount,
        completeGoogleSignUp,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
