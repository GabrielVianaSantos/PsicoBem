import React, { createContext } from 'react';

// Create the authentication context
export const AuthContext = createContext({
  // Authentication state
  user: null,
  token: null,
  userType: null, // 'psicologo' or 'paciente'
  isLoading: false,
  isAuthenticated: false,

  // Authentication functions
  login: () => {},
  logout: () => {},
  setUserData: () => {},
});

export default AuthContext;