import React, { useMemo, useState } from "react";
import { type LayoutChangeEvent, StyleSheet, View, useWindowDimensions } from "react-native";
import { CalendarList } from "react-native-calendars";

type CalendarEvent = {
  data: string;
};

type OverviewCalendarProps = {
  calendarEvents?: CalendarEvent[];
  disabledDays?: string[];
};

const WEEKDAY_PT: Record<number, string> = {
  0: "domingo",
  1: "segunda",
  2: "terca",
  3: "quarta",
  4: "quinta",
  5: "sexta",
  6: "sabado",
};

function toISODate(date: Date) {
  return date.toISOString().split("T")[0];
}

function buildMarkedDates(calendarEvents: CalendarEvent[], disabledDays: string[], daysAhead = 180) {
  const now = new Date();
  const marks: Record<string, { disabled?: boolean; disableTouchEvent?: boolean; marked?: boolean; dotColor?: string }> = {};

  for (let index = 0; index <= daysAhead; index += 1) {
    const day = new Date(now);
    day.setDate(now.getDate() + index);

    const weekdayKey = WEEKDAY_PT[day.getDay()];
    if (!disabledDays.includes(weekdayKey)) continue;

    const iso = toISODate(day);
    marks[iso] = {
      ...(marks[iso] ?? {}),
      disabled: true,
      disableTouchEvent: true,
    };
  }

  for (const event of calendarEvents) {
    const eventDay = event.data?.split("T")[0];
    if (!eventDay) continue;
    marks[eventDay] = {
      ...(marks[eventDay] ?? {}),
      marked: true,
      dotColor: "#0d79b8",
    };
  }

  return marks;
}

export default function Calendar({
  calendarEvents = [],
  disabledDays = [],
}: OverviewCalendarProps) {
  const { width: screenWidth } = useWindowDimensions();
  const [calendarWidth, setCalendarWidth] = useState<number>(Math.max(280, screenWidth - 60));

  const markedDates = useMemo(
    () => buildMarkedDates(calendarEvents, disabledDays),
    [calendarEvents, disabledDays]
  );

  function handleCalendarLayout(event: LayoutChangeEvent) {
    const nextWidth = event.nativeEvent.layout.width;
    if (nextWidth > 0 && Math.abs(nextWidth - calendarWidth) > 1) {
      setCalendarWidth(nextWidth);
    }
  }

  return (
    <View style={styles.calendarWrapper} onLayout={handleCalendarLayout}>
      <CalendarList
        markedDates={markedDates}
        current={toISODate(new Date())}
        calendarWidth={calendarWidth}
        pastScrollRange={0}
        futureScrollRange={6}
        horizontal
        pagingEnabled
        hideExtraDays
        theme={{
          backgroundColor: "#ffffff",
          calendarBackground: "#ffffff",
          textSectionTitleColor: "#456176",
          selectedDayBackgroundColor: "#0f567f",
          selectedDayTextColor: "#ffffff",
          todayTextColor: "#0f567f",
          dayTextColor: "#173a52",
          textDisabledColor: "#a2b8c9",
          dotColor: "#0d79b8",
          arrowColor: "#0f567f",
          monthTextColor: "#173a52",
          textMonthFontWeight: "700",
          textDayFontWeight: "500",
          textDayHeaderFontWeight: "600",
        }}
        style={styles.calendar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  calendar: {
    borderWidth: 1,
    borderColor: "#d8e8f4",
    borderRadius: 12,
    overflow: "hidden",
  },
  calendarWrapper: {
    width: "100%",
  },
});