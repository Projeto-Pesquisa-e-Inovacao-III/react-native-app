import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowRight,
  Check,
  Clock3,
  MapPin,
  Plus,
  X,
  Bell,
  QrCode,
  Maximize2,
} from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';
import { useQueryClient } from '@tanstack/react-query';
import BottomTabBar from '../../../src/components/BottomTabBar';
import MonthlyCalendar, { type CalendarEvent } from '../../../src/components/MonthlyCalendar';
import NewEvent, { type NewEventPayload } from '../../../src/components/NewEvent';
import { useNotifications } from '../../../src/contexts/NotificationContext';
import NotificationCenterModal from '../../../src/components/modals/NotificationCenterModal';
import QRCodeDisplayModal, { AppointmentForQr } from '../../../src/components/modals/QRCodeDisplayModal';
import PopupModal, { type PopupAppointment } from '../../../src/components/modals/PopupModal';
import {
  acceptUserAppointment,
  appointmentAtCalendar,
  disabledPersonalDays,
  findAppointmentById,
  findUserAppointments,
  getPersonalList,
  refuseAppointment,
} from '../../../src/constants/schedule';
import { getPersonalHours } from '../../../src/constants/personal';

// Statuses confirmados no STATUS_CONFIG do AppointmentCard.tsx (web). PENDENTE e
// CANCELADO ficam mantidos só pelo placeholder otimista local (novo agendamento
// criado na hora, antes de sincronizar com a API).
type AppointmentStatus =
  | 'APROVADO'
  | 'PENDENTE'
  | 'PENDENTE_CLIENTE_APROVACAO'
  | 'PENDENTE_PERSONAL_APROVACAO'
  | 'PENDENTE_PERSONAL_CONCLUIR'
  | 'CONCLUIDO'
  | 'CANCELADO'
  | 'CANCELADO_CLIENTE'
  | 'CANCELADO_PERSONAL'
  | 'AUSENCIA_CLIENTE'
  | 'AUSENCIA_PERSONAL';

type Appointment = {
  id: number;          // local key / display id
  agendamentoId: number; // real API id — used as QR payload
  name: string;
  type: string;
  start: string;
  end: string;
  address: string;
  status: AppointmentStatus;
};

// Mapeia Appointment -> AppointmentForQr garantindo que o QR sempre carregue o
// agendamentoId real da API, e não o id local/display (que pode divergir).
function toQrAppointment(appt: Appointment): AppointmentForQr {
  return {
    id: appt.agendamentoId,
    name: appt.name,
    type: appt.type,
    start: appt.start,
    end: appt.end,
    address: appt.address,
  };
}

// Formato REAL de GET /agendamentos/calendario (appointmentAtCalendar),
// confirmado via inspector de rede: só devolve agendamentoId, data (início) e
// status. NÃO tem datafim, nome, tipoAula nem endereco — esse endpoint parece
// pensado só pra marcar dias com evento no calendário, não pra listar detalhes.
type ApiAppointment = {
  agendamentoId: number;
  data: string;
  status: string;
};

// O QR code é gerado a partir de appointment.agendamentoId, então é essencial
// que esse valor seja sempre o id real vindo da API — nunca um valor local/mock.
//
// ATENÇÃO: como appointmentAtCalendar não traz nome/tipo/endereço/hora de fim,
// esses campos ficam vazios por enquanto (placeholders abaixo). Ver mensagem
// sobre como preencher isso de verdade.
function mapApiAppointment(raw: ApiAppointment): Appointment {
  return {
    id: raw.agendamentoId,
    agendamentoId: raw.agendamentoId,
    name: 'Personal Trainer',
    type: 'Aula',
    start: raw.data,
    end: raw.data,
    address: 'Local a combinar',
    status: raw.status as AppointmentStatus,
  };
}

