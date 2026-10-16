import React from "react";
import { Pressable, Text, View } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import ScheduleDetailsScreen from "../schedule-details";
import { findAppointmentById, appointmentAtCalendar, getAppointmentResumes } from "../../../../src/constants/schedule";
const mockReplace = jest.fn();
jest.mock("expo-router", () => ({ useRouter: () => ({ back: jest.fn(), replace: mockReplace, push: jest.fn() }), useLocalSearchParams: () => ({ id: "4" }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock("../../../../src/contexts/AuthContext", () => ({ useAuth: () => ({ roles: ["personal"] }) }));
jest.mock("../../../../src/constants/schedule", () => ({
  findAppointmentById: jest.fn(), appointmentAtCalendar: jest.fn(), getAppointmentResumes: jest.fn(),
  acceptUserAppointment: jest.fn(), refuseAppointment: jest.fn(), concludeAppointment: jest.fn(), reportAbsencePersonal: jest.fn(), appointmentAtCalendar: jest.fn(),
}));
jest.mock("lucide-react-native", () => { const React = require("react"); const { View } = require("react-native"); const Icon = () => <View />; return new Proxy({}, { get: () => Icon }); });
jest.mock("../../../../src/components/UserAvatar", () => () => { const { View } = require("react-native"); return <View />; });
jest.mock("../../../../src/components/SummaryCard", () => () => null);
jest.mock("../../../../src/components/GoogleMapEmbed", () => ({ GoogleMapEmbed: ({ query }) => { const { Text } = require("react-native"); return <Text>{query}</Text>; } }));
jest.mock("../../../../src/components/NewEvent", () => () => null);
jest.mock("../../../../src/components/modals/TimerModal", () => () => null);
jest.mock("../../../../src/components/modals/ConcludeAppointmentModal", () => () => null);
jest.mock("../../../../src/components/modals/RegisterAbsenceModal", () => () => null);
jest.mock("../../../../src/components/modals/AiPanelModal", () => () => null);
jest.mock("../../../../src/components/modals/SuccessModal", () => ({ visible, title, content }) => { const { Text } = require("react-native"); return visible ? <Text>{title} {content}</Text> : null; });
jest.mock("../../../../src/components/modals/ErrorModal", () => ({ title, content }) => { const { Text } = require("react-native"); return <Text>{title} {content}</Text>; });
const appointment = { id: 4, status: "APROVADO", nome: "ignored", dataInicio: "2026-10-09T09:00:00", dataFim: "2026-10-09T10:00:00", tipoAula: "PRESENCIAL", personal: { nome: "Carlos", idade: 30 }, aluno: { id: 8, nome: "João", idade: 28 }, endereco: { numero: "10", cep: { logradouro: "Rua A", bairro: "Centro", uf: "SP" } } };
let view;
const renderScreen = async () => { view = await render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } })}><ScheduleDetailsScreen /></QueryClientProvider>); return view; };
describe("ScheduleDetailsScreen", () => {
  beforeEach(() => { jest.resetAllMocks(); });

  describe("quando o agendamento existe", () => {
    beforeEach(async () => {
      findAppointmentById.mockResolvedValue({ data: appointment });
      appointmentAtCalendar.mockResolvedValue({ data: [] });
      getAppointmentResumes.mockResolvedValue({ data: { content: [] } });
      await renderScreen();
      await waitFor(() => expect(screen.getByText("Detalhes do agendamento")).toBeOnTheScreen());
    });

    it("renderiza dados do agendamento", async () => { expect(await screen.findByText("João")).toBeOnTheScreen(); expect(screen.getByText("09:00 - 10:00")).toBeOnTheScreen(); expect(screen.getByText("Marcado")).toBeOnTheScreen(); });
  });

  it("redireciona quando o agendamento não existe", async () => {
    findAppointmentById.mockRejectedValue({ response: { status: 404 } });
    appointmentAtCalendar.mockResolvedValue({ data: [] });
    await renderScreen();
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/(app)/(tabs)"));
  });

  it("mantém fallback para endereço ausente", async () => {
    findAppointmentById.mockResolvedValue({ data: { ...appointment, endereco: undefined } });
    appointmentAtCalendar.mockResolvedValue({ data: [] });
    await renderScreen();
    expect(await screen.findByText("Endereço não informado")).toBeOnTheScreen();
  });
});
