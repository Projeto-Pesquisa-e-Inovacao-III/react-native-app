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
import BottomTabBar from '../../../src/components/BottomTabBar';
import MonthlyCalendar from '../../../src/components/MonthlyCalendar';
import { useNotifications } from '../../../src/contexts/NotificationContext';
import NotificationCenterModal from '../../../src/components/modals/NotificationCenterModal';
import QRCodeDisplayModal from '../../../src/components/modals/QRCodeDisplayModal';

type AppointmentStatus =
  | 'PENDENTE'
  | 'APROVADO'
  | 'CANCELADO'
  | 'CONCLUIDO'
  | 'PENDENTE_PERSONAL_CONCLUIR';

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

const now = new Date();
const pad = (n: number) => n.toString().padStart(2, '0');
const todayYear = now.getFullYear();
const todayMonth = pad(now.getMonth() + 1);
const todayDate = pad(now.getDate());
const todayIso = `${todayYear}-${todayMonth}-${todayDate}`;

const SAMPLE_APPOINTMENTS: Appointment[] = [
  {
    id: 101,
    agendamentoId: 101, // deve coincidir com o agendamentoId real da API
    name: 'Fabio Costa',
    type: 'Musculação / Personal',
    start: `${todayIso}T10:00:00`,
    end: `${todayIso}T11:00:00`,
    address: 'Academia CSF - Sala 02',
    status: 'PENDENTE_PERSONAL_CONCLUIR',
  },
  {
    id: 1,
    agendamentoId: 1,
    name: 'Fabio Costa',
    type: 'Personal',
    start: '2026-08-23T08:00:00',
    end: '2026-08-23T09:00:00',
    address: 'Rua Alberto Almeida, 23 - Centro',
    status: 'APROVADO',
  },
  {
    id: 2,
    agendamentoId: 2,
    name: 'Fernanda Souza',
    type: 'Funcional',
    start: '2026-08-25T18:00:00',
    end: '2026-08-25T19:00:00',
    address: 'Academia Prime, Sala 3',
    status: 'PENDENTE',
  },
  {
    id: 3,
    agendamentoId: 3,
    name: 'Rafael Nunes',
    type: 'Residencial',
    start: '2026-08-28T07:30:00',
    end: '2026-08-28T08:15:00',
    address: 'Avenida Paulista, 1500',
    status: 'CONCLUIDO',
  },
  {
    id: 4,
    agendamentoId: 4,
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
    case 'PENDENTE_PERSONAL_CONCLUIR':
      return { label: 'Pendente Conclusão', background: '#FFF4ED', color: '#B43403' };
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
  const [appointments, setAppointments] = useState<Appointment[]>(SAMPLE_APPOINTMENTS);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [isNotificationModalVisible, setIsNotificationModalVisible] = useState(false);
  const [selectedQrAppointment, setSelectedQrAppointment] = useState<Appointment | null>(null);
  const [selectedDetailsAppointment, setSelectedDetailsAppointment] = useState<Appointment | null>(null);
  const { scheduleAppointmentNotification, unreadCount } = useNotifications();

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
                        onPress={() => setSelectedQrAppointment(item)}
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

                  const newAppt: Appointment = {
                    id: Date.now(),
                    agendamentoId: 0, // 0 = ainda não sincronizado com a API
                    name: 'Fabio Costa',
                    type: 'Personal',
                    start: selectedDate.toISOString(),
                    end: new Date(selectedDate.getTime() + 3600000).toISOString(),
                    address: 'Academia / Local a definir',
                    status: 'PENDENTE',
                  };
                  setAppointments((prev) => [newAppt, ...prev]);
                }}
                activeOpacity={0.9}
              >
                <Text style={styles.modalPrimaryText}>Confirmar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
                      setSelectedQrAppointment(appt);
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