function normalizeStudentAppointment(data: any): Appointment | null {
  if (!data || typeof data !== 'object') return null;
  const id = Number(data.agendamentoId ?? data.id);
  if (!Number.isInteger(id) || id <= 0) return null;

  const start = String(data.data ?? data.dataInicio ?? '');
  if (!start) return null;

  const end = String(data.datafim ?? data.dataFim ?? data.dataFinal ?? start);
  const personal = data.personal && typeof data.personal === 'object' ? data.personal : undefined;
  const name = String(data.personalNome ?? personal?.nome ?? 'Personal Trainer');
  const type = String(data.tipoAula ?? data.tipo ?? 'Personal');
  const status = String(data.agendamentoStatus ?? data.status ?? 'PENDENTE') as AppointmentStatus;

  let address = '';
  if (data.endereco && typeof data.endereco === 'object') {
    const end = data.endereco as Record<string, any>;
    const cep = end.cep && typeof end.cep === 'object' ? end.cep : undefined;
    const parts = [
      cep?.logradouro ?? end.logradouro,
      end.numero,
      end.complemento,
      cep?.bairro ?? end.bairro,
      cep?.localidade ?? end.localidade ?? end.cidade,
    ].filter(Boolean);
    address = parts.join(', ');
  } else if (typeof data.endereco === 'string') {
    address = data.endereco;
  }
  if (!address) {
    address = 'Local a combinar';
  }

  return {
    id,
    agendamentoId: id,
    name,
    type,
    start,
    end,
    address,
    status,
  };
}

function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
}

