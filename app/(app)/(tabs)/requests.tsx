import { useState, useCallback, useEffect, useRef } from 'react';
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
  useWindowDimensions,
  Animated,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
  UIManager,
} from 'react-native';
import { statusProperties } from '../../../src/constants/cardStatus';
import { Bell } from 'lucide-react-native';
import { useNotifications } from '../../../src/contexts/NotificationContext';
import NotificationCenterModal from '../../../src/components/modals/NotificationCenterModal';
import {
  findPersonalRequests,
  getScheduleData,
  acceptUserAppointment,
  refuseAppointment,
  concludeAppointment,
  reportAbsencePersonal,
} from '../../../src/constants/schedule';
import type { CheckSchedule, AbsenceAppointment } from '../../../src/models/schedule';
import ConfirmModal from '../../../src/components/modals/ConfirmModal';
import SuccessModal from '../../../src/components/modals/SuccessModal';
import ConcludeAppointmentModal from '../../../src/components/modals/ConcludeAppointmentModal';
import RegisterAbsenceModal from '../../../src/components/modals/RegisterAbsenceModal';
import BottomTabBar from '../../../src/components/BottomTabBar';
import {
  CircleCheckIcon,
  CircleXIcon,
  CalendarClockIcon,
  UserCheckIcon,
  UserXIcon,
  CalendarXIcon,
  RefreshIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  SlidersIcon,
  SearchIcon,
  MapPinIcon,
  CloseIcon,
} from '../../../src/components/icons/ScheduleIcons';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

function KpiCard({
  title,
  value,
  color,
  style,
}: {
  title: string;
  value: number;
  color: string;
  style?: object;
}) {
  return (
    <View style={[styles.kpiCard, style]}>
      <Text style={styles.kpiTitle} numberOfLines={1}>
        {title}
      </Text>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
    </View>
  );
}

function StatusBadge({ status, isNarrow }: { status: string; isNarrow: boolean }) {
  const prop = statusProperties.find((s) => s.cardStatus === status);
  if (!prop) return null;
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: prop.backgroundColor,
          borderColor: prop.borderColor,
          width: isNarrow ? '100%' : '60%',
        },
      ]}
    >
      <Text style={[styles.badgeText, { color: prop.textColor }]}>{prop.cardDescription}</Text>
    </View>
  );
}

type CardProps = {
  card: CheckSchedule;
  isNarrow: boolean;
  isTablet: boolean;
  onAccept: (id: number) => void;
  onDecline: (id: number) => void;
  onReschedule: (id: number, date: string) => void;
  onConclude: (id: number) => void;
  onAbsence: (id: number) => void;
  onPress: (id: number) => void;
};

function AppointmentCard({
  card,
  isNarrow,
  isTablet,
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
    <View style={[styles.cardWrapper, isTablet && styles.cardWrapperTablet]}>
      <TouchableOpacity
        style={styles.card}
        onPress={() => onPress(card.agendamentoId)}
        activeOpacity={0.85}
      >
        <View style={[styles.cardHeader, isNarrow && styles.cardHeaderNarrow]}>
          <StatusBadge status={card.status} isNarrow={isNarrow} />
          <View style={[styles.typeBadge, isNarrow && styles.typeBadgeNarrow]}>
            <Text style={styles.typeText}>{card.tipoAula}</Text>
          </View>
        </View>

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
            <TouchableOpacity
              style={styles.addressWrapper}
              onPress={openMap}
              activeOpacity={0.7}
            >
              <MapPinIcon size={13} color="#4e5053" />
              <Text style={styles.addressText} numberOfLines={2}>
                {address}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.actionsRow}>
          {isPendingApproval && (
            <>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => onAccept(card.agendamentoId)}
                activeOpacity={0.7}
              >
                <CircleCheckIcon size={22} color="#22c55e" />
                <Text style={[styles.actionLabel, { color: '#22c55e' }]}>Aceitar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => onDecline(card.agendamentoId)}
                activeOpacity={0.7}
              >
                <CircleXIcon size={22} color="#ef4444" />
                <Text style={[styles.actionLabel, { color: '#ef4444' }]}>Recusar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => onReschedule(card.agendamentoId, card.dataInicio?.split('T')[0] ?? '')}
                activeOpacity={0.7}
              >
                <CalendarClockIcon size={22} color="#3b82f6" />
                <Text style={[styles.actionLabel, { color: '#3b82f6' }]}>Reagendar</Text>
              </TouchableOpacity>
            </>
          )}
          {isApproved && (
            <>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => onDecline(card.agendamentoId)}
                activeOpacity={0.7}
              >
                <CircleXIcon size={22} color="#ef4444" />
                <Text style={[styles.actionLabel, { color: '#ef4444' }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => onReschedule(card.agendamentoId, card.dataInicio?.split('T')[0] ?? '')}
                activeOpacity={0.7}
              >
                <CalendarClockIcon size={22} color="#3b82f6" />
                <Text style={[styles.actionLabel, { color: '#3b82f6' }]}>Reagendar</Text>
              </TouchableOpacity>
            </>
          )}
          {isPendingConclusion && (
            <>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => onConclude(card.agendamentoId)}
                activeOpacity={0.7}
              >
                <UserCheckIcon size={22} color="#16a34a" />
                <Text style={[styles.actionLabel, { color: '#16a34a' }]}>Concluir</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => onAbsence(card.agendamentoId)}
                activeOpacity={0.7}
              >
                <UserXIcon size={22} color="#ef4444" />
                <Text style={[styles.actionLabel, { color: '#ef4444' }]}>Ausência</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    </View>
  );
}

