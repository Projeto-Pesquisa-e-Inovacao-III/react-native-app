import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as userService from '../constants/user';
import { setOnUnauthorized } from '../services/api';
import type { AuthUserData, AuthResponseDTO } from '../models/user';

type AuthContextType = {
  user: AuthUserData | null;
  roles: string[] | null;
  isAuthenticated: boolean;
  ativoAnamnese?: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUserData | null>(null);
  const [roles, setRoles] = useState<string[] | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [ativoAnamnese, setAtivoAnamnese] = useState<boolean | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const checkAuth = useCallback(async () => {
    try {
      const res = await userService.isAuthenticated();
      if (res.data?.autentificado) {
        setIsAuthenticated(true);
        setUser(res.data.user || null);
        setAtivoAnamnese(res.data.ativoAnamnese);
        const userRoles = res.data.user?.roles || [];
        setRoles(userRoles.map((r) => r.toLowerCase()));
      } else {
        setIsAuthenticated(false);
        setUser(null);
        setRoles(null);
        setAtivoAnamnese(undefined);
      }
    } catch {
      setIsAuthenticated(false);
      setUser(null);
      setRoles(null);
      setAtivoAnamnese(undefined);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();

    // 401 Interceptor: Desloga automaticamente se token/cookie expirar
    setOnUnauthorized(() => {
      setIsAuthenticated(false);
      setUser(null);
      setRoles(null);
    });

    return () => {
      setOnUnauthorized(null);
    };
  }, [checkAuth]);

  const login = async (email: string, pass: string): Promise<boolean> => {
    const res = await userService.login(email, pass);
    if (res.status === 200) {
      await checkAuth();
      return true;
    }
    return false;
  };

  const logout = async (): Promise<void> => {
    try {
      await userService.logout();
    } catch (err) {
      console.warn('Erro ao efetuar logout na API:', err);
    } finally {
      setIsAuthenticated(false);
      setUser(null);
      setRoles(null);
      setAtivoAnamnese(undefined);
    }
  };

  const refreshAuth = async (): Promise<void> => {
    await checkAuth();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        roles,
        isAuthenticated,
        ativoAnamnese,
        isLoading,
        login,
        logout,
        refreshAuth,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um AuthProvider');
  }
  return context;
}
