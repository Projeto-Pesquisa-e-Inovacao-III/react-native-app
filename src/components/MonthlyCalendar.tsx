import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react-native';

type MonthlyCalendarProps = {
  currentMonth: Date;
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  onMonthChange: (date: Date) => void;
  hasEventOnDate?: (date: Date) => boolean;
};

const dayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

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

function toDayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

export default function MonthlyCalendar({
  currentMonth,
  selectedDate,
  onDateSelect,
  onMonthChange,
  hasEventOnDate,
}: MonthlyCalendarProps) {
  const monthDays = useMemo(() => getMonthMatrix(currentMonth), [currentMonth]);
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const goToPreviousMonth = () => {
    onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    onMonthChange(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  return (
    <View>
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
          <Text key={label} style={styles.weekLabel}>
            {label}
          </Text>
        ))}
      </View>

      <View style={styles.dayGrid}>
        {monthDays.map((value, index) => {
          if (!value) {
            return <View key={`empty-${index}`} style={styles.emptyCell} />;
          }

          const isSelected = isSameDay(value, selectedDate);
          const hasEvent = hasEventOnDate?.(value) ?? false;
          const dayDate = new Date(value.getFullYear(), value.getMonth(), value.getDate());
          const isPastDay = dayDate.getTime() < today.getTime();

          return (
            <Pressable
              key={toDayKey(value)}
              style={[styles.dayCell, isPastDay && !isSelected && styles.dayCellPast, isSelected && styles.dayCellSelected]}
              onPress={() => onDateSelect(value)}
            >
              <Text style={[styles.dayNumber, isPastDay && !isSelected && styles.dayNumberPast, isSelected && styles.dayNumberSelected]}>
                {value.getDate()}
              </Text>
              {hasEvent && <View style={styles.dayDot} />}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
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
  dayCellPast: {
    backgroundColor: '#F3F4F6',
  },
  dayNumber: {
    color: '#111827',
    fontWeight: '600',
    fontSize: 14,
  },
  dayNumberPast: {
    color: '#9CA3AF',
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
});
