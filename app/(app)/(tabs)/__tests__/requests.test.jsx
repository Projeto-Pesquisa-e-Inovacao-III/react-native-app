import React from "react";
import { Text, View } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import RequestsScreen from "../requests";
import {
  findPersonalRequests,
  getScheduleData,
  acceptUserAppointment,
} from "../../../../src/constants/schedule";
import { useAuth } from "../../../../src/contexts/AuthContext";
import { useNotifications } from "../../../../src/contexts/NotificationContext";

jest.mock("../../../../src/constants/schedule", () => ({
  findPersonalRequests: jest.fn(), getScheduleData: jest.fn(),
  acceptUserAppointment: jest.fn(), refuseAppointment: jest.fn(),
  concludeAppointment: jest.fn(), reportAbsencePersonal: jest.fn(),
}));
jest.mock("../../../../src/contexts/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../../../src/contexts/NotificationContext", () => ({ useNotifications: jest.fn() }));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("lucide-react-native", () => { const React = require("react"); return new Proxy({}, { get: () => () => { const { View } = require("react-native"); return React.createElement(View); } }); });
jest.mock("../../../../src/components/ScreenHeader", () => ({ title, subtitle }) => { const { View, Text } = require("react-native"); return <View><Text>{title}</Text><Text>{subtitle}</Text></View>; });
jest.mock("../../../../src/components/VoiceRecorderButton", () => () => null);
jest.mock("../../../../src/components/BottomTabBar", () => () => null);
jest.mock("../../../../src/components/FocusAwareStatusBar", () => () => null);
jest.mock("../../../../src/components/icons/ScheduleIcons", () => {
  const React = require("react");
  return new Proxy({}, { get: () => () => { const { View } = require("react-native"); return React.createElement(View); } });
});
jest.mock("../../../../src/components/modals/DateRangePickerModal", () => () => null);
jest.mock("../../../../src/components/modals/NotificationCenterModal", () => () => null);
jest.mock("../../../../src/components/modals/ConfirmModal", () => ({ visible, onConfirm }) => {
  const { Pressable, Text } = require("react-native");
  return visible ? <Pressable onPress={onConfirm}><Text>Confirmar solicitação</Text></Pressable> : null;
});
jest.mock("../../../../src/components/modals/SuccessModal", () => () => null);
jest.mock("../../../../src/components/modals/ConcludeAppointmentModal", () => () => null);
jest.mock("../../../../src/components/modals/QRCodeScannerModal", () => () => null);
jest.mock("../../../../src/components/modals/RegisterAbsenceModal", () => () => null);

const appointment = {
  agendamentoId: 7, status: "PENDENTE_PERSONAL_APROVACAO", nome: "João",
  tipoAula: "PRESENCIAL", dataInicio: "2026-10-10T10:00:00", dataFim: "2026-10-10T11:00:00",
  endereco: { cep: { logradouro: "Rua A", bairro: "Centro", localidade: "SP" }, numero: "1" },
};
const renderScreen = () => render(<RequestsScreen />);

describe("RequestsScreen", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ roles: ["personal"] });
    useNotifications.mockReturnValue({
      unreadCount: 0,
      scheduleApprovalNotification: jest.fn(),
      scheduleCancellationNotification: jest.fn(),
      scheduleRescheduleNotification: jest.fn(),
    });
    findPersonalRequests.mockResolvedValue({ data: { content: [appointment], page: { number: 0, totalPages: 1 } } });
    getScheduleData.mockResolvedValue({ data: { totalPendente: 1, totalRespondido: 0, totalCanceladoPorMesAtual: 0 } });
    acceptUserAppointment.mockResolvedValue({});
    await renderScreen();
    await waitFor(() => expect(screen.getByText("Solicitações")).toBeOnTheScreen());
  });
  it("exibe solicitações e filtros no caminho feliz", async () => {
    expect(screen.getByText("Gerencie as solicitações de agendamentos")).toBeOnTheScreen();
    expect(screen.getByText("João")).toBeOnTheScreen();
  });
  it("mostra estado vazio quando API não retorna conteúdo", async () => {
    findPersonalRequests.mockResolvedValueOnce({ data: { content: [], page: { number: 0, totalPages: 0 } } });
    await renderScreen();
    expect(await screen.findByText("Nenhum agendamento encontrado")).toBeOnTheScreen();
  });
  it("permite aceitar uma solicitação", async () => {
    await fireEvent.press(screen.getByText("Aceitar"));
    await fireEvent.press(screen.getByText("Confirmar solicitação"));
    await waitFor(() => expect(acceptUserAppointment).toHaveBeenCalledWith(7));
  });
});
