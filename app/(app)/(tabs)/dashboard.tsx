import { ArrowLeft, BarChart3, Dumbbell, Percent, RotateCcwClock, User, Users } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getConsultingSessions,
  getPlansSalesQuantity,
  getQuantityofActiveStudents,
  getQuantityofInactiveStudents,
  getSalesQuantity,
} from "../../../src/constants/dashboard";
import MetricCard from "src/components/MetricCard";
import DashboardChart from "src/components/DashboardChart";
import DashboardTeam from "src/components/DashboardTeam";
import FocusAwareStatusBar from "src/components/FocusAwareStatusBar";
import { DashboardSeriesPoint } from "src/models/dashboard";
import { formatNumber } from "src/utils/formatacao";
import { useQuery } from "@tanstack/react-query";

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Marco",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

type ApiMonthPoint = {
  mes: number;
  totalConsultorias?: number;
  totalPreco?: number;
};

type DashboardApiResponse = {
  sessions: ApiMonthPoint[];
  sales: ApiMonthPoint[];
  plansSales: number;
  activeStudents: number;
  inactiveStudents: number;
  inactivePercentage: number;
};

type DashboardMetric = {
  activeStudents: number;
  salesLast30Days: number;
  inactiveStudents: number;
  activePackagesPercentage: number;
};

type DashboardData = {
  metrics: DashboardMetric;
  consultingSessions: DashboardSeriesPoint[];
  monthlySales: DashboardSeriesPoint[];
};

function mapDashboardResponse(response: DashboardApiResponse): DashboardData {
  return {
    metrics: {
      activeStudents: response.activeStudents,
      salesLast30Days: response.plansSales,
      inactiveStudents: response.inactiveStudents,
      activePackagesPercentage: 100 - response.inactivePercentage,
    },
    consultingSessions: response.sessions.map((item) => ({
      month: MONTH_NAMES[item.mes - 1] ?? "-",
      value: item.totalConsultorias ?? 0,
    })),
    monthlySales: response.sales.map((item) => ({
      month: MONTH_NAMES[item.mes - 1] ?? "-",
      value: item.totalPreco ?? 0,
    })),
  };
}

async function fetchDashboardData(): Promise<DashboardData> {
  const [sessions, sales, plansSales, activeStudents, inactiveStudents] = await Promise.all([
    getConsultingSessions(),
    getSalesQuantity(),
    getPlansSalesQuantity(),
    getQuantityofActiveStudents(),
    getQuantityofInactiveStudents(),
  ]);

  return mapDashboardResponse({
    sessions: sessions.data,
    sales: sales.data,
    plansSales: plansSales.data,
    activeStudents: activeStudents.data.quantidadeAlunos,
    inactiveStudents: inactiveStudents.data.quantidadeAlunos,
    inactivePercentage: inactiveStudents.data.percentualAlunos,
  });
}

