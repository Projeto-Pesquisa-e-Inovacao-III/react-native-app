import React, { useMemo, useState, useEffect } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from 'react-native';
import {
  CalendarDays,
  Clock3,
  MapPin,
  Plus,
  X,
  Check,
  RefreshCw,
  QrCode,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react-native';
import { findPersonalRequests } from '../../constants/schedule';

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
  onReschedule?: (item: PopupAppointment) => void;
  onViewDetails?: (item: PopupAppointment) => void;
  onShowQrCode?: (item: PopupAppointment) => void;
  isAluno?: boolean;
  isPersonal?: boolean;
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

const PAGE_SIZE = 3;

export default function PopupModal({
  visible,
  date,
  appointments = [],
  onClose,
  onNewEvent,
  canCreateNewEvent = true,
  onAccept,
  onRefuse,
  onReschedule,
  onViewDetails,
  onShowQrCode,
  isAluno = true,
  isPersonal = false,
}: PopupModalProps) {
  const formattedTitleDate = useMemo(() => formatDateLong(date), [date]);

  const [page, setPage] = useState(0);
  const [personalItems, setPersonalItems] = useState<PopupAppointment[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [loadingPersonal, setLoadingPersonal] = useState(false);

  useEffect(() => {
    if (visible) {
      setPage(0);
    }
  }, [visible, date]);

  // Se for personal, busca todas as solicitações do dia via API com paginação de 3 em 3
  useEffect(() => {
    if (!visible || !isPersonal || !date) return;
    let isMounted = true;
    setLoadingPersonal(true);

    const initialDateParam = `${date}T00:00:00`;
    const finalDateParam = `${date}T23:59:59`;

    findPersonalRequests(page, '3', initialDateParam, finalDateParam)
      .then((res) => {
        if (!isMounted) return;
        const content = res.data?.content || [];
        const pageInfo = res.data?.page;
        const mapped: PopupAppointment[] = content.map((item: any) => {
          const addr = [
            item.endereco?.cep?.logradouro,
            item.endereco?.numero,
            item.endereco?.complemento,
            item.endereco?.cep?.bairro,
            item.endereco?.cep?.localidade,
          ].filter(Boolean).join(', ') || [
            item.endereco?.cep?.logradouro,
            item.endereco?.numero,
            item.endereco?.cep?.bairro,
            item.endereco?.cep?.uf,
          ].filter(Boolean).join(' - ') || 'Endereço não informado';

          return {
            id: item.agendamentoId,
            agendamentoId: item.agendamentoId,
            name: item.nome || 'Aluno',
            type: item.tipoAula || 'Aula',
            start: item.dataInicio,
            end: item.dataFim || item.dataInicio,
            address: addr,
            status: item.status,
            photoUrl: item.foto,
          };
        });

        setPersonalItems(mapped);
        setTotalPages(pageInfo?.totalPages || (mapped.length > 0 ? Math.ceil(mapped.length / PAGE_SIZE) : 1));
        setTotalElements(pageInfo?.totalElements ?? mapped.length);
      })
      .catch(() => {
        if (isMounted) {
          setPersonalItems([]);
          setTotalPages(1);
          setTotalElements(0);
        }
      })
      .finally(() => {
        if (isMounted) setLoadingPersonal(false);
      });

    return () => {
      isMounted = false;
    };
  }, [visible, isPersonal, date, page]);

  // Paginação client-side caso não seja personal (visão do aluno)
  const effectiveTotalPages = isPersonal
    ? totalPages
    : Math.max(1, Math.ceil(appointments.length / PAGE_SIZE));

  const effectiveTotalElements = isPersonal
    ? totalElements
    : appointments.length;

  const displayedAppointments = useMemo(() => {
    if (isPersonal) {
      return personalItems;
    }
    const startIdx = page * PAGE_SIZE;
    return appointments.slice(startIdx, startIdx + PAGE_SIZE);
  }, [isPersonal, personalItems, appointments, page]);

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

          {/* Conteúdo: Lista ou Loading */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {loadingPersonal ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#0F567F" />
                <Text style={styles.loadingText}>Carregando agendamentos do dia...</Text>
              </View>
            ) : displayedAppointments.length === 0 ? (
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
              displayedAppointments.map((item) => {
                const statusStyle = getStatusStyle(item.status);
                const startTime = formatTimeOnly(item.start);
                const endTime = formatTimeOnly(item.end);
                const isClientPending = item.status?.toUpperCase() === 'PENDENTE_CLIENTE_APROVACAO';
                const isPersonalPending =
                  item.status?.toUpperCase() === 'PENDENTE_PERSONAL_APROVACAO' ||
                  item.status?.toUpperCase() === 'PENDENTE';
                const isApproved = item.status?.toUpperCase() === 'APROVADO';
                const isPendingConclusion = item.status?.toUpperCase() === 'PENDENTE_PERSONAL_CONCLUIR';
                const isConcluded = item.status?.toUpperCase() === 'CONCLUIDO';
                const hasActions =
                  isClientPending ||
                  isPersonalPending ||
                  isApproved ||
                  isPendingConclusion ||
                  isConcluded;

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
                    {hasActions ? (
                      <View style={styles.actionRow}>
                        {((!isPersonal && isClientPending) || (isPersonal && isPersonalPending)) && onAccept ? (
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.acceptBtn]}
                            onPress={() => onAccept(item.agendamentoId ?? item.id)}
                            activeOpacity={0.8}
                          >
                            <Check size={14} color="#127B49" />
                            <Text style={styles.acceptBtnText}>Aceitar</Text>
                          </TouchableOpacity>
                        ) : null}

                        {(isClientPending || isPersonalPending || isApproved) && onReschedule ? (
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.rescheduleBtn]}
                            onPress={() => onReschedule(item)}
                            activeOpacity={0.8}
                          >
                            <RefreshCw size={13} color="#19587A" />
                            <Text style={styles.rescheduleBtnText}>Reagendar</Text>
                          </TouchableOpacity>
                        ) : null}

                        {(isClientPending || isPersonalPending || isApproved) && onRefuse ? (
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.refuseBtn]}
                            onPress={() => onRefuse(item.agendamentoId ?? item.id)}
                            activeOpacity={0.8}
                          >
                            <X size={14} color="#B42318" />
                            <Text style={styles.refuseBtnText}>Cancelar</Text>
                          </TouchableOpacity>
                        ) : null}

                        {/* QR Code apenas para o Aluno! */}
                        {isAluno && (isApproved || isPendingConclusion) && onShowQrCode ? (
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.qrBtn]}
                            onPress={() => onShowQrCode(item)}
                            activeOpacity={0.8}
                          >
                            <QrCode size={14} color="#19587A" />
                            <Text style={styles.qrBtnText}>QR Code</Text>
                          </TouchableOpacity>
                        ) : null}

                        {isConcluded && onViewDetails ? (
                          <TouchableOpacity
                            style={[styles.actionBtn, styles.rescheduleBtn]}
                            onPress={() => onViewDetails(item)}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.rescheduleBtnText}>Ver resumo</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                    ) : null}
                  </View>
                );
              })
            )}
          </ScrollView>

          {/* Paginação se houver mais de 3 agendamentos no dia */}
          {effectiveTotalPages > 1 && (
            <View style={styles.paginationContainer}>
              <TouchableOpacity
                style={[styles.pageNavBtn, page === 0 && styles.pageNavBtnDisabled]}
                onPress={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                activeOpacity={0.7}
              >
                <ChevronLeft size={18} color={page === 0 ? '#94A3B8' : '#0F567F'} />
              </TouchableOpacity>

              <View style={styles.pageIndicatorWrap}>
                <Text style={styles.pageIndicatorText}>
                  Página <Text style={styles.pageIndicatorCurrent}>{page + 1}</Text> de {effectiveTotalPages}
                </Text>
                {effectiveTotalElements > 0 && (
                  <Text style={styles.pageTotalElements}>({effectiveTotalElements} agendamentos no dia)</Text>
                )}
              </View>

              <TouchableOpacity
                style={[styles.pageNavBtn, page >= effectiveTotalPages - 1 && styles.pageNavBtnDisabled]}
                onPress={() => setPage((p) => Math.min(effectiveTotalPages - 1, p + 1))}
                disabled={page >= effectiveTotalPages - 1}
                activeOpacity={0.7}
              >
                <ChevronRight size={18} color={page >= effectiveTotalPages - 1 ? '#94A3B8' : '#0F567F'} />
              </TouchableOpacity>
            </View>
          )}

          {/* Botão Novo Agendamento (apenas para o Aluno) */}
          {isAluno && isEligibleForBooking && onNewEvent ? (
            <TouchableOpacity
              style={styles.newEventButton}
              onPress={onNewEvent}
              activeOpacity={0.85}
            >
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.newEventButtonText}>Novo agendamento para este dia</Text>
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
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 24,
    paddingHorizontal: 18,
    paddingTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    alignSelf: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
  },
  scrollView: {
    marginTop: 10,
    maxHeight: 420,
  },
  scrollContent: {
    paddingBottom: 8,
    gap: 10,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 36,
  },
  emptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 6,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  personalName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  classType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#19587A',
    marginTop: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: '#475569',
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    gap: 4,
  },
  acceptBtn: {
    backgroundColor: '#EAFBF1',
  },
  acceptBtnText: {
    color: '#127B49',
    fontSize: 12,
    fontWeight: '700',
  },
  rescheduleBtn: {
    backgroundColor: '#EFF6FF',
  },
  rescheduleBtnText: {
    color: '#19587A',
    fontSize: 12,
    fontWeight: '700',
  },
  refuseBtn: {
    backgroundColor: '#FDECEC',
  },
  refuseBtnText: {
    color: '#B42318',
    fontSize: 12,
    fontWeight: '700',
  },
  qrBtn: {
    backgroundColor: '#E0F2FE',
  },
  qrBtnText: {
    color: '#0369A1',
    fontSize: 12,
    fontWeight: '700',
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 6,
    marginTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  pageNavBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageNavBtnDisabled: {
    backgroundColor: '#F8FAFC',
    opacity: 0.4,
  },
  pageIndicatorWrap: {
    alignItems: 'center',
  },
  pageIndicatorText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '600',
  },
  pageIndicatorCurrent: {
    color: '#0F567F',
    fontWeight: '800',
  },
  pageTotalElements: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  newEventButton: {
    backgroundColor: '#0F567F',
    borderRadius: 14,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
  },
  newEventButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
