import { useMemo, useState } from 'react';
import {
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  MapPin,
  Plus,
  X,
} from 'lucide-react-native';
import BottomTabBar from '../components/BottomTabBar';

type AppointmentStatus = 'PENDENTE' | 'APROVADO' | 'CANCELADO' | 'CONCLUIDO';

type Appointment = {
  id: number;
  name: string;
  type: string;
  start: string;
  end: string;
  address: string;
  status: AppointmentStatus;
};

const SAMPLE_APPOINTMENTS: Appointment[] = [
  {
    id: 1,
    name: 'Fabio Costa',
    type: 'Personal',
    start: '2026-08-23T08:00:00',
    end: '2026-08-23T09:00:00',
    address: 'Rua Alberto Almeida, 23 - Centro',
    status: 'APROVADO',
  },
  {
    id: 2,
    name: 'Fernanda Souza',
    type: 'Funcional',
    start: '2026-08-25T18:00:00',
    end: '2026-08-25T19:00:00',
    address: 'Academia Prime, Sala 3',
    status: 'PENDENTE',
  },
  {
    id: 3,
    name: 'Rafael Nunes',
    type: 'Residencial',
    start: '2026-08-27T07:30:00',
    end: '2026-08-27T08:15:00',
    address: 'Avenida Paulista, 1500',
    status: 'CONCLUIDO',
  },
];

const dayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function formatDateLabel(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }).format(date);
}

function formatTimeLabel(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
}

function isSameDay(dateA: Date, dateB: Date) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function getMonthMatrix(date: Date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const daysInMonth = lastDay.getDate();
  const totalCells = Math.ceil((daysInMonth + startOffset) / 7) * 7;
  const calendarDays: Array<Date | null> = [];

  for (let i = 0; i < totalCells; i += 1) {
    const dayNumber = i - startOffset + 1;
    const cellDate = dayNumber > 0 && dayNumber <= daysInMonth ? new Date(year, month, dayNumber) : null;
    calendarDays.push(cellDate);
  }

  return calendarDays;
}

function getStatusStyle(status: AppointmentStatus) {
  switch (status) {
    case 'APROVADO':
      return { label: 'Aprovado', background: '#EAFBF1', color: '#127B49' };
    case 'PENDENTE':
      return { label: 'Pendente', background: '#FFF6D9', color: '#8A6300' };
    case 'CANCELADO':
      return { label: 'Cancelado', background: '#FDECEC', color: '#B42318' };
    case 'CONCLUIDO':
      return { label: 'Concluído', background: '#EEF4FF', color: '#1D4ED8' };
    default:
      return { label: 'Sem status', background: '#F3F4F6', color: '#374151' };
  }
}

