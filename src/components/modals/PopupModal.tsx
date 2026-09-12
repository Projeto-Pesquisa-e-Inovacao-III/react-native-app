import React, { useMemo } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  CalendarDays,
  Clock3,
  MapPin,
  Plus,
  X,
  Check,
} from 'lucide-react-native';

export type PopupAppointment = {
  id: number;
  agendamentoId?: number;
  name: string;
  type: string;
  start: string;
  end: string;
  address: string;
  status: string;
  photoUrl?: string;
};

type PopupModalProps = {
  visible: boolean;
  date: string; // Formato YYYY-MM-DD
  appointments?: PopupAppointment[];
  onClose: () => void;
  onNewEvent?: () => void;
  canCreateNewEvent?: boolean;
  onAccept?: (id: number) => void;
  onRefuse?: (id: number) => void;
  onViewDetails?: (item: PopupAppointment) => void;
  onShowQrCode?: (item: PopupAppointment) => void;
};

function formatDateLong(dateStr: string) {
  if (!dateStr) return '';
  const parts = dateStr.split('T')[0].split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 12, 0, 0);
  if (Number.isNaN(d.getTime())) return dateStr;

  const formatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(d);

  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

function formatTimeOnly(dateStr: string) {
  if (!dateStr) return '';
  if (dateStr.includes('T')) {
    return dateStr.split('T')[1].substring(0, 5);
  }
  const parts = dateStr.split(' ');
  if (parts.length > 1) {
    return parts[1].substring(0, 5);
  }
  return dateStr;
}

function getStatusStyle(status?: string) {
  const s = (status || '').toUpperCase();
  if (s === 'APROVADO' || s === 'CONCLUIDO') {
    return { label: 'Aprovado', bg: '#EAFBF1', text: '#127B49' };
  }
  if (s.includes('PENDENTE')) {
    return { label: 'Pendente', bg: '#FFF6D9', text: '#8A6300' };
  }
  if (s.includes('CANCELADO') || s.includes('AUSENCIA')) {
    return { label: 'Cancelado', bg: '#FDECEC', text: '#B42318' };
  }
  return { label: status || 'Agendado', bg: '#F3F4F6', text: '#374151' };
}

export default function PopupModal({
  visible,
  date,
  appointments = [],
  onClose,
  onNewEvent,
  canCreateNewEvent = true,
  onAccept,
  onRefuse,
  onViewDetails,
  onShowQrCode,
}: PopupModalProps) {
  const formattedTitleDate = useMemo(() => formatDateLong(date), [date]);

  // Regra de 24 horas: não permite criar novo agendamento para hoje ou datas passadas
  const isEligibleForBooking = useMemo(() => {
    if (!canCreateNewEvent || !date) return false;
    const parts = date.split('T')[0].split('-').map(Number);
    if (parts.length !== 3) return false;
    const selDate = new Date(parts[0], parts[1] - 1, parts[2]);
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return selDate.getTime() > todayStart.getTime();
  }, [canCreateNewEvent, date]);

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
          {/* Indicador no topo estilo bottom-sheet */}
          <View style={styles.sheetHandle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.title}>Agendamentos</Text>
              <Text style={styles.subtitle}>{formattedTitleDate}</Text>
            </View>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              hitSlop={12}
              activeOpacity={0.7}
            >
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Lista de agendamentos */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {appointments.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconWrap}>
                  <CalendarDays size={28} color="#94A3B8" />
                </View>
                <Text style={styles.emptyTitle}>Nenhum agendamento</Text>
                <Text style={styles.emptyText}>
                  Não há aulas marcadas para este dia.
                </Text>
              </View>
            ) : (
              appointments.map((item) => {
                const statusStyle = getStatusStyle(item.status);
                const startTime = formatTimeOnly(item.start);
                const endTime = formatTimeOnly(item.end);
                // O aluno só pode aceitar/recusar quando o personal enviou uma solicitação
                // que aguarda aprovação do cliente (PENDENTE_CLIENTE_APROVACAO).
                // PENDENTE_PERSONAL_APROVACAO = o aluno aguarda o personal → sem ação do aluno aqui.
                const isClientPending = item.status?.toUpperCase() === 'PENDENTE_CLIENTE_APROVACAO';

                return (
                  <View key={item.id} style={styles.appointmentCard}>
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.personalName} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={styles.classType}>{item.type}</Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: statusStyle.bg },
                        ]}
                      >
                        <Text style={[styles.statusText, { color: statusStyle.text }]}>
                          {statusStyle.label}
                        </Text>
                      </View>
                    </View>

                    {/* Horário */}
                    {startTime ? (
                      <View style={styles.metaRow}>
                        <Clock3 size={15} color="#64748B" />
                        <Text style={styles.metaText}>
                          {startTime}
                          {endTime && endTime !== startTime ? ` - ${endTime}` : ''}
                        </Text>
                      </View>
                    ) : null}

                    {/* Endereço */}
                    {item.address ? (
                      <View style={styles.metaRow}>
                        <MapPin size={15} color="#64748B" />
                        <Text style={styles.metaText} numberOfLines={2}>
                          {item.address}
                        </Text>
                      </View>
                    ) : null}

                    {/* Ações contextuais */}
                    {isClientPending && (onAccept || onRefuse) ? (
                      <View style={styles.actionRow}>
                        {onAccept ? (
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.acceptBtn]}
                            onPress={() => onAccept(item.agendamentoId ?? item.id)}
                            activeOpacity={0.8}
                          >
                            <Check size={14} color="#127B49" />
                            <Text style={styles.acceptBtnText}>Aceitar</Text>
                          </TouchableOpacity>
                        ) : null}
                        {onRefuse ? (
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.refuseBtn]}
                            onPress={() => onRefuse(item.agendamentoId ?? item.id)}
                            activeOpacity={0.8}
                          >
                            <X size={14} color="#B42318" />
                            <Text style={styles.refuseBtnText}>Cancelar</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Botão de Novo Agendamento (se data for elegível > 24h) */}
          {isEligibleForBooking && onNewEvent ? (
            <TouchableOpacity
              style={styles.newEventButton}
              onPress={() => {
                onClose();
                onNewEvent();
              }}
              activeOpacity={0.9}
            >
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.newEventButtonText}>Novo agendamento</Text>
            </TouchableOpacity>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 32,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 10,
  },
  sheetHandle: {
    width: 44,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E2E8F0',
    alignSelf: 'center',
    marginBottom: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 3,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    maxHeight: 380,
  },
  scrollContent: {
    paddingBottom: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 32,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  appointmentCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  personalName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  classType: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
  },
  acceptBtn: {
    backgroundColor: '#EAFBF1',
  },
  acceptBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#127B49',
  },
  refuseBtn: {
    backgroundColor: '#FDECEC',
  },
  refuseBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B42318',
  },
  newEventButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0F567F',
    borderRadius: 14,
    paddingVertical: 14,
    gap: 8,
    marginTop: 12,
    shadowColor: '#0F567F',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  newEventButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
