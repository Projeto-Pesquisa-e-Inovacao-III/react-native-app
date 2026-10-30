import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  Platform,
} from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { CalendarDays, X, Check, RotateCcw } from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type DateRange = {
  start: string;
  end: string;
};

type Props = {
  visible: boolean;
  initialRange?: DateRange;
  onClose: () => void;
  onApply: (range: DateRange) => void;
};

LocaleConfig.locales['pt-br'] = {
  monthNames: [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
  ],
  monthNamesShort: ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'],
  dayNames: ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'],
  dayNamesShort: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
  today: 'Hoje',
};
LocaleConfig.defaultLocale = 'pt-br';

export default function DateRangePickerModal({
  visible,
  initialRange,
  onClose,
  onApply,
}: Props) {
  const [range, setRange] = useState<DateRange>({
    start: initialRange?.start || '',
    end: initialRange?.end || '',
  });

  useEffect(() => {
    if (visible) {
      setRange({
        start: initialRange?.start || '',
        end: initialRange?.end || '',
      });
    }
  }, [visible, initialRange]);

  function handleDayPress(day: { dateString: string }) {
    const selected = day.dateString;
    const { start, end } = range;

    if (!start || (start && end)) {
      setRange({ start: selected, end: '' });
      return;
    }

    if (start && !end) {
      if (selected < start) {
        setRange({ start: selected, end: start });
      } else {
        setRange({ start, end: selected });
      }
    }
  }

  const markedDates = useMemo(() => {
    const { start, end } = range;
    if (!start) return {};

    if (!end || start === end) {
      return {
        [start]: {
          startingDay: true,
          endingDay: true,
          color: '#093A5D',
          textColor: '#FFFFFF',
        },
      };
    }

    const marks: Record<string, any> = {
      [start]: {
        startingDay: true,
        color: '#093A5D',
        textColor: '#FFFFFF',
      },
      [end]: {
        endingDay: true,
        color: '#093A5D',
        textColor: '#FFFFFF',
      },
    };

    try {
      let curr = new Date(`${start}T00:00:00`);
      const last = new Date(`${end}T00:00:00`);
      curr.setDate(curr.getDate() + 1);

      while (curr < last) {
        const y = curr.getFullYear();
        const m = String(curr.getMonth() + 1).padStart(2, '0');
        const d = String(curr.getDate()).padStart(2, '0');
        const iso = `${y}-${m}-${d}`;
        marks[iso] = {
          color: '#DCEBFA',
          textColor: '#093A5D',
        };
        curr.setDate(curr.getDate() + 1);
      }
    } catch {
      // fallback safe
    }

    return marks;
  }, [range]);

  function handleReset() {
    setRange({ start: '', end: '' });
  }

  function handleConfirm() {
    if (range.start && !range.end) {
      onApply({ start: range.start, end: range.start });
    } else {
      onApply(range);
    }
    onClose();
  }

  const formattedLabel = useMemo(() => {
    if (!range.start) return 'Nenhum período selecionado';
    const startFormatted = format(parseISO(`${range.start}T00:00:00`), 'dd/MM/yyyy', { locale: ptBR });
    if (!range.end || range.start === range.end) {
      return `${startFormatted}`;
    }
    const endFormatted = format(parseISO(`${range.end}T00:00:00`), 'dd/MM/yyyy', { locale: ptBR });
    return `${startFormatted} até ${endFormatted}`;
  }, [range]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.modalContainer} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <CalendarDays size={20} color="#093A5D" />
              <Text style={styles.headerTitle}>Filtrar por Período</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.rangeInfoBadge}>
            <Text style={styles.rangeInfoLabel}>Período:</Text>
            <Text style={styles.rangeInfoValue}>{formattedLabel}</Text>
          </View>

          <View style={styles.calendarContainer}>
            <Calendar
              markingType="period"
              markedDates={markedDates}
              onDayPress={handleDayPress}
              theme={{
                backgroundColor: '#FFFFFF',
                calendarBackground: '#FFFFFF',
                textSectionTitleColor: '#4B5563',
                selectedDayBackgroundColor: '#093A5D',
                selectedDayTextColor: '#FFFFFF',
                todayTextColor: '#F26430',
                dayTextColor: '#111827',
                textDisabledColor: '#D1D5DB',
                arrowColor: '#093A5D',
                monthTextColor: '#111827',
                textDayFontWeight: '500',
                textMonthFontWeight: '700',
                textDayHeaderFontWeight: '600',
                textDayFontSize: 14,
                textMonthFontSize: 16,
                textDayHeaderFontSize: 13,
              }}
            />
          </View>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.resetButton}
              onPress={handleReset}
              activeOpacity={0.7}
            >
              <RotateCcw size={16} color="#6B7280" />
              <Text style={styles.resetButtonText}>Limpar data</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.applyButton}
              onPress={handleConfirm}
              activeOpacity={0.7}
            >
              <Check size={16} color="#FFFFFF" />
              <Text style={styles.applyButtonText}>Aplicar</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  rangeInfoBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rangeInfoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },
  rangeInfoValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#093A5D',
  },
  calendarContainer: {
    marginVertical: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  resetButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
  },
  resetButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4B5563',
  },
  applyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: '#093A5D',
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