export default function Dashboard() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"overview" | "team">("overview");

  const dashboardQuery = useQuery<DashboardData>({
    queryKey: ["dashboard"],
    queryFn: fetchDashboardData,
  });
  const displayedData = dashboardQuery.data;
  const handleRefresh = () => void dashboardQuery.refetch();
  const displayedError = dashboardQuery.error instanceof Error ? dashboardQuery.error.message : undefined;
  const displayedLoading = dashboardQuery.isLoading;
  const displayedRefreshing = dashboardQuery.isRefetching;

  return (
    <View style={styles.screen}>
      <FocusAwareStatusBar style="dark" />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Math.max(insets.top, 16) + 8,
            paddingBottom: Math.max(insets.bottom, 16) + 90,
          },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={displayedRefreshing} onRefresh={handleRefresh} />}
      >
        <View style={styles.headerTop}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.replace("/(app)/(tabs)/more")}
            activeOpacity={0.7}
          >
            <ArrowLeft size={18} color="#475569" />
            <Text style={styles.backText}>Voltar</Text>
          </TouchableOpacity>
          <View style={styles.adminBadge}>
            <View style={styles.adminDot} />
            <Text style={styles.adminBadgeText}>Painel Admin</Text>
          </View>
        </View>

        <View style={styles.heading}>
          <Text style={styles.headingTitle}>Desempenho</Text>
          <Text style={styles.headingSubtitle}>Acompanhe suas metricas e resultados.</Text>
        </View>

        <View style={styles.tabSwitcher} accessibilityRole="tablist">
          <Pressable
            style={[styles.tabButton, activeTab === "overview" && styles.tabButtonActive]}
            onPress={() => setActiveTab("overview")}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "overview" }}
          >
            <BarChart3 size={17} color={activeTab === "overview" ? "#2563eb" : "#334155"} />
            <Text style={[styles.tabText, activeTab === "overview" && styles.tabTextActive]}>
              Visão Geral
            </Text>
          </Pressable>
          <Pressable
            style={[styles.tabButton, activeTab === "team" && styles.tabButtonActive]}
            onPress={() => setActiveTab("team")}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === "team" }}
          >
            <Users size={17} color={activeTab === "team" ? "#2563eb" : "#334155"} />
            <Text style={[styles.tabText, activeTab === "team" && styles.tabTextActive]}>
              Personais &amp; Equipe
            </Text>
            <View style={styles.teamCount}>
              <Text style={styles.teamCountText}>3</Text>
            </View>
          </Pressable>
        </View>

        {activeTab === "overview" ? (
          <>
            {displayedError ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{displayedError}</Text>
                <Pressable onPress={handleRefresh}><Text style={styles.retryText}>Tentar novamente</Text></Pressable>
              </View>
            ) : null}

            {displayedLoading && !displayedData ? (
              <View style={styles.loadingBox}><ActivityIndicator color="#0f172a" /><Text style={styles.mutedText}>Carregando dashboard...</Text></View>
            ) : (
              <View style={styles.metricsGrid}>
                <View style={styles.metricRow}>
                  <View style={styles.metricColumn}>
                    <MetricCard title="Alunos com pacotes ativos" value={displayedData ? formatNumber(displayedData.metrics.activeStudents) : "-"} icon={<Dumbbell size={20} color="#192633"/>}/>
                  </View>
                  <View style={styles.metricColumn}>
                    <MetricCard title="Vendas dos ultimos 30 dias" value={displayedData ? formatNumber(displayedData.metrics.salesLast30Days) : "-"} icon={<RotateCcwClock size={20} color="#192633"/>} />
                  </View>
                </View>
                <View style={styles.metricRow}>
                  <View style={styles.metricColumn}>
                    <MetricCard title="Alunos sem pacotes ativos" value={displayedData ? formatNumber(displayedData.metrics.inactiveStudents) : "-"} icon={<User size={20} color="#192633"/>} />
                  </View>
                  <View style={styles.metricColumn}>
                    <MetricCard title="Percentual pacotes ativos" value={displayedData ? `${displayedData.metrics.activePackagesPercentage.toFixed(2)}%` : "-"} icon={<Percent size={20} color="#192633"/>} />
                  </View>
                </View>
                <DashboardChart title="Consultorias por mês" legend="Consultorias" type="bar" data={displayedData?.consultingSessions ?? []} />
                <DashboardChart title="Ganhos mensais em reais" legend="Ganhos" type="line" data={displayedData?.monthlySales ?? []} />
              </View>
            )}
          </>
        ) : (
          <DashboardTeam />
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f1f5f9",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 14,
    maxWidth: 1000,
    alignSelf: "center",
    width: "100%",
  },
  headerTop: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
  },
  backText: {
    color: "#475569",
    fontSize: 14,
    fontWeight: "600",
  },
  heading: {
    paddingTop: 4,
    paddingBottom: 8,
  },
  headingTitle: {
    color: "#0f172a",
    fontSize: 32,
    fontWeight: "800",
    marginTop: 4,
  },
  headingSubtitle: {
    color: "#64748b",
    fontSize: 14,
    marginTop: 5,
  },
  adminBadge: {
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  adminDot: {
    backgroundColor: "#3b82f6",
    borderRadius: 3,
    height: 6,
    width: 6,
  },
  adminBadgeText: {
    color: "#1d4ed8",
    fontSize: 11,
    fontWeight: "700",
  },
  tabSwitcher: {
    alignItems: "center",
    backgroundColor: "#e9eef4",
    borderRadius: 16,
    flexDirection: "row",
    gap: 6,
    padding: 5,
  },
  tabButton: {
    alignItems: "center",
    borderRadius: 12,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    minHeight: 44,
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  tabButtonActive: {
    backgroundColor: "#ffffff",
    boxShadow: "0px 1px 3px rgba(15, 23, 42, 0.08)",
    elevation: 1,
  },
  tabText: {
    color: "#475569",
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
  tabTextActive: {
    color: "#1e293b",
    fontWeight: "700",
  },
  teamCount: {
    alignItems: "center",
    backgroundColor: "#eff6ff",
    borderColor: "#bfdbfe",
    borderRadius: 10,
    borderWidth: 1,
    height: 21,
    justifyContent: "center",
    minWidth: 21,
    paddingHorizontal: 4,
  },
  teamCountText: {
    color: "#2563eb",
    fontSize: 11,
    fontWeight: "700",
  },
  metricsGrid: {
    gap: 12,
  },
  metricRow: {
    flexDirection: "row",
    gap: 12,
  },
  metricColumn: {
    flex: 1,
    minWidth: 0,
  },
  loadingBox: {
    minHeight: 240,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  mutedText: {
    color: "#64748b",
    fontSize: 14,
  },
  errorBox: {
    backgroundColor: "#fff1f2",
    borderColor: "#fecdd3",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 8,
  },
  errorText: {
    color: "#9f1239",
    fontSize: 14,
  },
  retryText: {
    color: "#be123c",
    fontWeight: "800",
  },
});