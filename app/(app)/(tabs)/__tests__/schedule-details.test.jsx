import React from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import ScheduleDetailsScreen from "../schedule-details";
import {
  acceptUserAppointment,
  appointmentAtCalendar,
  concludeAppointment,
  findAppointmentById,
  getAppointmentResumes,
  refuseAppointment,
  reportAbsencePersonal,
} from "../../../../src/constants/schedule";
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
jest.mock("../../../../src/components/modals/TimerModal", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");
  return ({ title, buttonTitle, callSuccessModal }) =>
    React.createElement(
      View,
      null,
      React.createElement(Text, null, title),
      React.createElement(
        Pressable,
        { accessibilityRole: "button", onPress: callSuccessModal },
        React.createElement(Text, null, buttonTitle)
      )
    );
});
jest.mock("../../../../src/components/modals/ConcludeAppointmentModal", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return ({ onSubmit }) =>
    React.createElement(
      Pressable,
      {
        accessibilityRole: "button",
        onPress: () => onSubmit({ resumo: "Resumo", grupoMuscular: ["Peito"] }),
      },
      React.createElement(Text, null, "Confirmar conclusão")
    );
});
jest.mock("../../../../src/components/modals/RegisterAbsenceModal", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return ({ onSubmit }) =>
    React.createElement(
      Pressable,
      {
        accessibilityRole: "button",
        onPress: () => onSubmit({ type: "PERSONAL", description: "" }),
      },
      React.createElement(Text, null, "Confirmar ausência")
    );
});
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

  it("deve abrir o perfil do aluno e as direções quando o personal toca nos controles", async () => {
    jest.spyOn(Linking, "openURL").mockResolvedValue();
    findAppointmentById.mockResolvedValue({
      data: {
        ...appointment,
        personal: { ...appointment.personal, telefone: { numero: "(11) 99999-8888" } },
      },
    });
    appointmentAtCalendar.mockResolvedValue({ data: [] });
    getAppointmentResumes.mockResolvedValue({ data: { content: [] } });
    await renderScreen();
    await waitFor(() => expect(screen.getByText("Detalhes do agendamento")).toBeOnTheScreen());

    await fireEvent.press(screen.getByText("João"));
    await fireEvent.press(screen.getByText("Direções"));

    expect(Linking.openURL).toHaveBeenCalled();
  });

  it("deve aceitar uma solicitação e mostrar o sucesso quando a API conclui", async () => {
    findAppointmentById.mockResolvedValue({ data: { ...appointment, status: "PENDENTE_PERSONAL_APROVACAO" } });
    appointmentAtCalendar.mockResolvedValue({ data: [] });
    getAppointmentResumes.mockResolvedValue({ data: { content: [] } });
    acceptUserAppointment.mockResolvedValue({});
    await renderScreen();
    await waitFor(() => expect(screen.getByText("Aceitar")).toBeOnTheScreen());

    await fireEvent.press(screen.getByText("Aceitar"));
    await fireEvent.press(screen.getByText("Aceitar agendamento"));

    await waitFor(() => {
      expect(acceptUserAppointment).toHaveBeenCalledWith(4);
      expect(screen.getByText(/Agendamento Aceito/)).toBeOnTheScreen();
    });
  });

  it("deve exibir a mensagem padrão quando a recusa falha sem resposta da API", async () => {
    findAppointmentById.mockResolvedValue({ data: { ...appointment, status: "PENDENTE_PERSONAL_APROVACAO" } });
    appointmentAtCalendar.mockResolvedValue({ data: [] });
    getAppointmentResumes.mockResolvedValue({ data: { content: [] } });
    refuseAppointment.mockRejectedValueOnce(new Error("offline"));
    await renderScreen();
    await waitFor(() => expect(screen.getByText("Recusar")).toBeOnTheScreen());

    await fireEvent.press(screen.getByText("Recusar"));
    const declineButtons = screen.getAllByText("Recusar agendamento");
    await fireEvent.press(declineButtons[declineButtons.length - 1]);

    await waitFor(() =>
      expect(screen.getByText(/Ocorreu um erro ao recusar o agendamento\./)).toBeOnTheScreen()
    );
  });

  it("deve enviar os dados de conclusão quando o personal conclui uma aula", async () => {
    findAppointmentById.mockResolvedValue({
      data: { ...appointment, status: "PENDENTE_PERSONAL_CONCLUIR" },
    });
    appointmentAtCalendar.mockResolvedValue({ data: [] });
    getAppointmentResumes.mockResolvedValue({ data: { content: [] } });
    concludeAppointment.mockResolvedValue({});
    await renderScreen();
    await waitFor(() => expect(screen.getByText("Concluir aula")).toBeOnTheScreen());

    await fireEvent.press(screen.getByText("Concluir aula"));
    await fireEvent.press(screen.getByText("Confirmar conclusão"));

    await waitFor(() => {
      expect(concludeAppointment).toHaveBeenCalledWith(4, {
        resumo: "Resumo",
        grupoMuscular: ["Peito"],
      });
      expect(screen.getByText(/Agendamento Concluído/)).toBeOnTheScreen();
    });
  });

  it("deve registrar ausência com descrição vazia quando a API conclui", async () => {
    findAppointmentById.mockResolvedValue({
      data: { ...appointment, status: "PENDENTE_PERSONAL_CONCLUIR" },
    });
    appointmentAtCalendar.mockResolvedValue({ data: [] });
    getAppointmentResumes.mockResolvedValue({ data: { content: [] } });
    reportAbsencePersonal.mockResolvedValue({});
    await renderScreen();
    await waitFor(() => expect(screen.getByText("Registrar ausência")).toBeOnTheScreen());

    await fireEvent.press(screen.getByText("Registrar ausência"));
    await fireEvent.press(screen.getByText("Confirmar ausência"));

    await waitFor(() => {
      expect(reportAbsencePersonal).toHaveBeenCalledWith({
        idAgendamento: 4,
        tipoUsuario: "PERSONAL",
        descricaoCancelamento: "",
      });
      expect(screen.getByText(/Ausência Registrada/)).toBeOnTheScreen();
    });
  });
});
