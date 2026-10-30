import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import CreatePersonalScreen from "../create-personal";
import { createPersonal } from "../../../../src/constants/admin";

jest.mock("expo-router", () => ({ useRouter: jest.fn() }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("expo-status-bar", () => ({ StatusBar: () => null }));
jest.mock("lucide-react-native", () => {
  const React = require("react");
  const { View } = require("react-native"); const Icon = () => React.createElement(View);
  return { User: Icon, Mail: Icon, Users: Icon, Calendar: Icon, Hash: Icon, Phone: Icon, ArrowLeft: Icon, Sparkles: Icon, ChevronDown: Icon, Check: Icon };
});
jest.mock("../../../../src/constants/admin", () => ({ createPersonal: jest.fn() }));
jest.mock("../../../../src/components/modals/SuccessModal", () => ({ visible, title, content }) => {
  const { Text } = require("react-native");
  return visible ? <Text>{title}{content}</Text> : null;
});
jest.mock("../../../../src/components/modals/ErrorModal", () => ({ visible, title, content }) => {
  const { Text } = require("react-native");
  return visible ? <Text>{title}{content}</Text> : null;
});

const router = { back: jest.fn(), canGoBack: jest.fn(() => true) };

function renderScreen() {
  return render(<CreatePersonalScreen />);
}

async function fillValidForm() {
  await fireEvent.changeText(screen.getByPlaceholderText("Ex: João Carlos Silva"), "Gabriel");
  await fireEvent.changeText(screen.getByPlaceholderText("email@dominio.com"), "gabriel@email.com");
  await fireEvent.press(screen.getByText("Selecione"));
  await fireEvent.press(screen.getByText("Masculino"));
  await fireEvent.changeText(screen.getByPlaceholderText("DD/MM/AAAA"), "01012000");
  await fireEvent.changeText(screen.getByPlaceholderText("000000-G/UF"), "123456");
  await fireEvent.changeText(screen.getByPlaceholderText("DD/MM/AAAA"), "01012000");
  await fireEvent.changeText(screen.getByPlaceholderText("000000-G/UF"), "123456");
  await fireEvent.changeText(screen.getByPlaceholderText("(11) 99999-9999"), "11999999999");
}

describe("CreatePersonalScreen", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    useRouter.mockReturnValue(router);
    createPersonal.mockResolvedValue({});
    await renderScreen();
  });

  it("exibe validações ao tentar enviar formulário vazio", async () => {
    await fireEvent.press(screen.getAllByText("Cadastrar Personal").at(-1));
    expect(screen.getByText("O nome é obrigatório.")).toBeOnTheScreen();
    expect(screen.getByText("O email é obrigatório.")).toBeOnTheScreen();
    expect(createPersonal).not.toHaveBeenCalled();
  });

  it("cadastra um personal preenchido e mostra sucesso", async () => {
    await fillValidForm();
    await fireEvent.press(screen.getAllByText("Cadastrar Personal").at(-1));

    await waitFor(() => expect(createPersonal).toHaveBeenCalledWith(expect.objectContaining({
      nome: "Gabriel",
      email: "gabriel@email.com",
      dataNascimento: "2000-01-01",
      sexo: "Masculino",
    })));
    expect(screen.getByText(/Personal Cadastrado!/)).toBeOnTheScreen();
  });

  it("mostra erro quando a API falha", async () => {
    createPersonal.mockRejectedValueOnce({ response: { data: { message: "Falha no cadastro" } } });
    await fillValidForm();
    await fireEvent.press(screen.getAllByText("Cadastrar Personal").at(-1));
    expect(await screen.findByText(/Falha no cadastro/)).toBeOnTheScreen();
  });
});
