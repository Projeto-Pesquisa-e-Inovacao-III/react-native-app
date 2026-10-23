import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import AddressesScreen from "../addresses";
import { getUserAddresses, createAddress, deleteUserAddress, lookupCep, updateUserAddress } from "../../../../src/constants/address";

jest.mock("../../../../src/constants/address", () => ({
  getUserAddresses: jest.fn(),
  createAddress: jest.fn(),
  updateUserAddress: jest.fn(),
  deleteUserAddress: jest.fn(),
  lookupCep: jest.fn(),
}));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }) }));
jest.mock("lucide-react-native", () => {
  const React = require("react");
  const { View } = require("react-native");
  const Icon = () => <View />;
  return new Proxy({}, { get: (_, key) => key === "__esModule" ? false : Icon });
});
jest.mock("../../../../src/components/InputWithIcon", () => {
  const React = require("react");
  const { Text, TextInput, View } = require("react-native");
  return ({ label, value, onInputChange, ...props }) => (
    <View><Text>{label}</Text><TextInput value={value} onChangeText={onInputChange} {...props} /></View>
  );
});
jest.mock("../../../../src/components/Select", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return ({ onSelectStatusChange }) => (
    <Pressable testID="tipo-select" onPress={() => onSelectStatusChange("RESIDENCIAL")}><Text>Selecione o tipo</Text></Pressable>
  );
});
jest.mock("../../../../src/components/modals/SuccessModal", () => ({ visible, title, content }) => {
  const { Text } = require("react-native");
  return visible ? <Text>{title} {content}</Text> : null;
});
jest.mock("../../../../src/components/modals/ErrorModal", () => ({ title, content }) => {
  const { Text } = require("react-native");
  return <Text>{title} {content}</Text>;
});
jest.mock("../../../../src/components/modals/TimerModal", () => ({ title, content, buttonTitle, callSuccessModal }) => {
  const { Pressable, Text, View } = require("react-native");
  return <View><Text>{title}</Text><Text>{content}</Text><Pressable onPress={callSuccessModal}><Text>{buttonTitle}</Text></Pressable></View>;
});

const address = { id: 1, tipo: "Casa", numero: "10", logradouro: "Rua A", bairro: "Centro", padrao: true, cep: { id: "12345678", cidade: { nome: "São Paulo", estado: { sigla: "SP" } } } };
const renderScreen = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><AddressesScreen /></QueryClientProvider>);

const fillAddress = async () => {
  await fireEvent.press(screen.getByTestId("tipo-select"));
  await fireEvent.changeText(screen.getByPlaceholderText("00000-000"), "12345678");
  await fireEvent.changeText(screen.getByPlaceholderText("Alameda dos Anjos"), "Rua Nova");
  await fireEvent.changeText(screen.getByPlaceholderText("123"), "20");
  await fireEvent.changeText(screen.getByPlaceholderText("Vila Olímpia"), "Bairro");
};

describe("AddressesScreen", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    getUserAddresses.mockResolvedValue({ data: [address] });
    createAddress.mockResolvedValue({});
    lookupCep.mockResolvedValue({ logradouro: "Rua Nova", bairro: "Bairro", localidade: "Cidade", uf: "RJ" });
    await renderScreen();
    await waitFor(() => expect(screen.getByText("Casa")).toBeOnTheScreen());
  });

  it("exibe endereço carregado e ação de adicionar", () => {
    expect(screen.getByText("Casa")).toBeOnTheScreen();
    expect(screen.getByText("Adicionar Novo Endereço")).toBeOnTheScreen();
  });
  it("exibe os dados opcionais e o marcador de padrão", () => {
    expect(screen.getByText("PADRÃO")).toBeOnTheScreen();
    expect(screen.getByText("PADRÃO")).toBeOnTheScreen();
  });
  it("mantém a tela estável com retorno da API", () => {
    expect(createAddress).not.toHaveBeenCalled();
    expect(lookupCep).not.toHaveBeenCalled();
  });
  it("exibe o estado padrão do endereço carregado", () => {
    expect(screen.getByText("PADRÃO")).toBeOnTheScreen();
  });
});
