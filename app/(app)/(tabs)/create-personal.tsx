import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  useWindowDimensions,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  User,
  Mail,
  Users,
  Calendar,
  Hash,
  Phone,
  ArrowLeft,
  Sparkles,
} from 'lucide-react-native';

import InputWithIcon from '../../../src/components/InputWithIcon';
import Select from '../../../src/components/Select';
import SuccessModal from '../../../src/components/modals/SuccessModal';
import ErrorModal from '../../../src/components/modals/ErrorModal';
import FocusAwareStatusBar from '../../../src/components/FocusAwareStatusBar';
import VoiceRecorderButton from '../../../src/components/VoiceRecorderButton';
import { cellphoneMask, crefMask, dateMask } from '../../../src/utils/mascara';
import { validateEmail } from '../../../src/utils/validacao';
import { createPersonal } from '../../../src/constants/admin';
import type { ReqCreateUserDTO } from '../../../src/models/admin';

export default function CreatePersonalScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDoubleRow = width >= 768;

  const sexOptions = [
    { label: 'Masculino', value: 'Masculino' },
    { label: 'Feminino', value: 'Feminino' },
    { label: 'Outro', value: 'Outro' },
  ];

  const [form, setForm] = useState({
    nome: '',
    sexo: '',
    dataNascimento: '',
    email: '',
    cref: '',
    telefone: '',
  });

  const [openSelectId, setOpenSelectId] = useState<string | null>(null);

  const [modalState, setModalState] = useState<{
    type: 'success' | 'error' | null;
    title: string;
    content: string;
  }>({
    type: null,
    title: '',
    content: '',
  });

  const [touched, setTouched] = useState<{ [key: string]: boolean }>({
    nome: false,
    email: false,
  });
  const [showNomeError, setShowNomeError] = useState(false);
  const [showEmailError, setShowEmailError] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleChange(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setTouched((prev) => ({ ...prev, [field]: true }));
    if (field === 'nome') {
      setShowNomeError(false);
      setTimeout(() => setShowNomeError(true), 200);
    }
    if (field === 'email') {
      setShowEmailError(false);
      setTimeout(() => setShowEmailError(true), 200);
    }
  }

  function parseTelefone(telefone: string) {
    const onlyNums = telefone.replace(/\D/g, '');
    return {
      pais: 55,
      ddd: Number(onlyNums.substring(0, 2)),
      numero: Number(onlyNums.substring(2)),
    };
  }

  function isFormValid() {
    return (
      form.nome.trim() !== '' &&
      validateEmail(form.email).startsWith('Email válido') &&
      form.cref.trim() !== '' &&
      form.sexo.trim() !== '' &&
      form.dataNascimento.length === 10 &&
      form.telefone.replace(/\D/g, '').length === 11
    );
  }

  function handleAutoFill() {
    setForm({
      nome: 'Gabriel',
      sexo: 'Masculino',
      dataNascimento: '01/01/2000',
      email: 'gabriel@email.com',
      cref: '123456',
      telefone: '(11) 99999-9999',
    });
    setTouched({ nome: false, email: false });
    setShowNomeError(false);
    setShowEmailError(false);
  }

  function handleCancel() {
    setSubmitAttempted(false);
    setTouched({ nome: false, email: false });
    setShowNomeError(false);
    setShowEmailError(false);
    setForm({
      nome: '',
      sexo: '',
      dataNascimento: '',
      email: '',
      cref: '',
      telefone: '',
    });
    if (router.canGoBack()) {
      router.back();
    }
  }

  async function handleSubmit() {
    setSubmitAttempted(true);
    setTouched({ nome: true, email: true });
    setShowNomeError(true);
    setShowEmailError(true);

    if (!isFormValid()) {
      return;
    }

    setLoading(true);

    try {
      const [d, m, y] = form.dataNascimento.split('/');
      const formattedDate = `${y}-${m}-${d}`;

      const data: ReqCreateUserDTO = {
        nome: form.nome.trim(),
        sexo: form.sexo,
        dataNascimento: formattedDate,
        email: form.email.trim(),
        cref: form.cref.trim(),
        telefone: parseTelefone(form.telefone),
      };

      await createPersonal(data);

      setModalState({
        type: 'success',
        title: 'Personal Cadastrado!',
        content: 'O personal trainer foi cadastrado com sucesso no sistema.',
      });

      setSubmitAttempted(false);
      setTouched({ nome: false, email: false });
      setShowNomeError(false);
      setShowEmailError(false);
      setForm({
        nome: '',
        sexo: '',
        dataNascimento: '',
        email: '',
        cref: '',
        telefone: '',
      });
    } catch (err: any) {
      setModalState({
        type: 'error',
        title: 'Erro ao Cadastrar Personal!',
        content:
          err?.response?.data?.Exception ||
          err?.response?.data?.message ||
          'Ocorreu um erro ao cadastrar o personal trainer. Tente novamente.',
      });
    } finally {
      setLoading(false);
    }
  }

  // Validações
  const nomeHasError =
    (submitAttempted || (touched.nome && showNomeError)) &&
    form.nome.trim() === '';

  const emailEmptyError = submitAttempted && form.email.trim() === '';
  const emailInvalidError =
    (submitAttempted || (touched.email && showEmailError)) &&
    form.email.length > 0 &&
    !validateEmail(form.email).startsWith('Email válido');

  const emailErrorMessage = emailEmptyError
    ? 'O email é obrigatório.'
    : emailInvalidError
    ? 'Digite um email válido.'
    : undefined;

  const sexoHasError = submitAttempted && form.sexo.trim() === '';

  const dataNascimentoEmptyError =
    submitAttempted && form.dataNascimento.length === 0;
  const dataNascimentoFormatError =
    form.dataNascimento.length > 0 && form.dataNascimento.length !== 10;

  const dataNascimentoErrorMessage = dataNascimentoEmptyError
    ? 'A data de nascimento é obrigatória.'
    : dataNascimentoFormatError
    ? 'Data no formato DD/MM/AAAA.'
    : undefined;

  const crefHasError = submitAttempted && form.cref.trim() === '';

  const telefoneEmptyError = submitAttempted && form.telefone.length === 0;
  const telefoneInvalidError =
    form.telefone.length > 0 &&
    form.telefone.replace(/\D/g, '').length !== 11;

  const telefoneErrorMessage = telefoneEmptyError
    ? 'O telefone é obrigatório.'
    : telefoneInvalidError
    ? 'Telefone deve ter 11 dígitos.'
    : undefined;

  return (
    <View style={styles.screen}>
      <FocusAwareStatusBar style="dark" />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContainer,
            {
              paddingTop: insets.top + 16,
              paddingBottom: Math.max(insets.bottom, 24) + 80,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Top Bar with Back Button */}
          <View style={styles.topBar}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color="#1F2937" />
            </TouchableOpacity>
            <Text style={styles.topBarTitle}>Administração</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* White Container / Card */}
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.title}>Cadastrar Personal</Text>
              <Text style={styles.subtitle}>
                Preencha os dados para criar um novo personal trainer no sistema.
              </Text>
            </View>

            {/* Dev Auto Fill Button */}
            {__DEV__ && (
              <TouchableOpacity
                style={styles.autoFillBtn}
                onPress={handleAutoFill}
                activeOpacity={0.8}
              >
                <Sparkles size={16} color="#1D4ED8" />
                <Text style={styles.autoFillText}>⚡ Auto Preencher para Teste</Text>
              </TouchableOpacity>
            )}

            <View style={styles.form}>
              {/* Nome Completo */}
              <View style={styles.fieldWrapper}>
                <InputWithIcon
                  label="Nome Completo"
                  placeholder="Ex: João Carlos Silva"
                  icon={<User size={18} color="#64748B" />}
                  value={form.nome}
                  onInputChange={(v) => handleChange('nome', v)}
                  maxLength={100}
                  hasError={nomeHasError}
                  errorMessage={nomeHasError ? 'O nome é obrigatório.' : undefined}
                  onBlur={() => {
                    setTouched((prev) => ({ ...prev, nome: true }));
                    setTimeout(() => setShowNomeError(true), 200);
                  }}
                />
              </View>

              {/* Email & Sexo Row */}
              <View style={[styles.row, isDoubleRow ? styles.rowDouble : styles.rowSingle]}>
                <View style={[styles.fieldWrapper, isDoubleRow && styles.flexOne]}>
                  <InputWithIcon
                    type="email"
                    label="Email Profissional"
                    placeholder="email@dominio.com"
                    icon={<Mail size={18} color="#64748B" />}
                    value={form.email}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onInputChange={(v) => handleChange('email', v)}
                    maxLength={100}
                    hasError={Boolean(emailErrorMessage)}
                    errorMessage={emailErrorMessage}
                    onBlur={() => {
                      setTouched((prev) => ({ ...prev, email: true }));
                      setTimeout(() => setShowEmailError(true), 200);
                    }}
                  />
                </View>

                <View style={[styles.fieldWrapper, isDoubleRow && styles.flexOne]}>
                  <Select
                    id="genero"
                    label="Genero"
                    selectPlaceholder="Selecione"
                    icon={<Users size={18} color="#64748B" />}
                    values={sexOptions}
                    selectStatusValue={form.sexo}
                    onSelectStatusChange={(v) => handleChange('sexo', v)}
                    openSelectId={openSelectId}
                    setOpenSelectId={setOpenSelectId}
                    showSelectAll={false}
                    hasError={sexoHasError}
                    errorMessage={sexoHasError ? 'Selecione o genero.' : undefined}
                  />
                </View>
              </View>

              {/* Data de Nascimento & Registro CREF Row */}
              <View style={[styles.row, isDoubleRow ? styles.rowDouble : styles.rowSingle]}>
                <View style={[styles.fieldWrapper, isDoubleRow && styles.flexOne]}>
                  <InputWithIcon
                    label="Data de Nascimento"
                    placeholder="DD/MM/AAAA"
                    icon={<Calendar size={18} color="#64748B" />}
                    value={form.dataNascimento}
                    keyboardType="numeric"
                    onInputChange={(v) => handleChange('dataNascimento', dateMask(v))}
                    maxLength={10}
                    hasError={Boolean(dataNascimentoErrorMessage)}
                    errorMessage={dataNascimentoErrorMessage}
                  />
                </View>

                <View style={[styles.fieldWrapper, isDoubleRow && styles.flexOne]}>
                  <InputWithIcon
                    label="Registro CREF"
                    placeholder="000000-G/UF"
                    icon={<Hash size={18} color="#64748B" />}
                    value={form.cref}
                    autoCapitalize="characters"
                    onInputChange={(v) => handleChange('cref', crefMask(v))}
                    maxLength={11}
                    hasError={crefHasError}
                    errorMessage={crefHasError ? 'O registro CREF é obrigatório.' : undefined}
                  />
                </View>
              </View>

              {/* Telefone */}
              <View style={styles.fieldWrapper}>
                <InputWithIcon
                  label="Telefone"
                  placeholder="(11) 99999-9999"
                  icon={<Phone size={18} color="#64748B" />}
                  value={form.telefone}
                  keyboardType="phone-pad"
                  onInputChange={(v) => handleChange('telefone', cellphoneMask(v))}
                  maxLength={15}
                  hasError={Boolean(telefoneErrorMessage)}
                  errorMessage={telefoneErrorMessage}
                />
              </View>

              {/* Botões Cancelar e Cadastrar */}
              <View style={styles.buttonRow}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCancel}
                  disabled={loading}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={loading}
                  activeOpacity={0.8}
                >
                  {loading ? (
                    <View style={styles.loadingWrapper}>
                      <ActivityIndicator size="small" color="#FFFFFF" />
                      <Text style={styles.submitButtonText}>Cadastrando...</Text>
                    </View>
                  ) : (
                    <Text style={styles.submitButtonText}>Cadastrar Personal</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Modal de Sucesso */}
      <SuccessModal
        visible={modalState.type === 'success'}
        title={modalState.title}
        content={modalState.content}
        onClose={() => setModalState({ type: null, title: '', content: '' })}
      />

      {/* Modal de Erro */}
      <ErrorModal
        visible={modalState.type === 'error'}
        title={modalState.title}
        content={modalState.content}
        onClose={() => setModalState({ type: null, title: '', content: '' })}
        closeThen={() => setModalState({ type: null, title: '', content: '' })}
      />

      {/* Botão de gravação de áudio com IA */}
      <VoiceRecorderButton />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  scrollContainer: {
    paddingHorizontal: 16,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1A202C',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#4A5568',
    lineHeight: 20,
  },
  autoFillBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 16,
  },
  autoFillText: {
    fontSize: 13,
    color: '#1D4ED8',
    fontWeight: '600',
  },
  form: {
    gap: 4,
  },
  fieldWrapper: {
    marginBottom: 4,
  },
  row: {
    width: '100%',
  },
  rowDouble: {
    flexDirection: 'row',
    gap: 16,
  },
  rowSingle: {
    flexDirection: 'column',
    gap: 0,
  },
  flexOne: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4A5568',
  },
  submitButton: {
    backgroundColor: '#0A2239',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0A2239',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  loadingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
