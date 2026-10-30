import React from "react";
import { Pressable, Text, View } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import Dashboard from "../dashboard";
import {
  getConsultingSessions,
  getPlansSalesQuantity,
  getQuantityofActiveStudents,
  getQuantityofInactiveStudents,
  getSalesQuantity,
} from "../../../../src/constants/dashboard";

jest.mock("expo-router", () => ({ useRouter: jest.fn() }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("lucide-react-native", () => {
  const React = require("react");
  return new Proxy({}, { get: () => () => { const { View } = require("react-native"); return React.createElement(View); } });
});
jest.mock("../../../../src/components/FocusAwareStatusBar", () => () => null);
jest.mock("../../../../src/components/MetricCard", () => ({ title, value }) => { const { View, Text } = require("react-native"); return <View><Text>{title}</Text><Text>{value}</Text></View>; });
jest.mock("../../../../src/components/DashboardChart", () => ({ title }) => { const { Text } = require("react-native"); return <Text>{title}</Text>; });
jest.mock("../../../../src/utils/formatacao", () => ({ formatNumber: (value) => String(value) }));
jest.mock("../../../../src/constants/dashboard", () => ({
  getConsultingSessions: jest.fn(), getPlansSalesQuantity: jest.fn(),
  getQuantityofActiveStudents: jest.fn(), getQuantityofInactiveStudents: jest.fn(),
  getSalesQuantity: jest.fn(),
}));

const apiData = () => {
  getConsultingSessions.mockResolvedValue({ data: [{ mes: 1, totalConsultorias: 4 }] });
  getSalesQuantity.mockResolvedValue({ data: [{ mes: 1, totalPreco: 120 }] });
  getPlansSalesQuantity.mockResolvedValue({ data: 300 });
  getQuantityofActiveStudents.mockResolvedValue({ data: { quantidadeAlunos: 8 } });
  getQuantityofInactiveStudents.mockResolvedValue({ data: { quantidadeAlunos: 2, percentualAlunos: 20 } });
};
const renderScreen = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><Dashboard /></QueryClientProvider>);

describe("Dashboard", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    useRouter.mockReturnValue({ replace: jest.fn() });
    apiData();
    await renderScreen();
    await waitFor(() => expect(screen.getByText("Alunos com pacotes ativos")).toBeOnTheScreen());
  });
  it("exibe métricas e gráficos no caminho feliz", () => {
    expect(screen.getByText("8")).toBeOnTheScreen();
    expect(screen.getByText("80.00%")).toBeOnTheScreen();
    expect(screen.getByText("Consultorias por mês")).toBeOnTheScreen();
  });
  it("usa valores padrão para campos ausentes", async () => {
    getConsultingSessions.mockResolvedValueOnce({ data: [{ mes: 13 }] });
    await renderScreen();
    await waitFor(() => expect(screen.getByText("Consultorias por mês")).toBeOnTheScreen());
  });
  it("exibe erro da API e permite tentar novamente", async () => {
    getConsultingSessions.mockRejectedValueOnce(new Error("falha de rede"));
    await renderScreen();
    expect(await screen.findByText("falha de rede")).toBeOnTheScreen();
    expect(screen.getByText("Tentar novamente")).toBeOnTheScreen();
  });
});
