import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as userService from '../constants/user';
import { clearAuthToken, setAuthToken, setOnUnauthorized } from '../services/api';
import type { AuthUserData, AuthResponseDTO } from '../models/user';
import { clearStoredPushToken, getStoredPushToken, dismissAllNotificationsAsync } from '../services/notificationService';
import * as biometricsService from '../services/biometricsService';
import type { BiometricType } from '../services/biometricsService';

type AuthContextType = {
  user: AuthUserData | null;
  roles: string[] | null;
  isAuthenticated: boolean;
  ativoAnamnese?: boolean;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  // Biometria
  isBiometricsSupported: boolean;
  isBiometricsEnrolled: boolean;
  isBiometricsEnabled: boolean;
  biometricType: BiometricType;
  savedBiometricEmail: string | null;
  savedBiometricName: string | null;
  refreshBiometricsStatus: () => Promise<void>;
  enableBiometrics: (email: string, pass: string, name?: string) => Promise<boolean>;
  disableBiometrics: () => Promise<void>;
  loginWithBiometrics: () => Promise<{ success: boolean; error?: string }>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUserData | null>(null);
  const [roles, setRoles] = useState<string[] | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [ativoAnamnese, setAtivoAnamnese] = useState<boolean | undefined>(undefined);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Estados de Biometria
  const [isBiometricsSupported, setIsBiometricsSupported] = useState<boolean>(false);
  const [isBiometricsEnrolled, setIsBiometricsEnrolled] = useState<boolean>(false);
  const [isBiometricsEnabled, setIsBiometricsEnabled] = useState<boolean>(false);
  const [biometricType, setBiometricType] = useState<BiometricType>(null);
  const [savedBiometricEmail, setSavedBiometricEmail] = useState<string | null>(null);
  const [savedBiometricName, setSavedBiometricName] = useState<string | null>(null);

  const refreshBiometricsStatus = useCallback(async () => {
    try {
      const supported = await biometricsService.isBiometricsSupported();
      const enrolled = supported ? await biometricsService.isBiometricsEnrolled() : false;
      const type = enrolled ? await biometricsService.getBiometricType() : null;
      const hasSaved = enrolled ? await biometricsService.hasSavedBiometrics() : false;
      const savedEmail = hasSaved ? await biometricsService.getSavedBiometricEmail() : null;
      const savedName = hasSaved ? await biometricsService.getSavedBiometricName() : null;

      setIsBiometricsSupported(supported);
      setIsBiometricsEnrolled(enrolled);
      setBiometricType(type);
      setIsBiometricsEnabled(hasSaved);
      setSavedBiometricEmail(savedEmail);
      setSavedBiometricName(savedName);
    } catch {
      setIsBiometricsSupported(false);
      setIsBiometricsEnrolled(false);
      setBiometricType(null);
      setIsBiometricsEnabled(false);
      setSavedBiometricEmail(null);
      setSavedBiometricName(null);
    }
  }, []);

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
    refreshBiometricsStatus();

    // 401 Interceptor: Desloga automaticamente se token/cookie expirar
    setOnUnauthorized(async () => {
      await clearStoredPushToken();
      await clearAuthToken();
      setIsAuthenticated(false);
      setUser(null);
      setRoles(null);
    });

    return () => {
      setOnUnauthorized(null);
    };
  }, [checkAuth, refreshBiometricsStatus]);

  const login = async (email: string, pass: string): Promise<boolean> => {
    const res = await userService.login(email, pass);
    if (res.status === 200) {
      const token = typeof res.data?.token === 'string' ? res.data.token : null;
      if (token) {
        await setAuthToken(token);
      }
      await checkAuth();

      // Se a biometria já estiver ativa para este email, atualiza a senha salva
      if (isBiometricsEnabled) {
        const savedEmail = await biometricsService.getSavedBiometricEmail();
        if (savedEmail && savedEmail.toLowerCase() === email.trim().toLowerCase()) {
          await biometricsService.updateSavedBiometricPassword(pass);
        }
      }
      return true;
    }
    return false;
  };

  const logout = async (): Promise<void> => {
    try {
      const storedPushToken = await getStoredPushToken();
      if (storedPushToken) {
        await userService.removePushToken(storedPushToken);
      }
      await userService.logout();
    } catch (err) {
      console.warn('Erro ao efetuar logout na API:', err);
    } finally {
      await dismissAllNotificationsAsync();
      await clearStoredPushToken();
      await clearAuthToken();
      setIsAuthenticated(false);
      setUser(null);
      setRoles(null);
      setAtivoAnamnese(undefined);
      await refreshBiometricsStatus();
    }
  };

  const refreshAuth = async (): Promise<void> => {
    await checkAuth();
  };

  const enableBiometrics = async (email: string, pass: string, name?: string): Promise<boolean> => {
    try {
      const authOk = await biometricsService.authenticateWithBiometrics(
        'Confirme sua biometria para ativar o acesso rápido'
      );
      if (!authOk) return false;

      await biometricsService.saveBiometricCredentials({
        email,
        password: pass,
        name,
      });
      await refreshBiometricsStatus();
      return true;
    } catch (err) {
      console.error('[AuthContext] Erro ao ativar biometria:', err);
      return false;
    }
  };

  const disableBiometrics = async (): Promise<void> => {
    await biometricsService.clearBiometricCredentials();
    await refreshBiometricsStatus();
  };

  const loginWithBiometrics = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const credentials = await biometricsService.getBiometricCredentials();
      if (!credentials?.email || !credentials?.password) {
        return { success: false, error: 'Credenciais biométricas não encontradas.' };
      }

      const promptMsg = credentials.name
        ? `Acessar CSF como ${credentials.name}`
        : 'Acessar CSF com biometria';

      const authOk = await biometricsService.authenticateWithBiometrics(promptMsg);
      if (!authOk) {
        return { success: false, error: 'Autenticação biométrica não concluída.' };
      }

      const res = await userService.login(credentials.email, credentials.password);
      if (res.status === 200) {
        const token = typeof res.data?.token === 'string' ? res.data.token : null;
        if (token) {
          await setAuthToken(token);
        }
        await checkAuth();
        return { success: true };
      }
      return { success: false, error: 'Falha ao autenticar com o servidor.' };
    } catch (err: any) {
      console.error('[AuthContext] Erro no login biométrico:', err);
      const isAuthError = err?.response?.status === 401 || err?.response?.status === 403;
      if (isAuthError) {
        await biometricsService.clearBiometricCredentials();
        await refreshBiometricsStatus();
        return {
          success: false,
          error: 'Suas credenciais foram alteradas. Faça login com email e senha para atualizar.',
        };
      }
      const message =
        err?.response?.data?.mensagem ||
        err?.response?.data?.message ||
        'Não foi possível realizar o login biométrico.';
      return { success: false, error: message };
    }
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
        isBiometricsSupported,
        isBiometricsEnrolled,
        isBiometricsEnabled,
        biometricType,
        savedBiometricEmail,
        savedBiometricName,
        refreshBiometricsStatus,
        enableBiometrics,
        disableBiometrics,
        loginWithBiometrics,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

const defaultAuthContext: AuthContextType = {
  user: null,
  roles: [],
  isAuthenticated: false,
  isLoading: false,
  login: async () => false,
  logout: async () => {},
  refreshAuth: async () => {},
  isBiometricsSupported: false,
  isBiometricsEnrolled: false,
  isBiometricsEnabled: false,
  biometricType: null,
  savedBiometricEmail: null,
  savedBiometricName: null,
  refreshBiometricsStatus: async () => {},
  enableBiometrics: async () => false,
  disableBiometrics: async () => {},
  loginWithBiometrics: async () => ({ success: false }),
};

export function useAuth() {
  const context = useContext(AuthContext);
  return context || defaultAuthContext;
}
