import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  ArrowUpRight,
  Calendar,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  RotateCcw,
  User,
  X,
} from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useRouter } from 'expo-router';
import { findPersonalRequests } from '../../../src/constants/schedule';

export type PersonalScheduleEvent = {
  agendamentoId: number;
  tipoAula: string;
  nome: string;
  idade?: string;
  foto?: string;
  dataInicio: string;
  dataFim: string;
  status: string;
};

const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

function startOfWeek(date: Date) {
  const clone = new Date(date);
  const day = clone.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  clone.setHours(0, 0, 0, 0);
  clone.setDate(clone.getDate() + diff);
  return clone;
}

function formatWeekRange(date: Date) {
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  const formatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' });
  return `${formatter.format(start)} - ${formatter.format(end)}`;
}

function formatHour(dateString: string) {
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '--:--';
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  } catch {
    return '--:--';
  }
}

function formatDateLong(dateString: string) {
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(date);
  } catch {
    return '-';
  }
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
}

function normalizeStatus(status?: string): 'approved' | 'pending' | 'cancelled' | 'completed' {
  if (!status) return 'pending';
  const s = status.toUpperCase();
  if (s === 'APROVADO') return 'approved';
  if (s === 'CONCLUIDO') return 'completed';
  if (s.startsWith('CANCELADO') || s.startsWith('AUSENCIA')) return 'cancelled';
  return 'pending';
}

function getStatusLabel(status?: string): string {
  if (!status) return 'Pendente';
  switch (status.toUpperCase()) {
    case 'APROVADO':
      return 'Aprovado';
    case 'CONCLUIDO':
      return 'Concluído';
    case 'PENDENTE_PERSONAL_APROVACAO':
      return 'Pendente sua aprovação';
    case 'PENDENTE_CLIENTE_APROVACAO':
      return 'Pendente cliente';
    case 'PENDENTE_PERSONAL_CONCLUIR':
      return 'Pendente conclusão';
    case 'CANCELADO_CLIENTE':
      return 'Cancelado pelo aluno';
    case 'CANCELADO_PERSONAL':
      return 'Cancelado por você';
    case 'AUSENCIA_CLIENTE':
      return 'Ausência do aluno';
    case 'AUSENCIA_PERSONAL':
      return 'Ausência do personal';
    default:
      return status;
  }
}

function getStatusColors(status?: string) {
  const normalized = normalizeStatus(status);
  switch (normalized) {
    case 'approved':
      return {
        background: '#E8F7EE',
        border: '#38A169',
        text: '#1C7C54',
        badgeBg: '#C6F6D5',
        badgeText: '#22543D',
      };
    case 'pending':
      return {
        background: '#FFF6DA',
        border: '#D7A300',
        text: '#8A6300',
        badgeBg: '#FEEBC8',
        badgeText: '#744210',
      };
    case 'cancelled':
      return {
        background: '#FDECEC',
        border: '#D14343',
        text: '#B42318',
        badgeBg: '#FEE2E2',
        badgeText: '#991B1B',
      };
    case 'completed':
      return {
        background: '#EAF2FF',
        border: '#3B82F6',
        text: '#1D4ED8',
        badgeBg: '#DBEAFE',
        badgeText: '#1E40AF',
      };
    default:
      return {
        background: '#F3F4F6',
        border: '#94A3B8',
        text: '#334155',
        badgeBg: '#E2E8F0',
        badgeText: '#334155',
      };
  }
}

function getClassTypeColor(type?: string) {
  switch (type?.toUpperCase()) {
    case 'PRESENCIAL':
      return { bg: '#093A5D', text: '#FFFFFF' };
    case 'RESIDENCIAL':
      return { bg: '#F26430', text: '#FFFFFF' };
    case 'FUNCIONAL':
      return { bg: '#82ADC5', text: '#FFFFFF' };
    default:
      return { bg: '#1C6AAB', text: '#FFFFFF' };
  }
}

