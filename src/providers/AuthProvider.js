import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authService } from '../services/authService';

export const AuthContext = createContext({});

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Carregar dados do usuário ao iniciar o app
  useEffect(() => {
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
          await authService.getUserProfile();
        } catch (error) {
          // Token inválido, fazer logout
          await logout();
        }
      }
    } catch (error) {
      console.error('Erro ao carregar dados do storage:', error);
    } finally {
      setLoading(false);
    }
  }

async function login(email, password) {
    try {
      setLoading(true);
      
      const response = await authService.login(email, password);
      
      const userData = response.user;
      const token = response.tokens.access;
      const refreshToken = response.tokens.refresh;
      
      // Salvar dados no AsyncStorage
      await AsyncStorage.multiSet([
        ['@PsicoBem:user', JSON.stringify(userData)],
        ['@PsicoBem:token', token],
        ['@PsicoBem:refreshToken', refreshToken],
        ['@PsicoBem:userType', userData.user_type]
      ]);

      setUser(userData);
      setUserType(userData.user_type);
      setIsAuthenticated(true);
      
      return { success: true, user: userData };
    } catch (error) {
      console.error('❌ Erro no AuthProvider login:', error);
      
      // ✅ MELHORADO: Agora error.message terá a mensagem correta
      return { 
        success: false, 
        message: error.message || 'Erro ao fazer login',
        status: error.status || -1
      };
    } finally {
      setLoading(false);
    }
  }

  async function registerPaciente(userData) {
    try {
      setLoading(true);
      
      const response = await authService.registerPaciente(userData);
      
      const user = response.user;
      const token = response.tokens.access;
      const refreshToken = response.tokens.refresh;
      
      // Salvar dados no AsyncStorage
      await AsyncStorage.multiSet([
        ['@PsicoBem:user', JSON.stringify(user)],
        ['@PsicoBem:token', token],
        ['@PsicoBem:refreshToken', refreshToken],
        ['@PsicoBem:userType', 'paciente']
      ]);

      setUser(user);
      setUserType('paciente');
      setIsAuthenticated(true);
      
      return { success: true, user };
    } catch (error) {
      console.error('Erro no cadastro de paciente:', error);
      return { 
        success: false, 
        message: error.message || 'Erro ao cadastrar paciente' 
      };
    } finally {
      setLoading(false);
    }
  }

  async function registerPsicologo(userData) {
    try {
      setLoading(true);
      
      const response = await authService.registerPsicologo(userData);
      
      const user = response.user;
      const token = response.tokens.access;
      const refreshToken = response.tokens.refresh;
      
      // Salvar dados no AsyncStorage
      await AsyncStorage.multiSet([
        ['@PsicoBem:user', JSON.stringify(user)],
        ['@PsicoBem:token', token],
        ['@PsicoBem:refreshToken', refreshToken],
        ['@PsicoBem:userType', 'psicologo']
      ]);

      setUser(user);
      setUserType('psicologo');
      setIsAuthenticated(true);
      
      return { success: true, user };
    } catch (error) {
      console.error('Erro no cadastro de psicólogo:', error);
      return { 
        success: false, 
        message: error.message || 'Erro ao cadastrar psicólogo' 
      };
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
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
      setLoading(true);
      
      const response = await authService.updateUserProfile(userData);
      
      // Atualizar dados locais
      const updatedUser = { ...user, ...response.user };
      await AsyncStorage.setItem('@PsicoBem:user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      
      return { success: true, user: updatedUser };
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      return { 
        success: false, 
        message: error.message || 'Erro ao atualizar perfil' 
      };
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        userType,
        loading,
        isAuthenticated,
        login,
        logout,
        registerPaciente,
        registerPsicologo,
        updateProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}