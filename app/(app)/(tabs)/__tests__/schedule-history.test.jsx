import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useFocusEffect, useRouter } from "expo-router";
import ScheduleHistoryRoute from "../schedule-history";
import { findPersonalRequests } from "../../../../src/constants/schedule";

jest.mock("expo-router", () => ({ useRouter: jest.fn(), useFocusEffect: jest.fn() }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("lucide-react-native", () => { const React = require("react"); const { View } = require("react-native"); const Icon = () => React.createElement(View); return new Proxy({ __esModule: true }, { get: (_, key) => key === "__esModule" ? true : Icon }); });
jest.mock("../../../../src/constants/schedule", () => ({ findPersonalRequests: jest.fn() }));
jest.mock("../../../../src/components/modals/DateRangePickerModal", () => ({ visible, onApply, onClose }) => {
  const { Text, Pressable } = require("react-native");
  return visible ? <><Text>Período</Text><Pressable onPress={() => { onApply({ start: "2026-01-01", end: "2026-01-31" }); onClose(); }}><Text>Aplicar período</Text></Pressable></> : null;
});
jest.mock("../../../../src/components/InputWithIcon", () => ({ placeholder, value, onInputChange }) => {
  const { TextInput } = require("react-native"); return <TextInput placeholder={placeholder} value={value} onChangeText={onInputChange} />;
});

const { Pressable, Text } = require("react-native");
const router = { back: jest.fn(), push: jest.fn() };
const response = { content: [{ agendamentoId: 4, dataInicio: "2026-01-10T10:00:00", tipoAula: "Musculação", status: "CONCLUIDO", endereco: null }], page: { number: 0, size: 10, totalElements: 1, totalPages: 1 } };
async function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  await render(<QueryClientProvider client={client}><ScheduleHistoryRoute /></QueryClientProvider>);
  await waitFor(() => expect(screen.getByText("Musculação")).toBeOnTheScreen());
}
describe("ScheduleHistoryRoute", () => {
  beforeEach(async () => { jest.clearAllMocks(); useRouter.mockReturnValue(router); findPersonalRequests.mockResolvedValue({ data: response }); await renderScreen(); });
  it("exibe agendamento e permite abrir detalhes", async () => { expect(screen.getByText(/Status: concluído/i)).toBeOnTheScreen(); await fireEvent.press(screen.getByText("Ver Detalhes")); expect(router.push).toHaveBeenCalledWith({ pathname: "/(app)/(tabs)/schedule-details", params: { id: 4 } }); });
  it("mostra estado vazio quando não há resultados", async () => { findPersonalRequests.mockResolvedValueOnce({ data: { ...response, content: [] } }); await render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}><ScheduleHistoryRoute /></QueryClientProvider>); expect(await screen.findByText("Não há agendamentos para exibir")).toBeOnTheScreen(); });
  it("aplica filtro de período", async () => { await fireEvent.press(screen.getByLabelText("Filtrar por período")); await fireEvent.press(screen.getByText("Aplicar período")); await waitFor(() => expect(findPersonalRequests).toHaveBeenCalledWith(expect.any(Number), "10", expect.any(String), expect.any(String), undefined, undefined, undefined)); });
});
