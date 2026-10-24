import React from "react";
import { Pressable, Text, View } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PlansScreen from "../plans";
import { useAuth } from "../../../../src/contexts/AuthContext";
import { getProductsExhibitions, buyProductExhibition } from "../../../../src/constants/products";

jest.mock("../../../../src/contexts/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../../../src/constants/products", () => ({ getProductsExhibitions: jest.fn(), buyProductExhibition: jest.fn(), desactivateProductExhibition: jest.fn() }));
jest.mock("../../../../src/components/FocusAwareStatusBar", () => () => null);
jest.mock("../../../../src/components/VoiceRecorderButton", () => () => null);
jest.mock("react-native-safe-area-context", () => ({ SafeAreaView: ({ children }) => { const { View } = require("react-native"); return <View>{children}</View>; } }));
jest.mock("../../../../src/components/PackageCard", () => ({ PackageCard: ({ titulo, onClick }) => { const { Pressable, Text } = require("react-native"); return <Pressable onPress={onClick}><Text>{titulo}</Text></Pressable>; } }));
jest.mock("../../../../src/components/modals/PagBankModal", () => () => { const { Text } = require("react-native"); return <Text>Pagamento</Text>; });
jest.mock("../../../../src/components/modals/SuccessModal", () => ({ visible, title, content }) => { const { View, Text } = require("react-native"); return visible ? <View><Text>{title}</Text><Text>{content}</Text></View> : null; });
jest.mock("../../../../src/components/modals/ErrorModal", () => ({ title, content }) => { const { View, Text } = require("react-native"); return <View><Text>{title}</Text><Text>{content}</Text></View>; });
jest.mock("../../../../src/components/modals/AddPackagePlan", () => ({ title }) => { const { Text } = require("react-native"); return <Text>{title}</Text>; });
jest.mock("../../../../src/components/modals/TimerModal", () => () => null);

const product = { id: 1, titulo: "Plano mensal", subtitulo: "Plano", preco: 100, duracaoMes: 1, tipoAula: "PRESENCIAL", quantidadeAula: 4, status: "ATIVO", tipoProduto: "PACOTE", beneficios: [] };
const renderScreen = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><PlansScreen /></QueryClientProvider>);

describe("PlansScreen", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ roles: ["aluno"] });
    getProductsExhibitions.mockResolvedValue({ data: [product] });
    buyProductExhibition.mockResolvedValue({});
    await renderScreen();
    await waitFor(() => expect(screen.getByText("Plano mensal")).toBeOnTheScreen());
  });
  it("lista pacotes ativos e alterna para adicionais vazios", async () => {
    expect(screen.getByText("Pacotes e Adicionais")).toBeOnTheScreen();
    await fireEvent.press(screen.getByText("Adicionais"));
    expect(screen.getByText("Nenhum adicional ativo no momento.")).toBeOnTheScreen();
  });
  it("inicia compra ao tocar no pacote", async () => {
    await fireEvent.press(screen.getByText("Plano mensal"));
    expect(buyProductExhibition).toHaveBeenCalledWith(1);
  });
  it("exibe estado vazio quando API não retorna produtos", async () => {
    getProductsExhibitions.mockResolvedValueOnce({ data: [] });
    await renderScreen();
    expect(await screen.findByText("Nenhum pacote ativo no momento.")).toBeOnTheScreen();
  });
});
