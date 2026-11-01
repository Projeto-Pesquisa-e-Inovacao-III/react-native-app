import React from "react";
import { render, screen } from "@testing-library/react-native";
import AiPanelModal from "../AiPanelModal";

jest.mock("lucide-react-native", () => {
  const React = require("react");
  const { View } = require("react-native");
  const Icon = () => <View />;
  return new Proxy({}, { get: () => Icon });
});

describe("AiPanelModal recommendation formatting", () => {
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
});
