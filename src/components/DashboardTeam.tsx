import { useState } from "react";
import { ChevronDown, ChevronUp, Users } from "lucide-react-native";
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from "react-native";

type PersonalMetrics = {
  name: string;
  role: string;
  active: boolean;
  appointments: number;
  cancellations: number;
  reschedules: number;
};

const DEMO_PERSONALS: PersonalMetrics[] = [
  { name: "Rodrigo S.", role: "Personal Trainer", active: true, appointments: 92, cancellations: 2, reschedules: 6 },
  { name: "Lucas M.", role: "Personal Trainer", active: true, appointments: 84, cancellations: 4, reschedules: 8 },
  { name: "Camila F.", role: "Personal Trainer", active: true, appointments: 78, cancellations: 14, reschedules: 12 },
];

const METRIC_GROUPS = [
  {
    key: "appointments",
    title: "Taxa de Agendamentos por Personal",
    context: "Demanda & Produtividade",
    color: "#111827",
  },
  {
    key: "cancellations",
    title: "Taxa de Cancelamentos por Personal",
    context: "Controle de Retenção",
    color: "#94a3b8",
  },
  {
    key: "reschedules",
    title: "Taxa de Reagendamentos por Personal",
    context: "Flexibilidade de Horários",
    color: "#cbd5e1",
  },
] as const;

const METRIC_LABELS = [
  { key: "appointments", label: "Agendamentos" },
  { key: "cancellations", label: "Cancelamentos" },
  { key: "reschedules", label: "Reagendamentos" },
] as const;

