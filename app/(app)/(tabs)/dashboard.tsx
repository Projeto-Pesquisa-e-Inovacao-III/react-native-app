import { Dumbbell, Percent, RotateCcwClock, User } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { BASE_URL } from "../../../src/services/api";
import MetricCard from "src/components/MetricCard";
import DashboardChart from "src/components/DashboardChart";
import { DashboardSeriesPoint } from "src/models/dashboard";
import { formatNumber } from "src/utils/formatacao";

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

export type DashboardMetric = {
  activeStudents: number;
  salesLast30Days: number;
  inactiveStudents: number;
  activePackagesPercentage: number;
};

export type DashboardData = {
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

const DASHBOARD_ENDPOINTS = {
  sales: "/produtos-contratados/ganhos-mes/12",
  plansSales: "/produtos-contratados/planos-vendidos/30",
  sessions: "/agendamentos/consultoria-realizadas/12",
  activeStudents: "/alunos/quantidade-ativos",
  inactiveStudents: "/produtos-contratados/quantidade-e-percentual-alunos-expirados",
} as const;

async function getJson<T>(url: string, headers: Record<string, string>) {
  const response = await fetch(url, {
    method: "GET",
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(`Nao foi possivel carregar o dashboard (${response.status}).`);
  }

  return response.json() as Promise<T>;
}

async function fetchDashboardData(
  apiBaseUrl: string,
  headers: Record<string, string> = {},
): Promise<DashboardData> {
  const baseUrl = apiBaseUrl.replace(/\/$/, "");
  const [sessions, sales, plansSales, activeStudents, inactiveStudents] = await Promise.all([
    getJson<ApiMonthPoint[]>(`${baseUrl}${DASHBOARD_ENDPOINTS.sessions}`, headers),
    getJson<ApiMonthPoint[]>(`${baseUrl}${DASHBOARD_ENDPOINTS.sales}`, headers),
    getJson<number>(`${baseUrl}${DASHBOARD_ENDPOINTS.plansSales}`, headers),
    getJson<{ quantidadeAlunos: number }>(`${baseUrl}${DASHBOARD_ENDPOINTS.activeStudents}`, headers),
    getJson<{ quantidadeAlunos: number; percentualAlunos: number }>(
      `${baseUrl}${DASHBOARD_ENDPOINTS.inactiveStudents}`,
      headers,
    ),
  ]);

  return mapDashboardResponse({
    sessions,
    sales,
    plansSales,
    activeStudents: activeStudents.quantidadeAlunos,
    inactiveStudents: inactiveStudents.quantidadeAlunos,
    inactivePercentage: inactiveStudents.percentualAlunos,
  });
}

export type DashboardProps = {
  data?: DashboardData;
  apiBaseUrl?: string;
  headers?: Record<string, string>;
  loading?: boolean;
  error?: string;
  refreshing?: boolean;
  onRefresh?: () => void;
};

export default function Dashboard({
  data,
  apiBaseUrl = BASE_URL,
  headers,
  loading = false,
  error,
  refreshing = false,
  onRefresh,
}: DashboardProps) {
  const [remoteData, setRemoteData] = useState<DashboardData>();
  const [remoteLoading, setRemoteLoading] = useState(!data && !!apiBaseUrl);
  const [remoteError, setRemoteError] = useState<string>();
  const [remoteRefreshing, setRemoteRefreshing] = useState(false);
  const displayedData = data ?? remoteData;

  const loadDashboard = useCallback(async (isRefresh = false) => {
    if (!apiBaseUrl) return;

    if (isRefresh) setRemoteRefreshing(true);
    else setRemoteLoading(true);
    setRemoteError(undefined);

    try {
      setRemoteData(await fetchDashboardData(apiBaseUrl, headers));
    } catch (requestError) {
      setRemoteError(requestError instanceof Error ? requestError.message : "Nao foi possivel carregar o dashboard.");
    } finally {
      setRemoteLoading(false);
      setRemoteRefreshing(false);
    }
  }, [apiBaseUrl, headers]);

  useEffect(() => {
    if (!data && apiBaseUrl) void Promise.resolve().then(() => loadDashboard());
  }, [apiBaseUrl, data, loadDashboard]);

  const handleRefresh = onRefresh ?? (apiBaseUrl ? () => void loadDashboard(true) : undefined);
  const displayedError = error ?? remoteError;
  const displayedLoading = loading || remoteLoading;
  const displayedRefreshing = refreshing || remoteRefreshing;

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={handleRefresh ? <RefreshControl refreshing={displayedRefreshing} onRefresh={handleRefresh} /> : undefined}
    >
      <View style={styles.heading}>
        <Text style={styles.headingTitle}>Desempenho</Text>
        <Text style={styles.headingSubtitle}>Acompanhe suas metricas e resultados.</Text>
      </View>

      {displayedError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{displayedError}</Text>
          {handleRefresh ? <Pressable onPress={handleRefresh}><Text style={styles.retryText}>Tentar novamente</Text></Pressable> : null}
        </View>
      ) : null}

      {displayedLoading && !displayedData ? (
        <View style={styles.loadingBox}><ActivityIndicator color="#0f172a" /><Text style={styles.mutedText}>Carregando dashboard...</Text></View>
      ) : (
        <>
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
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f1f5f9",
    padding: 16,
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
  metricCopy: {
    flex: 1,
    paddingRight: 8
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