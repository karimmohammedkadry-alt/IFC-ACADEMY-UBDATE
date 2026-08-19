import React, { createContext, useContext, useState, useEffect } from 'react';
import { AdminUser } from '../types';
import { api } from '../services/api';

interface AuthContextType {
  admin: AdminUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, pass: string) => Promise<void>;
  logout: () => void;
  updateAdminState: (user: AdminUser) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('kfa_token'));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = localStorage.getItem('kfa_token');
      if (!savedToken) {
        setIsLoading(false);
        return;
      }
      try {
        const user = await api.getMe();
        setAdmin(user);
      } catch (err) {
        console.error('Session expired or invalid', err);
        localStorage.removeItem('kfa_token');
        setToken(null);
        setAdmin(null);
      } finally {
        // give a smooth feel for the loading screen
        setTimeout(() => {
          setIsLoading(false);
        }, 600);
      }
    };

    checkAuth();
  }, []);

  const login = async (username: string, pass: string) => {
    const res = await api.login(username, pass);
    localStorage.setItem('kfa_token', res.token);
    setToken(res.token);
    setAdmin(res.admin);
  };

  const logout = () => {
    localStorage.removeItem('kfa_token');
    setToken(null);
    setAdmin(null);
  };

  const updateAdminState = (user: AdminUser) => {
    setAdmin(user);
  };

  return (
    <AuthContext.Provider
      value={{
        admin,
        token,
        isAuthenticated: !!token && !!admin,
        isLoading,
        login,
        logout,
        updateAdminState
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
