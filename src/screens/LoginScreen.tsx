import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  SafeAreaView,
} from 'react-native';
import { MailIcon, LockIcon, ArrowLeftIcon } from '../components/icons/AuthIcons';
import InputWithIcon from '../components/InputWithIcon';
import Button from '../components/Button';
import LogoCSF from '../components/LogoCSF';
import * as userService from '../constants/user';
import type { AuthResponseDTO } from '../models/user';

type Props = {
  onLoginSuccess?: (authData?: AuthResponseDTO) => void;
  onNavigateRegister?: () => void;
  onNavigateForgotPassword?: () => void;
  onGoBack?: () => void;
};

const initialLoginState = {
  email: '',
  password: '',
};

export default function LoginScreen({
  onLoginSuccess,
  onNavigateRegister,
  onNavigateForgotPassword,
  onGoBack,
}: Props) {
  const [loginInfo, setLoginInfo] = useState(initialLoginState);
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  // Verifica se o usuário já está autenticado ao abrir a tela
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const res = await userService.isAuthenticated();
        if (isMounted && res.data?.autentificado) {
          onLoginSuccess?.(res.data);
        }
      } catch {
        // Não autenticado, permanece na tela de login
      } finally {
        if (isMounted) setCheckingAuth(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [onLoginSuccess]);

  // Funções de auto-preenchimento para agilizar testes no desenvolvimento
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

  async function handleSubmit() {
    if (!loginInfo.email.trim() || !loginInfo.password.trim()) {
      Alert.alert('Campos obrigatórios', 'Por favor, informe seu email e senha.');
      return;
    }

    setLoading(true);

    try {
      const res = await userService.login(loginInfo.email.trim(), loginInfo.password);

      if (res.status === 200) {
        try {
          const authRes = await userService.isAuthenticated();
          onLoginSuccess?.(authRes.data);
        } catch {
          onLoginSuccess?.();
        }
      }
    } catch (err: any) {
      console.error('Login error:', err);
      const message =
        err.response?.data?.mensagem ||
        err.response?.data?.message ||
        'Email ou senha incorreto. Verifique suas credenciais.';

      Alert.alert('Falha no Login', message, [
        { text: 'OK', style: 'default' },
      ]);
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
          {/* Header Superior com Logo e Botão Voltar */}
          <View style={styles.headerSection}>
            {onGoBack && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={onGoBack}
                activeOpacity={0.7}
              >
                <ArrowLeftIcon size={18} color="#FFFFFF" />
                <Text style={styles.backButtonText}>Voltar</Text>
              </TouchableOpacity>
            )}

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
                onPress={onNavigateForgotPassword}
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

            {/* Link Cadastre-se */}
            <View style={styles.footerWrapper}>
              <Text style={styles.footerText}>Não tem uma conta? </Text>
              <TouchableOpacity onPress={onNavigateRegister} activeOpacity={0.7}>
                <Text style={styles.registerLink}>Criar uma conta</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F1E2E', // Navy background CSF
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
    paddingTop: 16,
    paddingBottom: 28,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  backButton: {
    position: 'absolute',
    left: 20,
    top: 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    zIndex: 10,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '500',
    marginLeft: 4,
  },
  logoWrapper: {
    marginTop: 20,
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
    marginBottom: 24,
    backgroundColor: '#F26430',
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
