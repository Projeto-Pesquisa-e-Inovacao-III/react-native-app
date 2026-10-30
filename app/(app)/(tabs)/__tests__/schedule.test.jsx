import React from "react";
import { Text, View } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import ScheduleScreen from "../schedule";
import { findUserAppointments, appointmentAtCalendar, getPersonalList, disabledPersonalDays } from "../../../../src/constants/schedule";
import { useNotifications } from "../../../../src/contexts/NotificationContext";

jest.mock("../../../../src/constants/schedule", () => ({
  findUserAppointments: jest.fn(), appointmentAtCalendar: jest.fn(), getPersonalList: jest.fn(),
  disabledPersonalDays: jest.fn(), findAppointmentById: jest.fn(), acceptUserAppointment: jest.fn(), refuseAppointment: jest.fn(),
}));
jest.mock("../../../../src/constants/personal", () => ({ getPersonalHours: jest.fn() }));
jest.mock("../../../../src/contexts/NotificationContext", () => ({ useNotifications: jest.fn() }));
jest.mock("expo-router", () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock("@tanstack/react-query", () => ({ useQueryClient: () => ({ invalidateQueries: jest.fn() }) }));
jest.mock("react-native-safe-area-context", () => ({ SafeAreaView: ({ children }) => { const { View } = require("react-native"); return <View>{children}</View>; } }));
jest.mock("lucide-react-native", () => { const React = require("react"); return new Proxy({}, { get: () => () => { const { View } = require("react-native"); return React.createElement(View); } }); });
jest.mock("react-native-qrcode-svg", () => () => null);
jest.mock("../../../../src/components/FocusAwareStatusBar", () => () => null);
jest.mock("../../../../src/components/BottomTabBar", () => () => null);
jest.mock("../../../../src/components/VoiceRecorderButton", () => () => null);
jest.mock("../../../../src/components/MonthlyCalendar", () => () => null);
jest.mock("../../../../src/components/NewEvent", () => () => null);
jest.mock("../../../../src/components/modals/NotificationCenterModal", () => () => null);
jest.mock("../../../../src/components/modals/QRCodeDisplayModal", () => () => null);
jest.mock("../../../../src/components/modals/PopupModal", () => () => null);

const renderScreen = () => render(<ScheduleScreen />);
describe("ScheduleScreen", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    useNotifications.mockReturnValue({ unreadCount: 0, scheduleAppointmentNotification: jest.fn() });
    findUserAppointments.mockResolvedValue({ data: [] });
    appointmentAtCalendar.mockResolvedValue({ data: [] });
    getPersonalList.mockResolvedValue({ data: [] });
    disabledPersonalDays.mockResolvedValue({ data: [] });
    await renderScreen();
    await waitFor(() => expect(screen.getByText("Meus agendamentos")).toBeOnTheScreen());
  });
  it("exibe estado vazio e botão para agendar", () => {
    expect(screen.getByText("Nenhum horário neste dia")).toBeOnTheScreen();
    expect(screen.getByText("Agendar")).toBeOnTheScreen();
  });
  it("aceita resposta de API vazia sem falhar", async () => {
    findUserAppointments.mockResolvedValueOnce({ data: null });
    await renderScreen();
    await waitFor(() => expect(screen.getByText("Nenhum horário neste dia")).toBeOnTheScreen());
  });
  it("mostra erro de carregamento como lista vazia", async () => {
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    try {
      findUserAppointments.mockRejectedValueOnce(new Error("offline"));
      await renderScreen();
      await waitFor(() => expect(screen.getByText("Nenhum horário neste dia")).toBeOnTheScreen());
    } finally {
      warnSpy.mockRestore();
    }
  });
});
