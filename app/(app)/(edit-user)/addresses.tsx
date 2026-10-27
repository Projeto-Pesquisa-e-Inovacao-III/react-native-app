import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  MapPin,
  Plus,
  Map,
  Edit2,
  Trash2,
  Search,
  Route,
  Hash,
  DoorOpen,
  MapPinned,
  Building2,
  Flag,
  Home,
  Briefcase,
} from 'lucide-react-native';

import InputWithIcon from '../../../src/components/InputWithIcon';
import Select from '../../../src/components/Select';
import SuccessModal from '../../../src/components/modals/SuccessModal';
import ErrorModal from '../../../src/components/modals/ErrorModal';
import TimerModal from '../../../src/components/modals/TimerModal';
import {
  getUserAddresses,
  createAddress,
  updateUserAddress,
  deleteUserAddress,
  lookupCep,
} from '../../../src/constants/address';
import type { Address } from '../../../src/models/address';

type AddressForm = {
  tipo: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  padrao: boolean;
};

const emptyForm: AddressForm = {
  tipo: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  estado: '',
  padrao: false,
};

const TIPO_LEGACY_MAP: Record<string, string> = {
  Presencial: 'PRESENCIAL',
  Academia: 'PRESENCIAL',
  ACADEMIA: 'PRESENCIAL',
  Casa: 'RESIDENCIAL',
  Residencial: 'RESIDENCIAL',
  'Parque/Academia': 'FUNCIONAL',
  Funcional: 'FUNCIONAL',
};

function normalizeTipo(tipo: string): string {
  return TIPO_LEGACY_MAP[tipo] ?? tipo;
}

function extractAddressFields(address: Address) {
  return {
    logradouro: address.logradouro || address.cep?.logradouro || '',
    bairro: address.bairro || address.cep?.bairro || '',
    cidade: address.cep?.cidade?.nome || address.cep?.localidade || '',
    estado: address.cep?.cidade?.estado?.sigla || address.cep?.uf || '',
    cepId: address.cep?.id || address.cep?.cep || '',
  };
}

function getAddressIcon(tipo: string) {
  const lower = (tipo ?? '').toLowerCase();
  if (lower.includes('trabalho') || lower.includes('work')) {
    return <Briefcase size={18} color="#093A5D" />;
  }
  if (lower.includes('empresa') || lower.includes('comercial')) {
    return <Building2 size={18} color="#093A5D" />;
  }
  return <Home size={18} color="#093A5D" />;
}

