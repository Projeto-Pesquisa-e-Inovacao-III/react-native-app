import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ArrowRight, CalendarDays } from "lucide-react-native";
import { Path, Svg } from "react-native-svg";

type Plan = {
  nome: string;
  dataExpiracao: string;
};

type OverviewCardPackageStatusProps = {
  actualPlan?: Plan | null;
  onHistory?: () => void;
  onPackages?: () => void;
};

function getRemainingDays(dateISO: string) {
  const expiration = new Date(dateISO).getTime();
  if (Number.isNaN(expiration)) return 0;
  return Math.max(0, Math.floor((expiration - Date.now()) / 86400000));
}

function getProgress(dateISO: string) {
  const expiration = new Date(dateISO).getTime();
  if (Number.isNaN(expiration)) return 0;

  const yearStart = new Date(dateISO);
  yearStart.setFullYear(yearStart.getFullYear() - 1);
  const totalDays = Math.floor((expiration - yearStart.getTime()) / 86400000);
  const remainingDays = getRemainingDays(dateISO);

  if (totalDays <= 0) return 0;
  return Math.min(100, Math.max(0, Math.round((remainingDays / totalDays) * 100)));
}

function formatExpirationDate(dateISO?: string) {
  if (!dateISO || Number.isNaN(new Date(dateISO).getTime())) return "N/A";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(new Date(dateISO));
}

export default function OverviewCardPackageStatus({
  actualPlan,
  onHistory,
  onPackages,
}: OverviewCardPackageStatusProps) {
  if (!actualPlan) {
    return (
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>Status do plano</Text>
        <Text style={styles.emptyText}>Você não possui plano ativo</Text>
        <Pressable style={styles.emptyButton} onPress={onPackages}>
          <Text style={styles.emptyButtonText}>Ver planos</Text>
        </Pressable>
      </View>
    );
  }

  const remainingDays = getRemainingDays(actualPlan.dataExpiracao);
  const progress = getProgress(actualPlan.dataExpiracao);

  return (
    <View style={styles.card}>
      <Svg
        width={83}
        height={99}
        viewBox="0 0 83 99"
        fill="none"
        style={styles.backgroundIcon}
      >
        <Path
          d="M30.5 49L42.75 39.75L55 49L50.5 33.75L62.75 24H47.5L42.75 9L38 24H22.75L35 33.75L30.5 49ZM85.5 29.25C85.5 5.75 66.25 -13.25 42.75 -13.25C19.25 -13.25 0 5.75 0 29.25C0 40.25 4.25 50 10.75 57.5V98.75L42.75 88L74.75 98.75V57.5C81.25 50 85.5 40.25 85.5 29.25ZM42.75 -2.75C60.5 -2.75 74.75 11.75 74.75 29.25C74.75 47 60.5 61.25 42.75 61.25C25 61.25 10.75 47 10.75 29.25C10.75 11.75 25 -2.75 42.75 -2.75ZM42.75 77.25L21.5 82.75V66.25C27.75 69.75 35 72 42.75 72C50.5 72 57.75 69.75 64 66.25V82.75L42.75 77.25Z"
          fill="white"
          fillOpacity={0.1}
        />
      </Svg>

      <View style={styles.content}>
        <Text style={styles.badge}>Plano Ativo</Text>
        <Text style={styles.planName}>{actualPlan.nome}</Text>

        <View style={styles.expiryRow}>
          <CalendarDays size={17} color="rgba(255, 255, 255, 0.7)" />
          <Text style={styles.expiryText}>
            Expira em {formatExpirationDate(actualPlan.dataExpiracao)}
          </Text>
        </View>

        <View style={styles.progressBox}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressLabel}>Dias restantes</Text>
            <Text style={styles.progressValue}>{remainingDays} dias</Text>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressBar, { width: `${progress}%` }]} />
          </View>
        </View>

        {onHistory ? (
          <Pressable style={styles.historyButton} onPress={onHistory}>
            <Text style={styles.historyButtonText}>Histórico de compras</Text>
            <ArrowRight size={17} color="#0f567f" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#093A5D",
    borderRadius: 12,
    padding: 24,
    color: "#ffffff",
    overflow: "hidden",
    position: "relative",
    width: "100%",
  },
  backgroundIcon: {
    position: "absolute",
    right: -4,
    top: -2,
  },
  content: {
    position: "relative",
    zIndex: 1,
  },
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 999,
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 16,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 4,
    textTransform: "uppercase",
  },
  planName: {
    color: "#ffffff",
    fontSize: 24,
    fontWeight: "900",
    marginBottom: 4,
  },
  expiryRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  expiryText: {
    color: "rgba(255, 255, 255, 0.7)",
    fontSize: 14,
  },
  progressBox: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
  },
  progressHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  progressLabel: {
    color: "#ffffff",
    fontSize: 14,
  },
  progressValue: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  progressTrack: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 999,
    height: 6,
    overflow: "hidden",
    width: "100%",
  },
  progressBar: {
    backgroundColor: "#ffffff",
    height: "100%",
  },
  historyButton: {
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    flexDirection: "row",
    gap: 8,
    height: 44,
    justifyContent: "center",
    marginTop: 24,
    paddingHorizontal: 12,
    width: "100%",
  },
  historyButtonText: {
    color: "#0f567f",
    fontWeight: "700",
  },
  emptyCard: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    shadowColor: "#001f33",
    shadowOpacity: 0.09,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    width: "100%",
  },
  emptyTitle: {
    color: "#173a52",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptyText: {
    color: "#39596f",
    fontSize: 16,
    marginBottom: 12,
  },
  emptyButton: {
    alignSelf: "flex-start",
    backgroundColor: "#184763",
    borderColor: "#b8d2e7",
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  emptyButtonText: {
    color: "#f0f6fb",
    fontWeight: "700",
  },
});