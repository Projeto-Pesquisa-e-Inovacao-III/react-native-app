import { View, Text, StyleSheet } from "react-native";

export default function MetricCard({
  title,
  value,
  icon,
}: {
  title: string;
  value: string;
  icon: React.ReactNode
  compact?: boolean;
}) {
  const valueFontSize = value.length > 14 ? 16 : value.length > 11 ? 18 : value.length > 8 ? 22 : 25;

  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricIcon} accessibilityLabel={title}>
        {icon}
      </Text>
      <View style={styles.metricContent}>
        <Text style={styles.metricTitle}>{title}</Text>
        <Text style={[styles.metricValue, { fontSize: valueFontSize }]}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
    metricCard: {
      backgroundColor: "#ffffff",
      borderRadius: 14,
      padding: 12,
      alignItems: "flex-start",
      boxShadow: "0px 4px 10px rgba(15, 23, 42, 0.07)",
    },
    metricContent: {
      width: "100%",
      minWidth: 0,
      flexShrink: 1,
    },
    metricTitle: {
      color: "#64748b",
      fontSize: 13,
      lineHeight: 16,
      minHeight: 32,
    },
    metricValue: {
      color: "#0f172a",
      fontSize: 25,
      fontWeight: "800",
      marginTop: 6,
      lineHeight: 30,
    },
    metricIcon: {
      backgroundColor: "rgba(12, 98, 145, 0.12)",
      padding: 10,
      borderRadius: 10,
      marginBottom: 8,
    },
})