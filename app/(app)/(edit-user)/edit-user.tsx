import React, { useReducer, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as ImagePicker from 'expo-image-picker';
import {
  ArrowLeft,
  User as UserIcon,
  Phone,
  IdCard,
  Upload,
  Trash2,
} from 'lucide-react-native';

import { useAuth } from '../../../src/contexts/AuthContext';
import {
  findUserData,
  update,
  removerUserImage,
  insertUserImage,
} from '../../../src/constants/user';
import { editPersonalProfile } from '../../../src/constants/personal';
import { BASE_URL } from '../../../src/services/api';
import type { UpdateUserDTO } from '../../../src/models/user';
import type { PersonalDTO } from '../../../src/models/personal';

import InputWithIcon from '../../../src/components/InputWithIcon';
import Select from '../../../src/components/Select';
import UserAvatar, { setCachedAvatar, clearCachedAvatar } from '../../../src/components/UserAvatar';
import SuccessModal from '../../../src/components/modals/SuccessModal';
import ErrorModal from '../../../src/components/modals/ErrorModal';
import TimerModal from '../../../src/components/modals/TimerModal';

type EditUserState = {
  firstName: string;
  lastName: string;
  cref: string;
  phone: string;
  gender: string;
  email: string;
  birthDate: string;
};

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

type EditUserAction =
  | { type: 'hydrateForm'; payload: UserDataResponse }
  | { type: 'setFirstName'; payload: string }
  | { type: 'setLastName'; payload: string }
  | { type: 'setCREF'; payload: string }
  | { type: 'setPhone'; payload: string }
  | { type: 'setGender'; payload: string }
  | { type: 'setEmail'; payload: string }
  | { type: 'setBirthDate'; payload: string };

function reducer(state: EditUserState, action: EditUserAction): EditUserState {
  switch (action.type) {
    case 'setFirstName':
      return { ...state, firstName: action.payload };
    case 'setLastName':
      return { ...state, lastName: action.payload };
    case 'setCREF':
      return { ...state, cref: action.payload };
    case 'setPhone':
      return { ...state, phone: action.payload };
    case 'setGender':
      return { ...state, gender: action.payload };
    case 'setEmail':
      return { ...state, email: action.payload };
    case 'setBirthDate':
      return { ...state, birthDate: action.payload };
    case 'hydrateForm':
      const phoneObj = action.payload.telefones?.[0];
      const rawPhone = phoneObj?.numeroCompleto || (phoneObj?.ddd ? `(${phoneObj.ddd}) ${phoneObj.numero}` : '');
      return {
        ...state,
        firstName: action.payload.nome || '',
        cref: action.payload.cref ?? '',
        phone: formatCellphone(rawPhone),
        gender: action.payload.sexo ?? '',
        email: action.payload.email ?? '',
        birthDate: action.payload.dataNascimento ?? '',
      };
    default:
      return state;
  }
}

const initialEditUserState: EditUserState = {
  firstName: '',
  lastName: '',
  cref: '',
  phone: '',
  gender: '',
  email: '',
  birthDate: '',
};

function formatCellphone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export default function EditUserScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { roles } = useAuth();
  const isAluno = roles?.includes('aluno');

  const [state, dispatch] = useReducer(reducer, initialEditUserState);
  const [openSelectId, setOpenSelectId] = useState<string | null>(null);
  const [userImage, setUserImage] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Modais
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
    if (!userInfo.data) return;

    dispatch({
      type: 'hydrateForm',
      payload: userInfo.data,
    });

    if (userInfo.data.caminhoFoto) {
      setUserImage((prev) => {
        // Se o usuário selecionou uma imagem local recentemente, mantém
        if (prev && (prev.startsWith('file://') || prev.startsWith('content://') || prev.startsWith('data:'))) {
          return prev;
        }
        return userInfo.data?.caminhoFoto || '';
      });
    } else {
      setUserImage('');
    }
  }, [userInfo.data]);

  async function handlePickImage() {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert(
          'Permissão Necessária',
          'Precisamos de permissão para acessar sua galeria e atualizar sua foto de perfil.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const asset = result.assets[0];
      setUploadingImage(true);

      const filename = asset.fileName || asset.uri.split('/').pop() || 'profile.jpg';
      const match = /\.(\w+)$/.exec(filename);
      const type = asset.mimeType || (match ? `image/${match[1]}` : 'image/jpeg');

      console.log('[Upload] URI local:', asset.uri);

      const formData = new FormData();
      formData.append('imagem', {
        uri: asset.uri,
        name: filename,
        type,
      } as any);

      // Preview local imediato enquanto faz o upload
      setUserImage(asset.uri);

      const uploadResponse = await insertUserImage(formData);
      console.log('[Upload] Resposta do servidor:', uploadResponse?.status, JSON.stringify(uploadResponse?.data));

      // Refetch para sincronizar os dados do usuário
      await queryClient.refetchQueries({ queryKey: ['userData'] });
      await queryClient.refetchQueries({ queryKey: ['user'] });

      const updatedUserInfo = await findUserData();
      const updatedCaminhoFoto = updatedUserInfo?.data?.caminhoFoto;
      console.log('[Upload] caminhoFoto retornado pelo backend:', updatedCaminhoFoto);

      if (updatedCaminhoFoto) {
        const cleanFoto = updatedCaminhoFoto.replace(/^"|"$/g, '');
        const fotoFilename = cleanFoto.split('/').pop();
        if (fotoFilename) {
          // Salva no cache da sessão com a URI local para exibição imediata sem recarregar
          setCachedAvatar(fotoFilename, asset.uri);
        }
      }

      setModalText({
        title: 'Foto atualizada!',
        content: 'Sua foto de perfil foi atualizada com sucesso.',
      });
      setOpenModal('success');
    } catch (error: any) {
      console.error('[Upload] Erro:', error?.response?.status, JSON.stringify(error?.response?.data), error?.message);
      setModalText({
        title: 'Houve um erro',
        content:
          error?.response?.data?.Exception ||
          error?.response?.data?.message ||
          'Não foi possível atualizar sua foto de perfil.',
      });
      setOpenModal('error');
    } finally {
      setUploadingImage(false);
    }
  }


  async function handleUpdateUserInfo() {
    setSaving(true);
    const cleanPhone = state.phone.replace(/\D/g, '');
    const ddd = cleanPhone.slice(0, 2) || '11';
    const numero = cleanPhone.slice(2);

    const options: UpdateUserDTO = {
      nome: state.firstName,
      telefones: [{ numero, ddd, id: 1 }],
      sexo: state.gender,
      email: state.email,
    };

    try {
      await update(options);
      await queryClient.refetchQueries({ queryKey: ['userData'] });
      setModalText({
        title: 'Perfil atualizado!',
        content: 'Seu perfil foi atualizado com sucesso.',
      });
      setOpenModal('success');
    } catch (error: any) {
      setModalText({
        title: 'Houve um erro',
        content:
          error?.response?.data?.Exception ||
          error?.response?.data?.message ||
          'Não foi possível atualizar seu perfil.',
      });
      setOpenModal('error');
    } finally {
      setSaving(false);
    }
  }

  async function handleUpdatePersonalInfo() {
    setSaving(true);
    const cleanPhone = state.phone.replace(/\D/g, '');
    const ddd = cleanPhone.slice(0, 2) || '11';
    const numero = cleanPhone.slice(2);

    const options: PersonalDTO = {
      nome: state.firstName,
      telefones: [{ numero, ddd, pais: '55', id: 1 }],
      sexo: state.gender,
      email: state.email,
      dataNascimento: userInfo.data?.dataNascimento || undefined,
      caminhoFoto: userInfo.data?.caminhoFoto || undefined,
    };

    try {
      await editPersonalProfile(options);
      await queryClient.refetchQueries({ queryKey: ['userData'] });
      setModalText({
        title: 'Perfil atualizado!',
        content: 'Seu perfil foi atualizado com sucesso.',
      });
      setOpenModal('success');
    } catch (error: any) {
      setModalText({
        title: 'Houve um erro',
        content:
          error?.response?.data?.Exception ||
          error?.response?.data?.message ||
          'Não foi possível atualizar seu perfil.',
      });
      setOpenModal('error');
    } finally {
      setSaving(false);
    }
  }

  function handleSave() {
    if (isAluno) {
      handleUpdateUserInfo();
    } else {
      handleUpdatePersonalInfo();
    }
  }

  function handleUndoChanges() {
    if (userInfo.data) {
      dispatch({
        type: 'hydrateForm',
        payload: userInfo.data,
      });
    }
  }

  async function handleRemoveImage() {
    try {
      clearCachedAvatar();
      setUserImage('');
      await removerUserImage();
      await queryClient.refetchQueries({ queryKey: ['userData'] });
      await queryClient.refetchQueries({ queryKey: ['user'] });
      setModalText({
        title: 'Imagem removida!',
        content: 'Sua imagem de perfil foi removida com sucesso.',
      });
      setOpenModal('success');
    } catch (error) {
      setModalText({
        title: 'Houve um erro',
        content: 'Não foi possível remover a imagem de perfil.',
      });
      setOpenModal('error');
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
          <View style={styles.formCard}>
            <View style={styles.sectionHeader}>
              <UserIcon size={20} color="#093A5D" />
              <Text style={styles.sectionTitle}>Informações Pessoais</Text>
            </View>

            {/* Seção Foto de Perfil com Avatar Aumentado */}
            <View style={styles.photoSection}>
              <View style={styles.avatarWrapper}>
                <UserAvatar
                  customImageUrl={userImage}
                  foto={userInfo.data?.caminhoFoto || undefined}
                  userName={state.firstName}
                  size={136}
                />
              </View>

              <View style={styles.photoInfo}>
                <Text style={styles.photoTitle}>Foto de Perfil</Text>
                <Text style={styles.photoSubtitle}>
                  Formatos aceitos: JPG, PNG. Esta foto será visível para os outros usuários.
                </Text>

                <View style={styles.photoButtonsRow}>
                  <TouchableOpacity
                    style={[styles.updatePhotoBtn, uploadingImage && styles.buttonDisabled]}
                    onPress={handlePickImage}
                    disabled={uploadingImage}
                    activeOpacity={0.8}
                  >
                    {uploadingImage ? (
                      <ActivityIndicator size="small" color="#093A5D" />
                    ) : (
                      <>
                        <Upload size={16} color="#093A5D" />
                        <Text style={styles.updatePhotoBtnText}>Atualizar Foto</Text>
                      </>
                    )}
                  </TouchableOpacity>

                  {!!userImage && (
                    <TouchableOpacity
                      style={[styles.removePhotoBtn, uploadingImage && styles.buttonDisabled]}
                      onPress={() => setOpenModal('timer')}
                      disabled={uploadingImage}
                      activeOpacity={0.8}
                    >
                      <Trash2 size={16} color="#DC2626" />
                      <Text style={styles.removePhotoBtnText}>Remover Foto</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            <View style={styles.divider} />

            {/* Campos do Formulário */}
            <InputWithIcon
              label="Nome"
              placeholder="Digite seu nome"
              icon={<UserIcon size={18} color="#6B7280" />}
              value={state.firstName}
              onInputChange={(val) => dispatch({ type: 'setFirstName', payload: val })}
              maxLength={60}
              containerStyle={styles.fieldContainer}
            />

            {!isAluno && (
              <InputWithIcon
                label="CREF"
                placeholder="Digite seu CREF"
                icon={<IdCard size={18} color="#6B7280" />}
                value={state.cref}
                onInputChange={(val) => dispatch({ type: 'setCREF', payload: val })}
                disabled={true}
                maxLength={11}
                containerStyle={styles.fieldContainer}
              />
            )}

            <InputWithIcon
              label="Telefone"
              placeholder="(11) 99999-9999"
              icon={<Phone size={18} color="#6B7280" />}
              value={state.phone}
              onInputChange={(val) => dispatch({ type: 'setPhone', payload: formatCellphone(val) })}
              keyboardType="phone-pad"
              maxLength={15}
              containerStyle={styles.fieldContainer}
            />

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Gênero</Text>
              <Select
                id="genero"
                selectPlaceholder="Selecione o gênero"
                values={[
                  { label: 'Masculino', value: 'Masculino' },
                  { label: 'Feminino', value: 'Feminino' },
                  { label: 'Outro', value: 'Outro' },
                ]}
                selectStatusValue={state.gender}
                onSelectStatusChange={(val) => dispatch({ type: 'setGender', payload: val })}
                openSelectId={openSelectId}
                setOpenSelectId={setOpenSelectId}
                showSelectAll={false}
              />
            </View>

            <View style={styles.divider} />

            {/* Botões de Ação */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Salvar Alterações</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.discardBtn}
                onPress={handleUndoChanges}
                activeOpacity={0.8}
              >
                <Text style={styles.discardBtnText}>Descartar alterações</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modais */}
      <SuccessModal
        visible={openModal === 'success'}
        title={modalText.title}
        content={modalText.content}
        onClose={() => setOpenModal(null)}
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
          title="Remover imagem?"
          content="Tem certeza que deseja remover sua imagem de perfil?"
          buttonTitle="Remover"
          callSuccessModal={handleRemoveImage}
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
  formCard: {
    width: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  photoSection: {
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
  },
  avatarWrapper: {
    borderRadius: 68,
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  photoInfo: {
    alignItems: 'center',
    width: '100%',
  },
  photoTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  photoSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
    maxWidth: 320,
  },
  photoButtonsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
    width: '100%',
  },
  updatePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#093A5D',
    backgroundColor: '#FFFFFF',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    minWidth: 140,
  },
  updatePhotoBtnText: {
    color: '#093A5D',
    fontSize: 14,
    fontWeight: '600',
  },
  removePhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    backgroundColor: '#FEF2F2',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    minWidth: 140,
  },
  removePhotoBtnText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 18,
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
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
  saveBtnDisabled: {
    opacity: 0.6,
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
    color: '#475569',
    fontSize: 15,
    fontWeight: '600',
  },
});
