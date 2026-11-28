import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import AiPanelModal from "../AiPanelModal";
import { getStudentTrainingMetrics } from "../../../constants/schedule";

jest.mock("lucide-react-native", () => {
  const React = require("react");
  const { View } = require("react-native");
  const Icon = () => <View />;
  return new Proxy({}, { get: () => Icon });
});

jest.mock("../../../constants/schedule", () => ({
  getStudentTrainingMetrics: jest.fn(),
}));

jest.mock("react-native-body-highlighter", () => {
  const React = require("react");
  const { View } = require("react-native");
  return function MockBody({ side }) {
    return React.createElement(View, { testID: `body-${side}` });
  };
});

describe("AiPanelModal recommendation formatting", () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it("renders workout sections, exercise prescriptions, and care notes", async () => {
    await render(
      <AiPanelModal
        visible
        onClose={jest.fn()}
        recommendationText={`Objetivo do treino
Emagrecimento

Nível de intensidade
Alta

Grupos musculares principais
QUADRICEPS, POSTERIOR, GLUTEO, ABDOMEN

Exercícios
1. Agachamento livre - 4 x 15
2. Avanço em passada alternada - 3 x 12 por perna

Cuidados
- Manter a técnica correta e a postura neutra da coluna.`}
      />,
    );

    expect(screen.getByText("Objetivo do treino")).toBeOnTheScreen();
    expect(screen.getByText("Emagrecimento")).toBeOnTheScreen();
    expect(screen.getByText("Alta")).toBeOnTheScreen();
    expect(screen.getByText("QUADRICEPS")).toBeOnTheScreen();
    expect(screen.getByText("Agachamento livre")).toBeOnTheScreen();
    expect(screen.getByText("4 x 15")).toBeOnTheScreen();
    expect(
      screen.getByText("Avanço em passada alternada"),
    ).toBeOnTheScreen();
    expect(screen.getByText("3 x 12 por perna")).toBeOnTheScreen();
    expect(
      screen.getByText("Manter a técnica correta e a postura neutra da coluna."),
    ).toBeOnTheScreen();
    expect(screen.queryByText("Métricas de treino (90 dias)")).toBeNull();
  });

  it("keeps plain-text recommendations unchanged", async () => {
    const recommendation = "Beba água antes e depois do treino.";

    await render(
      <AiPanelModal
        visible
        onClose={jest.fn()}
        recommendationText={recommendation}
      />,
    );

    expect(screen.getByText(recommendation)).toBeOnTheScreen();
  });

  it("renders collapsible training metrics accordion when studentId is provided", async () => {
    getStudentTrainingMetrics.mockResolvedValue({
      data: {
        alunoId: 42,
        periodoDias: 90,
        dataInicio: "2026-08-29",
        dataFim: "2026-11-27",
        totalTreinosConcluidos: 24,
        frequenciaSemanal: 1.9,
        maxTreinosGrupo: 8,
        distribuicaoMuscular: [
          { grupoMuscular: "PEITO", quantidade: 8, percentual: 33.3 },
        ],
      },
    });

    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    });

    await render(
      <QueryClientProvider client={queryClient}>
        <AiPanelModal
          visible
          onClose={jest.fn()}
          studentId={42}
          studentName="Maria"
          recommendationText="Treino sugerido."
        />
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(getStudentTrainingMetrics).toHaveBeenCalledWith(42, 90);
    });

    const accordionHeader = screen.getByText("Métricas de treino (90 dias)");
    expect(accordionHeader).toBeOnTheScreen();
    expect(screen.queryByText("Distribuição muscular")).toBeNull();

    await fireEvent.press(accordionHeader);

    expect(await screen.findByText("Distribuição muscular")).toBeOnTheScreen();
    expect(screen.getByText(/1,9\s+treinos\/sem/)).toBeOnTheScreen();
  });
});
