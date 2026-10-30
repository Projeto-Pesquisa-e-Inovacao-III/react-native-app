import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import AnamnesisScreen from "../anamnesis";
import { createAnamnesis } from "../../../src/constants/anamnesis";

jest.mock("expo-router", () => ({ useRouter: jest.fn() }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("lucide-react-native", () => { const React = require("react"); const { View } = require("react-native"); const Icon = () => React.createElement(View); return new Proxy({ __esModule: true }, { get: (_, key) => key === "__esModule" ? true : Icon }); });
jest.mock("../../../src/contexts/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../../src/constants/anamnesis", () => ({ createAnamnesis: jest.fn() }));
jest.mock("../../../src/components/modals/SuccessModal", () => ({ visible, title, content }) => { const { Text } = require("react-native"); return visible ? <Text>{title}{content}</Text> : null; });
jest.mock("../../../src/components/modals/ErrorModal", () => ({ visible, title, content }) => { const { Text } = require("react-native"); return visible ? <Text>{title}{content}</Text> : null; });

const { useAuth } = require("../../../src/contexts/AuthContext");
const router = { back: jest.fn(), replace: jest.fn() };
async function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><AnamnesisScreen /></QueryClientProvider>);
  await waitFor(() => expect(screen.getByText("Continuar para Etapa 2")).toBeOnTheScreen());
}
describe("AnamnesisScreen", () => {
  beforeEach(async () => { jest.clearAllMocks(); useRouter.mockReturnValue(router); useAuth.mockReturnValue({ refreshAuth: jest.fn().mockResolvedValue({}) }); createAnamnesis.mockResolvedValue({}); await renderScreen(); });
  it("valida campos obrigatórios da primeira etapa", async () => { await fireEvent.press(screen.getByText("Continuar para Etapa 2")); expect(screen.getByText("Preencha a altura, o peso e selecione um objetivo.")).toBeOnTheScreen(); });
  it("conclui anamnese com medidas e atividade válidas", async () => {
    await fireEvent.changeText(screen.getByPlaceholderText("Ex: 175"), "175");
    await fireEvent.changeText(screen.getByPlaceholderText("Ex: 72.5"), "72.5");
    await fireEvent.press(screen.getByText("Emagrecimento"));
    await fireEvent.press(screen.getByText("Continuar para Etapa 2"));
    await fireEvent.press(screen.getByText("Ativo regularmente"));
    await fireEvent.press(screen.getByText("Concluir Anamnese"));
    await waitFor(() => expect(createAnamnesis).toHaveBeenCalledWith(expect.objectContaining({ altura: 175, peso: 72.5, nivelDeAtividade: "ATIVO" })));
    expect(screen.getByText(/Anamnese concluída!/)).toBeOnTheScreen();
  });
  it("impede avanço com medidas fora do limite", async () => {
    await fireEvent.changeText(screen.getByPlaceholderText("Ex: 175"), "80");
    await fireEvent.changeText(screen.getByPlaceholderText("Ex: 72.5"), "10");
    await fireEvent.press(screen.getByText("Emagrecimento"));
    await fireEvent.press(screen.getByText("Continuar para Etapa 2"));
    expect(screen.getByText(/altura deve estar entre|peso deve estar entre/i)).toBeOnTheScreen();
    expect(createAnamnesis).not.toHaveBeenCalled();
  });
});
