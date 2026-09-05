import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Shield,
  Mail,
  Lock,
  HeartCrack,
} from 'lucide-react-native';

import { useAuth } from '../../../src/contexts/AuthContext';
import { findUserData, softDelete, changePassword } from '../../../src/constants/user';
import { validatePassword } from '../../../src/utils/validacao';
import InputWithIcon from '../../../src/components/InputWithIcon';
import SuccessModal from '../../../src/components/modals/SuccessModal';
import ErrorModal from '../../../src/components/modals/ErrorModal';
import TimerModal from '../../../src/components/modals/TimerModal';

type UserPhone = {
  id: number;
  ddd: string;
  numero: string;
  numeroCompleto?: string;
};

type UserDataResponse = {
  ativo: boolean;
  caminhoFoto: string | null;
  cref?: string;
  cpf?: string;
  dataNascimento: string;
  email: string;
  id: number;
  nome: string;
  sexo: string;
  telefones: UserPhone[];
};

export default function SecurityScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { logout } = useAuth();

  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [openModal, setOpenModal] = useState<'success' | 'error' | 'timer' | null>(null);
  const [modalText, setModalText] = useState({ title: '', content: '' });

  const userInfo = useQuery<UserDataResponse>({
    queryKey: ['userData'],
    queryFn: async () => {
      const response = await findUserData();
      return response.data as UserDataResponse;
    },
  });

  useEffect(() => {
    if (userInfo.data?.email) {
      setEmail(userInfo.data.email);
    }
  }, [userInfo.data]);

  async function handleUpdatePassword() {
    if (!currentPassword) {
      setModalText({
        title: 'Houve um erro',
        content: 'Senha atual obrigatória.',
      });
      setOpenModal('error');
      return;
    }

    if (!newPassword) {
      setModalText({
        title: 'Houve um erro',
        content: 'Preencha a nova senha.',
      });
      setOpenModal('error');
      return;
    }

    const validation = validatePassword(newPassword);
    if (validation !== 'password válida!') {
      setModalText({
        title: 'Houve um erro',
        content:
          'Senha inválida. A senha deve conter pelo menos 8 caracteres, incluindo letras maiúsculas, minúsculas, números e caracteres especiais.',
      });
      setOpenModal('error');
      return;
    }

    setUpdating(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setModalText({
        title: 'Senha atualizada',
        content: 'Sua senha foi atualizada com sucesso.',
      });
      setOpenModal('success');
    } catch (error: any) {
      console.error('Erro ao atualizar senha:', error);
      setModalText({
        title: 'Houve um erro',
        content:
          error?.response?.data?.Exception ||
          error?.response?.data?.message ||
          'Não foi possível atualizar sua senha.',
      });
      setOpenModal('error');
    } finally {
      setUpdating(false);
    }
  }

  function handleDiscard() {
    setEmail(userInfo.data?.email || '');
    setCurrentPassword('');
    setNewPassword('');
  }

  async function handleDeleteAccount() {
    setDeleting(true);
    try {
      await softDelete();
      await logout();
      router.replace('/(auth)/login');
    } catch (error: any) {
      console.error('Erro ao apagar usuário:', error);
      setModalText({
        title: 'Houve um erro',
        content:
          error?.response?.data?.Exception ||
          error?.response?.data?.message ||
          'Erro ao apagar perfil.',
      });
      setOpenModal('error');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, 20),
            paddingBottom: Math.max(insets.bottom, 24) + 40,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {userInfo.isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#093A5D" />
            <Text style={styles.loadingText}>Carregando informações...</Text>
          </View>
        ) : (
          <View style={styles.contentWrapper}>
            {/* Card de Segurança */}
            <View style={styles.card}>
              <View style={styles.sectionHeader}>
                <Shield size={20} color="#093A5D" />
                <Text style={styles.sectionTitle}>Segurança</Text>
              </View>

              <Text style={styles.sectionSubtitle}>
                Atualize suas credenciais de acesso para manter sua conta protegida.
              </Text>

              {/* Email (Apenas Leitura) */}
              <View style={styles.fieldContainer}>
                <InputWithIcon
                  label="Email"
                  placeholder="Digite seu email"
                  icon={<Mail size={20} color="#64748B" />}
                  value={email}
                  disabled={true}
                  maxLength={100}
                />
              </View>

              {/* Senha Atual */}
              <View style={styles.fieldContainer}>
                <InputWithIcon
                  label="Senha atual"
                  placeholder="Senha atual"
                  icon={<Lock size={20} color="#64748B" />}
                  isPassword={true}
                  value={currentPassword}
                  onInputChange={setCurrentPassword}
                  maxLength={50}
                />
              </View>

              {/* Nova Senha */}
              <View style={styles.fieldContainer}>
                <InputWithIcon
                  label="Nova senha"
                  placeholder="Nova senha"
                  icon={<Lock size={20} color="#64748B" />}
                  isPassword={true}
                  value={newPassword}
                  onInputChange={setNewPassword}
                  maxLength={50}
                />
              </View>

              {/* Botões de Ação */}
              <View style={styles.actionsContainer}>
                <TouchableOpacity
                  style={[styles.saveBtn, updating && styles.buttonDisabled]}
                  onPress={handleUpdatePassword}
                  disabled={updating}
                  activeOpacity={0.8}
                >
                  {updating ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.saveBtnText}>Salvar Alterações</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.discardBtn}
                  onPress={handleDiscard}
                  activeOpacity={0.7}
                >
                  <Text style={styles.discardBtnText}>Descartar alterações</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Card de Apagar Conta (Zona de Perigo) */}
            <View style={[styles.card, styles.dangerCard]}>
              <View style={styles.dangerHeader}>
                <HeartCrack size={20} color="#DC2626" />
                <Text style={styles.dangerTitle}>Zona de Perigo</Text>
              </View>

              <Text style={styles.dangerDescription}>
                Ao apagar seu perfil, você perderá acesso definitivo à sua conta e todos os dados vinculados.
              </Text>

              <TouchableOpacity
                style={[styles.deleteAccountBtn, deleting && styles.buttonDisabled]}
                onPress={() => setOpenModal('timer')}
                disabled={deleting}
                activeOpacity={0.8}
              >
                {deleting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <HeartCrack size={18} color="#FFFFFF" />
                    <Text style={styles.deleteAccountBtnText}>Apagar minha conta</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modais */}
      <SuccessModal
        visible={openModal === 'success'}
        onClose={() => setOpenModal(null)}
        title={modalText.title}
        content={modalText.content}
      />

      {openModal === 'error' && (
        <ErrorModal
          closeThen={() => setOpenModal(null)}
          title={modalText.title}
          content={modalText.content}
        />
      )}

      {openModal === 'timer' && (
        <TimerModal
          title="Apagar perfil?"
          content="Tem certeza que deseja apagar seu perfil? Isso é irreversível."
          buttonTitle="Apagar"
          callSuccessModal={handleDeleteAccount}
          closeThen={() => setOpenModal(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  container: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 18,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0F172A',
  },
  loadingContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  contentWrapper: {
    width: '100%',
    gap: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 18,
    lineHeight: 18,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  actionsContainer: {
    gap: 12,
    marginTop: 8,
  },
  saveBtn: {
    backgroundColor: '#093A5D',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#093A5D',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  discardBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  discardBtnText: {
    color: '#64748B',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  dangerCard: {
    borderColor: '#FECACA',
    backgroundColor: '#FFF5F5',
  },
  dangerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  dangerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#DC2626',
  },
  dangerDescription: {
    fontSize: 13,
    color: '#7F1D1D',
    marginBottom: 18,
    lineHeight: 18,
  },
  deleteAccountBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#DC2626',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  deleteAccountBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
