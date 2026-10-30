import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { useRouter } from "expo-router";
import EditUserScreen from "../edit-user";
import { findUserData, update } from "../../../../src/constants/user";
import { editPersonalProfile } from "../../../../src/constants/personal";

jest.mock("expo-router", () => ({ useRouter: jest.fn() }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));
jest.mock("lucide-react-native", () => {
  const React = require("react"); const { View } = require("react-native"); const Icon = () => React.createElement(View);
  return { __esModule: true, ArrowLeft: Icon, User: Icon, Phone: Icon, IdCard: Icon, Upload: Icon, Trash2: Icon };
});
jest.mock("../../../../src/contexts/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../../../src/constants/user", () => ({
  findUserData: jest.fn(), update: jest.fn(), removerUserImage: jest.fn(),
  insertUserImage: jest.fn(),
}));
jest.mock("../../../../src/constants/personal", () => ({ editPersonalProfile: jest.fn() }));
jest.mock("../../../../src/components/AsideEditUser", () => () => null);
jest.mock("../../../../src/components/UserAvatar", () => {
  const Avatar = () => null;
  return { __esModule: true, default: Avatar, setCachedAvatar: jest.fn(), clearCachedAvatar: jest.fn() };
});
jest.mock("../../../../src/components/InputWithIcon", () => ({ label, placeholder, value, onInputChange }) => {
  const { Text, TextInput, View } = require("react-native");
  return <View><Text>{label}</Text><TextInput placeholder={placeholder} value={value} onChangeText={onInputChange} /></View>;
});
jest.mock("../../../../src/components/Select", () => ({ selectPlaceholder, selectStatusValue, values, onSelectStatusChange }) => {
  const { Pressable, Text } = require("react-native");
  return <Pressable onPress={() => onSelectStatusChange(values?.[0]?.value || "")}><Text>{selectStatusValue || selectPlaceholder}</Text></Pressable>;
});
jest.mock("../../../../src/components/modals/SuccessModal", () => ({ visible, title, content }) => {
  const { Text } = require("react-native");
  return visible ? <Text>{title}{content}</Text> : null;
});
jest.mock("../../../../src/components/modals/ErrorModal", () => ({ visible = true, title, content }) => {
  const { Text } = require("react-native");
  return visible ? <Text>{title}{content}</Text> : null;
});
jest.mock("../../../../src/components/modals/TimerModal", () => () => null);

const { useAuth } = require("../../../../src/contexts/AuthContext");
const router = { back: jest.fn(), replace: jest.fn() };
const user = {
  id: 7, nome: "Ana Silva", cref: "123456", sexo: "Feminino", email: "ana@email.com",
  dataNascimento: "1990-01-01", caminhoFoto: null, ativo: true,
  telefones: [{ id: 1, ddd: "11", numero: "999999999", numeroCompleto: "(11) 99999-9999" }],
};

async function renderScreen() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  await render(<QueryClientProvider client={client}><EditUserScreen /></QueryClientProvider>);
  expect(findUserData).toHaveBeenCalled();
}

describe("EditUserScreen", () => {
  beforeEach(async () => {
    jest.clearAllMocks(); useRouter.mockReturnValue(router); useAuth.mockReturnValue({ roles: ["aluno"] });
    findUserData.mockResolvedValue({ data: user }); update.mockResolvedValue({}); editPersonalProfile.mockResolvedValue({});
    await renderScreen();
    await waitFor(() => expect(screen.getByDisplayValue("Ana Silva")).toBeOnTheScreen());
  });

  it("hidrata dados e permite atualizar nome do aluno", async () => {
    await fireEvent.changeText(screen.getByDisplayValue("Ana Silva"), "Ana Souza");
    await fireEvent.press(screen.getByText("Salvar Alterações"));
    await waitFor(() => expect(update).toHaveBeenCalledWith(expect.objectContaining({ nome: "Ana Souza" })));
  });

  it("mostra erro quando a atualização falha", async () => {
    update.mockRejectedValueOnce({ response: { data: { message: "Não foi possível atualizar" } } });
    await fireEvent.press(screen.getByText("Salvar Alterações"));
    expect(await screen.findByText(/Não foi possível atualizar/)).toBeOnTheScreen();
  });

  it("desfaz alteração local retornando aos dados carregados", async () => {
    await fireEvent.changeText(screen.getByDisplayValue("Ana Silva"), "Outro nome");
    await fireEvent.press(screen.getByText("Descartar alterações"));
    expect(screen.getByDisplayValue("Ana Silva")).toBeOnTheScreen();
  });
});