function initials(name: string) {
  return name
    .replace(".", "")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function PersonalMetricGroup({
  group,
}: {
  group: (typeof METRIC_GROUPS)[number];
}) {
  const metricKey = group.key;

  return (
    <View style={styles.metricGroup}>
      <View style={styles.groupHeader}>
        <View style={styles.groupTitleWrap}>
          <View style={[styles.groupDot, { backgroundColor: group.color }]} />
          <Text style={styles.groupTitle}>{group.title}</Text>
        </View>
        <Text style={styles.groupContext}>{group.context}</Text>
      </View>
      {DEMO_PERSONALS.map((personal) => {
        const value = personal[metricKey];

        return (
          <View key={personal.name} style={styles.progressRow}>
            <View style={styles.progressLabelRow}>
              <Text style={styles.personalName}>{personal.name}</Text>
              <Text style={styles.progressValue}>{value}%</Text>
            </View>
            <View
              style={styles.progressTrack}
              accessibilityRole="progressbar"
              accessibilityLabel={`${personal.name}: ${group.title}`}
              accessibilityValue={{ min: 0, max: 100, now: value }}
            >
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(value, 100)}%`, backgroundColor: group.color },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

function PersonalDetail({ personal }: { personal: PersonalMetrics }) {
  return (
    <View style={styles.detailMetrics}>
      {METRIC_LABELS.map(({ key, label }) => (
        <View key={key} style={styles.detailMetric}>
          <Text style={styles.detailMetricLabel} numberOfLines={1}>{label}</Text>
          <Text style={styles.detailMetricValue}>{personal[key]}%</Text>
        </View>
      ))}
    </View>
  );
}

function PersonalCard({
  personal,
  expanded,
  onPress,
}: {
  personal: PersonalMetrics;
  expanded: boolean;
  onPress: () => void;
}) {
  const Chevron = expanded ? ChevronUp : ChevronDown;

  return (
    <View style={[styles.personalCard, expanded && styles.personalCardExpanded]}>
      <Pressable
        style={styles.personalCardHeader}
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
        accessibilityLabel={`${personal.name}, ${expanded ? "recolher" : "expandir"} indicadores`}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(personal.name)}</Text>
        </View>
        <View style={styles.personalIdentity}>
          <View style={styles.nameAndStatus}>
            <Text style={styles.personalFullName}>{personal.name}</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>{personal.active ? "Ativo" : "Inativo"}</Text>
            </View>
          </View>
          <Text style={styles.roleText}>{personal.role}</Text>
        </View>
        <Chevron size={20} color="#94a3b8" />
      </Pressable>
      {expanded ? <PersonalDetail personal={personal} /> : null}
    </View>
  );
}

export default function DashboardTeam() {
  const [expandedPersonal, setExpandedPersonal] = useState<string | null>(DEMO_PERSONALS[0].name);
  const { width } = useWindowDimensions();
  const compact = width < 400;

  return (
    <View style={styles.content}>
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeading}>
            <Text style={styles.cardTitle}>Métricas por Personal</Text>
            <Text style={styles.cardSubtitle}>Visão operacional dos atendimentos da equipe</Text>
          </View>
          <View style={styles.demoBadge}>
            <Text style={styles.demoBadgeText}>Dados de exemplo</Text>
          </View>
        </View>
        {METRIC_GROUPS.map((group) => (
          <PersonalMetricGroup key={group.key} group={group} />
        ))}
      </View>

      <View style={styles.card}>
        <View style={styles.detailHeader}>
          <View style={styles.detailHeading}>
            <Text style={styles.cardTitle}>Detalhamento por Personal</Text>
            <Text style={styles.cardSubtitle}>Toque para ver indicadores detalhados</Text>
          </View>
          <View style={styles.peopleCount}>
            <Users size={14} color="#475569" />
            <Text style={styles.peopleCountText}>3 personais</Text>
          </View>
        </View>
        {DEMO_PERSONALS.map((personal) => (
          <PersonalCard
            key={personal.name}
            personal={personal}
            expanded={expandedPersonal === personal.name}
            onPress={() =>
              setExpandedPersonal((current) => current === personal.name ? null : personal.name)
            }
          />
        ))}
        <Text style={[styles.demoDisclaimer, compact && styles.demoDisclaimerCompact]}>
          Valores ilustrativos para demonstração; ainda não conectados ao backend.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
  },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#edf1f6",
    borderRadius: 18,
    borderWidth: 1,
    boxShadow: "0px 2px 6px rgba(15, 23, 42, 0.04)",
    elevation: 1,
    gap: 18,
    padding: 20,
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  cardHeading: {
    flex: 1,
    minWidth: 180,
  },
  cardTitle: {
    color: "#111827",
    fontSize: 18,
    fontWeight: "700",
  },
  cardSubtitle: {
    color: "#64748b",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
  },
  demoBadge: {
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  demoBadgeText: {
    color: "#475569",
    fontSize: 11,
    fontWeight: "600",
  },
  metricGroup: {
    borderBottomColor: "#edf1f6",
    borderBottomWidth: 1,
    gap: 12,
    paddingBottom: 18,
  },
  groupHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  groupTitleWrap: {
    alignItems: "flex-start",
    flex: 1,
    flexDirection: "row",
    gap: 8,
  },
  groupDot: {
    borderRadius: 4,
    height: 8,
    marginTop: 6,
    width: 8,
  },
  groupTitle: {
    color: "#111827",
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  groupContext: {
    color: "#94a3b8",
    flex: 0.65,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "right",
  },
  progressRow: {
    gap: 5,
  },
  progressLabelRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  personalName: {
    color: "#475569",
    fontSize: 13,
  },
  progressValue: {
    color: "#111827",
    fontSize: 13,
    fontWeight: "700",
  },
  progressTrack: {
    backgroundColor: "#f1f5f9",
    borderRadius: 5,
    height: 8,
    overflow: "hidden",
  },
  progressFill: {
    borderRadius: 5,
    height: "100%",
  },
  detailHeader: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  detailHeading: {
    flex: 1,
    minWidth: 180,
  },
  peopleCount: {
    alignItems: "center",
    backgroundColor: "#f1f5f9",
    borderRadius: 8,
    flexDirection: "row",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  peopleCountText: {
    color: "#475569",
    fontSize: 12,
  },
  personalCard: {
    borderColor: "#dbe4f0",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  personalCardExpanded: {
    backgroundColor: "#f8fafc",
  },
  personalCardHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    minHeight: 84,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  avatar: {
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderColor: "#dbeafe",
    borderRadius: 12,
    borderWidth: 1,
    height: 42,
    justifyContent: "center",
    width: 42,
  },
  avatarText: {
    color: "#0f172a",
    fontSize: 13,
    fontWeight: "700",
  },
  personalIdentity: {
    flex: 1,
    gap: 4,
  },
  nameAndStatus: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  personalFullName: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "700",
  },
  statusBadge: {
    backgroundColor: "#f1f5f9",
    borderColor: "#e2e8f0",
    borderRadius: 5,
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  statusText: {
    color: "#475569",
    fontSize: 10,
  },
  roleText: {
    color: "#94a3b8",
    fontSize: 12,
  },
  detailMetrics: {
    borderTopColor: "#e8eef5",
    borderTopWidth: 1,
    flexDirection: "row",
    gap: 8,
    padding: 12,
  },
  detailMetric: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderColor: "#edf1f6",
    borderRadius: 12,
    borderWidth: 1,
    flex: 1,
    gap: 6,
    justifyContent: "center",
    minHeight: 64,
    paddingHorizontal: 4,
    paddingVertical: 9,
  },
  detailMetricLabel: {
    color: "#64748b",
    fontSize: 10,
    textAlign: "center",
  },
  detailMetricValue: {
    color: "#111827",
    fontSize: 15,
    fontWeight: "700",
  },
  demoDisclaimer: {
    color: "#94a3b8",
    fontSize: 11,
    lineHeight: 16,
    marginTop: -7,
  },
  demoDisclaimerCompact: {
    marginTop: -3,
  },
});
