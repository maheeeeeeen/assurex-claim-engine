/**
 * AuthContext — Global authentication state for AssureX Claim Engine
 *
 * This context:
 * 1. Stores the JWT token and user info (including role) in React state + localStorage
 * 2. Provides login() that calls the auth API and saves the token
 * 3. Provides logout() that clears all auth state
 * 4. Exposes isAuthenticated, user, role for route guards and UI conditional rendering
 * 5. On mount, checks localStorage for an existing session (page refresh persistence)
 */

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../api/auth';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('assurex_token'));
  const [loading, setLoading] = useState(true);

  // On mount: if token exists in localStorage, fetch the user profile
  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('assurex_token');
      const savedUser = localStorage.getItem('assurex_user');

      if (savedToken && savedUser) {
        try {
          setToken(savedToken);
          setUser(JSON.parse(savedUser));
        } catch {
          // Invalid stored data — clear it
          localStorage.removeItem('assurex_token');
          localStorage.removeItem('assurex_user');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = useCallback(async (email, password) => {
    const response = await authAPI.login(email, password);
    const { access_token, user: userData } = response.data;

    localStorage.setItem('assurex_token', access_token);
    localStorage.setItem('assurex_user', JSON.stringify(userData));
    setToken(access_token);
    setUser(userData);

    return userData;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('assurex_token');
    localStorage.removeItem('assurex_user');
    setToken(null);
    setUser(null);
  }, []);

  const value = {
    user,
    token,
    loading,
    isAuthenticated: !!token && !!user,
    role: user?.role || null,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
