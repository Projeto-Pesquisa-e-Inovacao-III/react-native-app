import React from "react";
import { Pressable, Text, TextInput, View } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import RegisterRoute from "../register";
import { useAuth } from "../../../src/contexts/AuthContext";
import * as userService from "../../../src/constants/user";

jest.mock("expo-router", () => ({ useRouter: jest.fn() }));
jest.mock("../../../src/contexts/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../../src/constants/user", () => ({ register: jest.fn() }));
jest.mock("../../../src/components/LogoCSF", () => {
  const React = require("react");
  const { View } = require("react-native");
  return () => React.createElement(View);
});
jest.mock("lucide-react-native", () => {
  const React = require("react");
  const { View } = require("react-native");
  return new Proxy({}, { get: () => () => React.createElement(View) });
});
jest.mock("../../../src/components/InputWithIcon", () => {
  const React = require("react");
  const { Text, TextInput, View } = require("react-native");
  return ({
    label,
    placeholder,
    value,
    onInputChange,
    keyboardType,
  }) =>
    React.createElement(
      View,
      null,
      React.createElement(Text, null, label),
      React.createElement(TextInput, {
        placeholder,
        value,
        onChangeText: onInputChange,
        keyboardType,
      })
    );
});
jest.mock("../../../src/components/Select", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return ({ onSelectStatusChange }) =>
    React.createElement(
      Pressable,
      { testID: "gender-select", onPress: () => onSelectStatusChange("Masculino") },
      React.createElement(Text, null, "Gênero")
    );
});
jest.mock("../../../src/components/modals/ErrorModal", () => {
  const React = require("react");
  const { Text, View } = require("react-native");
  return ({ title, content }) =>
    React.createElement(
      View,
      null,
      React.createElement(Text, null, title),
      React.createElement(Text, null, content)
    );
});

const router = { back: jest.fn(), replace: jest.fn() };
const refreshAuth = jest.fn();

function input(placeholder) {
  return screen.getByPlaceholderText(placeholder);
}

async function fillValidForm() {
  await fireEvent.changeText(input("Ex: João da Silva"), "Maria Silva");
  await fireEvent.changeText(input("usuario@dominio.com"), "maria@example.com");
  await fireEvent.changeText(input("DD/MM/AAAA"), "01/01/2000");
  await fireEvent.press(screen.getByTestId("gender-select"));
  await fireEvent.changeText(input("000.000.000-00"), "11382514026");
  await fireEvent.changeText(input("(11) 90000-0000"), "11912345678");
  await fireEvent.changeText(input("Mínimo 8 caracteres"), "Password123!");
  await fireEvent.changeText(input("Repita a senha"), "Password123!");
}

describe("RegisterRoute", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    useRouter.mockReturnValue(router);
    useAuth.mockReturnValue({ refreshAuth });
    userService.register.mockResolvedValue({});
    await render(<RegisterRoute />);
  });

  test("deve exibir o formulário de cadastro quando a tela é carregada", () => {
    expect(screen.getByText("Criar conta")).toBeOnTheScreen();
    expect(input("Ex: João da Silva")).toBeOnTheScreen();
    expect(input("usuario@dominio.com")).toHaveProp("keyboardType", "email-address");
    expect(input("DD/MM/AAAA")).toHaveProp("keyboardType", "numeric");
    expect(screen.getByText("Criar conta e Iniciar Anamnese →")).toBeOnTheScreen();
  });

  test("deve desabilitar o envio quando o cadastro está com campos vazios", async () => {
    const submitButton = screen.getByText("Criar conta e Iniciar Anamnese →");

    expect(submitButton).toBeDisabled();
    expect(userService.register).not.toHaveBeenCalled();
  });

  test("deve exibir validação para e-mail inválido e menor de idade", async () => {
    await fireEvent.changeText(input("usuario@dominio.com"), "email-invalido");
    await fireEvent.changeText(input("DD/MM/AAAA"), "01/01/2015");

    expect(screen.getByText("E-mail com formato inválido.")).toBeOnTheScreen();
    expect(screen.getByText("Necessário ter pelo menos 18 anos.")).toBeOnTheScreen();
  });

  test("deve cadastrar e navegar para a anamnese quando todos os dados são válidos", async () => {
    await fillValidForm();
    await fireEvent.press(screen.getByText("Criar conta e Iniciar Anamnese →"));

    await waitFor(() => {
      expect(userService.register).toHaveBeenCalledWith({
        nome: "Maria Silva",
        email: "maria@example.com",
        senha: "Password123!",
        cpf: "11382514026",
        telefone: { ddd: "11", numero: "912345678", pais: "55" },
        sexo: "Masculino",
        dataNascimento: "2000-01-01",
      });
      expect(refreshAuth).toHaveBeenCalledTimes(1);
      expect(router.replace).toHaveBeenCalledWith("/anamnesis");
    });
  });

  test("deve exibir erro quando o serviço de cadastro falha", async () => {
    userService.register.mockRejectedValueOnce({
      response: { data: { message: "E-mail já cadastrado." } },
    });
    await fillValidForm();
    await fireEvent.press(screen.getByText("Criar conta e Iniciar Anamnese →"));

    expect(await screen.findByText("Erro ao cadastrar")).toBeOnTheScreen();
    expect(screen.getByText("E-mail já cadastrado.")).toBeOnTheScreen();
    expect(router.replace).not.toHaveBeenCalled();
  });
});
