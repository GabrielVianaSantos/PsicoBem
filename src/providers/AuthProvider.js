import React, { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import AuthContext from '../contexts/AuthContext';

// Storage keys for AsyncStorage
const STORAGE_KEYS = {
  TOKEN: '@PsicoBem:token',
  USER: '@PsicoBem:user',
  USER_TYPE: '@PsicoBem:userType',
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [userType, setUserType] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Function to save data to AsyncStorage
  const saveToStorage = async (key, value) => {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Error saving to storage:', error);
    }
  };

  // Function to load data from AsyncStorage
  const loadFromStorage = async (key) => {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Error loading from storage:', error);
      return null;
    }
  };

  // Function to remove data from AsyncStorage
  const removeFromStorage = async (key) => {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing from storage:', error);
    }
  };

  // Login function
  const login = async (userData, authToken, type) => {
    try {
      setIsLoading(true);
      
      // Update state
      setUser(userData);
      setToken(authToken);
      setUserType(type);
      setIsAuthenticated(true);

      // Persist to storage
      await saveToStorage(STORAGE_KEYS.USER, userData);
      await saveToStorage(STORAGE_KEYS.TOKEN, authToken);
      await saveToStorage(STORAGE_KEYS.USER_TYPE, type);
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true);

      // Clear state
      setUser(null);
      setToken(null);
      setUserType(null);
      setIsAuthenticated(false);

      // Clear storage
      await removeFromStorage(STORAGE_KEYS.USER);
      await removeFromStorage(STORAGE_KEYS.TOKEN);
      await removeFromStorage(STORAGE_KEYS.USER_TYPE);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Set user data function (for updating user information)
  const setUserData = async (userData) => {
    try {
      setUser(userData);
      await saveToStorage(STORAGE_KEYS.USER, userData);
    } catch (error) {
      console.error('Error updating user data:', error);
      throw error;
    }
  };

  // Load authentication data when the app starts
  useEffect(() => {
    const loadAuthData = async () => {
      try {
        setIsLoading(true);

        // Load data from storage
        const [storedUser, storedToken, storedUserType] = await Promise.all([
          loadFromStorage(STORAGE_KEYS.USER),
          loadFromStorage(STORAGE_KEYS.TOKEN),
          loadFromStorage(STORAGE_KEYS.USER_TYPE),
        ]);

        // If we have a token, consider the user authenticated
        if (storedToken && storedUser && storedUserType) {
          setUser(storedUser);
          setToken(storedToken);
          setUserType(storedUserType);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Error loading auth data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAuthData();
  }, []);

  // Context value
  const contextValue = {
    user,
    token,
    userType,
    isLoading,
    isAuthenticated,
    login,
    logout,
    setUserData,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;