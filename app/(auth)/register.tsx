import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  User as UserIcon,
  Mail as MailIcon,
  Lock as LockIcon,
  Calendar as CalendarIcon,
  IdCard,
  Phone as PhoneIcon,
  Check,
} from 'lucide-react-native';

import { useAuth } from '../../src/contexts/AuthContext';
import * as userService from '../../src/constants/user';
import type { UserDTO } from '../../src/models/user';
import InputWithIcon from '../../src/components/InputWithIcon';
import Select, { SelectOption } from '../../src/components/Select';
import LogoCSF from '../../src/components/LogoCSF';
import ErrorModal from '../../src/components/modals/ErrorModal';
import { cpfMask, cellphoneMask, dateMask } from '../../src/utils/mascara';
import { validatePassword, validateEmail } from '../../src/utils/validacao';

const initialRegisterState = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  customerDocument: '',
  birthDate: '',
  phone: '',
  gender: '',
};

const GENDER_OPTIONS: SelectOption[] = [
  { label: 'Masculino', value: 'Masculino' },
  { label: 'Feminino', value: 'Feminino' },
  { label: 'Outro', value: 'Outro' },
];

export default function RegisterRoute() {
  const router = useRouter();
  const { refreshAuth } = useAuth();

  const [register, setRegister] = useState(initialRegisterState);
  const [openSelectId, setOpenSelectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [errorModal, setErrorModal] = useState<{ visible: boolean; title: string; content: string }>({
    visible: false,
    title: '',
    content: '',
  });

  const allPasswordRules = useMemo(() => {
    return [
      'Pelo menos uma letra minúscula',
      'Pelo menos uma letra maiúscula',
      'Pelo menos um número',
      'Pelo menos um caractere especial',
      'No mínimo 8 caracteres',
    ];
  }, []);

  const passwordValidation = useMemo(() => {
    const pwd = register.password;
    if (!pwd) return null;

    const hasLower = /[a-z]/.test(pwd);
    const hasUpper = /[A-Z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSpecial = /[\W_]/.test(pwd);
    const hasMinLen = pwd.length >= 8;

    const passedCount = [hasLower, hasUpper, hasNumber, hasSpecial, hasMinLen].filter(Boolean).length;
    const pct = Math.round((passedCount / 5) * 100);

    const color = pct < 50 ? '#EF4444' : pct < 100 ? '#F59E0B' : '#22C55E';
    const label = pct < 50 ? 'Senha fraca' : pct < 100 ? 'Quase completa...' : 'Senha forte';

    return {
      hasLower,
      hasUpper,
      hasNumber,
      hasSpecial,
      hasMinLen,
      pct,
      color,
      label,
    };
  }, [register.password]);

  function handleChange(field: string, value: string) {
    setRegister((prev) => ({ ...prev, [field]: value }));
  }

  // Verifica idade a partir de DD/MM/AAAA
  const isAdult = useMemo(() => {
    if (register.birthDate.length !== 10) return null;
    const [d, m, y] = register.birthDate.split('/').map(Number);
    if (!d || !m || !y || isNaN(d) || isNaN(m) || isNaN(y)) return false;
    const birth = new Date(y, m - 1, d);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const mDiff = today.getMonth() - birth.getMonth();
    if (mDiff < 0 || (mDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age >= 18;
  }, [register.birthDate]);

  const isFormValid = useMemo(() => {
    const emailOk = validateEmail(register.email).startsWith('Email válido');
    const pwdOk = validatePassword(register.password).startsWith('password válida');
    const pwdMatch = register.password === register.confirmPassword && register.password.length > 0;
    const cpfOk = register.customerDocument.replace(/\D/g, '').length === 11;
    const phoneOk = register.phone.replace(/\D/g, '').length >= 10;
    const nameOk = register.name.trim().length >= 3;
    const genderOk = register.gender.trim().length > 0;

    return nameOk && emailOk && pwdOk && pwdMatch && cpfOk && phoneOk && genderOk && isAdult === true;
  }, [register, isAdult]);

  function handleAutoFill() {
    setRegister({
      name: 'João Silva',
      email: `joao.${Date.now()}@example.com`,
      password: 'Password123!',
      confirmPassword: 'Password123!',
      customerDocument: '113.825.140-26',
      phone: '(11) 91234-5678',
      gender: 'Masculino',
      birthDate: '01/01/2000',
    });
  }

  async function handleSubmit() {
    if (!isFormValid) {
      setErrorModal({
        visible: true,
        title: 'Campos incompletos',
        content: 'Preencha todos os campos obrigatórios corretamente antes de prosseguir.',
      });
      return;
    }

    setLoading(true);

    const [d, m, y] = register.birthDate.split('/');
    const formattedBirthDate = `${y}-${m}-${d}`;
    const cleanPhone = register.phone.replace(/\D/g, '');

    const userData: UserDTO = {
      nome: register.name.trim(),
      email: register.email.trim().toLowerCase(),
      senha: register.password,
      cpf: register.customerDocument.replace(/\D/g, ''),
      telefone: {
        ddd: cleanPhone.slice(0, 2),
        numero: cleanPhone.slice(2),
        pais: '55',
      },
      sexo: register.gender,
      dataNascimento: formattedBirthDate,
    };

    try {
      await userService.register(userData);
      // Sincroniza sessão no AuthContext (o backend já fez o login e enviou o cookie)
      await refreshAuth();
      // Redireciona diretamente para a etapa de Anamnese
      router.replace('/(app)/anamnesis' as any);
    } catch (err: any) {
      console.error('Erro no cadastro:', err);
      const message =
        err?.response?.data?.Exception ||
        err?.response?.data?.message ||
        err?.response?.data?.dataNascimento ||
        'Ocorreu um erro ao realizar o cadastro. Tente novamente mais tarde.';
      setErrorModal({
        visible: true,
        title: 'Erro ao cadastrar',
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
          {/* Header Superior com Botão de Voltar */}
          <View style={styles.topBar}>
            <View style={styles.logoContainer}>
              <LogoCSF width={150} height={50} />
            </View>
            <View style={{ width: 40 }} />
          </View>

          {/* Card Principal de Cadastro */}
          <View style={styles.card}>
            <View style={styles.titleSection}>
              <Text style={styles.title}>Criar conta</Text>
              <Text style={styles.subtitle}>
                Preencha os dados abaixo para iniciar sua jornada personalizada.
              </Text>
            </View>

            {/* Botão Auto-Preencher em Desenvolvimento */}
            {__DEV__ && (
              <TouchableOpacity
                style={styles.autoFillBtn}
                onPress={handleAutoFill}
                activeOpacity={0.8}
              >
                <Text style={styles.autoFillText}>⚡ Auto-Preencher para Teste</Text>
              </TouchableOpacity>
            )}

            {/* Nome Completo */}
            <View style={styles.fieldWrapper}>
              <InputWithIcon
                label="Nome completo"
                placeholder="Ex: João da Silva"
                icon={<UserIcon size={20} color="#64748B" />}
                value={register.name}
                onInputChange={(v) => handleChange('name', v)}
                maxLength={70}
              />
            </View>

            {/* E-mail */}
            <View style={styles.fieldWrapper}>
              <InputWithIcon
                label="E-mail"
                placeholder="usuario@dominio.com"
                icon={<MailIcon size={20} color="#64748B" />}
                value={register.email}
                keyboardType="email-address"
                autoCapitalize="none"
                onInputChange={(v) => handleChange('email', v)}
                maxLength={100}
              />
              {register.email.length > 0 &&
                !validateEmail(register.email).startsWith('Email válido') && (
                  <Text style={styles.errorHint}>E-mail com formato inválido.</Text>
                )}
            </View>

            {/* Data de Nascimento & Gênero */}
            <View style={styles.row}>
              <View style={[styles.fieldWrapper, { flex: 1 }]}>
                <InputWithIcon
                  label="Data de nascimento"
                  placeholder="DD/MM/AAAA"
                  icon={<CalendarIcon size={18} color="#64748B" />}
                  value={register.birthDate}
                  keyboardType="numeric"
                  onInputChange={(v) => handleChange('birthDate', dateMask(v))}
                  maxLength={10}
                />
                {isAdult === false && (
                  <Text style={styles.errorHint}>Necessário ter pelo menos 18 anos.</Text>
                )}
              </View>

              <View style={[styles.fieldWrapper, { flex: 1 }]}>
                <Text style={styles.fieldLabel}>Gênero</Text>
                <Select
                  id="gender-select"
                  openSelectId={openSelectId}
                  setOpenSelectId={setOpenSelectId}
                  selectPlaceholder="Gênero"
                  values={GENDER_OPTIONS}
                  selectStatusValue={register.gender}
                  onSelectStatusChange={(val) => handleChange('gender', val)}
                  showSelectAll={false}
                />
              </View>
            </View>

            {/* CPF & Telefone */}
            <View style={styles.row}>
              <View style={[styles.fieldWrapper, { flex: 1 }]}>
                <InputWithIcon
                  label="CPF"
                  placeholder="000.000.000-00"
                  icon={<IdCard size={18} color="#64748B" />}
                  value={register.customerDocument}
                  keyboardType="numeric"
                  onInputChange={(v) => handleChange('customerDocument', cpfMask(v))}
                  maxLength={14}
                />
              </View>

              <View style={[styles.fieldWrapper, { flex: 1 }]}>
                <InputWithIcon
                  label="Telefone"
                  placeholder="(11) 90000-0000"
                  icon={<PhoneIcon size={18} color="#64748B" />}
                  value={register.phone}
                  keyboardType="phone-pad"
                  onInputChange={(v) => handleChange('phone', cellphoneMask(v))}
                  maxLength={15}
                />
              </View>
            </View>

            {/* Senha */}
            <View style={styles.fieldWrapper}>
              <InputWithIcon
                label="Senha"
                placeholder="Mínimo 8 caracteres"
                icon={<LockIcon size={20} color="#64748B" />}
                isPassword={true}
                value={register.password}
                onInputChange={(v) => handleChange('password', v)}
                maxLength={50}
              />
            </View>

            {/* Confirmar Senha */}
            <View style={styles.fieldWrapper}>
              <InputWithIcon
                label="Confirmar Senha"
                placeholder="Repita a senha"
                icon={<LockIcon size={20} color="#64748B" />}
                isPassword={true}
                value={register.confirmPassword}
                onInputChange={(v) => handleChange('confirmPassword', v)}
                maxLength={50}
              />
              {register.confirmPassword.length > 0 &&
                register.password !== register.confirmPassword && (
                  <Text style={styles.errorHint}>As senhas não coincidem.</Text>
                )}
            </View>

            {/* Validador de Força e Requisitos de Senha */}
            {passwordValidation && (
              <View style={styles.strengthBox}>
                <View style={styles.strengthHeader}>
                  <Text style={[styles.strengthLabel, { color: passwordValidation.color }]}>
                    {passwordValidation.label}
                  </Text>
                  {register.password === register.confirmPassword &&
                    register.confirmPassword.length > 0 && (
                      <Text style={styles.passMatchBadge}>Senhas coincidem ✓</Text>
                    )}
                </View>

                <View style={styles.strengthTrack}>
                  <View
                    style={[
                      styles.strengthFill,
                      {
                        width: `${passwordValidation.pct}%`,
                        backgroundColor: passwordValidation.color,
                      },
                    ]}
                  />
                </View>

                <View style={styles.rulesList}>
                  <Text style={styles.rulesHeader}>Requisitos de senha:</Text>
                  <View style={styles.ruleRow}>
                    <Check
                      size={14}
                      color={passwordValidation.hasMinLen ? '#22C55E' : '#94A3B8'}
                    />
                    <Text
                      style={[
                        styles.ruleText,
                        passwordValidation.hasMinLen && styles.rulePassed,
                      ]}
                    >
                      Pelo menos 8 caracteres
                    </Text>
                  </View>

                  <View style={styles.ruleRow}>
                    <Check
                      size={14}
                      color={passwordValidation.hasUpper ? '#22C55E' : '#94A3B8'}
                    />
                    <Text
                      style={[
                        styles.ruleText,
                        passwordValidation.hasUpper && styles.rulePassed,
                      ]}
                    >
                      Pelo menos uma letra maiúscula
                    </Text>
                  </View>

                  <View style={styles.ruleRow}>
                    <Check
                      size={14}
                      color={passwordValidation.hasLower ? '#22C55E' : '#94A3B8'}
                    />
                    <Text
                      style={[
                        styles.ruleText,
                        passwordValidation.hasLower && styles.rulePassed,
                      ]}
                    >
                      Pelo menos uma letra minúscula
                    </Text>
                  </View>

                  <View style={styles.ruleRow}>
                    <Check
                      size={14}
                      color={passwordValidation.hasNumber ? '#22C55E' : '#94A3B8'}
                    />
                    <Text
                      style={[
                        styles.ruleText,
                        passwordValidation.hasNumber && styles.rulePassed,
                      ]}
                    >
                      Pelo menos um número
                    </Text>
                  </View>

                  <View style={styles.ruleRow}>
                    <Check
                      size={14}
                      color={passwordValidation.hasSpecial ? '#22C55E' : '#94A3B8'}
                    />
                    <Text
                      style={[
                        styles.ruleText,
                        passwordValidation.hasSpecial && styles.rulePassed,
                      ]}
                    >
                      Pelo menos um caractere especial (!@#$...)
                    </Text>
                  </View>
                </View>
              </View>
            )}

            {/* Botão de Cadastro */}
            <TouchableOpacity
              style={[styles.submitBtn, (!isFormValid || loading) && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={!isFormValid || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.submitBtnText}>Criar conta e Iniciar Anamnese →</Text>
              )}
            </TouchableOpacity>

            {/* Link para Login */}
            <View style={styles.footerLink}>
              <Text style={styles.footerText}>Já tem uma conta? </Text>
              <TouchableOpacity onPress={() => router.back()}>
                <Text style={styles.loginLinkText}>Faça login</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal de Erro */}
      {errorModal.visible && (
        <ErrorModal
          title={errorModal.title}
          content={errorModal.content}
          closeThen={() => setErrorModal((prev) => ({ ...prev, visible: false }))}
        />
      )}
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
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoContainer: {
    alignItems: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  titleSection: {
    marginBottom: 18,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  autoFillBtn: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  autoFillText: {
    fontSize: 12,
    color: '#1D4ED8',
    fontWeight: '700',
  },
  fieldWrapper: {
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  errorHint: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  strengthBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  strengthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  strengthLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  passMatchBadge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#22C55E',
  },
  strengthTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  strengthFill: {
    height: '100%',
    borderRadius: 3,
  },
  rulesList: {
    gap: 4,
  },
  rulesHeader: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 2,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  ruleText: {
    fontSize: 11,
    color: '#94A3B8',
  },
  rulePassed: {
    color: '#1E293B',
    fontWeight: '500',
  },
  submitBtn: {
    backgroundColor: '#F26430',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F26430',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
    marginTop: 6,
    marginBottom: 16,
  },
  submitBtnDisabled: {
    opacity: 0.5,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  footerLink: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 13,
    color: '#64748B',
  },
  loginLinkText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#093A5D',
  },
});