const STATUS_OPTIONS = [
  { label: 'Todos', value: '' },
  { label: 'Pendente resposta do personal', value: 'PENDENTE_PERSONAL_APROVACAO' },
  { label: 'Pendente resposta do aluno', value: 'PENDENTE_CLIENTE_APROVACAO' },
  { label: 'Aprovado', value: 'APROVADO' },
  { label: 'Pendente conclusão', value: 'PENDENTE_PERSONAL_CONCLUIR' },
  { label: 'Concluído', value: 'CONCLUIDO' },
  { label: 'Cancelado pelo personal', value: 'CANCELADO_PERSONAL' },
  { label: 'Cancelado pelo aluno', value: 'CANCELADO_CLIENTE' },
  { label: 'Ausência (aluno)', value: 'AUSENCIA_CLIENTE' },
  { label: 'Ausência (personal)', value: 'AUSENCIA_PERSONAL' },
];

type FilterBarProps = {
  name: string;
  onNameChange: (v: string) => void;
  filterStatus: string;
  onStatusChange: (v: string) => void;
  hasFilters: boolean;
  onClear: () => void;
};

function FilterBar({
  name,
  onNameChange,
  filterStatus,
  onStatusChange,
  hasFilters,
  onClear,
}: FilterBarProps) {
  return (
    <View style={styles.filterContainer}>
      <View style={styles.searchWrapper}>
        <SearchIcon size={18} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar aluno..."
          placeholderTextColor="#9ca3af"
          value={name}
          onChangeText={onNameChange}
        />
        {name.length > 0 && (
          <TouchableOpacity onPress={() => onNameChange('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <CloseIcon size={16} color="#9ca3af" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.statusScrollContent}
        style={styles.statusScroll}
      >
        {STATUS_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={[styles.filterChip, filterStatus === opt.value && styles.filterChipActive]}
            onPress={() => onStatusChange(opt.value)}
            activeOpacity={0.75}
          >
            <Text style={[styles.filterChipText, filterStatus === opt.value && styles.filterChipTextActive]}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {hasFilters && (
        <TouchableOpacity style={styles.clearBtn} onPress={onClear} activeOpacity={0.8}>
          <RefreshIcon size={14} color="#ffffff" />
          <Text style={styles.clearBtnText}>Limpar filtros</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

export default function CheckScheduleScreen() {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isNarrow = width < 360;

  const [appointments, setAppointments] = useState<CheckSchedule[]>([]);
  const { scheduleApprovalNotification, scheduleCancellationNotification, scheduleRescheduleNotification, unreadCount } = useNotifications();
  const [isNotificationModalVisible, setIsNotificationModalVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [kpis, setKpis] = useState({
    totalPendente: 0,
    totalRespondido: 0,
    totalCanceladoPorMesAtual: 0,
    totalAgendamentosHoje: 0,
  });

  const [nameFilter, setNameFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showScrollTop, setShowScrollTop] = useState(false);

  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const panelAnim = useRef(new Animated.Value(1)).current;

  const flatListRef = useRef<FlatList>(null);
  const fadeScrollTop = useRef(new Animated.Value(0)).current;

  type ModalType = 'accept' | 'decline' | 'conclude' | 'absence' | null;
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [selectedId, setSelectedId] = useState<number>(0);
  const [successInfo, setSuccessInfo] = useState<{ title: string; content: string } | null>(null);

  function togglePanel() {
    const nextState = !isPanelOpen;
    setIsPanelOpen(nextState);
    Animated.spring(panelAnim, {
      toValue: nextState ? 1 : 0,
      friction: 9,
      tension: 50,
      useNativeDriver: false,
    }).start();
  }

  const panelMaxHeight = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 750],
  });

  const panelOpacity = panelAnim.interpolate({
    inputRange: [0, 0.2, 1],
    outputRange: [0, 0, 1],
  });

  const panelTranslateY = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-14, 0],
  });

  const rotateChevron = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  function openModal(type: ModalType, id: number) {
    setSelectedId(id);
    setActiveModal(type);
  }

  function closeModal() {
    setActiveModal(null);
  }

  const loadData = useCallback(
    async (pageNum: number, replace: boolean) => {
      try {
        const res = await findPersonalRequests(
          pageNum,
          '10',
          undefined,
          undefined,
          statusFilter || undefined,
          undefined,
          nameFilter || undefined,
        );
        const data = res.data;
        if (replace) {
          setAppointments(data.content);
        } else {
          setAppointments((prev) => [...prev, ...data.content]);
        }
        setHasMore(data.page.number < data.page.totalPages - 1);
      } catch {
        // Silenciosamente define lista vazia ou falha sem popup
      }
    },
    [statusFilter, nameFilter],
  );

  const loadKpis = useCallback(async () => {
    try {
      const res = await getScheduleData();
      setKpis(res.data);
    } catch {
      // Ignora erro silenciosamente
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

  async function handleAcceptConfirm() {
    const item = appointments.find((r) => r.agendamentoId === selectedId);
    await acceptUserAppointment(selectedId);
    await onRefresh();
    setSuccessInfo({ title: 'Agendamento Aceito', content: 'O agendamento foi aceito com sucesso.' });

    // Dispara notificação de aprovação simultânea para Aluno e Personal
    scheduleApprovalNotification({
      studentName: item?.nome || 'Aluno',
      personalName: 'Personal Trainer',
      classType: item?.tipoAula || 'Aula',
      date: item?.dataInicio ? formatDate(item.dataInicio) : '',
      time: item?.dataInicio ? formatTime(item.dataInicio) : '',
    });
  }

  async function handleDeclineConfirm() {
    const item = appointments.find((r) => r.agendamentoId === selectedId);
    await refuseAppointment(selectedId);
    await onRefresh();
    setSuccessInfo({ title: 'Agendamento Recusado', content: 'O agendamento foi recusado.' });

    // Notifica o Aluno que a aula foi cancelada
    scheduleCancellationNotification({
      studentName: item?.nome || 'Aluno',
      personalName: 'Personal Trainer',
      classType: item?.tipoAula || 'Aula',
      date: item?.dataInicio ? formatDate(item.dataInicio) : '',
      time: item?.dataInicio ? formatTime(item.dataInicio) : '',
    });
  }

  async function handleConcludeSubmit(data: { resumo: string; grupoMuscular: string[] }) {
    await concludeAppointment(selectedId, data);
    await onRefresh();
    setSuccessInfo({ title: 'Agendamento Concluído', content: 'O agendamento foi concluído com sucesso.' });
  }

  async function handleAbsenceSubmit(data: { type: string; description: string }) {
    const payload: AbsenceAppointment = {
      idAgendamento: selectedId,
      tipoUsuario: data.type.includes('PERSONAL') ? 'PERSONAL' : 'ALUNO',
      descricaoCancelamento: data.description || null,
    };
    await reportAbsencePersonal(payload);
    await onRefresh();
    setSuccessInfo({ title: 'Ausência Registrada', content: 'A ausência foi registrada com sucesso.' });
  }

  function handleReschedule(id: number, _date: string) {
    Alert.alert('Reagendar', `Reagendamento ainda não implementado nesta versão mobile. ID: #${id}`);
    // Quando implementado, chamar:
    // const item = appointments.find((r) => r.agendamentoId === id);
    // scheduleRescheduleNotification({
    //   studentName: item?.nome || 'Aluno',
    //   personalName: 'Personal Trainer',
    //   classType: item?.tipoAula || 'Aula',
    //   date: novaData,
    //   time: novoHorario,
    // });
  }

  function handleCardPress(_id: number) {}

  const activeFiltersCount = (nameFilter ? 1 : 0) + (statusFilter ? 1 : 0);
  const hasFilters = activeFiltersCount > 0;

  function clearFilters() {
    setNameFilter('');
    setStatusFilter('');
  }

  const activeStatusLabel = STATUS_OPTIONS.find((s) => s.value === statusFilter)?.label;

  function handleScroll(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const offsetY = event.nativeEvent.contentOffset.y;
    const shouldShow = offsetY > 200;
    if (shouldShow !== showScrollTop) {
      setShowScrollTop(shouldShow);
      Animated.timing(fadeScrollTop, {
        toValue: shouldShow ? 1 : 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }

  function scrollToTop() {
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }

  const renderEmpty = () => (
    <View style={[styles.emptyContainer, isTablet && styles.emptyContainerTablet]}>
      <View style={styles.emptyIconWrapper}>
        <CalendarXIcon size={48} color="#9ca3af" />
      </View>
      <Text style={styles.emptyTitle}>Nenhum agendamento encontrado</Text>
      <Text style={styles.emptyText}>
        Não encontramos solicitações com os filtros selecionados ou ainda não há agendamentos.
      </Text>
      {hasFilters && (
        <TouchableOpacity style={styles.clearBtn} onPress={clearFilters} activeOpacity={0.8}>
          <RefreshIcon size={14} color="#ffffff" />
          <Text style={styles.clearBtnText}>Limpar filtros</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  const renderFooter = () => {
    if (!loadingMore) return <View style={{ height: 80 }} />;
    return (
      <View style={{ paddingVertical: 20, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="small" color="#192633" />
      </View>
    );
  };

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={[styles.headerInner, isTablet && styles.headerInnerTablet]}>
          <View style={styles.headerTopBar}>
            <View style={styles.titleRow}>
              <View style={styles.titleWrapper}>
                <Text style={styles.title}>Solicitações de Agendamentos</Text>
              </View>
              <TouchableOpacity
                style={styles.bellBtn}
                onPress={() => setIsNotificationModalVisible(true)}
                activeOpacity={0.8}
              >
                <Bell size={18} color="#ffffff" />
                {unreadCount > 0 && (
                  <View style={styles.bellBadge}>
                    <Text style={styles.bellBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

          </View>

          {!isPanelOpen && hasFilters && (
            <View style={styles.compactFilterSummary}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.compactFilterChips}>
                {nameFilter ? (
                  <View style={styles.compactChip}>
                    <Text style={styles.compactChipText}>Aluno: "{nameFilter}"</Text>
                  </View>
                ) : null}
                {statusFilter ? (
                  <View style={styles.compactChip}>
                    <Text style={styles.compactChipText}>{activeStatusLabel}</Text>
                  </View>
                ) : null}
                <TouchableOpacity style={styles.compactClearBtn} onPress={clearFilters} activeOpacity={0.7}>
                  <Text style={styles.compactClearBtnText}>✕ Limpar</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          )}

          {!isPanelOpen && (
            <TouchableOpacity
              style={[styles.togglePanelBtn, isPanelOpen && styles.togglePanelBtnActive]}
              onPress={togglePanel}
              activeOpacity={0.8}
            >
              <SlidersIcon size={16} color={isPanelOpen ? '#1a1a1a' : '#ffffff'} />
              <Text style={[styles.togglePanelBtnText, isPanelOpen && styles.togglePanelBtnTextActive]}>
                Filtros e KPIs
              </Text>
              {hasFilters && !isPanelOpen && (
                <View style={styles.activeFilterBadge}>
                  <Text style={styles.activeFilterBadgeText}>{activeFiltersCount}</Text>
                </View>
              )}
              <Animated.View style={{ transform: [{ rotate: rotateChevron }] }}>
                <ChevronDownIcon size={16} color={isPanelOpen ? '#1a1a1a' : '#ffffff'} />
              </Animated.View>
            </TouchableOpacity>
          )}

          <Animated.View
            style={[
              styles.collapsibleContent,
              {
                maxHeight: panelMaxHeight,
                opacity: panelOpacity,
                transform: [{ translateY: panelTranslateY }],
              },
            ]}
          >
            <View style={styles.collapsibleInner}>
              {isTablet ? (
                <View style={styles.kpiRowTablet}>
                  <KpiCard
                    title="TOTAL PENDENTE"
                    value={kpis.totalPendente}
                    color="#F59E0B"
                    style={styles.kpiCardTablet}
                  />
                  <KpiCard
                    title="RESPONDIDOS"
                    value={kpis.totalRespondido}
                    color="#009664"
                    style={styles.kpiCardTablet}
                  />
                  <KpiCard
                    title="CANCELADOS NO MÊS ATUAL"
                    value={kpis.totalCanceladoPorMesAtual}
                    color="#960000"
                    style={styles.kpiCardTablet}
                  />
                </View>
              ) : (
                <View style={styles.kpiGridMobile}>
                  <View style={styles.kpiMobileRowTop}>
                    <KpiCard
                      title="TOTAL PENDENTE"
                      value={kpis.totalPendente}
                      color="#F59E0B"
                      style={styles.kpiCardHalf}
                    />
                    <KpiCard
                      title="RESPONDIDOS"
                      value={kpis.totalRespondido}
                      color="#009664"
                      style={styles.kpiCardHalf}
                    />
                  </View>
                  <KpiCard
                    title="CANCELADOS NO MÊS ATUAL"
                    value={kpis.totalCanceladoPorMesAtual}
                    color="#960000"
                    style={styles.kpiCardFull}
                  />
                </View>
              )}

              <FilterBar
                name={nameFilter}
                onNameChange={setNameFilter}
                filterStatus={statusFilter}
                onStatusChange={setStatusFilter}
                hasFilters={hasFilters}
                onClear={clearFilters}
              />

              {isPanelOpen && (
                <TouchableOpacity
                  style={[styles.togglePanelBtn, styles.togglePanelBtnActive]}
                  onPress={togglePanel}
                  activeOpacity={0.8}
                >
                  <SlidersIcon size={16} color="#1a1a1a" />
                  <Text style={[styles.togglePanelBtnText, styles.togglePanelBtnTextActive]}>
                    Filtros e KPIs
                  </Text>
                  <Animated.View style={{ transform: [{ rotate: rotateChevron }] }}>
                    <ChevronDownIcon size={16} color="#1a1a1a" />
                  </Animated.View>
                </TouchableOpacity>
              )}

            </View>
          </Animated.View>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#192633" />
        </View>
      ) : (
        <FlatList
          ref={flatListRef}
          data={appointments}
          keyExtractor={(item) => String(item.agendamentoId)}
          renderItem={({ item }) => (
            <AppointmentCard
              card={item}
              isNarrow={isNarrow}
              isTablet={isTablet}
              onAccept={(id) => openModal('accept', id)}
              onDecline={(id) => openModal('decline', id)}
              onReschedule={handleReschedule}
              onConclude={(id) => openModal('conclude', id)}
              onAbsence={(id) => openModal('absence', id)}
              onPress={handleCardPress}
            />
          )}
          contentContainerStyle={appointments.length === 0 ? styles.emptyListContent : styles.listContent}
          ListEmptyComponent={renderEmpty}
          ListFooterComponent={renderFooter}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#192633']} />}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.3}
          onScroll={handleScroll}
          scrollEventThrottle={16}
        />
      )}

      {showScrollTop && (
        <Animated.View style={[styles.scrollTopBtnContainer, { opacity: fadeScrollTop }]}>
          <TouchableOpacity style={styles.scrollTopBtn} onPress={scrollToTop} activeOpacity={0.85}>
            <ChevronUpIcon size={22} color="#ffffff" />
          </TouchableOpacity>
        </Animated.View>
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

      <NotificationCenterModal
        visible={isNotificationModalVisible}
        onClose={() => setIsNotificationModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },

  header: {
    backgroundColor: '#192633',
    paddingTop: 50,
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#324d67',
  },
  headerInner: {
    width: '100%',
  },
  headerInnerTablet: {
    maxWidth: 960,
    alignSelf: 'center',
  },

  headerTopBar: {
    flexDirection: 'column',
    alignItems: 'stretch',
    gap: 12,
    marginBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  bellBtn: {
    position: 'relative',
    padding: 8,
    borderRadius: 10,
    backgroundColor: '#273c50',
    borderWidth: 1,
    borderColor: '#3c5a78',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 999,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '800',
  },
  titleWrapper: {
    flex: 1,
  },
  title: {
    fontWeight: '700',
    fontSize: 22,
    color: '#ffffff',
    letterSpacing: -0.3,
  },

  togglePanelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#273c50',
    borderWidth: 1,
    borderColor: '#3c5a78',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    gap: 8,
    width: '100%',
  },
  togglePanelBtnActive: {
    marginTop: 12,
    backgroundColor: '#f59e0b',
    borderColor: '#d97706',
  },
  togglePanelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
  },
  togglePanelBtnTextActive: {
    color: '#1a1a1a',
    fontWeight: '700',
  },
  activeFilterBadge: {
    backgroundColor: '#f59e0b',
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeFilterBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#1a1a1a',
  },

  compactFilterSummary: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#273c50',
  },
  compactFilterChips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactChip: {
    backgroundColor: '#324d67',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  compactChipText: {
    fontSize: 11,
    color: '#cbd5e1',
    fontWeight: '500',
  },
  compactClearBtn: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  compactClearBtnText: {
    fontSize: 11,
    color: '#ffffff',
    fontWeight: '700',
  },

  collapsibleContent: {
    overflow: 'hidden',
  },
  collapsibleInner: {
    paddingTop: 12,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#273c50',
  },

  kpiRowTablet: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 14,
  },
  kpiCardTablet: {
    flex: 1,
  },

  kpiGridMobile: {
    gap: 10,
    marginBottom: 14,
  },
  kpiMobileRowTop: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiCardHalf: {
    flex: 1,
  },
  kpiCardFull: {
    width: '100%',
  },

  kpiCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  kpiTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4,
  },

  filterContainer: {
    gap: 10,
  },
  searchWrapper: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#324d67',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
    fontSize: 14,
    color: '#111827',
  },
  statusScroll: {
    flexGrow: 0,
  },
  statusScrollContent: {
    paddingRight: 8,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#324d67',
    borderWidth: 1,
    borderColor: '#43617e',
  },
  filterChipActive: {
    backgroundColor: '#f59e0b',
    borderColor: '#d97706',
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

  clearBtn: {
    width: '100%',
    textAlign: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#f59e0b',
    marginTop: 15,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  clearBtnText: {
    color: '#000000ff',
    fontSize: 13,
    fontWeight: '600',
  },

  listContent: {
    paddingTop: 8,
    paddingBottom: 80,
  },
  emptyListContent: {
    flexGrow: 1,
    paddingBottom: 80,
  },

  cardWrapper: {
    width: '100%',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  cardWrapperTablet: {
    maxWidth: 780,
    alignSelf: 'center',
  },

  card: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f3f4f6',
    padding: 16,
  },

  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  cardHeaderNarrow: {
    flexDirection: 'column',
    alignItems: 'flex-start',
  },

  badge: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 9999,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    textAlign: 'center',
  },

  typeBadge: {
    backgroundColor: '#4b5563',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  typeBadgeNarrow: {
    width: '100%',
    marginTop: 4,
  },
  typeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
    textAlign: 'center',
  },

  userSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  avatarWrapper: {
    borderWidth: 1,
    borderColor: '#9ca3af',
    borderRadius: 9999,
    width: 42,
    height: 42,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatar: {
    width: 42,
    height: 42,
  },
  avatarPlaceholder: {
    width: 42,
    height: 42,
    backgroundColor: '#192633',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  userName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  dateText: {
    fontSize: 12,
    color: '#4e5053',
    marginTop: 2,
  },
  addressWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  addressText: {
    fontSize: 12,
    color: '#4e5053',
    flex: 1,
  },

  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  actionBtn: {
    backgroundColor: 'transparent',
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 3,
    textAlign: 'center',
  },

  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  emptyContainerTablet: {
    maxWidth: 600,
    alignSelf: 'center',
    width: '100%',
  },
  emptyIconWrapper: {
    width: 96,
    height: 96,
    marginBottom: 16,
    borderRadius: 48,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    textAlign: 'center',
  },
  emptyText: {
    marginTop: 6,
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    maxWidth: 320,
    lineHeight: 20,
  },

  scrollTopBtnContainer: {
    position: 'absolute',
    bottom: 75,
    right: 18,
    zIndex: 100,
  },
  scrollTopBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#192633',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
  },
});