export default function ScheduleScreen() {
  const today = useMemo(() => new Date(), []);
  const [selectedDate, setSelectedDate] = useState(new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  const [currentMonth, setCurrentMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [appointments] = useState<Appointment[]>(SAMPLE_APPOINTMENTS);
  const [isModalVisible, setIsModalVisible] = useState(false);

  const filteredAppointments = useMemo(
    () =>
      appointments.filter((item) => {
        const date = new Date(item.start);
        return isSameDay(date, selectedDate);
      }),
    [appointments, selectedDate],
  );

  const monthDays = useMemo(() => getMonthMatrix(currentMonth), [currentMonth]);

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screenContent}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <View>
              <Text style={styles.sectionLabel}>Agenda</Text>
              <Text style={styles.sectionTitle}>Meus agendamentos</Text>
            </View>
          </View>

          <View style={styles.calendarCard}>
          <View style={styles.monthHeader}>
            <TouchableOpacity onPress={goToPreviousMonth} style={styles.arrowButton} activeOpacity={0.8}>
              <ChevronLeft size={18} color="#1F2937" />
            </TouchableOpacity>

            <View style={styles.monthTitleWrap}>
              <CalendarDays size={18} color="#1C6AAB" />
              <Text style={styles.monthTitle}>{formatMonthLabel(currentMonth)}</Text>
            </View>

            <TouchableOpacity onPress={goToNextMonth} style={styles.arrowButton} activeOpacity={0.8}>
              <ChevronRight size={18} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <View style={styles.weekRow}>
            {dayLabels.map((label) => (
              <Text key={label} style={styles.weekLabel}>{label}</Text>
            ))}
          </View>

          <View style={styles.dayGrid}>
            {monthDays.map((value, index) => {
              if (!value) {
                return <View key={`empty-${index}`} style={styles.emptyCell} />;
              }

              const isSelected = isSameDay(value, selectedDate);
              const isCurrentMonth = value.getMonth() === currentMonth.getMonth();
              const hasEvent = appointments.some((item) => isSameDay(new Date(item.start), value));

              return (
                <Pressable
                  key={value.toISOString()}
                  style={[styles.dayCell, isSelected && styles.dayCellSelected, !isCurrentMonth && styles.dayCellMuted]}
                  onPress={() => setSelectedDate(value)}
                >
                  <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>{value.getDate()}</Text>
                  {hasEvent && <View style={styles.dayDot} />}
                </Pressable>
              );
            })}
          </View>

          <TouchableOpacity style={styles.primaryButton} onPress={() => setIsModalVisible(true)} activeOpacity={0.9}>
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.primaryButtonText}>Agendar</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={styles.sectionHeaderText}>{formatDateLabel(selectedDate)}</Text>
        </View>

          {filteredAppointments.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>Nenhum horário neste dia</Text>
              <Text style={styles.emptyDescription}>Use o botão Agendar para adicionar um novo compromisso.</Text>
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
                    {item.status === 'PENDENTE' && (
                      <>
                        <TouchableOpacity style={[styles.actionButton, styles.successAction]} activeOpacity={0.9}>
                          <Check size={16} color="#127B49" />
                          <Text style={[styles.actionText, styles.successText]}>Aceitar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.actionButton, styles.dangerAction]} activeOpacity={0.9}>
                          <X size={16} color="#B42318" />
                          <Text style={[styles.actionText, styles.dangerText]}>Cancelar</Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {item.status === 'APROVADO' && (
                      <TouchableOpacity style={[styles.actionButton, styles.secondaryAction]} activeOpacity={0.9}>
                        <ArrowRight size={16} color="#1C6AAB" />
                        <Text style={[styles.actionText, styles.secondaryText]}>Ver detalhes</Text>
                      </TouchableOpacity>
                    )}

                    {item.status === 'CONCLUIDO' && (
                      <TouchableOpacity style={[styles.actionButton, styles.secondaryAction]} activeOpacity={0.9}>
                        <ArrowRight size={16} color="#1C6AAB" />
                        <Text style={[styles.actionText, styles.secondaryText]}>Resumo</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>

        <BottomTabBar activeTab="schedule" onTabPress={() => {}} />
      </View>

      <Modal transparent animationType="slide" visible={isModalVisible} onRequestClose={() => setIsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Agendar horário</Text>
            <Text style={styles.modalText}>Selecione um horário e confirme a solicitação de agendamento.</Text>

            <View style={styles.scheduleInfo}>
              <Text style={styles.scheduleInfoLabel}>Data</Text>
              <Text style={styles.scheduleInfoValue}>{formatDateLabel(selectedDate)}</Text>
            </View>

            <View style={styles.scheduleInfo}>
              <Text style={styles.scheduleInfoLabel}>Horário sugerido</Text>
              <Text style={styles.scheduleInfoValue}>18:00 - 19:00</Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalSecondary} onPress={() => setIsModalVisible(false)} activeOpacity={0.9}>
                <Text style={styles.modalSecondaryText}>Fechar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalPrimary}
                onPress={() => {
                  setIsModalVisible(false);
                  // TODO: ir para tela detalhes
                }}
                activeOpacity={0.9}
              >
                <Text style={styles.modalPrimaryText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  sectionLabel: {
    color: '#1C6AAB',
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
    backgroundColor: '#1C6AAB',
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
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  arrowButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: '#EEF4FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  monthTitleWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  monthTitle: {
    color: '#0F172A',
    fontSize: 17,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  weekLabel: {
    flex: 1,
    color: '#6B7280',
    fontWeight: '600',
    fontSize: 11,
    textAlign: 'center',
  },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyCell: {
    width: `${100 / 7}%`,
    height: 46,
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 2,
  },
  dayCellSelected: {
    backgroundColor: '#1C6AAB',
  },
  dayCellMuted: {
    opacity: 0.35,
  },
  dayNumber: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 14,
  },
  dayNumberSelected: {
    color: '#FFFFFF',
  },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F59E0B',
    marginTop: 4,
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
    color: '#1C6AAB',
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
    backgroundColor: '#1C6AAB',
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalPrimaryText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
