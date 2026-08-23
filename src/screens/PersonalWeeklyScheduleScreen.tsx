import { useMemo, useState } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ChevronLeft, ChevronRight, Clock3, CalendarDays } from 'lucide-react-native';
import BottomTabBar from '../components/BottomTabBar';

type EventStatus = 'approved' | 'pending' | 'cancelled' | 'completed';

type WeeklyEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  status: EventStatus;
};

const weekDays = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const mockEvents: WeeklyEvent[] = [
  {
    id: '1',
    title: 'Personal',
    start: '2026-08-24T09:00:00',
    end: '2026-08-24T10:00:00',
    status: 'approved',
  },
  {
    id: '2',
    title: 'Funcional',
    start: '2026-08-25T18:00:00',
    end: '2026-08-25T19:00:00',
    status: 'pending',
  },
  {
    id: '3',
    title: 'Residencial',
    start: '2026-08-27T07:30:00',
    end: '2026-08-27T08:15:00',
    status: 'completed',
  },
  {
    id: '4',
    title: 'Avaliação',
    start: '2026-08-28T16:00:00',
    end: '2026-08-28T17:00:00',
    status: 'cancelled',
  },
];

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
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' }).format(date);
}

function formatMonth(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
}

function getStatusColors(status: EventStatus) {
  switch (status) {
    case 'approved':
      return { background: '#E8F7EE', border: '#38A169', text: '#1C7C54' };
    case 'pending':
      return { background: '#FFF6DA', border: '#D7A300', text: '#8A6300' };
    case 'cancelled':
      return { background: '#FDECEC', border: '#D14343', text: '#B42318' };
    case 'completed':
      return { background: '#EAF2FF', border: '#3B82F6', text: '#1D4ED8' };
    default:
      return { background: '#F3F4F6', border: '#94A3B8', text: '#334155' };
  }
}

export default function PersonalWeeklyScheduleScreen() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return date;
    });
  }, [weekStart]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, WeeklyEvent[]>();
    weekDates.forEach((date) => map.set(date.toISOString().slice(0, 10), []));

    mockEvents.forEach((event) => {
      const key = new Date(event.start).toISOString().slice(0, 10);
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    });

    return map;
  }, [weekDates]);

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

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screenContent}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.sectionLabel}>Agenda semanal</Text>
              <Text style={styles.sectionTitle}>Visão do personal</Text>
            </View>
          </View>

          <View style={styles.calendarCard}>
            <View style={styles.monthHeader}>
              <TouchableOpacity onPress={goToPreviousWeek} style={styles.arrowButton} activeOpacity={0.9}>
                <ChevronLeft size={18} color="#1F2937" />
              </TouchableOpacity>

              <View style={styles.monthTitleWrap}>
                <CalendarDays size={18} color="#1C6AAB" />
                <Text style={styles.monthTitle}>{formatMonth(weekStart)}</Text>
              </View>

              <TouchableOpacity onPress={goToNextWeek} style={styles.arrowButton} activeOpacity={0.9}>
                <ChevronRight size={18} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <Text style={styles.weekRange}>{formatWeekRange(weekStart)}</Text>

            <View style={styles.weekGrid}>
              {weekDates.map((date) => {
                const key = date.toISOString().slice(0, 10);
                const dayEvents = eventsByDay.get(key) ?? [];
                const labelIndex = date.getDay() === 0 ? 6 : date.getDay() - 1;

                return (
                  <View key={key} style={styles.dayColumn}>
                    <Text style={styles.dayTitle}>{weekDays[labelIndex]} {date.getDate()}</Text>

                    {dayEvents.length === 0 ? (
                      <View style={styles.emptySlot}>
                        <Text style={styles.emptySlotText}>Sem horários</Text>
                      </View>
                    ) : (
                      dayEvents.map((event) => {
                        const colors = getStatusColors(event.status);
                        return (
                          <View key={event.id} style={styles.eventTimeRow}>
                            <Text style={styles.eventTime}>{formatHour(event.start)}</Text>
                            <View
                              style={[
                                styles.eventCard,
                                { backgroundColor: colors.background, borderColor: colors.border },
                              ]}
                            >
                              <Text style={[styles.eventTitle, { color: colors.text }]}>{event.title}</Text>
                              <Text style={[styles.eventHour, { color: colors.text }]}>
                                {formatHour(event.start)} - {formatHour(event.end)}
                              </Text>
                            </View>
                          </View>
                        );
                      })
                    )}
                  </View>
                );
              })}
            </View>
          </View>

          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Clock3 size={16} color="#1C6AAB" />
              <Text style={styles.summaryTitle}>Resumo da semana</Text>
            </View>

            <View style={styles.legendRow}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#E8F7EE', borderColor: '#38A169' }]} />
                <Text style={styles.legendText}>Aprovado</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#FFF6DA', borderColor: '#D7A300' }]} />
                <Text style={styles.legendText}>Pendente</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#EAF2FF', borderColor: '#3B82F6' }]} />
                <Text style={styles.legendText}>Concluído</Text>
              </View>
            </View>
          </View>
        </ScrollView>

        <BottomTabBar activeTab="schedule" onTabPress={() => {}} />
      </View>
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
  headerRow: {
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
    marginBottom: 8,
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
  weekGrid: {
    flexDirection: 'column',
    gap: 12,
  },
  dayColumn: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  dayTitle: {
    color: '#0F172A',
    fontWeight: '700',
    fontSize: 18,
    marginBottom: 10,
  },
  emptySlot: {
    backgroundColor: '#EEF2F7',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 8,
  },
  emptySlotText: {
    color: '#64748B',
    fontSize: 11,
    fontWeight: '600',
  },
  eventTimeRow: {
    flexDirection: 'column',
    gap: 8,
    marginBottom: 10,
  },
  eventTime: {
    color: '#475467',
    fontSize: 12,
    fontWeight: '700',
  },
  eventCard: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  eventTitle: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  eventHour: {
    fontSize: 11,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  summaryTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  legendText: {
    fontSize: 11,
    color: '#475467',
    fontWeight: '600',
  },
});
