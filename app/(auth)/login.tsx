import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FingerprintPattern, ScanFace } from 'lucide-react-native';
import ErrorModal from '../../src/components/modals/ErrorModal';
import BiometricsOptInModal from '../../src/components/modals/BiometricsOptInModal';
import { MailIcon, LockIcon } from '../../src/components/icons/AuthIcons';
import InputWithIcon from '../../src/components/InputWithIcon';
import Button from '../../src/components/Button';
import LogoCSF from '../../src/components/LogoCSF';
import { useAuth } from '../../src/contexts/AuthContext';

const initialLoginState = {
  email: '',
  password: '',
};

export default function LoginRoute() {
  const router = useRouter();
  const {
    login,
    loginWithBiometrics = async (): Promise<{ success: boolean; error?: string }> => ({ success: false }),
    isBiometricsSupported = false,
    isBiometricsEnrolled = false,
    isBiometricsEnabled = false,
    biometricType = null,
    savedBiometricEmail = null,
    savedBiometricName = null,
    enableBiometrics = async () => false,
  } = useAuth();

  const [loginInfo, setLoginInfo] = useState(initialLoginState);
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showOptInModal, setShowOptInModal] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState<{ email: string; pass: string } | null>(null);
  const [errorModal, setErrorModal] = useState<{ visible: boolean; title?: string; content?: string }>({
    visible: false,
  });

  const hasAutoPrompted = useRef(false);

  useEffect(() => {
    if (isBiometricsEnabled && !hasAutoPrompted.current) {
      hasAutoPrompted.current = true;
      const timer = setTimeout(() => {
        handleBiometricLogin();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isBiometricsEnabled]);

  async function handleBiometricLogin() {
    setBiometricLoading(true);
    try {
      const res = await loginWithBiometrics();
      if (res.success) {
        router.replace('/(app)/(tabs)');
      } else if (
        res.error &&
        !res.error.toLowerCase().includes('cancelada') &&
        !res.error.toLowerCase().includes('não concluída')
      ) {
        setErrorModal({
          visible: true,
          title: 'Acesso por Biometria',
          content: res.error,
        });
      }
    } catch (err: any) {
      console.error('Login biometric error:', err);
    } finally {
      setBiometricLoading(false);
    }
  }

  async function handleConfirmOptIn() {
    if (pendingCredentials) {
      await enableBiometrics(pendingCredentials.email, pendingCredentials.pass);
    }
    setShowOptInModal(false);
    setPendingCredentials(null);
    router.replace('/(app)/(tabs)');
  }

  function handleCloseOptIn() {
    setShowOptInModal(false);
    setPendingCredentials(null);
    router.replace('/(app)/(tabs)');
  }

  function handleAutoFill(email?: string, password?: string) {
    setLoginInfo({
      email: email || 'joao.silva@example.com',
      password: password || '123456789aA!',
    });
  }

  function handleAutoFill2() {
    setLoginInfo({
      email: 'maria.oliveira@example.com',
      password: '123456789aA!',
    });
  }

  function handleAutoFill3() {
    setLoginInfo({
      email: 'fabio.admin@email.com',
      password: 'admin123',
    });
  }

  function handleAutoFill4() {
    router.push('/dev-seed');
  }

  async function handleSubmit() {
    if (!loginInfo.email.trim() || !loginInfo.password.trim()) {
      setErrorModal({
        visible: true,
        title: 'Campos obrigatórios',
        content: 'Por favor, informe seu email e senha.',
      });
      return;
    }

    setLoading(true);

    try {
      const success = await login(loginInfo.email.trim(), loginInfo.password);
      if (success) {
        if (isBiometricsSupported && isBiometricsEnrolled && !isBiometricsEnabled) {
          setPendingCredentials({
            email: loginInfo.email.trim(),
            pass: loginInfo.password,
          });
          setShowOptInModal(true);
        } else {
          router.replace('/(app)/(tabs)');
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const message =
        err.response?.data?.mensagem ||
        err.response?.data?.message ||
        'Email ou senha incorretos. Verifique suas credenciais.';

      setErrorModal({
        visible: true,
        title: 'Falha no Login',
        content: message,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header Superior com Logo */}
          <View style={styles.headerSection}>
            <View style={styles.logoWrapper}>
              <LogoCSF width={220} height={96} />
            </View>
          </View>

          {/* Card Principal de Login */}
          <View style={styles.card}>
            <View style={styles.titleWrapper}>
              <Text style={styles.title}>Bem-vindo</Text>
              <Text style={styles.subtitle}>
                Acesse sua conta para continuar seus treinamentos
              </Text>
            </View>

            {/* Atalhos de Autofill em Desenvolvimento */}
            {__DEV__ && (
              <View style={styles.devSection}>
                <Text style={styles.devLabel}>Atalhos de Teste:</Text>
                <View style={styles.devButtonsRow}>
                  <TouchableOpacity
                    style={styles.btnAutoFill}
                    onPress={() => handleAutoFill()}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.btnAutoFillText}>Aluno 1</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.btnAutoFill}
                    onPress={handleAutoFill2}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.btnAutoFillText}>Aluno 2</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.btnAutoFill}
                    onPress={handleAutoFill3}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.btnAutoFillText}>Admin / Personal</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.btnAutoFill}
                    onPress={handleAutoFill4}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.btnAutoFillText}>Dev-seed</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Inputs */}
            <View style={styles.inputsWrapper}>
              <InputWithIcon
                label="Email"
                placeholder="seu@email.com"
                type="email"
                value={loginInfo.email}
                onInputChange={(email) => setLoginInfo((prev) => ({ ...prev, email }))}
                icon={<MailIcon size={20} color="#6B7280" />}
                returnKeyType="next"
              />

              <InputWithIcon
                label="Senha"
                placeholder="Sua senha"
                isPassword={true}
                value={loginInfo.password}
                onInputChange={(password) => setLoginInfo((prev) => ({ ...prev, password }))}
                icon={<LockIcon size={20} color="#6B7280" />}
                returnKeyType="done"
                onSubmitEditing={handleSubmit}
              />
            </View>

            {/* Link Esqueci a Senha */}
            <View style={styles.forgotPasswordWrapper}>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/forgot-password')}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotPasswordText}>
                  Esqueceu sua senha?
                </Text>
              </TouchableOpacity>
            </View>

            {/* Botão Entrar */}
            <Button
              title="Entrar"
              onPress={handleSubmit}
              loading={loading}
              variant="primary"
              size="large"
              style={styles.submitBtn}
            />

            {/* Atalho de Biometria */}
            {isBiometricsEnabled && (
              <View style={styles.biometricSection}>
                <View style={styles.biometricDividerRow}>
                  <View style={styles.biometricDividerLine} />
                  <Text style={styles.biometricDividerText}>ou acesse rapidamente</Text>
                  <View style={styles.biometricDividerLine} />
                </View>

                <TouchableOpacity
                  style={styles.biometricBtn}
                  onPress={handleBiometricLogin}
                  disabled={loading || biometricLoading}
                  activeOpacity={0.8}
                >
                  <View style={styles.biometricIconWrapper}>
                    {biometricType === 'facial' ? (
                      <ScanFace size={24} color="#093A5D" />
                    ) : (
                      <FingerprintPattern size={24} color="#093A5D" />
                    )}
                  </View>
                  <View style={styles.biometricTextWrapper}>
                    <Text style={styles.biometricTitle}>
                      {biometricType === 'facial' ? 'Entrar com Face ID' : 'Entrar com Digital'}
                    </Text>
                    {savedBiometricEmail ? (
                      <Text style={styles.biometricSubtitle} numberOfLines={1}>
                        {savedBiometricName ? `${savedBiometricName} (${savedBiometricEmail})` : savedBiometricEmail}
                      </Text>
                    ) : null}
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Link Cadastre-se */}
            <View style={styles.footerWrapper}>
              <Text style={styles.footerText}>Não tem uma conta? </Text>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/register')}
                activeOpacity={0.7}
              >
                <Text style={styles.registerLink}>Criar uma conta</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <ErrorModal
        visible={errorModal.visible}
        title={errorModal.title}
        content={errorModal.content}
        onClose={() => setErrorModal((prev) => ({ ...prev, visible: false }))}
      />
      <BiometricsOptInModal
        visible={showOptInModal}
        biometricType={biometricType}
        onConfirm={handleConfirmOptIn}
        onClose={handleCloseOptIn}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F1E2E',
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  headerSection: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoWrapper: {
    marginTop: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 36,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  titleWrapper: {
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 20,
  },
  devSection: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 10,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  devLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  devButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  btnAutoFill: {
    backgroundColor: '#E5E7EB',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  btnAutoFillText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#1F2937',
  },
  inputsWrapper: {
    marginBottom: 8,
  },
  forgotPasswordWrapper: {
    alignItems: 'flex-end',
    marginBottom: 24,
  },
  forgotPasswordText: {
    fontSize: 13,
    color: '#192633',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  submitBtn: {
    marginBottom: 20,
    backgroundColor: '#F26430',
  },
  biometricSection: {
    marginBottom: 24,
  },
  biometricDividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  biometricDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  biometricDividerText: {
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: '500',
    color: '#94A3B8',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  biometricBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F0F9FF',
    borderWidth: 1.5,
    borderColor: '#BAE6FD',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    gap: 12,
  },
  biometricIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  biometricTextWrapper: {
    flexShrink: 1,
  },
  biometricTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#093A5D',
  },
  biometricSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  footerWrapper: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#4B5563',
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F26430',
    textDecorationLine: 'underline',
  },
});