function formatCep(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

const TIPO_OPTIONS = [
  { label: 'Presencial (Academia)', value: 'PRESENCIAL' },
  { label: 'Residencial (Casa)', value: 'RESIDENCIAL' },
  { label: 'Funcional (Parque/Academia)', value: 'FUNCIONAL' },
];

const ADDRESS_LIMIT = 6;

export default function AddressesScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [openSelectId, setOpenSelectId] = useState<string | null>(null);

  const [form, setForm] = useState<AddressForm>(emptyForm);
  const [cepLoading, setCepLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof AddressForm, string>>>({});

  const [openModal, setOpenModal] = useState<'success' | 'error' | 'timer' | null>(null);
  const [modalText, setModalText] = useState({ title: '', content: '' });

  const addressesQuery = useQuery<Address[]>({
    queryKey: ['userAddresses'],
    queryFn: async () => {
      const response = await getUserAddresses();
      return response.data as Address[];
    },
  });

  const addresses = addressesQuery.data ?? [];
  const isLimitReached = addresses.length >= ADDRESS_LIMIT;

  async function handleCepLookup() {
    const raw = form.cep.replace(/\D/g, '');
    if (raw.length !== 8) return;
    setCepLoading(true);
    try {
      const data = await lookupCep(raw);
      if (data) {
        setForm((prev) => ({
          ...prev,
          logradouro: data.logradouro || prev.logradouro,
          bairro: data.bairro || prev.bairro,
          cidade: data.localidade || prev.cidade,
          estado: data.uf || prev.estado,
        }));
      }
    } finally {
      setCepLoading(false);
    }
  }

  function handleOpenCreate() {
    setEditingAddress(null);
    setForm(emptyForm);
    setFormErrors({});
    setShowForm(true);
  }

  function handleAddPress() {
    if (isLimitReached) {
      setModalText({
        title: 'Limite atingido',
        content: `Você atingiu o limite máximo de ${ADDRESS_LIMIT} endereços cadastrados. Remova um para adicionar um novo.`,
      });
      setOpenModal('error');
    } else {
      handleOpenCreate();
    }
  }

  function handleOpenEdit(address: Address) {
    setEditingAddress(address);
    const { logradouro, bairro, cidade, estado, cepId } = extractAddressFields(address);
    setForm({
      tipo: normalizeTipo(address.tipo || ''),
      cep: formatCep(String(cepId || '')),
      logradouro,
      numero: address.numero || '',
      complemento: address.complemento || '',
      bairro,
      cidade,
      estado,
      padrao: !!address.padrao,
    });
    setFormErrors({});
    setShowForm(true);
  }

  function handleCancelForm() {
    setShowForm(false);
    setEditingAddress(null);
    setForm(emptyForm);
    setFormErrors({});
  }

  function validate(): boolean {
    const errors: Partial<Record<keyof AddressForm, string>> = {};
    if (!form.cep.replace(/\D/g, '')) errors.cep = 'CEP obrigatório.';
    if (!form.logradouro.trim()) errors.logradouro = 'Logradouro obrigatório.';
    if (!form.numero.trim()) errors.numero = 'Número obrigatório.';
    if (!form.bairro.trim()) errors.bairro = 'Bairro obrigatório.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaveLoading(true);

    const payload: Address = {
      tipo: form.tipo || 'Endereço',
      numero: form.numero,
      complemento: form.complemento,
      logradouro: form.logradouro,
      bairro: form.bairro,
      padrao: form.padrao,
      cep: { id: form.cep.replace(/\D/g, '') },
    };

    try {
      if (editingAddress?.id) {
        await updateUserAddress(editingAddress.id, payload);
      } else {
        await createAddress(payload);
      }
      await queryClient.invalidateQueries({ queryKey: ['userAddresses'] });
      setModalText({
        title: editingAddress ? 'Endereço atualizado!' : 'Endereço adicionado!',
        content: editingAddress
          ? 'Seu endereço foi atualizado com sucesso.'
          : 'Seu endereço foi adicionado com sucesso.',
      });
      setOpenModal('success');
      handleCancelForm();
    } catch (error: any) {
      setModalText({
        title: 'Houve um erro',
        content:
          error?.response?.data?.Exception ||
          error?.response?.data?.message ||
          'Não foi possível salvar o endereço.',
      });
      setOpenModal('error');
    } finally {
      setSaveLoading(false);
    }
  }

  function handleDeleteConfirm() {
    if (deleteId == null) return;
    deleteUserAddress(deleteId)
      .then(async () => {
        await queryClient.invalidateQueries({ queryKey: ['userAddresses'] });
        setModalText({ title: 'Endereço removido!', content: 'O endereço foi removido com sucesso.' });
        setOpenModal('success');
      })
      .catch(() => {
        setModalText({ title: 'Houve um erro', content: 'Não foi possível remover o endereço.' });
        setOpenModal('error');
      });
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
        {showForm ? (
          <View style={styles.formCard}>
            <View style={styles.formHeader}>
              <MapPin size={22} color="#093A5D" />
              <View>
                <Text style={styles.formHeaderTitle}>
                  {editingAddress ? 'Editar Detalhes' : 'Novo Endereço'}
                </Text>
                <Text style={styles.formHeaderSubtitle}>Todos os campos são obrigatórios</Text>
              </View>
            </View>

            <View style={styles.fieldContainer}>
              <Text style={styles.fieldLabel}>Local (Tipo)</Text>
              <Select
                id="tipo-select"
                openSelectId={openSelectId}
                setOpenSelectId={setOpenSelectId}
                selectStatusValue={form.tipo}
                onSelectStatusChange={(value: string) => setForm((prev) => ({ ...prev, tipo: value }))}
                values={TIPO_OPTIONS}
                selectPlaceholder="Selecione o tipo"
                showSelectAll={false}
              />
            </View>

            <View style={styles.cepRow}>
              <View style={{ flex: 1 }}>
                <InputWithIcon
                  label="CEP"
                  placeholder="00000-000"
                  icon={<MapPin size={18} color="#64748B" />}
                  value={form.cep}
                  onInputChange={(value: string) => setForm((prev) => ({ ...prev, cep: formatCep(value) }))}
                  keyboardType="numeric"
                  maxLength={9}
                />
                {!!formErrors.cep && <Text style={styles.error}>{formErrors.cep}</Text>}
              </View>
              <TouchableOpacity
                style={styles.searchCepButton}
                onPress={handleCepLookup}
                disabled={cepLoading}
                activeOpacity={0.8}
              >
                {cepLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Search size={18} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.fieldContainer}>
              <InputWithIcon
                label="Logradouro"
                placeholder="Alameda dos Anjos"
                icon={<Route size={18} color="#64748B" />}
                value={form.logradouro}
                disabled
                maxLength={100}
              />
              {!!formErrors.logradouro && <Text style={styles.error}>{formErrors.logradouro}</Text>}
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <InputWithIcon
                  label="Número"
                  placeholder="123"
                  icon={<Hash size={18} color="#64748B" />}
                  value={form.numero}
                  onInputChange={(value: string) =>
                    setForm((prev) => ({ ...prev, numero: value.replace(/\D/g, '').slice(0, 5) }))
                  }
                  keyboardType="numeric"
                  maxLength={5}
                />
                {!!formErrors.numero && <Text style={styles.error}>{formErrors.numero}</Text>}
              </View>
              <View style={{ flex: 1 }}>
                <InputWithIcon
                  label="Complemento"
                  placeholder="Ex: Sala 2"
                  icon={<DoorOpen size={18} color="#64748B" />}
                  value={form.complemento}
                  onInputChange={(value: string) => setForm((prev) => ({ ...prev, complemento: value }))}
                  maxLength={50}
                />
              </View>
            </View>

            <View style={styles.fieldContainer}>
              <InputWithIcon
                label="Bairro"
                placeholder="Vila Olímpia"
                icon={<MapPinned size={18} color="#64748B" />}
                value={form.bairro}
                disabled
                maxLength={50}
              />
              {!!formErrors.bairro && <Text style={styles.error}>{formErrors.bairro}</Text>}
            </View>

            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <InputWithIcon
                  label="Cidade"
                  placeholder="Nome da cidade"
                  icon={<Building2 size={18} color="#64748B" />}
                  value={form.cidade}
                  disabled
                  maxLength={40}
                />
              </View>
              <View style={{ width: 90 }}>
                <InputWithIcon
                  label="Estado"
                  placeholder="UF"
                  icon={<Flag size={18} color="#64748B" />}
                  value={form.estado}
                  disabled
                  maxLength={2}
                />
              </View>
            </View>

            <View style={styles.padraoContainer}>
              <View style={styles.padraoText}>
                <MapPin size={18} color="#093A5D" />
                <View>
                  <Text style={styles.padraoTitle}>Endereço padrão</Text>
                  <Text style={styles.padraoSubtitle}>Usar como endereço principal</Text>
                </View>
              </View>
              <Switch
                value={form.padrao}
                onValueChange={(value) => setForm((prev) => ({ ...prev, padrao: value }))}
                trackColor={{ false: '#CBD5E1', true: '#093A5D' }}
                thumbColor="#FFFFFF"
              />
            </View>

            <View style={styles.formFooter}>
              <TouchableOpacity style={styles.discardBtn} onPress={handleCancelForm} activeOpacity={0.8}>
                <Text style={styles.discardBtnText}>Voltar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saveLoading && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={saveLoading}
                activeOpacity={0.8}
              >
                {saveLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    {editingAddress ? 'Salvar Alterações' : 'Salvar Endereço'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.contentWrapper}>
            <View style={styles.headerRow}>
              <Text style={styles.sectionTitle}>Endereços</Text>
              <Text style={styles.sectionSubtitle}>
                Gerencie os endereços vinculados à sua conta.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.addButton, isLimitReached && styles.buttonDisabled]}
              onPress={handleAddPress}
              activeOpacity={0.8}
            >
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.addButtonText}>Adicionar Novo Endereço</Text>
            </TouchableOpacity>
            {isLimitReached && (
              <Text style={styles.limitText}>Limite de {ADDRESS_LIMIT} endereços atingido</Text>
            )}

            {addressesQuery.isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#093A5D" />
                <Text style={styles.loadingText}>Carregando endereços...</Text>
              </View>
            ) : addresses.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconWrapper}>
                  <Map size={32} color="#093A5D" />
                </View>
                <Text style={styles.emptyTitle}>Nenhum endereço encontrado</Text>
                <Text style={styles.emptyText}>
                  Você ainda não cadastrou nenhum endereço. Adicione um para agilizar seus agendamentos.
                </Text>
                <TouchableOpacity style={styles.emptyAddButton} onPress={handleOpenCreate} activeOpacity={0.8}>
                  <MapPin size={16} color="#FFFFFF" />
                  <Text style={styles.emptyAddButtonText}>Adicionar Novo Endereço</Text>
                </TouchableOpacity>
                <Text style={styles.emptyFooterText}>Leva menos de 1 minuto para configurar.</Text>
              </View>
            ) : (
              <View style={styles.cardsList}>
                {addresses.map((addr) => {
                  const { logradouro, bairro, cidade, estado, cepId } = extractAddressFields(addr);
                  return (
                    <TouchableOpacity
                      key={addr.id}
                      style={[styles.addressCard, addr.padrao && styles.addressCardBorder]}
                      onPress={() => handleOpenEdit(addr)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.cardHeader}>
                        <View style={styles.cardTitleLine}>
                          {getAddressIcon(addr.tipo)}
                          <Text style={styles.cardTitleText}>{addr.tipo}</Text>
                          {addr.padrao && (
                            <View style={styles.badgePadrao}>
                              <Text style={styles.badgePadraoText}>PADRÃO</Text>
                            </View>
                          )}
                        </View>
                        <View style={styles.cardActions}>
                          <TouchableOpacity onPress={() => handleOpenEdit(addr)} hitSlop={8}>
                            <Edit2 size={16} color="#64748B" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() => {
                              setDeleteId(addr.id ?? null);
                              setOpenModal('timer');
                            }}
                            hitSlop={8}
                          >
                            <Trash2 size={16} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <View style={styles.cardBody}>
                        <Text style={styles.boldText}>
                          {logradouro}, {addr.numero}
                        </Text>
                        {!!addr.complemento && <Text style={styles.cardBodyText}>{addr.complemento}</Text>}
                        <Text style={styles.cardBodyText}>{bairro} - {cepId}</Text>
                        {(cidade || estado) && (
                          <Text style={styles.cardBodyText}>
                            {cidade}
                            {cidade && estado ? ', ' : ''}
                            {estado}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

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
          title="Remover endereço?"
          content="Tem certeza que deseja remover este endereço? Esta ação não pode ser desfeita."
          buttonTitle="Remover"
          callSuccessModal={() => {
            handleDeleteConfirm();
            setOpenModal(null);
            setDeleteId(null);
          }}
          closeThen={() => {
            setOpenModal(null);
            setDeleteId(null);
          }}
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
  contentWrapper: {
    width: '100%',
    gap: 16,
  },
  headerRow: {
    gap: 4,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#64748B',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#093A5D',
    borderRadius: 10,
    paddingVertical: 13,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  limitText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: -8,
  },
  buttonDisabled: {
    opacity: 0.6,
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingVertical: 48,
    paddingHorizontal: 24,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#093A5D',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    maxWidth: 300,
  },
  emptyAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#093A5D',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 22,
    marginBottom: 14,
  },
  emptyAddButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyFooterText: {
    fontSize: 12,
    color: '#94A3B8',
  },
  cardsList: {
    gap: 14,
  },
  addressCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  addressCardBorder: {
    borderLeftWidth: 4,
    borderLeftColor: '#093A5D',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  cardTitleText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  badgePadrao: {
    backgroundColor: '#DBEAFE',
    borderRadius: 12,
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  badgePadraoText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1E40AF',
    letterSpacing: 0.5,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 14,
  },
  cardBody: {
    gap: 3,
  },
  cardBodyText: {
    fontSize: 13,
    color: '#64748B',
  },
  boldText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 16,
  },
  formHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  formHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#093A5D',
  },
  formHeaderSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  fieldContainer: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  cepRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
  },
  searchCepButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#093A5D',
    borderRadius: 8,
    width: 48,
    height: 48,
  },
  error: {
    color: '#EF4444',
    fontSize: 12,
    marginTop: 2,
  },
  padraoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 14,
  },
  padraoText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  padraoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  padraoSubtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  formFooter: {
    gap: 10,
  },
  discardBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  discardBtnText: {
    color: '#64748B',
    fontWeight: '600',
    fontSize: 14,
  },
  saveBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#093A5D',
    borderRadius: 10,
    paddingVertical: 13,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});