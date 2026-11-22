import { Platform } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';

export type BiometricType = 'facial' | 'fingerprint' | 'biometrics' | null;

export interface BiometricCredentials {
  email: string;
  password: string;
  name?: string;
}

const BIOMETRIC_ENABLED_KEY = 'csf_biometric_enabled';
const BIOMETRIC_EMAIL_KEY = 'csf_biometric_email';
const BIOMETRIC_PASSWORD_KEY = 'csf_biometric_password';
const BIOMETRIC_NAME_KEY = 'csf_biometric_name';

/**
 * Verifica se o dispositivo possui hardware biométrico e suporte ao SecureStore.
 */
export async function isBiometricsSupported(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const isSecureStoreAvailable = await SecureStore.isAvailableAsync();
    if (!isSecureStoreAvailable) return false;

    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    return hasHardware;
  } catch (error) {
    console.warn('[BiometricsService] Erro ao verificar suporte de hardware:', error);
    return false;
  }
}

/**
 * Verifica se o usuário tem biometria registrada/cadastrada no aparelho.
 */
export async function isBiometricsEnrolled(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const supported = await isBiometricsSupported();
    if (!supported) return false;

    return await LocalAuthentication.isEnrolledAsync();
  } catch (error) {
    console.warn('[BiometricsService] Erro ao verificar cadastro biométrico:', error);
    return false;
  }
}

/**
 * Identifica o tipo de biometria predominante no dispositivo (Face ID, Digital ou Genérico).
 */
export async function getBiometricType(): Promise<BiometricType> {
  if (Platform.OS === 'web') return null;
  try {
    const supported = await isBiometricsSupported();
    if (!supported) return null;

    const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
    if (types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      return 'facial';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      return 'fingerprint';
    }
    if (types.includes(LocalAuthentication.AuthenticationType.IRIS)) {
      return 'facial';
    }
    if (types.length > 0) {
      return 'biometrics';
    }
    return null;
  } catch (error) {
    console.warn('[BiometricsService] Erro ao identificar tipo biométrico:', error);
    return null;
  }
}

/**
 * Dispara o prompt nativo do sistema para autenticação biométrica.
 */
export async function authenticateWithBiometrics(promptMessage?: string): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const isEnrolled = await isBiometricsEnrolled();
    if (!isEnrolled) return false;

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: promptMessage || 'Autentique-se para acessar o CSF',
      cancelLabel: 'Cancelar',
      fallbackLabel: 'Usar Senha',
      disableDeviceFallback: false,
    });

    return result.success;
  } catch (error) {
    console.warn('[BiometricsService] Falha na autenticação biométrica:', error);
    return false;
  }
}

/**
 * Salva as credenciais do usuário com segurança no SecureStore e ativa a biometria.
 */
export async function saveBiometricCredentials(credentials: BiometricCredentials): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await SecureStore.setItemAsync(BIOMETRIC_ENABLED_KEY, 'true');
    await SecureStore.setItemAsync(BIOMETRIC_EMAIL_KEY, credentials.email.trim());
    await SecureStore.setItemAsync(BIOMETRIC_PASSWORD_KEY, credentials.password);
    if (credentials.name) {
      await SecureStore.setItemAsync(BIOMETRIC_NAME_KEY, credentials.name.trim());
    } else {
      await SecureStore.deleteItemAsync(BIOMETRIC_NAME_KEY).catch(() => {});
    }
  } catch (error) {
    console.error('[BiometricsService] Erro ao salvar credenciais biométricas:', error);
    throw error;
  }
}

/**
 * Recupera as credenciais biométricas armazenadas.
 */
export async function getBiometricCredentials(): Promise<BiometricCredentials | null> {
  if (Platform.OS === 'web') return null;
  try {
    const isEnabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    if (isEnabled !== 'true') return null;

    const email = await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
    const password = await SecureStore.getItemAsync(BIOMETRIC_PASSWORD_KEY);

    if (!email || !password) return null;

    const name = await SecureStore.getItemAsync(BIOMETRIC_NAME_KEY);

    return {
      email,
      password,
      name: name || undefined,
    };
  } catch (error) {
    console.warn('[BiometricsService] Erro ao ler credenciais biométricas:', error);
    return null;
  }
}

/**
 * Checa se o usuário tem biometria ativa e credenciais salvas no aparelho.
 */
export async function hasSavedBiometrics(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const isEnabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    if (isEnabled !== 'true') return false;

    const email = await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
    const password = await SecureStore.getItemAsync(BIOMETRIC_PASSWORD_KEY);

    return Boolean(email && password);
  } catch (error) {
    console.warn('[BiometricsService] Erro ao checar credenciais salvas:', error);
    return false;
  }
}

/**
 * Retorna o email da conta vinculada à biometria para exibição na UI.
 */
export async function getSavedBiometricEmail(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    const isEnabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    if (isEnabled !== 'true') return null;
    return await SecureStore.getItemAsync(BIOMETRIC_EMAIL_KEY);
  } catch {
    return null;
  }
}

/**
 * Retorna o nome da conta vinculada à biometria para exibição na UI.
 */
export async function getSavedBiometricName(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    const isEnabled = await SecureStore.getItemAsync(BIOMETRIC_ENABLED_KEY);
    if (isEnabled !== 'true') return null;
    return await SecureStore.getItemAsync(BIOMETRIC_NAME_KEY);
  } catch {
    return null;
  }
}

/**
 * Atualiza a senha salva caso o usuário troque de senha nas configurações.
 */
export async function updateSavedBiometricPassword(newPassword: string): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const hasBiometrics = await hasSavedBiometrics();
    if (!hasBiometrics) return false;

    await SecureStore.setItemAsync(BIOMETRIC_PASSWORD_KEY, newPassword);
    return true;
  } catch (error) {
    console.warn('[BiometricsService] Erro ao atualizar senha biométrica:', error);
    return false;
  }
}

/**
 * Remove credenciais salvas e desativa o login por biometria.
 */
export async function clearBiometricCredentials(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await SecureStore.deleteItemAsync(BIOMETRIC_ENABLED_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(BIOMETRIC_EMAIL_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(BIOMETRIC_PASSWORD_KEY).catch(() => {});
    await SecureStore.deleteItemAsync(BIOMETRIC_NAME_KEY).catch(() => {});
  } catch (error) {
    console.warn('[BiometricsService] Erro ao limpar credenciais biométricas:', error);
  }
}
