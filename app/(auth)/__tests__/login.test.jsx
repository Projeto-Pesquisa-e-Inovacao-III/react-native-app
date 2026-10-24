import React from "react";
import { Alert, Pressable, Text, TextInput, View } from "react-native";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import LoginRoute from "../login";
import { useAuth } from "../../../src/contexts/AuthContext";

jest.mock("expo-router", () => ({ useRouter: jest.fn() }));
jest.mock("../../../src/contexts/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../../src/components/LogoCSF", () => {
  const React = require("react");
  const { View } = require("react-native");
  return () => React.createElement(View);
});
jest.mock("../../../src/components/icons/AuthIcons", () => {
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
    onSubmitEditing,
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
        onSubmitEditing,
        keyboardType,
      })
    );
});

jest.mock("../../../src/components/Button", () => {
  const React = require("react");
  const { Pressable, Text } = require("react-native");
  return ({ title, onPress, loading, disabled }) =>
    React.createElement(
      Pressable,
      { accessibilityRole: "button", onPress, disabled: disabled || loading },
      React.createElement(Text, null, loading ? "Carregando..." : title)
    );
});

const router = { push: jest.fn(), replace: jest.fn() };
const login = jest.fn();

describe("LoginRoute", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    useRouter.mockReturnValue(router);
    useAuth.mockReturnValue({ login });
    jest.spyOn(Alert, "alert").mockImplementation(() => {});
    await render(<LoginRoute />);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("deve exibir os campos e o botão de entrada quando a tela é carregada", () => {
    expect(screen.getByText("Bem-vindo")).toBeOnTheScreen();
    expect(screen.getByPlaceholderText("seu@email.com")).toBeOnTheScreen();
    expect(screen.getByPlaceholderText("Sua senha")).toBeOnTheScreen();
    expect(screen.getByText("Entrar")).toBeOnTheScreen();
  });

  test("deve exibir validação quando o usuário tenta entrar com campos vazios", async () => {
    await fireEvent.press(screen.getByText("Entrar"));

    expect(Alert.alert).toHaveBeenCalledWith(
      "Campos obrigatórios",
      "Por favor, informe seu email e senha."
    );
    expect(login).not.toHaveBeenCalled();
  });

  test("deve autenticar e redirecionar quando as credenciais são válidas", async () => {
    login.mockResolvedValueOnce(true);

    await fireEvent.changeText(screen.getByPlaceholderText("seu@email.com"), " user@example.com ");
    await fireEvent.changeText(screen.getByPlaceholderText("Sua senha"), "Password123!");
    await fireEvent.press(screen.getByText("Entrar"));

    await waitFor(() => {
      expect(login).toHaveBeenCalledWith("user@example.com", "Password123!");
      expect(router.replace).toHaveBeenCalledWith("/(app)/(tabs)");
    });
  });

  test("deve exibir erro quando a autenticação falha", async () => {
    login.mockRejectedValueOnce({
      response: { data: { message: "Credenciais inválidas." } },
    });

    await fireEvent.changeText(screen.getByPlaceholderText("seu@email.com"), "user@example.com");
    await fireEvent.changeText(screen.getByPlaceholderText("Sua senha"), "wrong");
    await fireEvent.press(screen.getByText("Entrar"));

    await waitFor(() => {
      expect(Alert.alert).toHaveBeenCalledWith(
        "Falha no Login",
        "Credenciais inválidas.",
        [{ text: "OK" }]
      );
    });
    expect(router.replace).not.toHaveBeenCalled();
  });

  test("deve navegar para recuperação de senha quando o link é pressionado", async () => {
    await fireEvent.press(screen.getByText("Esqueceu sua senha?"));

    expect(router.push).toHaveBeenCalledWith("/(auth)/forgot-password");
  });
});
