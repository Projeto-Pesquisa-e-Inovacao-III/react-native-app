import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native';

export type CalendarEvent = {
  data: string;
  status?: string;
  agendamentoId?: number;
};

type MonthlyCalendarProps = {
  currentMonth?: Date;
  selectedDate?: Date | string | null;
  onDateSelect?: (date: Date, dateString: string) => void;
  onMonthChange?: (date: Date) => void;
  calendarEvents?: CalendarEvent[];
  disabledDays?: string[];
  disabledDates?: string[];
  hasEventOnDate?: (date: Date) => boolean;
};

const dayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const WEEKDAY_PT: Record<number, string> = {
  0: 'domingo',
  1: 'segunda',
  2: 'terca',
  3: 'quarta',
  4: 'quinta',
  5: 'sexta',
  6: 'sabado',
};

function formatMonthLabel(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(date);
}

function toISODate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

function getDotColor(status?: string) {
  if (!status) return '#1C6AAB';
  const s = status.toUpperCase();
  if (s === 'APROVADO' || s === 'CONCLUIDO') return '#127B49';
  if (s.includes('PENDENTE')) return '#D7A300';
  if (s.includes('CANCELADO') || s.includes('AUSENCIA')) return '#B42318';
  return '#1C6AAB';
}

export default function MonthlyCalendar({
  currentMonth: propMonth,
  selectedDate: propSelectedDate,
  onDateSelect,
  onMonthChange,
  calendarEvents = [],
  disabledDays = [],
  disabledDates = [],
  hasEventOnDate,
}: MonthlyCalendarProps) {
  const [internalMonth, setInternalMonth] = useState(() => new Date());
  const activeMonth = propMonth ?? internalMonth;

  const monthDays = useMemo(() => getMonthMatrix(activeMonth), [activeMonth]);
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const normalizedSelectedDate = useMemo(() => {
    if (!propSelectedDate) return null;
    if (propSelectedDate instanceof Date) return propSelectedDate;
    if (typeof propSelectedDate === 'string') {
      const parts = propSelectedDate.split('T')[0].split('-');
      if (parts.length === 3) {
        return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      }
    }
    return null;
  }, [propSelectedDate]);

  // Indexa os eventos por dia (YYYY-MM-DD) garantindo que o mesmo agendamento não seja duplicado
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    const seenIds = new Set<number>();

    calendarEvents.forEach((ev) => {
      if (!ev.data) return;
      if (ev.agendamentoId !== undefined && ev.agendamentoId !== null) {
        if (seenIds.has(ev.agendamentoId)) return;
        seenIds.add(ev.agendamentoId);
      }
      const key = ev.data.split('T')[0];
      const list = map.get(key) ?? [];
      list.push(ev);
      map.set(key, list);
    });
    return map;
  }, [calendarEvents]);

  const goToPreviousMonth = () => {
    const next = new Date(activeMonth.getFullYear(), activeMonth.getMonth() - 1, 1);
    setInternalMonth(next);
    onMonthChange?.(next);
  };

  const goToNextMonth = () => {
    const next = new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 1);
    setInternalMonth(next);
    onMonthChange?.(next);
  };

  return (
    <View style={styles.calendarContainer}>
      {/* Header com Setas e Título */}
      <View style={styles.monthHeader}>
        <TouchableOpacity
          onPress={goToPreviousMonth}
          style={styles.arrowButton}
          activeOpacity={0.8}
          accessibilityLabel="Mês anterior"
        >
          <ChevronLeft size={18} color="#1F2937" />
        </TouchableOpacity>

        <View style={styles.monthTitleWrap}>
          <CalendarDays size={18} color="#1C6AAB" />
          <Text style={styles.monthTitle}>{formatMonthLabel(activeMonth)}</Text>
        </View>

        <TouchableOpacity
          onPress={goToNextMonth}
          style={styles.arrowButton}
          activeOpacity={0.8}
          accessibilityLabel="Próximo mês"
        >
          <ChevronRight size={18} color="#1F2937" />
        </TouchableOpacity>
      </View>

      {/* Cabeçalho dos Dias da Semana */}
      <View style={styles.weekRow}>
        {dayLabels.map((label) => (
          <Text key={label} style={styles.weekLabel}>
            {label}
          </Text>
        ))}
      </View>

      {/* Grid de Dias */}
      <View style={styles.dayGrid}>
        {monthDays.map((value, index) => {
          if (!value) {
            return <View key={`empty-${index}`} style={styles.emptyCell} />;
          }

          const isoKey = toISODate(value);
          const isSelected = normalizedSelectedDate ? isSameDay(value, normalizedSelectedDate) : false;
          const isToday = isSameDay(value, today);
          const dayDate = new Date(value.getFullYear(), value.getMonth(), value.getDate());
          const isPastDay = dayDate.getTime() < today.getTime();
          const isPastOrToday = dayDate.getTime() <= today.getTime();

          const weekdayKey = WEEKDAY_PT[value.getDay()];
          const isRuleDisabled = disabledDays.includes(weekdayKey) || disabledDates.includes(isoKey);

          const dayEvents = eventsByDay.get(isoKey) ?? [];
          const hasEvents = dayEvents.length > 0 || (hasEventOnDate?.(value) ?? false);

          // Regra das 24 horas: dias de hoje ou passados (< 24h) ficam cinzas e não clicáveis,
          // a menos que já possuam agendamentos para visualização via popup.
          const is24hDisabled = isPastOrToday && !hasEvents;
          const isDisabledDay = (isRuleDisabled && !hasEvents) || is24hDisabled;

          return (
            <Pressable
              key={isoKey}
              disabled={isDisabledDay}
              style={[
                styles.dayCell,
                isPastDay && !isSelected && !isDisabledDay && styles.dayCellPast,
                isToday && !isSelected && !isDisabledDay && styles.dayCellToday,
                isDisabledDay && styles.dayCellDisabled,
                isSelected && !isDisabledDay && styles.dayCellSelected,
              ]}
              onPress={() => {
                if (isDisabledDay) return;
                onDateSelect?.(value, isoKey);
              }}
            >
              <Text
                style={[
                  styles.dayNumber,
                  isPastDay && !isSelected && !isDisabledDay && styles.dayNumberPast,
                  isToday && !isSelected && !isDisabledDay && styles.dayNumberToday,
                  isDisabledDay && styles.dayNumberDisabled,
                  isSelected && !isDisabledDay && styles.dayNumberSelected,
                ]}
              >
                {value.getDate()}
              </Text>

              {/* Indicadores de Evento (Dots coloridos por status) */}
              {hasEvents && (
                <View style={styles.dotsRow}>
                  {dayEvents.length > 0 ? (
                    dayEvents.slice(0, 3).map((ev, evIdx) => (
                      <View
                        key={`${ev.agendamentoId ?? evIdx}`}
                        style={[
                          styles.dayDot,
                          {
                            backgroundColor: isSelected
                              ? '#FFFFFF'
                              : getDotColor(ev.status),
                          },
                        ]}
                      />
                    ))
                  ) : (
                    <View
                      style={[
                        styles.dayDot,
                        { backgroundColor: isSelected ? '#FFFFFF' : '#1C6AAB' },
                      ]}
                    />
                  )}
                </View>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  calendarContainer: {
    width: '100%',
  },
  monthHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
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
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weekLabel: {
    flex: 1,
    color: '#64748B',
    fontWeight: '600',
    fontSize: 11,
    textAlign: 'center',
    textTransform: 'uppercase',
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
    shadowColor: '#1C6AAB',
    shadowOpacity: 0.3,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  dayCellToday: {
    borderColor: '#38BDF8',
    borderWidth: 1.5,
  },
  dayCellPast: {
    backgroundColor: '#F8FAFC',
  },
  dayCellDisabled: {
    backgroundColor: '#F1F5F9',
  },
  dayNumber: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 14,
  },
  dayNumberToday: {
    color: '#0284C7',
    fontWeight: '700',
  },
  dayNumberPast: {
    color: '#94A3B8',
  },
  dayNumberDisabled: {
    color: '#475569',
    fontWeight: '500',
  },
  dayNumberSelected: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    marginTop: 3,
  },
  dayDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
  },
});