export default function PersonalWeeklyScheduleScreen() {
  const router = useRouter();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selectedEvent, setSelectedEvent] = useState<PersonalScheduleEvent | null>(null);

  const isCurrentWeek = useMemo(() => {
    const currentStart = startOfWeek(new Date());
    return weekStart.getTime() === currentStart.getTime();
  }, [weekStart]);

  const weekRange = useMemo(() => {
    const start = new Date(weekStart);
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);

    return {
      startStr: `${format(start, 'yyyy-MM-dd')}T00:00:00`,
      endStr: `${format(end, 'yyyy-MM-dd')}T23:59:59`,
    };
  }, [weekStart]);

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return date;
    });
  }, [weekStart]);

  const {
    data: events = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ['personalWeeklySchedule', weekRange.startStr, weekRange.endStr],
    queryFn: async () => {
      const res = await findPersonalRequests(
        0,
        '30',
        weekRange.startStr,
        weekRange.endStr
      );
      const list = Array.isArray(res.data)
        ? res.data
        : res.data?.content ?? [];
      return list as PersonalScheduleEvent[];
    },
    staleTime: 1000 * 60 * 2,
    retry: false,
  });

  const eventsByDay = useMemo(() => {
    const map = new Map<string, PersonalScheduleEvent[]>();
    weekDates.forEach((date) => map.set(format(date, 'yyyy-MM-dd'), []));

    events.forEach((event) => {
      if (!event.dataInicio) return;
      const key = event.dataInicio.split('T')[0];
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    });

    // Ordena os eventos por horário dentro de cada dia
    map.forEach((list) => {
      list.sort((a, b) => new Date(a.dataInicio).getTime() - new Date(b.dataInicio).getTime());
    });

    return map;
  }, [weekDates, events]);

  const stats = useMemo(() => {
    const approved = events.filter((e) => normalizeStatus(e.status) === 'approved').length;
    const pending = events.filter((e) => normalizeStatus(e.status) === 'pending').length;
    const completed = events.filter((e) => normalizeStatus(e.status) === 'completed').length;
    const cancelled = events.filter((e) => normalizeStatus(e.status) === 'cancelled').length;
    return { approved, pending, completed, cancelled, total: events.length };
  }, [events]);

  const goToPreviousWeek = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() - 7);
    setWeekStart(next);
  };

  const goToNextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    setWeekStart(next);
  };

  const goToToday = () => {
    setWeekStart(startOfWeek(new Date()));
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screenContent}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              colors={['#1C6AAB']}
              tintColor="#1C6AAB"
            />
          }
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.headerTextGroup}>
              <Text style={styles.sectionLabel}>Agenda semanal</Text>
              <Text style={styles.sectionTitle}>Visão do Personal</Text>
            </View>

            {!isCurrentWeek && (
              <TouchableOpacity
                onPress={goToToday}
                style={styles.todayButton}
                activeOpacity={0.8}
              >
                <RotateCcw size={14} color="#1C6AAB" />
                <Text style={styles.todayButtonText}>Hoje</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Card da Semana */}
          <View style={styles.calendarCard}>
            {/* Navegador de Semanas */}
            <View style={styles.monthHeader}>
              <TouchableOpacity
                onPress={goToPreviousWeek}
                style={styles.arrowButton}
                activeOpacity={0.8}
              >
                <ChevronLeft size={20} color="#1F2937" />
              </TouchableOpacity>

              <View style={styles.monthTitleWrap}>
                <CalendarDays size={18} color="#1C6AAB" />
                <Text style={styles.monthTitle}>{formatMonth(weekStart)}</Text>
              </View>

              <TouchableOpacity
                onPress={goToNextWeek}
                style={styles.arrowButton}
                activeOpacity={0.8}
              >
                <ChevronRight size={20} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <Text style={styles.weekRange}>{formatWeekRange(weekStart)}</Text>

            {/* Loading do conteúdo semanal */}
            {isLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#1C6AAB" />
                <Text style={styles.loadingText}>Carregando agendamentos da semana...</Text>
              </View>
            ) : (
              <View style={styles.weekGrid}>
                {weekDates.map((date) => {
                  const key = format(date, 'yyyy-MM-dd');
                  const dayEvents = eventsByDay.get(key) ?? [];
                  const labelIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;
                  const isToday = format(new Date(), 'yyyy-MM-dd') === key;

                  return (
                    <View
                      key={key}
                      style={[styles.dayColumn, isToday && styles.dayColumnToday]}
                    >
                      <View style={styles.dayHeader}>
                        <Text style={[styles.dayTitle, isToday && styles.dayTitleToday]}>
                          {weekDays[labelIndex]} {date.getDate()}
                        </Text>
                        {isToday && (
                          <View style={styles.todayBadge}>
                            <Text style={styles.todayBadgeText}>Hoje</Text>
                          </View>
                        )}
                        {dayEvents.length > 0 && (
                          <Text style={styles.eventCountBadge}>
                            {dayEvents.length} {dayEvents.length === 1 ? 'aula' : 'aulas'}
                          </Text>
                        )}
                      </View>

                      {dayEvents.length === 0 ? (
                        <View style={styles.emptySlot}>
                          <Text style={styles.emptySlotText}>Sem horários agendados</Text>
                        </View>
                      ) : (
                        dayEvents.map((event) => {
                          const colors = getStatusColors(event.status);
                          const classTypeColor = getClassTypeColor(event.tipoAula);

                          return (
                            <TouchableOpacity
                              key={event.agendamentoId}
                              style={[
                                styles.eventCard,
                                {
                                  backgroundColor: colors.background,
                                  borderLeftColor: colors.border,
                                },
                              ]}
                              onPress={() => setSelectedEvent(event)}
                              activeOpacity={0.8}
                            >
                              <View style={styles.eventCardHeader}>
                                <View style={styles.studentWrap}>
                                  <User size={14} color="#1F2937" style={{ marginTop: 2 }} />
                                  <Text style={styles.studentName} numberOfLines={1}>
                                    {event.nome || 'Aluno'}
                                  </Text>
                                </View>
                                <View
                                  style={[
                                    styles.typeBadge,
                                    { backgroundColor: classTypeColor.bg },
                                  ]}
                                >
                                  <Text style={styles.typeBadgeText}>
                                    {event.tipoAula}
                                  </Text>
                                </View>
                              </View>

                              <View style={styles.eventCardFooter}>
                                <View style={styles.timeWrap}>
                                  <Clock3 size={13} color="#475467" />
                                  <Text style={styles.eventHour}>
                                    {formatHour(event.dataInicio)} - {formatHour(event.dataFim)}
                                  </Text>
                                </View>
                                <View
                                  style={[
                                    styles.statusBadge,
                                    { backgroundColor: colors.badgeBg },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.statusBadgeText,
                                      { color: colors.badgeText },
                                    ]}
                                  >
                                    {getStatusLabel(event.status)}
                                  </Text>
                                </View>
                              </View>
                            </TouchableOpacity>
                          );
                        })
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Resumo da Semana Dinâmico */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Clock3 size={18} color="#1C6AAB" />
              <Text style={styles.summaryTitle}>Resumo da semana</Text>
              <Text style={styles.summaryTotalBadge}>
                {stats.total} {stats.total === 1 ? 'aula total' : 'aulas no total'}
              </Text>
            </View>

            <View style={styles.summaryGrid}>
              <View style={[styles.summaryStatItem, { backgroundColor: '#E8F7EE' }]}>
                <Text style={[styles.summaryStatValue, { color: '#1C7C54' }]}>
                  {stats.approved}
                </Text>
                <Text style={[styles.summaryStatLabel, { color: '#1C7C54' }]}>
                  Aprovados
                </Text>
              </View>

              <View style={[styles.summaryStatItem, { backgroundColor: '#FFF6DA' }]}>
                <Text style={[styles.summaryStatValue, { color: '#8A6300' }]}>
                  {stats.pending}
                </Text>
                <Text style={[styles.summaryStatLabel, { color: '#8A6300' }]}>
                  Pendentes
                </Text>
              </View>

              <View style={[styles.summaryStatItem, { backgroundColor: '#EAF2FF' }]}>
                <Text style={[styles.summaryStatValue, { color: '#1D4ED8' }]}>
                  {stats.completed}
                </Text>
                <Text style={[styles.summaryStatLabel, { color: '#1D4ED8' }]}>
                  Concluídos
                </Text>
              </View>

              <View style={[styles.summaryStatItem, { backgroundColor: '#FDECEC' }]}>
                <Text style={[styles.summaryStatValue, { color: '#B42318' }]}>
                  {stats.cancelled}
                </Text>
                <Text style={[styles.summaryStatLabel, { color: '#B42318' }]}>
                  Cancelados
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>

      {/* Modal de Detalhes do Agendamento */}
      <Modal
        visible={!!selectedEvent}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedEvent(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setSelectedEvent(null)}
        >
          <Pressable
            style={styles.modalContainer}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Detalhes do Agendamento</Text>
              <TouchableOpacity
                onPress={() => setSelectedEvent(null)}
                style={styles.closeButton}
                activeOpacity={0.7}
              >
                <X size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            {selectedEvent && (
              <View style={styles.modalBody}>
                {/* Aluno */}
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Aluno</Text>
                  <Text style={styles.modalValue}>{selectedEvent.nome || 'Não informado'}</Text>
                </View>

                {/* Tipo de Aula */}
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Tipo de Aula</Text>
                  <View
                    style={[
                      styles.typeBadge,
                      {
                        backgroundColor: getClassTypeColor(selectedEvent.tipoAula).bg,
                        alignSelf: 'flex-start',
                      },
                    ]}
                  >
                    <Text style={styles.typeBadgeText}>
                      {selectedEvent.tipoAula}
                    </Text>
                  </View>
                </View>

                {/* Data e Horário */}
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Data</Text>
                  <Text style={styles.modalValue}>
                    {formatDateLong(selectedEvent.dataInicio)}
                  </Text>
                </View>

                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Horário</Text>
                  <Text style={styles.modalValue}>
                    {formatHour(selectedEvent.dataInicio)} - {formatHour(selectedEvent.dataFim)}
                  </Text>
                </View>

                {/* Status */}
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>Status</Text>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor: getStatusColors(selectedEvent.status).badgeBg,
                        alignSelf: 'flex-start',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeText,
                        { color: getStatusColors(selectedEvent.status).badgeText },
                      ]}
                    >
                      {getStatusLabel(selectedEvent.status)}
                    </Text>
                  </View>
                </View>

                {/* Ações */}
                {selectedEvent.status === 'PENDENTE_PERSONAL_APROVACAO' && (
                  <TouchableOpacity
                    style={styles.actionButton}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelectedEvent(null);
                      router.push('/(app)/(tabs)/requests');
                    }}
                  >
                    <Text style={styles.actionButtonText}>
                      Gerenciar em Solicitações
                    </Text>
                    <ArrowUpRight size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.closeModalButton}
                  activeOpacity={0.8}
                  onPress={() => setSelectedEvent(null)}
                >
                  <Text style={styles.closeModalButtonText}>Fechar</Text>
                </TouchableOpacity>
              </View>
            )}
          </Pressable>
        </Pressable>
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
  },
  container: {
    padding: 16,
    paddingBottom: 110,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTextGroup: {
    flex: 1,
  },
  sectionLabel: {
    color: '#1C6AAB',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sectionTitle: {
    marginTop: 2,
    color: '#0F172A',
    fontSize: 24,
    fontWeight: '800',
  },
  todayButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
  },
  todayButtonText: {
    color: '#1C6AAB',
    fontSize: 12,
    fontWeight: '700',
  },
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#001F33',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  arrowButton: {
    width: 36,
    height: 36,
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
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  weekRange: {
    color: '#475467',
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 14,
    textAlign: 'center',
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '500',
  },
  weekGrid: {
    flexDirection: 'column',
    gap: 12,
  },
  dayColumn: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  dayColumnToday: {
    borderColor: '#38BDF8',
    backgroundColor: '#F0F9FF',
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  dayTitle: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 15,
  },
  dayTitleToday: {
    color: '#0369A1',
  },
  todayBadge: {
    backgroundColor: '#0284C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  todayBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  eventCountBadge: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  emptySlot: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  emptySlotText: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '500',
  },
  eventCard: {
    borderLeftWidth: 4,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  eventCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 8,
  },
  studentWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  studentName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  eventCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  timeWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  eventHour: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475467',
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    shadowColor: '#001F33',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  summaryTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  summaryTotalBadge: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '600',
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryStatItem: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryStatValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  summaryStatLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    textAlign: 'center',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    gap: 14,
  },
  modalRow: {
    gap: 4,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
  },
  modalValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#0F172A',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#0F567F',
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  closeModalButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 11,
  },
  closeModalButtonText: {
    color: '#475467',
    fontSize: 14,
    fontWeight: '600',
  },
});
