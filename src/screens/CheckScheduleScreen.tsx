import { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Linking,
  Image,
  TextInput,
  ScrollView,
} from 'react-native';
import { api } from '../services/api';
import { statusProperties } from '../constants/cardStatus';
import type { CheckSchedule, AbsenceAppointment, PaginatedResponse } from '../models/schedule';
import ConfirmModal from '../components/modals/ConfirmModal';
import SuccessModal from '../components/modals/SuccessModal';
import ConcludeAppointmentModal from '../components/modals/ConcludeAppointmentModal';
import RegisterAbsenceModal from '../components/modals/RegisterAbsenceModal';
import BottomTabBar from '../components/BottomTabBar';

// ─── helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ─── API ─────────────────────────────────────────────────────────────────────

async function fetchPersonalRequests(
  page = 0,
  size = '10',
  status?: string,
  classType?: string,
  name?: string,
): Promise<PaginatedResponse<CheckSchedule>> {
  const res = await api.get('/agendamentos/solicitacoes', {
    params: {
      ...(status && { status }),
      ...(classType && { tipoAgendamento: classType }),
      ...(name && { nome: name }),
      page,
      size,
    },
  });
  return res.data;
}

async function fetchKpis(): Promise<{
  totalPendente: number;
  totalRespondido: number;
  totalCanceladoPorMesAtual: number;
  totalAgendamentosHoje: number;
}> {
  const res = await api.get('/agendamentos/kpis');
  return res.data;
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ title, value, color }: { title: string; value: number; color: string }) {
  return (
    <View style={[styles.kpiCard, { borderLeftColor: color }]}>
      <Text style={styles.kpiValue}>{value}</Text>
      <Text style={styles.kpiTitle}>{title}</Text>
    </View>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const prop = statusProperties.find((s) => s.cardStatus === status);
  if (!prop) return null;
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: prop.backgroundColor,
          borderColor: prop.borderColor,
        },
      ]}
    >
      <Text style={[styles.badgeText, { color: prop.textColor }]}>{prop.cardDescription}</Text>
    </View>
  );
}

// ─── Appointment Card ─────────────────────────────────────────────────────────

type CardProps = {
  card: CheckSchedule;
  onAccept: (id: number) => void;
  onDecline: (id: number) => void;
  onReschedule: (id: number, date: string) => void;
  onConclude: (id: number) => void;
  onAbsence: (id: number) => void;
  onPress: (id: number) => void;
};

function AppointmentCard({
  card,
  onAccept,
  onDecline,
  onReschedule,
  onConclude,
  onAbsence,
  onPress,
}: CardProps) {
  const address = `${card.endereco.cep.logradouro}, ${card.endereco.numero} - ${card.endereco.cep.bairro} - ${card.endereco.cep.uf}`;
  const isPendingApproval = card.status === 'PENDENTE_PERSONAL_APROVACAO';
  const isApproved = card.status === 'APROVADO';
  const isPendingConclusion =
    card.status === 'PENDENTE_PERSONAL_CONCLUIR' &&
    startOfDay(new Date()) >= startOfDay(new Date(card.dataInicio));

  function openMap() {
    const query = encodeURIComponent(address);
    Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  }

  return (
    <TouchableOpacity style={styles.card} onPress={() => onPress(card.agendamentoId)} activeOpacity={0.85}>
      {/* Header */}
      <View style={styles.cardHeader}>
        <StatusBadge status={card.status} />
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{card.tipoAula}</Text>
        </View>
      </View>

      {/* User section */}
      <View style={styles.userSection}>
        <View style={styles.avatarWrapper}>
          {card.foto ? (
            <Image source={{ uri: card.foto }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarInitial}>{card.nome?.charAt(0) ?? '?'}</Text>
            </View>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.userName}>{card.nome}</Text>
          <Text style={styles.dateText}>
            {formatDate(card.dataInicio)} – {formatTime(card.dataFim)}
          </Text>
          <TouchableOpacity onPress={openMap}>
            <Text style={styles.addressText}>📍 {address}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Actions — igual ao .mobileActions da web */}
      <View style={styles.actionsRow}>
        {isPendingApproval && (
          <>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onAccept(card.agendamentoId)}
            >
              <Text style={[styles.actionBtnText, styles.iconAccept]}>✔</Text>
              <Text style={[styles.actionLabel, styles.iconAccept]}>Aceitar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onDecline(card.agendamentoId)}
            >
              <Text style={[styles.actionBtnText, styles.iconDecline]}>✕</Text>
              <Text style={[styles.actionLabel, styles.iconDecline]}>Recusar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onReschedule(card.agendamentoId, card.dataInicio?.split('T')[0] ?? '')}
            >
              <Text style={[styles.actionBtnText, styles.iconReschedule]}>🗓</Text>
              <Text style={[styles.actionLabel, styles.iconReschedule]}>Reagendar</Text>
            </TouchableOpacity>
          </>
        )}
        {isApproved && (
          <>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onDecline(card.agendamentoId)}
            >
              <Text style={[styles.actionBtnText, styles.iconDecline]}>✕</Text>
              <Text style={[styles.actionLabel, styles.iconDecline]}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onReschedule(card.agendamentoId, card.dataInicio?.split('T')[0] ?? '')}
            >
              <Text style={[styles.actionBtnText, styles.iconReschedule]}>🗓</Text>
              <Text style={[styles.actionLabel, styles.iconReschedule]}>Reagendar</Text>
            </TouchableOpacity>
          </>
        )}
        {isPendingConclusion && (
          <>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onConclude(card.agendamentoId)}
            >
              <Text style={[styles.actionBtnText, styles.iconConclude]}>👤</Text>
              <Text style={[styles.actionLabel, styles.iconConclude]}>Concluir</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onAbsence(card.agendamentoId)}
            >
              <Text style={[styles.actionBtnText, styles.iconAbsence]}>👤✕</Text>
              <Text style={[styles.actionLabel, styles.iconAbsence]}>Ausência</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </TouchableOpacity>
  );
}

