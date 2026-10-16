import React from "react";
import { Alert } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import EditAnamnesisScreen from "../edit-anamnesis";
import { getAnamnesis, updateAnamnesis } from "../../../../src/constants/anamnesis";

jest.mock("expo-router", () => ({ useRouter: jest.fn() }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("lucide-react-native", () => { const React = require("react"); const { View } = require("react-native"); const Icon = () => React.createElement(View); return new Proxy({}, { get: (_, key) => key === "__esModule" ? false : Icon }); });
jest.mock("../../../../src/constants/anamnesis", () => ({ getAnamnesis: jest.fn(), updateAnamnesis: jest.fn() }));
jest.mock("../../../../src/components/AsideEditUser", () => () => null);

const router = { back: jest.fn(), replace: jest.fn() };
const data = { altura: 175, peso: 72, objectivoPrincipal: "EMAGRECIMENTO", rotina: "Corrida", condicoes: [], nivelDeAtividade: "ATIVO", observacaoSaude: "" };
async function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  await render(<QueryClientProvider client={client}><EditAnamnesisScreen /></QueryClientProvider>);
  await waitFor(() => expect(screen.getByDisplayValue("175")).toBeOnTheScreen());
}

describe("EditAnamnesisScreen", () => {
  beforeEach(async () => {
    jest.clearAllMocks(); useRouter.mockReturnValue(router); getAnamnesis.mockResolvedValue({ data }); updateAnamnesis.mockResolvedValue({});
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    await renderScreen();
  });
  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it("carrega dados e salva alterações válidas", async () => {
    await fireEvent.changeText(screen.getByDisplayValue("175"), "180");
    await fireEvent.press(screen.getByText("Atualizar Anamnese"));
    await waitFor(() => expect(updateAnamnesis).toHaveBeenCalledWith(expect.objectContaining({ altura: 180, peso: 72, rotina: "Corrida" })));
    expect(Alert.alert).toHaveBeenCalledWith("Anamnese atualizada!", expect.any(String), expect.any(Array));
  });
  it("bloqueia altura fora do intervalo permitido", async () => {
    await fireEvent.changeText(screen.getByDisplayValue("175"), "90");
    await fireEvent.press(screen.getByText("Atualizar Anamnese"));
    expect(screen.getByText("Altura deve estar entre 100 e 250 cm.")).toBeOnTheScreen();
    expect(updateAnamnesis).not.toHaveBeenCalled();
  });
  it("exibe alerta quando a API falha", async () => {
    updateAnamnesis.mockRejectedValueOnce(new Error("network"));
    await fireEvent.press(screen.getByText("Atualizar Anamnese"));
    await waitFor(() => expect(Alert.alert).toHaveBeenCalledWith("Erro ao atualizar anamnese", expect.any(String)));
  });
});
