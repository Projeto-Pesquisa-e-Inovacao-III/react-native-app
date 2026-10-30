import React from "react";
import { Pressable, Text, View } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react-native";
import PersonalScheduleScreen from "../personal-schedule";
import { findPersonalRequests } from "../../../../src/constants/schedule";
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("../../../../src/constants/schedule", () => ({ findPersonalRequests: jest.fn() }));
jest.mock("../../../../src/contexts/NotificationContext", () => ({ useNotifications: () => ({}) }));
jest.mock("lucide-react-native", () => { const React = require("react"); const { View } = require("react-native"); const Icon = () => <View />; return new Proxy({}, { get: () => Icon }); });
jest.mock("../../../../src/components/ScreenHeader", () => ({ children }) => { const { View } = require("react-native"); return <View>{children}</View>; });
jest.mock("../../../../src/components/modals/NotificationCenterModal", () => () => null);
jest.mock("../../../../src/components/VoiceRecorderButton", () => () => null);
const renderScreen = async () => await render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}><PersonalScheduleScreen /></QueryClientProvider>);
const eventDate = new Date().toISOString().slice(0, 10);
const event = { agendamentoId: 3, tipoAula: "PRESENCIAL", nome: "Ana", dataInicio: `${eventDate}T09:00:00`, dataFim: `${eventDate}T10:00:00`, status: "APROVADO" };
describe("PersonalScheduleScreen", () => {
  beforeEach(() => { jest.clearAllMocks(); });

  describe("quando existem eventos", () => {
    beforeEach(async () => {
      findPersonalRequests.mockResolvedValue({ data: [event] });
      await renderScreen();
      await waitFor(() => expect(screen.getByText("Ana")).toBeOnTheScreen());
    });

    it("renderiza eventos e estatísticas", () => { expect(screen.getByText("Aprovados")).toBeOnTheScreen(); expect(screen.getByText("PRESENCIAL")).toBeOnTheScreen(); });
    it("exibe o aluno no cartão do evento", () => { expect(screen.getByText("Ana")).toBeOnTheScreen(); });
  });

  describe("quando a API retorna um cenário alternativo", () => {
    it("mostra a semana sem horários no retorno vazio", async () => {
      findPersonalRequests.mockResolvedValue({ data: [] });
      await renderScreen();
      expect((await screen.findAllByText("Sem horários agendados")).length).toBeGreaterThan(0);
    });

    it("mantém a tela utilizável quando a API falha", async () => {
      findPersonalRequests.mockRejectedValue(new Error("offline"));
      await renderScreen();
      await waitFor(() => expect(findPersonalRequests).toHaveBeenCalled());
      expect(screen.getByText("Resumo da semana")).toBeOnTheScreen();
    });
  });
});