// ─── Filter Bar ───────────────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { label: 'Todos', value: '' },
  { label: 'Pendente aprovação', value: 'PENDENTE_PERSONAL_APROVACAO' },
  { label: 'Aprovado', value: 'APROVADO' },
  { label: 'Pendente conclusão', value: 'PENDENTE_PERSONAL_CONCLUIR' },
  { label: 'Concluído', value: 'CONCLUIDO' },
  { label: 'Cancelado', value: 'CANCELADO_PERSONAL' },
];

type FilterBarProps = {
  name: string;
  onNameChange: (v: string) => void;
  filterStatus: string;
  onStatusChange: (v: string) => void;
  hasFilters: boolean;
  onClear: () => void;
};

function FilterBar({ name, onNameChange, filterStatus, onStatusChange, hasFilters, onClear }: FilterBarProps) {
  return (
    <View style={styles.filterContainer}>
      <TextInput
        style={styles.searchInput}
        placeholder="Buscar aluno..."
        placeholderTextColor="#9ca3af"
        value={name}
        onChangeText={onNameChange}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statusScroll}>
        {STATUS_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.filterChip, filterStatus === opt.value && styles.filterChipActive]}
            onPress={() => onStatusChange(opt.value)}
          >
            <Text style={[styles.filterChipText, filterStatus === opt.value && styles.filterChipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {hasFilters && (
        <TouchableOpacity style={styles.clearBtn} onPress={onClear}>
          <Text style={styles.clearBtnText}>🔄 Limpar filtros</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CheckScheduleScreen() {
  const [appointments, setAppointments] = useState<CheckSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [kpis, setKpis] = useState({ totalPendente: 0, totalRespondido: 0, totalCanceladoPorMesAtual: 0, totalAgendamentosHoje: 0 });

  const [nameFilter, setNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modal state
  type ModalType = 'accept' | 'decline' | 'conclude' | 'absence' | null;
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedId, setSelectedId] = useState<number>(0);
  const [successInfo, setSuccessInfo] = useState<{ title: string; content: string } | null>(null);

  function openModal(type: ModalType, id: number) {
    setSelectedId(id);
    setActiveModal(type);
  }

  function closeModal() {
    setActiveModal(null);
  }

  function showSuccess(title: string, content: string) {
    setSuccessInfo({ title, content });
    setActiveModal(null);
    setTimeout(() => setSuccessInfo({ title, content }), 50);
  }

  // Load data
  const loadData = useCallback(async (pageNum: number, replace: boolean) => {
    try {
      const data = await fetchPersonalRequests(pageNum, '10', statusFilter || undefined, undefined, nameFilter || undefined);
      if (replace) {
        setAppointments(data.content);
      } else {
        setAppointments((prev) => [...prev, ...data.content]);
      }
      setHasMore(data.page.number < data.page.totalPages - 1);
    } catch {
      Alert.alert('Erro', 'Não foi possível carregar os agendamentos.');
    }
  }, [statusFilter, nameFilter]);

  const loadKpis = useCallback(async () => {
    try {
      const data = await fetchKpis();
      setKpis(data);
    } catch {
      // silently fail
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    setPage(0);
    Promise.all([loadData(0, true), loadKpis()]).finally(() => setLoading(false));
  }, [statusFilter, nameFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(0);
    await Promise.all([loadData(0, true), loadKpis()]);
    setRefreshing(false);
  }, [loadData, loadKpis]);

  const onLoadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    await loadData(nextPage, false);
    setPage(nextPage);
    setLoadingMore(false);
  }, [loadingMore, hasMore, page, loadData]);

  // Actions
  async function handleAcceptConfirm() {
    await api.put(`/agendamentos/${selectedId}/aprovar`);
    await onRefresh();
    setSuccessInfo({ title: 'Agendamento Aceito', content: 'O agendamento foi aceito com sucesso.' });
  }

  async function handleDeclineConfirm() {
    await api.delete(`/agendamentos/${selectedId}`);
    await onRefresh();
    setSuccessInfo({ title: 'Agendamento Recusado', content: 'O agendamento foi recusado.' });
  }

  async function handleConcludeSubmit(data: { resumo: string; grupoMuscular: string[] }) {
    await api.put(`/agendamentos/${selectedId}/confirmar-conclusao`, data);
    await onRefresh();
    setSuccessInfo({ title: 'Agendamento Concluído', content: 'O agendamento foi concluído com sucesso.' });
  }

  async function handleAbsenceSubmit(data: { type: string; description: string }) {
    const payload: AbsenceAppointment = {
      idAgendamento: selectedId,
      tipoUsuario: data.type.includes('PERSONAL') ? 'PERSONAL' : 'ALUNO',
      descricaoCancelamento: data.description || null,
    };
    await api.put('/agendamentos/ausencia', payload);
    await onRefresh();
    setSuccessInfo({ title: 'Ausência Registrada', content: 'A ausência foi registrada com sucesso.' });
  }

  function handleReschedule(id: number, _date: string) {
    Alert.alert('Reagendar', `Reagendamento ainda não implementado nesta versão mobile. ID: #${id}`);
  }

  function handleCardPress(_id: number) {
    // TODO: navigate to ScheduleDetails screen
  }

  const hasFilters = !!(nameFilter || statusFilter);

  function clearFilters() {
    setNameFilter('');
    setStatusFilter('');
  }

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconWrapper}>
        <Text style={styles.emptyIconText}>📅</Text>
      </View>
      <Text style={styles.emptyTitle}>Nenhum agendamento encontrado</Text>
      <Text style={styles.emptyText}>
        Não encontramos solicitações com os filtros selecionados ou ainda não há agendamentos.
      </Text>
      {hasFilters && (
        <TouchableOpacity style={styles.clearBtn} onPress={clearFilters}>
          <Text style={styles.clearBtnText}>🔄 Limpar filtros</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return null;
    return <ActivityIndicator style={{ marginVertical: 16 }} color="#192633" />;
  };

  return (
    <View style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Solicitações de Agendamentos</Text>

        {/* KPIs */}
        <View style={styles.kpiRow}>
          <KpiCard title="Total pendente" value={kpis.totalPendente} color="#f59e0b" />
          <KpiCard title="Respondidos" value={kpis.totalRespondido} color="#009664" />
          <KpiCard title="Cancelados no mês" value={kpis.totalCanceladoPorMesAtual} color="#960000" />
        </View>

        {/* Filter */}
        <FilterBar
          name={nameFilter}
          onNameChange={setNameFilter}
          filterStatus={statusFilter}
          onStatusChange={setStatusFilter}
          hasFilters={hasFilters}
          onClear={clearFilters}
        />
      </View>

      {/* List */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} size="large" color="#192633" />
      ) : (
        <FlatList
          data={appointments}
          keyExtractor={(item) => String(item.agendamentoId)}
          renderItem={({ item }) => (
            <AppointmentCard
              card={item}
              onAccept={(id) => openModal('accept', id)}
              onDecline={(id) => openModal('decline', id)}
              onReschedule={handleReschedule}
              onConclude={(id) => openModal('conclude', id)}
              onAbsence={(id) => openModal('absence', id)}
              onPress={handleCardPress}
            />
          )}
          contentContainerStyle={appointments.length === 0 ? { flex: 1 } : styles.listContent}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#192633']} />}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.3}
        />
      )}

      <ConfirmModal
        visible={activeModal === 'accept'}
        title="Aceitar Agendamento"
        content="Tem certeza que deseja aceitar este agendamento?"
        confirmText="Aceitar agendamento"
        onConfirm={handleAcceptConfirm}
        onClose={closeModal}
      />

      <ConfirmModal
        visible={activeModal === 'decline'}
        title="Recusar Agendamento"
        content="Tem certeza que deseja recusar este agendamento?"
        confirmText="Recusar agendamento"
        isDestructive
        onConfirm={handleDeclineConfirm}
        onClose={closeModal}
      />

      <ConcludeAppointmentModal
        visible={activeModal === 'conclude'}
        onClose={closeModal}
        onSubmit={handleConcludeSubmit}
      />

      <RegisterAbsenceModal
        visible={activeModal === 'absence'}
        onClose={closeModal}
        onSubmit={handleAbsenceSubmit}
      />

      <SuccessModal
        visible={!!successInfo}
        title={successInfo?.title}
        content={successInfo?.content}
        onClose={() => setSuccessInfo(null)}
      />

      <BottomTabBar activeTab="requests" />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },

  // Header (cor do .theadRow = #192633)
  header: {
    backgroundColor: '#192633',
    paddingTop: 52,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },

  // .titleFilter h1 → font-weight:600; font-size:30px; color:#333
  // No RN ficamos com branco pois o header é escuro
  title: {
    width: '100%',
    textAlign: 'left',
    fontWeight: '600',
    fontSize: 30,
    color: '#ffffff',
    marginBottom: 16,
  },

  // .gridContainer → gap: 1.25rem (20px)
  kpiRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 12,
  },
  kpiCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#192633',
  },
  kpiTitle: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },

  // Filtros (não existem no CSS da web, mantidos para funcionalidade)
  filterContainer: {
    gap: 8,
  },
  searchInput: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  statusScroll: {
    flexGrow: 0,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#324d67', // cor do .theadRow border #324d67
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: '#f59e0b',
  },
  filterChipText: {
    fontSize: 12,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  filterChipTextActive: {
    color: '#1a1a1a',
    fontWeight: '700',
  },

  // .mobileButton → background-color: var(--bg-orange) #f59e0b; padding: 0.5rem 1rem; border-radius: 0.375rem (6px)
  clearBtn: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,   // 1rem
    paddingVertical: 8,      // 0.5rem
    borderRadius: 6,         // 0.375rem
    backgroundColor: '#f59e0b', // var(--bg-orange)
    marginTop: 24,           // 1.5rem (margin-top do .mobileButton)
  },
  clearBtnText: {
    color: '#ffffff',
    fontSize: 14,            // 0.875rem
    fontWeight: '500',
  },

  listContent: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 70,
  },

  // .mobileCardWrapper → width: 100%
  cardWrapper: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 10,
  },

  // .mobileCard → border-radius: 0.75rem (12); box-shadow 0 1px 2px rgba(0,0,0,0.05); border: 1px solid #f3f4f6; padding: 1rem (16)
  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 12,        // 0.75rem
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,     // 0 1px 2px rgba(0,0,0,0.05)
    shadowRadius: 2,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    padding: 16,             // 1rem
  },

  // .mobileCardHeader → justify-content:space-between; margin-bottom:0.75rem (12); flex-wrap:wrap; gap:8px
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,        // 0.75rem
    flexWrap: 'wrap',
    gap: 8,
  },

  // .mobileStatusBadge → padding:0.25rem 0.625rem; border-radius:9999px; font-size:10px; font-weight:700; uppercase; letter-spacing:0.05em; width:60%
  // NOTA: o CSS original NÃO tem border — a borda vem das classes Tailwind cardColor
  badge: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,   // 0.625rem
    paddingVertical: 4,      // 0.25rem
    borderRadius: 9999,
    borderWidth: 1,          // vem do cardColor no web (mantemos para fidelidade visual)
    width: '60%',
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,      // 0.05em ≈ 0.8 em fontSize 10
    textAlign: 'center',
  },

  // .mobileCardType → font-size:0.75rem (12); color:#fff; padding: 0 8px; text-align:center; bg:#4b5563; border-radius:8px
  typeBadge: {
    backgroundColor: '#4b5563',
    paddingHorizontal: 8,    // padding: 0 8px (só horizontal)
    paddingVertical: 0,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 12,            // 0.75rem
    color: '#ffffff',
    textAlign: 'center',
  },

  // .mobileUserSection → gap:0.75rem (12); margin-bottom:1rem (16)
  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,                 // 0.75rem
    marginBottom: 16,        // 1rem
  },

  // .mobileAvatarWrapper → border:1px solid #9ca3af; border-radius:9999px; width:2.5rem (40); height:2.5rem (40); overflow:hidden
  avatarWrapper: {
    borderWidth: 1,
    borderColor: '#9ca3af',
    borderRadius: 9999,
    width: 40,               // 2.5rem
    height: 40,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: { width: 40, height: 40 },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    backgroundColor: '#192633',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },

  // .mobileUserName → font-size:0.875rem (14); font-weight:700; color:#111827
  userName: {
    fontSize: 14,            // 0.875rem
    fontWeight: '700',
    color: '#111827',
  },

  // .mobileUserDate → font-size:0.75rem (12); color:#4e5053 (sem marginTop no CSS original)
  dateText: {
    fontSize: 12,            // 0.75rem
    color: '#4e5053',
  },

  // .mobileAddress → font-size:0.75rem (12); color:#4e5053; margin-top:10px
  addressText: {
    fontSize: 12,            // 0.75rem
    color: '#4e5053',
    marginTop: 10,
  },

  // .mobileActions → justify-content:space-around; gap:0.75rem (12); padding-top:0.75rem (12); border-top:1px solid #f3f4f6
  // NOTA: o CSS original NÃO tem flex-wrap
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,                 // 0.75rem
    paddingTop: 12,          // 0.75rem
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },

  // .button → cursor:pointer; background:none; border:none
  actionBtn: {
    backgroundColor: 'transparent',
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Ícone do botão
  actionBtnText: {
    fontSize: 22,
    textAlign: 'center',
  },
  // Label abaixo do ícone
  actionLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },

  // Cores dos ícones — idênticas ao CSS da web
  iconAccept:     { color: '#22c55e' }, // .iconAccept
  iconDecline:    { color: '#ef4444' }, // .iconDecline
  iconReschedule: { color: '#3b82f6' }, // .iconReschedule
  iconConclude:   { color: '#16a34a' }, // text-green-600
  iconAbsence:    { color: '#ef4444' }, // text-red-500

  // .mobileEmptyContainer → flex-grow:1; padding:2rem (32); text-align:center; bg:#fff; border-radius:8px; width:100%
  emptyContainer: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,             // 2rem
    backgroundColor: '#fff',
    borderRadius: 8,
    width: '100%',
  },

  // .mobileIconWrapper → width:6rem (96); height:6rem (96); margin-bottom:1rem (16); border-radius:9999px; bg:#f3f4f6
  emptyIconWrapper: {
    width: 96,               // 6rem
    height: 96,
    marginBottom: 16,        // 1rem
    borderRadius: 9999,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // .mobileIcon → width:3rem (48); height:3rem (48); color:#9ca3af
  emptyIconText: {
    fontSize: 48,            // 3rem
    color: '#9ca3af',
  },

  // .mobileTitle → margin-top:0.5rem (8); font-size:1.125rem (18); font-weight:500; color:#111827
  emptyTitle: {
    marginTop: 8,            // 0.5rem
    fontSize: 18,            // 1.125rem
    fontWeight: '500',
    color: '#111827',
    textAlign: 'center',
  },

  // .mobileText → margin-top:0.25rem (4); font-size:0.875rem (14); color:#6b7280; max-width:20rem (320)
  emptyText: {
    marginTop: 4,            // 0.25rem
    fontSize: 14,            // 0.875rem
    color: '#6b7280',
    textAlign: 'center',
    maxWidth: 320,           // 20rem
  },
});


