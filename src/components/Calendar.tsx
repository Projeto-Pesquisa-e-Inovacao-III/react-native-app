import React from 'react';
import { StyleSheet, View } from 'react-native';
import MonthlyCalendar, { type CalendarEvent } from './MonthlyCalendar';

type OverviewCalendarProps = {
  calendarEvents?: CalendarEvent[];
  disabledDays?: string[];
  disabledDates?: string[];
  onDayPress?: (date: string) => void;
  selectedDate?: string | Date | null;
  currentMonth?: Date;
  onMonthChange?: (date: Date) => void;
};

export default function Calendar({
  calendarEvents = [],
  disabledDays = [],
  disabledDates = [],
  onDayPress,
  selectedDate,
  currentMonth,
  onMonthChange,
}: OverviewCalendarProps) {
  return (
    <View style={styles.calendarCard}>
      <MonthlyCalendar
        calendarEvents={calendarEvents}
        disabledDays={disabledDays}
        disabledDates={disabledDates}
        selectedDate={selectedDate}
        currentMonth={currentMonth}
        onMonthChange={onMonthChange}
        onDateSelect={(_date, dateStr) => onDayPress?.(dateStr)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  calendarCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    shadowColor: '#001F33',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    width: '100%',
  },
});