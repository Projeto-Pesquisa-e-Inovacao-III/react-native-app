import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import {
  isBiometricsSupported,
  isBiometricsEnrolled,
  getBiometricType,
  authenticateWithBiometrics,
  saveBiometricCredentials,
  getBiometricCredentials,
  hasSavedBiometrics,
  getSavedBiometricEmail,
  getSavedBiometricName,
  updateSavedBiometricPassword,
  clearBiometricCredentials,
} from '../biometricsService';

jest.mock('expo-local-authentication', () => ({
  hasHardwareAsync: jest.fn(),
  isEnrolledAsync: jest.fn(),
  supportedAuthenticationTypesAsync: jest.fn(),
  authenticateAsync: jest.fn(),
  AuthenticationType: {
    FINGERPRINT: 1,
    FACIAL_RECOGNITION: 2,
    IRIS: 3,
  },
}));

jest.mock('expo-secure-store', () => {
  const store: Record<string, string> = {};
  return {
    isAvailableAsync: jest.fn().mockResolvedValue(true),
    setItemAsync: jest.fn((key: string, value: string) => {
      store[key] = value;
      return Promise.resolve();
    }),
    getItemAsync: jest.fn((key: string) => {
      return Promise.resolve(store[key] || null);
    }),
    deleteItemAsync: jest.fn((key: string) => {
      delete store[key];
      return Promise.resolve();
    }),
    _getStore: () => store,
    _clearStore: () => {
      Object.keys(store).forEach((k) => delete store[k]);
    },
  };
});

describe('biometricsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (SecureStore as any)._clearStore();
    (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(true);
    (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(true);
    (SecureStore.isAvailableAsync as jest.Mock).mockResolvedValue(true);
  });

  describe('isBiometricsSupported', () => {
    it('deve retornar true quando hardware e SecureStore estão disponíveis', async () => {
      const supported = await isBiometricsSupported();
      expect(supported).toBe(true);
    });

    it('deve retornar false quando hardware não está disponível', async () => {
      (LocalAuthentication.hasHardwareAsync as jest.Mock).mockResolvedValue(false);
      const supported = await isBiometricsSupported();
      expect(supported).toBe(false);
    });

    it('deve retornar false quando SecureStore não está disponível', async () => {
      (SecureStore.isAvailableAsync as jest.Mock).mockResolvedValue(false);
      const supported = await isBiometricsSupported();
      expect(supported).toBe(false);
    });
  });

  describe('isBiometricsEnrolled', () => {
    it('deve retornar true quando biometria está cadastrada', async () => {
      const enrolled = await isBiometricsEnrolled();
      expect(enrolled).toBe(true);
    });

    it('deve retornar false quando usuário não cadastrou biometria', async () => {
      (LocalAuthentication.isEnrolledAsync as jest.Mock).mockResolvedValue(false);
      const enrolled = await isBiometricsEnrolled();
      expect(enrolled).toBe(false);
    });
  });

  describe('getBiometricType', () => {
    it('deve identificar Face ID / Reconhecimento Facial', async () => {
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
      ]);
      const type = await getBiometricType();
      expect(type).toBe('facial');
    });

    it('deve identificar Impressão Digital', async () => {
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([
        LocalAuthentication.AuthenticationType.FINGERPRINT,
      ]);
      const type = await getBiometricType();
      expect(type).toBe('fingerprint');
    });

    it('deve retornar biometrics genérico quando há outro tipo não específico', async () => {
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([99 as any]);
      const type = await getBiometricType();
      expect(type).toBe('biometrics');
    });

    it('deve retornar null quando nenhum tipo é suportado', async () => {
      (LocalAuthentication.supportedAuthenticationTypesAsync as jest.Mock).mockResolvedValue([]);
      const type = await getBiometricType();
      expect(type).toBeNull();
    });
  });

  describe('authenticateWithBiometrics', () => {
    it('deve retornar true quando a autenticação biométrica é bem-sucedida', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({ success: true });
      const result = await authenticateWithBiometrics('Teste de acesso');
      expect(result).toBe(true);
      expect(LocalAuthentication.authenticateAsync).toHaveBeenCalledWith(
        expect.objectContaining({ promptMessage: 'Teste de acesso' })
      );
    });

    it('deve retornar false quando o usuário cancela ou falha', async () => {
      (LocalAuthentication.authenticateAsync as jest.Mock).mockResolvedValue({
        success: false,
        error: 'user_cancel',
      });
      const result = await authenticateWithBiometrics();
      expect(result).toBe(false);
    });
  });

  describe('Gerenciamento de Credenciais no SecureStore', () => {
    it('deve salvar e recuperar credenciais biométricas com sucesso', async () => {
      await saveBiometricCredentials({
        email: 'aluno@teste.com',
        password: 'minha_senha_segura',
        name: 'Aluno Teste',
      });

      const hasSaved = await hasSavedBiometrics();
      expect(hasSaved).toBe(true);

      const creds = await getBiometricCredentials();
      expect(creds).toEqual({
        email: 'aluno@teste.com',
        password: 'minha_senha_segura',
        name: 'Aluno Teste',
      });

      const email = await getSavedBiometricEmail();
      expect(email).toBe('aluno@teste.com');

      const name = await getSavedBiometricName();
      expect(name).toBe('Aluno Teste');
    });

    it('deve atualizar a senha salva', async () => {
      await saveBiometricCredentials({
        email: 'aluno@teste.com',
        password: 'senha_antiga',
      });

      const updated = await updateSavedBiometricPassword('nova_senha_123');
      expect(updated).toBe(true);

      const creds = await getBiometricCredentials();
      expect(creds?.password).toBe('nova_senha_123');
    });

    it('deve limpar todas as credenciais ao desativar a biometria', async () => {
      await saveBiometricCredentials({
        email: 'aluno@teste.com',
        password: 'senha',
        name: 'Nome',
      });

      await clearBiometricCredentials();

      const hasSaved = await hasSavedBiometrics();
      expect(hasSaved).toBe(false);

      const creds = await getBiometricCredentials();
      expect(creds).toBeNull();
    });
  });
});
