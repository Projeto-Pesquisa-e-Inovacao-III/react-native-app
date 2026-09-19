import { Dumbbell, Percent, RotateCcwClock, User } from "lucide-react-native";
import React from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  getConsultingSessions,
  getPlansSalesQuantity,
  getQuantityofActiveStudents,
  getQuantityofInactiveStudents,
  getSalesQuantity,
} from "../../../src/constants/dashboard";
import MetricCard from "src/components/MetricCard";
import DashboardChart from "src/components/DashboardChart";
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
    <ScrollView
      style={styles.screen}
      refreshControl={<RefreshControl refreshing={displayedRefreshing} onRefresh={handleRefresh} />}
    >
      <FocusAwareStatusBar style="dark" />
      <View style={styles.heading}>
        <Text style={styles.headingTitle}>Desempenho</Text>
        <Text style={styles.headingSubtitle}>Acompanhe suas metricas e resultados.</Text>
      </View>

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
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    padding: 8,
    paddingBottom: 40
  },
  heading: {
    paddingTop: 8,
    paddingBottom: 28
  },
  headingTitle: {
    color: "#0f172a",
    fontSize: 32,
    fontWeight: "800",
    marginTop: 4
  },
  headingSubtitle: {
    color: "#64748b",
    fontSize: 14,
    marginTop: 5
  },
  metricsGrid: {
    gap: 12
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
    gap: 10
  },
  mutedText: {
    color: "#64748b",
    fontSize: 14
  },
  errorBox: {
    backgroundColor: "#fff1f2",
    borderColor: "#fecdd3",
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 8
  },
  errorText: {
    color: "#9f1239",
    fontSize: 14
  },
  retryText: {
    color: "#be123c",
    fontWeight: "800"
  },
});