function formatTimeLabel(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function isSameDay(dateA: Date, dateB: Date) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function getStatusStyle(status: AppointmentStatus) {
  switch (status) {
    case 'APROVADO':
      return { label: 'Aprovado', background: '#EAFBF1', color: '#127B49' };
    case 'PENDENTE':
    case 'PENDENTE_CLIENTE_APROVACAO':
      return { label: 'Pendente de confirmação', background: '#FFF6D9', color: '#8A6300' };
    case 'PENDENTE_PERSONAL_APROVACAO':
      return { label: 'Aguardando personal', background: '#FFF6D9', color: '#8A6300' };
    case 'PENDENTE_PERSONAL_CONCLUIR':
      return { label: 'Pendente Conclusão', background: '#FFF4ED', color: '#B43403' };
    case 'CANCELADO':
    case 'CANCELADO_CLIENTE':
      return { label: 'Cancelado por você', background: '#FDECEC', color: '#B42318' };
    case 'CANCELADO_PERSONAL':
      return { label: 'Cancelado pelo personal', background: '#FDECEC', color: '#B42318' };
    case 'AUSENCIA_CLIENTE':
      return { label: 'Ausência registrada', background: '#FDECEC', color: '#B42318' };
    case 'AUSENCIA_PERSONAL':
      return { label: 'Ausência do personal', background: '#FDECEC', color: '#B42318' };
    case 'CONCLUIDO':
      return { label: 'Concluído', background: '#EEF4FF', color: '#1D4ED8' };
    default:
      return { label: 'Sem status', background: '#F3F4F6', color: '#374151' };
  }
}

export default function ScheduleScreen() {
  const queryClient = useQueryClient();
  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [calendarDotEvents, setCalendarDotEvents] = useState<CalendarEvent[]>([]);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
  const [newEventVisible, setNewEventVisible] = useState(false);
  const [isNotificationModalVisible, setIsNotificationModalVisible] = useState(false);
  const [selectedQrAppointment, setSelectedQrAppointment] = useState<AppointmentForQr | null>(null);
  const [selectedDetailsAppointment, setSelectedDetailsAppointment] = useState<Appointment | null>(null);
  const [disabledWeekdays, setDisabledWeekdays] = useState<string[]>([]);
  const [personalId, setPersonalId] = useState<number | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);
  const [popupModalVisible, setPopupModalVisible] = useState(false);
  const [popupDate, setPopupDate] = useState('');
  const [popupAppointments, setPopupAppointments] = useState<PopupAppointment[]>([]);
  const { scheduleAppointmentNotification, unreadCount } = useNotifications();

  const loadAppointments = useCallback(async () => {
    try {
      setIsLoadingAppointments(true);

      // Busca o calendário (apenas para marcar dots) e os agendamentos completos em paralelo
      const [calRes, apptRes] = await Promise.all([
        appointmentAtCalendar(),
        findUserAppointments(),
      ]);

      // --- Eventos do calendário (dots): sempre vêm de /agendamentos/calendario ---
      const calData = calRes.data;
      const calList: ApiAppointment[] = Array.isArray(calData) ? calData : calData?.content ?? [];
      const seenIds = new Set<number>();
      const dedupedCalEvents: CalendarEvent[] = calList
        .filter((item) => {
          if (seenIds.has(item.agendamentoId)) return false;
          seenIds.add(item.agendamentoId);
          return true;
        })
        .map((item) => ({ data: item.data, status: item.status, agendamentoId: item.agendamentoId }));
      setCalendarDotEvents(dedupedCalEvents);

      // --- Lista de agendamentos (popup / lista diária): vêm de /agendamentos/me ---
      const raw = Array.isArray(apptRes.data) ? apptRes.data : apptRes.data?.content ?? [];
      const normalized: Appointment[] = raw
        .map(normalizeStudentAppointment)
        .filter((item: Appointment | null): item is Appointment => item !== null);

      if (normalized.length > 0) {
        setAppointments(normalized);
        return;
      }

      // Fallback: se /me não tiver dados, tenta buscar detalhes dos IDs do calendário
      if (calList.length > 0) {
        const detailed = await Promise.all(
          calList.map(async (item) => {
            try {
              const detailRes = await findAppointmentById(item.agendamentoId);
              const mapped = normalizeStudentAppointment(detailRes.data);
              return mapped ?? mapApiAppointment(item);
            } catch {
              return mapApiAppointment(item);
            }
          })
        );
        setAppointments(detailed);
      } else {
        setAppointments([]);
      }
    } catch (err) {
      if (__DEV__) {
        console.warn('[schedule] Falha ao carregar agendamentos:', err);
      }
    } finally {
      setIsLoadingAppointments(false);
    }
  }, []);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // Busca o primeiro personal e seus dias desabilitados para bloquear o calendário
  useEffect(() => {
    let isMounted = true;
    async function loadPersonalAvailability() {
      try {
        const res = await getPersonalList();
        const rawContent = res.data?.content || res.data;
        if (!isMounted || !Array.isArray(rawContent) || rawContent.length === 0) return;

        const firstPersonal = rawContent[0];
        const pid = firstPersonal.id as number;
        if (!pid) return;

        if (isMounted) setPersonalId(pid);

        const daysRes = await disabledPersonalDays(pid);
        const daysData = daysRes.data;
        const daysList = Array.isArray(daysData) ? daysData : daysData?.content ?? [];

        // Filtra os dias em que o personal NÃO trabalha (ativo === false)
        const inactiveDays: string[] = Array.from(
          new Set(
            daysList
              .filter((d: { ativo: boolean; diaSemana: string }) => !d.ativo)
              .map((d: { ativo: boolean; diaSemana: string }) => d.diaSemana.toLowerCase())
          )
        );

        if (isMounted) setDisabledWeekdays(inactiveDays);
      } catch {
        // falha silenciosa — calendário sem restrições de dia
      }
    }

    loadPersonalAvailability();
    return () => {
      isMounted = false;
    };
  }, []);

  // Checa disponibilidade dos próximos 14 dias para o personal e bloqueia datas sem horários
  useEffect(() => {
    let isMounted = true;
    async function checkUpcomingAvailability() {
      if (!personalId) return;

      const datesToDisable: string[] = [];
      const base = new Date();
      const promises = [];

      for (let i = 1; i <= 14; i++) {
        const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayStr = String(d.getDate()).padStart(2, '0');
        const isoDate = `${y}-${m}-${dayStr}`;

        const WEEKDAY_PT: Record<number, string> = {
          0: 'domingo',
          1: 'segunda',
          2: 'terca',
          3: 'quarta',
          4: 'quinta',
          5: 'sexta',
          6: 'sabado',
        };
        const weekday = WEEKDAY_PT[d.getDay()];
        if (disabledWeekdays.includes(weekday)) continue;

        promises.push(
          getPersonalHours(personalId, isoDate, 'PRESENCIAL')
            .then((res) => {
              const hours = res.data;
              if (!Array.isArray(hours) || hours.length === 0) {
                datesToDisable.push(isoDate);
              }
            })
            .catch(() => {})
        );
      }

      await Promise.all(promises);
      if (isMounted && datesToDisable.length > 0) {
        setUnavailableDates((prev) => Array.from(new Set([...prev, ...datesToDisable])));
      }
    }

    checkUpcomingAvailability();
    return () => {
      isMounted = false;
    };
  }, [personalId, disabledWeekdays]);

  // Verifica regra de 24 horas e disponibilidade horária antes de abrir o modal de agendamento
  async function handleOpenNewEvent() {
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const selDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());

    // 1. Validação de 24 horas: o aluno só pode agendar com antecedência mínima de 24h (a partir de amanhã)
    if (selDate.getTime() <= todayStart.getTime()) {
      Alert.alert(
        'Antecedência mínima',
        'Aulas só podem ser agendadas com pelo menos 24 horas de antecedência. Selecione uma data a partir de amanhã.',
      );
      return;
    }

    // 2. Validação de dias da semana em que o personal não atende
    const WEEKDAY_PT: Record<number, string> = {
      0: 'domingo',
      1: 'segunda',
      2: 'terca',
      3: 'quarta',
      4: 'quinta',
      5: 'sexta',
      6: 'sabado',
    };
    const weekday = WEEKDAY_PT[selectedDate.getDay()];
    if (disabledWeekdays.includes(weekday)) {
      Alert.alert(
        'Personal indisponível',
        'O personal não atende neste dia da semana. Selecione outro dia disponível no calendário.',
      );
      return;
    }

    if (!personalId) {
      setNewEventVisible(true);
      return;
    }

    // 3. Validação de disponibilidade de horários livres no backend
    setCheckingAvailability(true);
    try {
      const res = await getPersonalHours(personalId, selectedDateISO, 'PRESENCIAL');
      const hours = res.data;
      const hasHours = Array.isArray(hours) && hours.length > 0;

      if (!hasHours) {
        Alert.alert(
          'Sem disponibilidade',
          'O personal não possui horários disponíveis para esta data. Selecione outro dia no calendário.',
        );
        return;
      }

      setNewEventVisible(true);
    } catch {
      // Em caso de erro na verificação, permite abrir para não bloquear o usuário
      setNewEventVisible(true);
    } finally {
      setCheckingAvailability(false);
    }
  }

  const selectedDateISO = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const day = String(selectedDate.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }, [selectedDate]);

  const filteredAppointments = useMemo(
    () =>
      appointments.filter((item) => {
        const date = new Date(item.start);
        return isSameDay(date, selectedDate);
      }),
    [appointments, selectedDate],
  );

  // Usa SEMPRE os eventos do endpoint /agendamentos/calendario para os dots do calendário.
  // Os appointments completos são usados apenas na lista e popup do dia selecionado.
  const calendarEvents: CalendarEvent[] = calendarDotEvents;

  async function handleAccept(id: number) {
    try {
      await acceptUserAppointment(id);
      Alert.alert('Sucesso', 'Agendamento aprovado com sucesso!');
      await loadAppointments();
      void queryClient.invalidateQueries({ queryKey: ['overview'] });
    } catch {
      Alert.alert('Erro', 'Não foi possível aprovar o agendamento.');
    }
  }

  async function handleRefuse(id: number) {
    Alert.alert(
      'Cancelar agendamento',
      'Tem certeza que deseja cancelar esta solicitação?',
      [
        { text: 'Voltar', style: 'cancel' },
        {
          text: 'Sim, cancelar',
          style: 'destructive',
          onPress: async () => {
            try {
              await refuseAppointment(id);
              Alert.alert('Sucesso', 'Agendamento cancelado com sucesso.');
              await loadAppointments();
              void queryClient.invalidateQueries({ queryKey: ['overview'] });
            } catch {
              Alert.alert('Erro', 'Não foi possível cancelar o agendamento.');
            }
          },
        },
      ]
    );
  }

  async function handleNewEventSubmit(payload?: NewEventPayload) {
    setNewEventVisible(false);
    await loadAppointments();
    void queryClient.invalidateQueries({ queryKey: ['overview'] });
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screenContent}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <View>
              <Text style={styles.sectionTitle}>Meus agendamentos</Text>
            </View>
            <TouchableOpacity
              style={styles.bellButton}
              onPress={() => setIsNotificationModalVisible(true)}
              activeOpacity={0.8}
            >
              <Bell size={20} color="#19587A" />
              {unreadCount > 0 && (
                <View style={styles.headerBadge}>
                  <Text style={styles.headerBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          <View style={styles.calendarCard}>
            <MonthlyCalendar
              currentMonth={currentMonth}
              selectedDate={selectedDate}
              onDateSelect={(date, dateStr) => {
                setSelectedDate(date);
                const dayAppts = appointments.filter((item) => isSameDay(new Date(item.start), date));
                if (dayAppts.length > 0) {
                  const mapped: PopupAppointment[] = dayAppts.map((item) => ({
                    id: item.id,
                    agendamentoId: item.agendamentoId,
                    name: item.name,
                    type: item.type,
                    start: item.start,
                    end: item.end,
                    address: item.address,
                    status: item.status,
                  }));
                  setPopupDate(dateStr);
                  setPopupAppointments(mapped);
                  setPopupModalVisible(true);
                }
              }}
              onMonthChange={setCurrentMonth}
              calendarEvents={calendarEvents}
              disabledDays={disabledWeekdays}
              disabledDates={unavailableDates}
            />

            <TouchableOpacity
              style={[styles.primaryButton, checkingAvailability && { opacity: 0.7 }]}
              onPress={handleOpenNewEvent}
              activeOpacity={0.9}
              disabled={checkingAvailability}
            >
              {checkingAvailability ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Plus size={18} color="#FFFFFF" />
              )}
              <Text style={styles.primaryButtonText}>
                {checkingAvailability ? 'Verificando...' : 'Agendar'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{formatDateLabel(selectedDate)}</Text>
          </View>

          {isLoadingAppointments ? (
            <View style={styles.emptyState}>
              <ActivityIndicator size="small" color="#19587A" />
            </View>
          ) : filteredAppointments.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Nenhum horário neste dia</Text>
              <Text style={styles.emptyDescription}>
                Use o botão Agendar para adicionar um novo compromisso.
              </Text>
              <TouchableOpacity
                style={[styles.emptyScheduleButton, checkingAvailability && { opacity: 0.7 }]}
                onPress={handleOpenNewEvent}
                activeOpacity={0.9}
                disabled={checkingAvailability}
              >
                {checkingAvailability ? (
                  <ActivityIndicator size="small" color="#19587A" />
                ) : (
                  <Plus size={16} color="#19587A" />
                )}
                <Text style={styles.emptyScheduleButtonText}>
                  {checkingAvailability ? 'Verificando...' : 'Agendar aula'}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            filteredAppointments.map((item) => {
              const statusStyle = getStatusStyle(item.status);
              const startDate = new Date(item.start);
              const endDate = new Date(item.end);

              return (
                <View key={item.id} style={styles.card}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.background }]}>
                      <Text style={[styles.statusText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
                    </View>
                  </View>

                  <View style={styles.metaRow}>
                    <Text style={styles.metaBold}>{item.type}</Text>
                  </View>

                  <View style={styles.metaRow}>
                    <Clock3 size={16} color="#667085" />
                    <Text style={styles.metaText}>
                      {formatTimeLabel(startDate)} - {formatTimeLabel(endDate)}
                    </Text>
                  </View>

                  <View style={styles.metaRow}>
                    <MapPin size={16} color="#667085" />
                    <Text style={styles.metaText}>{item.address}</Text>
                  </View>

                  <View style={styles.actionRow}>
                    {/* Aluno s\u00f3 age quando o personal enviou pedido ao cliente */}
                    {item.status === 'PENDENTE_CLIENTE_APROVACAO' && (
                      <>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.successAction]}
                          activeOpacity={0.9}
                          onPress={() => handleAccept(item.agendamentoId)}
                        >
                          <Check size={16} color="#127B49" />
                          <Text style={[styles.actionText, styles.successText]}>Aceitar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.actionButton, styles.dangerAction]}
                          activeOpacity={0.9}
                          onPress={() => handleRefuse(item.agendamentoId)}
                        >
                          <X size={16} color="#B42318" />
                          <Text style={[styles.actionText, styles.dangerText]}>Cancelar</Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {(item.status === 'APROVADO' || item.status === 'PENDENTE_PERSONAL_CONCLUIR') && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.secondaryAction]}
                        activeOpacity={0.9}
                        onPress={() => setSelectedDetailsAppointment(item)}
                      >
                        <ArrowRight size={16} color="#19587A" />
                        <Text style={[styles.actionText, styles.secondaryText]}>Ver detalhes</Text>
                      </TouchableOpacity>
                    )}

                    {item.status === 'CONCLUIDO' && (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.secondaryAction]}
                        activeOpacity={0.9}
                        onPress={() => setSelectedDetailsAppointment(item)}
                      >
                        <ArrowRight size={16} color="#19587A" />
                        <Text style={[styles.actionText, styles.secondaryText]}>Resumo</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* QR de Aprovação abaixo de Ver detalhes */}
                  {(item.status === 'APROVADO' || item.status === 'PENDENTE_PERSONAL_CONCLUIR') && (
                    <View style={styles.qrCardSection}>
                      <View style={styles.qrCardHeader}>
                        <View style={styles.qrIconBadge}>
                          <QrCode size={16} color="#19587A" />
                        </View>
                        <View style={styles.qrHeaderTextCol}>
                          <Text style={styles.qrCardTitle}>QR Code de Aprovação</Text>
                          <Text style={styles.qrCardSubtitle}>
                            Mostre ao personal no final da aula para concluir o treino
                          </Text>
                        </View>
                      </View>

                      <TouchableOpacity
                        style={styles.qrCodeBox}
                        activeOpacity={0.85}
                        onPress={() => setSelectedQrAppointment(toQrAppointment(item))}
                      >
                        <View style={styles.qrCodeInnerWrapper}>
                          <QRCode
                            value={JSON.stringify({ agendamentoId: item.agendamentoId })}
                            size={140}
                            color="#0F172A"
                            backgroundColor="#FFFFFF"
                          />
                        </View>
                        <View style={styles.qrExpandButton}>
                          <Maximize2 size={13} color="#19587A" />
                          <Text style={styles.qrExpandButtonText}>Toque para ampliar</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </ScrollView>

        <BottomTabBar activeTab="schedule" onTabPress={() => {}} />
      </View>

      {/* Modal de Agendamento real via NewEvent */}
      <NewEvent
        key={`${newEventVisible}-${selectedDateISO}`}
        visible={newEventVisible}
        initialDate={selectedDateISO}
        onClose={() => setNewEventVisible(false)}
        onSubmit={handleNewEventSubmit}
      />

      {/* Modal de Detalhes do Agendamento */}
      <Modal
        transparent
        animationType="fade"
        visible={!!selectedDetailsAppointment}
        onRequestClose={() => setSelectedDetailsAppointment(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.detailsHeader}>
              <Text style={styles.modalTitle}>Detalhes do Agendamento</Text>
              <TouchableOpacity
                onPress={() => setSelectedDetailsAppointment(null)}
                style={styles.detailsCloseBtn}
              >
                <X size={18} color="#667085" />
              </TouchableOpacity>
            </View>

            {selectedDetailsAppointment && (
              <>
                <View style={styles.detailsBody}>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>Personal:</Text>
                    <Text style={styles.detailsValue}>{selectedDetailsAppointment.name}</Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>Modalidade:</Text>
                    <Text style={styles.detailsValue}>{selectedDetailsAppointment.type}</Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>Data:</Text>
                    <Text style={styles.detailsValue}>
                      {formatDateLabel(new Date(selectedDetailsAppointment.start))}
                    </Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>Horário:</Text>
                    <Text style={styles.detailsValue}>
                      {formatTimeLabel(new Date(selectedDetailsAppointment.start))} -{' '}
                      {formatTimeLabel(new Date(selectedDetailsAppointment.end))}
                    </Text>
                  </View>
                  <View style={styles.detailsRow}>
                    <Text style={styles.detailsLabel}>Local:</Text>
                    <Text style={styles.detailsValue}>{selectedDetailsAppointment.address}</Text>
                  </View>
                </View>

                {(selectedDetailsAppointment.status === 'APROVADO' ||
                  selectedDetailsAppointment.status === 'PENDENTE_PERSONAL_CONCLUIR') && (
                  <TouchableOpacity
                    style={styles.detailsQrBtn}
                    onPress={() => {
                      const appt = selectedDetailsAppointment;
                      setSelectedDetailsAppointment(null);
                      setSelectedQrAppointment(toQrAppointment(appt));
                    }}
                    activeOpacity={0.9}
                  >
                    <QrCode size={18} color="#FFFFFF" />
                    <Text style={styles.detailsQrBtnText}>Ver QR Code de Aprovação</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.modalSecondary}
                  onPress={() => setSelectedDetailsAppointment(null)}
                  activeOpacity={0.9}
                >
                  <Text style={styles.modalSecondaryText}>Fechar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Modal com QR Code ampliado para escaneamento */}
      <QRCodeDisplayModal
        visible={!!selectedQrAppointment}
        appointment={selectedQrAppointment}
        onClose={() => setSelectedQrAppointment(null)}
      />

      <NotificationCenterModal
        visible={isNotificationModalVisible}
        onClose={() => setIsNotificationModalVisible(false)}
      />

      {/* PopupModal com agendamentos do dia */}
      <PopupModal
        visible={popupModalVisible}
        date={popupDate}
        appointments={popupAppointments}
        canCreateNewEvent={true}
        onClose={() => setPopupModalVisible(false)}
        onNewEvent={() => {
          setPopupModalVisible(false);
          handleOpenNewEvent();
        }}
        onAccept={handleAccept}
        onRefuse={handleRefuse}
        onViewDetails={(item) => {
          const appt = appointments.find((a) => a.agendamentoId === item.agendamentoId);
          if (appt) {
            setSelectedDetailsAppointment(appt);
            setPopupModalVisible(false);
          }
        }}
        onShowQrCode={(item) => {
          const appt = appointments.find((a) => a.agendamentoId === item.agendamentoId);
          if (appt) {
            setSelectedQrAppointment(toQrAppointment(appt));
            setPopupModalVisible(false);
          }
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  screenContent: {
    flex: 1,
    position: 'relative',
  },
  container: {
    padding: 20,
    paddingBottom: 96,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  bellButton: {
    position: 'relative',
    padding: 8,
    borderRadius: 12,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 999,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  headerBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  sectionLabel: {
    color: '#19587A',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    marginTop: 4,
    color: '#0F172A',
    fontSize: 26,
    fontWeight: '700',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#19587A',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    marginTop: 18,
    alignSelf: 'center',
    minWidth: 160,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  sectionHeader: {
    marginTop: 20,
    marginBottom: 12,
  },
  sectionHeaderText: {
    color: '#1F2937',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    color: '#4B5563',
    fontSize: 14,
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
  },
  emptyDescription: {
    color: '#667085',
    fontSize: 14,
    textAlign: 'center',
  },
  emptyScheduleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    backgroundColor: '#EEF4FF',
  },
  emptyScheduleButtonText: {
    color: '#19587A',
    fontSize: 14,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  statusText: {
    fontWeight: '700',
    fontSize: 11,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  metaBold: {
    color: '#1F2937',
    fontWeight: '700',
    fontSize: 14,
  },
  metaText: {
    color: '#475467',
    fontSize: 13,
    flexShrink: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flex: 1,
    minWidth: 120,
  },
  successAction: {
    backgroundColor: '#EAFBF1',
  },
  dangerAction: {
    backgroundColor: '#FDECEC',
  },
  secondaryAction: {
    backgroundColor: '#EEF4FF',
  },
  actionText: {
    fontWeight: '700',
    fontSize: 13,
  },
  successText: {
    color: '#127B49',
  },
  dangerText: {
    color: '#B42318',
  },
  secondaryText: {
    color: '#19587A',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.48)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
  },
  modalTitle: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  modalText: {
    color: '#475467',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  scheduleInfo: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  scheduleInfoLabel: {
    color: '#6B7280',
    fontSize: 12,
    marginBottom: 4,
  },
  scheduleInfoValue: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 8,
  },
  modalSecondary: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#EEF2F7',
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalSecondaryText: {
    color: '#334155',
    fontWeight: '700',
  },
  modalPrimary: {
    flex: 1,
    borderRadius: 12,
    backgroundColor: '#19587A',
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  qrCardSection: {
    marginTop: 14,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qrCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  qrIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrHeaderTextCol: {
    flex: 1,
  },
  qrCardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  qrCardSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
    lineHeight: 15,
  },
  qrCodeBox: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  qrCodeInnerWrapper: {
    padding: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
  },
  qrExpandButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#EEF4FF',
  },
  qrExpandButtonText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#19587A',
  },
  detailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  detailsCloseBtn: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  detailsBody: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  detailsLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  detailsValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
    flexShrink: 1,
    textAlign: 'right',
  },
  detailsQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#19587A',
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 10,
  },
  detailsQrBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});