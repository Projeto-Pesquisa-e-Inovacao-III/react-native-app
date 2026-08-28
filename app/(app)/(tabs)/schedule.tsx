import { useMemo, useState } from 'react';
import {
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowRight, Check, Clock3, MapPin, Plus, X } from 'lucide-react-native';
import BottomTabBar from '../../../src/components/BottomTabBar';
import MonthlyCalendar from '../../../src/components/MonthlyCalendar';

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
    start: '2026-08-28T07:30:00',
    end: '2026-08-28T08:15:00',
    address: 'Avenida Paulista, 1500',
    status: 'CONCLUIDO',
  },
  {
    id: 4,
    name: 'Rafael Nunes',
    type: 'Residencial',
    start: '2026-08-21T07:30:00',
    end: '2026-08-21T08:15:00',
    address: 'Avenida Paulista, 1500',
    status: 'CONCLUIDO',
  },
];

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

  const appointmentDateKeys = useMemo(() => {
    const keys = new Set<string>();
    appointments.forEach((item) => {
      const date = new Date(item.start);
      keys.add(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
    });
    return keys;
  }, [appointments]);

  const hasEventOnDate = (date: Date) => {
    return appointmentDateKeys.has(`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screenContent}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.topBar}>
            <View>
              <Text style={styles.sectionTitle}>Meus agendamentos</Text>
            </View>
          </View>

          <View style={styles.calendarCard}>
            <MonthlyCalendar
              currentMonth={currentMonth}
              selectedDate={selectedDate}
              onDateSelect={setSelectedDate}
              onMonthChange={setCurrentMonth}
              hasEventOnDate={hasEventOnDate}
            />

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
                        <ArrowRight size={16} color="#19587A" />
                        <Text style={[styles.actionText, styles.secondaryText]}>Ver detalhes</Text>
                      </TouchableOpacity>
                    )}

                    {item.status === 'CONCLUIDO' && (
                      <TouchableOpacity style={[styles.actionButton, styles.secondaryAction]} activeOpacity={0.9}>
                        <ArrowRight size={16} color="#19587A" />
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
});
