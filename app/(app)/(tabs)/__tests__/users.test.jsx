import React from "react";
import { Text, View } from "react-native";
import { render, screen, waitFor } from "@testing-library/react-native";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import UsersRoute from "../users";
import { useAuth } from "../../../../src/contexts/AuthContext";
import { listStudents } from "../../../../src/constants/personal";
import { getUsers } from "../../../../src/constants/admin";

jest.mock("../../../../src/contexts/AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../../../../src/constants/personal", () => ({ listStudents: jest.fn(), searchStudent: jest.fn() }));
jest.mock("../../../../src/constants/admin", () => ({ getUsers: jest.fn() }));
jest.mock("lucide-react-native", () => { const React = require("react"); return new Proxy({}, { get: () => () => { const { View } = require("react-native"); return React.createElement(View); } }); });
jest.mock("../../../../src/components/FocusAwareStatusBar", () => () => null);
jest.mock("../../../../src/components/VoiceRecorderButton", () => () => null);
jest.mock("../../../../src/components/InputWithIcon", () => ({ placeholder }) => { const { Text } = require("react-native"); return <Text>{placeholder}</Text>; });
jest.mock("../../../../src/components/Select", () => () => { const { Text } = require("react-native"); return <Text>Filtrar por role</Text>; });
jest.mock("../../../../src/components/PaginatedList", () => ({ children }) => { const { View } = require("react-native"); return <View>{children}</View>; });
jest.mock("../../../../src/components/UsersTable", () => ({ users, isLoading }) => { const { View, Text } = require("react-native"); return <View><Text>{isLoading ? "Carregando" : `${users.length} usuários`}</Text>{users.map((u) => <Text key={u.id}>{u.nome}</Text>)}</View>; });
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ top: 0, bottom: 0 }) }));

const response = { data: { content: [{ id: 1, nome: "Ana" }], page: { number: 0, totalPages: 1 } } };
const renderScreen = () => render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><UsersRoute /></QueryClientProvider>);

describe("UsersRoute", () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    useAuth.mockReturnValue({ roles: ["personal"] });
    listStudents.mockResolvedValue(response);
    getUsers.mockResolvedValue(response);
    await renderScreen();
    await waitFor(() => expect(screen.getByText("Ana")).toBeOnTheScreen());
  });
  it("exibe a lista de alunos para personal", () => {
    expect(screen.getByText("Usuários")).toBeOnTheScreen();
    expect(listStudents).toHaveBeenCalledWith(0, 10);
  });
  it("mostra lista vazia sem quebrar", async () => {
    listStudents.mockResolvedValueOnce({ data: { content: [], page: { number: 0 } } });
    await renderScreen();
    await waitFor(() => expect(screen.getByText("0 usuários")).toBeOnTheScreen());
  });
  it("consulta usuários quando o papel é admin", async () => {
    useAuth.mockReturnValue({ roles: ["admin"] });
    await renderScreen();
    await waitFor(() => expect(getUsers).toHaveBeenCalledWith(0, 10, "", undefined, undefined));
  });
});
