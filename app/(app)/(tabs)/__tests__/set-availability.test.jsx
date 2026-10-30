import React from "react";
import { Pressable, Text, View } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import SetAvailabilityScreen from "../set-availability";
import {
  getPersonalBuffer,
  getPersonalCronogram,
  updateBuffer,
  updatePersonalCronogram,
  updateWorkDay,
  verifySchedules,
} from "../../../../src/constants/personal";

jest.mock("expo-router", () => ({
  useRouter: jest.fn(),
}));

jest.mock("lucide-react-native", () => {
  const React = require("react");
  const { View } = require("react-native");
  const Icon = () => React.createElement(View);

  return {
    CopyCheck: Icon,
    Info: Icon,
    Settings: Icon,
    TriangleAlert: Icon,
    AlertTriangle: Icon,
    ChevronLeft: Icon,
    ChevronRight: Icon,
    X: Icon,
  };
});

jest.mock("@react-native-picker/picker", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");

  function Picker({ selectedValue, onValueChange, children, ...props }) {
    return (
      <Pressable
        accessibilityRole="combobox"
        onPress={() => onValueChange("30")}
        testID="buffer-picker"
        {...props}
      >
        <Text>{selectedValue}</Text>
        {children}
      </Pressable>
    );
  }

  Picker.Item = ({ label }) => <Text>{label}</Text>;
  return { Picker };
});

jest.mock("../../../../src/components/modals/ErrorModal", () => {
  const React = require("react");
  const { Pressable, Text, View } = require("react-native");

  return function ErrorModal({ title, content, closeThen }) {
    return (
      <View>
        <Text>{title}</Text>
        <Text>{content}</Text>
        <Pressable accessibilityRole="button" onPress={() => closeThen(false)}>
          <Text>Fechar</Text>
        </Pressable>
      </View>
    );
  };
});

jest.mock("../../../../src/components/modals/InfoPersonalSchedulesModal", () => {
  const React = require("react");
  return function InfoPersonalSchedulesModal() {
    return null;
  };
});

jest.mock("../../../../src/constants/personal", () => ({
  getPersonalBuffer: jest.fn(),
  getPersonalCronogram: jest.fn(),
  updateBuffer: jest.fn(),
  updatePersonalCronogram: jest.fn(),
  updateWorkDay: jest.fn(),
  verifySchedules: jest.fn(),
}));

const mockedRouter = { back: jest.fn() };

const completeSchedule = [
  {
    id: "work-monday",
    diaSemana: "SEGUNDA",
    horaInicio: "08:00",
    horaFim: "12:00",
    tipo: "DISPONIVEL",
    ativo: true,
  },
  {
    id: "break-monday",
    diaSemana: "SEGUNDA",
    horaInicio: "13:00",
    horaFim: "18:00",
    tipo: "RESTRITO",
    ativo: true,
  },
];

function renderScreen(schedule = completeSchedule) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <SetAvailabilityScreen />
    </QueryClientProvider>
  );
}

describe("SetAvailabilityScreen", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    useRouter.mockReturnValue(mockedRouter);
    getPersonalCronogram.mockResolvedValue({ data: completeSchedule });
    getPersonalBuffer.mockResolvedValue({ data: { bufferMinutos: "15" } });
    updateBuffer.mockResolvedValue({});
    updatePersonalCronogram.mockResolvedValue({});
    updateWorkDay.mockResolvedValue({});
    verifySchedules.mockResolvedValue({
      data: {
        content: [],
        page: { number: 0, size: 3, totalElements: 0, totalPages: 0 },
      },
    });

    await renderScreen();
    await waitFor(() => {
      expect(screen.getByText("Segunda-feira")).toBeOnTheScreen();
    });
  });

  it("deve exibir os controles e horários quando as consultas retornam dados", () => {
    expect(screen.getByText("Intervalo pós agendamentos")).toBeOnTheScreen();
    expect(screen.getByText("Segunda-feira")).toBeOnTheScreen();
    expect(screen.getByText("Aplicar a todos")).toBeOnTheScreen();
    expect(screen.getByText("Salvar Alterações")).toBeOnTheScreen();
  });

  it("deve informar que não há horários quando um dia possui lista vazia", async () => {
    getPersonalCronogram.mockResolvedValueOnce({ data: [] });
    await renderScreen([]);

    await waitFor(() => {
      expect(screen.getAllByText("Sem horários cadastrados")).toHaveLength(7);
    });
  });

  it("deve salvar o novo intervalo e exibir confirmação no caminho feliz", async () => {
    await fireEvent.press(screen.getByTestId("buffer-picker"));
    expect(screen.getByText("Alterações feitas! Não esqueça de salvar")).toBeOnTheScreen();

    await fireEvent.press(screen.getByText("Salvar Alterações"));

    await waitFor(() => {
      expect(updateBuffer).toHaveBeenCalledWith("30");
      expect(screen.getByText("Alterações salvas!")).toBeOnTheScreen();
    });
  });

  it("deve mostrar erro quando o usuário informa um horário inválido", async () => {
    const startInputs = screen.getAllByDisplayValue("08:00");
    await fireEvent.changeText(startInputs[startInputs.length - 1], "9999");
    await fireEvent.press(screen.getByText("Salvar Alterações"));

    expect(await screen.findByText("Horário inválido")).toBeOnTheScreen();
    expect(screen.getByText("Preencha os horários no formato HH:mm.")).toBeOnTheScreen();
    expect(updatePersonalCronogram).not.toHaveBeenCalled();
  });

  it("deve exibir o erro retornado quando a API falha ao salvar", async () => {
    updateBuffer.mockRejectedValueOnce(new Error("network failure"));

    await fireEvent.press(screen.getByTestId("buffer-picker"));
    await fireEvent.press(screen.getByText("Salvar Alterações"));

    expect((await screen.findAllByText("Erro ao salvar")).length).toBeGreaterThan(0);
    expect(screen.getByText("Ocorreu um erro ao salvar as alterações.")).toBeOnTheScreen();
  });

  it("deve voltar para a tela anterior ao cancelar alterações", async () => {
    await fireEvent.press(screen.getByTestId("buffer-picker"));
    await fireEvent.press(screen.getByText("Cancelar"));

    expect(mockedRouter.back).toHaveBeenCalled();
  });
});
