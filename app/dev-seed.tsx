import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import { Check, Circle, Minus, X } from "lucide-react-native";
import axios from "axios";

import { api } from "../src/services/api";

type StepStatus = "idle" | "running" | "success" | "error" | "skipped";
type SeedContext = Record<string, unknown>;

type SeedStep = {
  label: string;
  description: string;
  run: (context: SeedContext) => Promise<unknown>;
};

type StepState = {
  status: StepStatus;
  response: unknown;
  error: string | null;
};

const steps: SeedStep[] = [
  {
    label: "Login Admin",
    description: "POST /usuarios/login (admin)",
    run: async (context) => {
      const response = await api.post("/usuarios/login", {
        email: "fabio.admin@email.com",
        senha: "admin123",
      });
      context.adminToken = response.data?.token;
      return response.data;
    },
  },
  {
    label: "Criar Produto Exibição",
    description: "POST /produtos-exibicoes",
    run: async (context) => {
      const response = await api.post("/produtos-exibicoes", {
        titulo: "Pacote Anual",
        subtitulo: "Plano único - 12 meses",
        beneficios: [
          { valor: "Pacote anual adquirido uma única vez" },
          { valor: "Treino personalizado (visando o seu objetivo)" },
          { valor: "Anamnese mensal" },
          { valor: "Feedback diário" },
          { valor: "1 aula grátis com o personal por mês" },
        ],
        preco: 2400,
        status: "ATIVO",
        tipoProduto: "PACOTE",
        tipoAula: "PRESENCIAL",
        quantidadeAula: 12,
        periodo: "12 meses",
        duracaoMes: 12,
      });
      context.produtoId = response.data?.id ?? 1;
      return response.data;
    },
  },
  {
    label: "Criar Adicional FUNCIONAL",
    description: "POST /produtos-exibicoes (ADICIONAL / FUNCIONAL)",
    run: async (context) => {
      const response = await api.post("/produtos-exibicoes", {
        titulo: "Adicional Funcional",
        subtitulo: "Aulas funcionais ao ar livre",
        beneficios: [
          { valor: "Aulas em parques e espaços abertos" },
          { valor: "Treino funcional personalizado" },
          { valor: "Flexibilidade de local" },
        ],
        preco: 300,
        status: "ATIVO",
        tipoProduto: "ADICIONAL",
        tipoAula: "FUNCIONAL",
        quantidadeAula: 12,
        periodo: "1 mês",
        duracaoMes: 1,
      });
      context.adicionalFuncionalId = response.data?.id;
      return response.data;
    },
  },
  {
    label: "Criar Adicional RESIDENCIAL",
    description: "POST /produtos-exibicoes (ADICIONAL / RESIDENCIAL)",
    run: async (context) => {
      const response = await api.post("/produtos-exibicoes", {
        titulo: "Adicional Residencial",
        subtitulo: "Aulas em domicílio",
        beneficios: [
          { valor: "Personal no seu endereço" },
          { valor: "Sem deslocamento" },
          { valor: "Horário flexível" },
        ],
        preco: 350,
        status: "ATIVO",
        tipoProduto: "ADICIONAL",
        tipoAula: "RESIDENCIAL",
        quantidadeAula: 12,
        periodo: "1 mês",
        duracaoMes: 1,
      });
      context.adicionalResidencialId = response.data?.id;
      return response.data;
    },
  },
  {
    label: "Cadastrar Personal",
    description: "POST /controle/admin/dev/usuarios/personal",
    run: async () => {
      const response = await api.post("/controle/admin/dev/usuarios/personal", {
        nome: "Fillipe",
        sexo: "Masculino",
        dataNascimento: "2005-12-27",
        email: "fillipemcoelho@hotmail.com",
        cref: "01415069031",
        telefone: { pais: 55, ddd: 11, numero: 912345678 },
      });
      return response.data;
    },
  },
  {
    label: "Cadastrar Aluno",
    description: "POST /alunos/cadastro",
    run: async () => {
      const response = await api.post("/alunos/cadastro", {
        nome: "Fillipe",
        sexo: "Masculino",
        dataNascimento: "2005-12-27",
        email: "joao.silva@example.com",
        senha: "123456789aA!",
        cpf: "54451703069",
        telefone: { ddd: "11", numero: "932269949", pais: "55" },
      });
      return response.data;
    },
  },
  {
    label: "Login Aluno",
    description: "POST /usuarios/login (aluno)",
    run: async () => {
      const response = await api.post("/usuarios/login", {
        email: "joao.silva@example.com",
        senha: "123456789aA!",
      });
      return response.data;
    },
  },
  {
    label: "Criar Anamnese",
    description: "POST /anamnese",
    run: async () => {
      const response = await api.post("/anamnese", {
        altura: 175,
        peso: 70.5,
        objectivoPrincipal: "Ganho de massa muscular",
        rotina: "Trabalho das 9h às 18h, treino à noite",
        condicoes: [
          { situacao: "Controlada com medicamento", tipo: "OUTRO" },
          { situacao: "Sem tratamento", tipo: "OUTRO" },
        ],
        nivelDeAtividade: "SEDENTARIO",
        observacaoSaude: "Sinto dores no joelho direito ao agachar",
      });
      return response.data;
    },
  },
  {
    label: "Contratar Produto",
    description: "POST /produtos-contratados",
    run: async (context) => {
      const response = await api.post("/produtos-contratados", {
        idProdutoExibicao: (context.produtoId as number) ?? 1,
      });
      return response.data;
    },
  },
  {
    label: "Contratar Adicional FUNCIONAL",
    description: "POST /produtos-contratados (FUNCIONAL)",
    run: async (context) => {
      const response = await api.post("/produtos-contratados", {
        idProdutoExibicao: (context.adicionalFuncionalId as number) ?? 2,
      });
      return response.data;
    },
  },
  {
    label: "Contratar Adicional RESIDENCIAL",
    description: "POST /produtos-contratados (RESIDENCIAL)",
    run: async (context) => {
      const response = await api.post("/produtos-contratados", {
        idProdutoExibicao: (context.adicionalResidencialId as number) ?? 3,
      });
      return response.data;
    },
  },
  {
    label: "Criar Agendamento PRESENCIAL",
    description: "POST /agendamentos (PRESENCIAL)",
    run: async () => createAppointment(2, 10, "PRESENCIAL", "Aula presencial na academia", {
      numero: "1234",
      complemento: "Apto 101",
      unidade: "Edifício Sol",
      cep: { id: "01001-000", logradouro: "Praça da Sé", bairro: "Sé", localidade: "São Paulo", uf: "SP" },
    }),
  },
  {
    label: "Criar Agendamento FUNCIONAL",
    description: "POST /agendamentos (FUNCIONAL)",
    run: async () => createAppointment(3, 9, "FUNCIONAL", "Aula funcional ao ar livre", {
      numero: "S/N",
      complemento: "",
      unidade: "",
      cep: { id: "01310-100", logradouro: "Avenida Paulista", bairro: "Bela Vista", localidade: "São Paulo", uf: "SP" },
    }),
  },
  {
    label: "Criar Agendamento RESIDENCIAL",
    description: "POST /agendamentos (RESIDENCIAL)",
    run: async () => createAppointment(4, 8, "RESIDENCIAL", "Aula residencial em domicílio", {
      numero: "456",
      complemento: "Casa",
      unidade: "",
      cep: { id: "01414-001", logradouro: "Rua Haddock Lobo", bairro: "Cerqueira César", localidade: "São Paulo", uf: "SP" },
    }),
  },
  {
    label: "Logout",
    description: "POST /usuarios/logout",
    run: async () => {
      const response = await api.post("/usuarios/logout");
      return response.data;
    },
  },
];

type Address = {
  numero: string;
  complemento: string;
  unidade: string;
  cep: {
    id: string;
    logradouro: string;
    bairro: string;
    localidade: string;
    uf: string;
  };
};

async function createAppointment(
  daysAhead: number,
  hour: number,
  type: string,
  description: string,
  address: Address
) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  date.setHours(hour, 0, 0, 0);
  const response = await api.post("/agendamentos", {
    data: date.toISOString(),
    descricao: description,
    novoEndereco: { ...address, tipo: type },
    personalId: 1,
    tipoAulaProdutoContratado: type,
  });
  return response.data;
}

const initialState = (): StepState[] =>
  steps.map(() => ({ status: "idle", response: null, error: null }));

function formatError(error: unknown) {
  if (axios.isAxiosError(error)) {
    return error.response?.data
      ? JSON.stringify(error.response.data, null, 2)
      : error.message;
  }
  return error instanceof Error ? error.message : "Erro desconhecido";
}

function StatusIcon({ status }: { status: StepStatus }) {
  if (status === "running") return <ActivityIndicator size="small" color="#7C3AED" />;
  if (status === "success") return <Check size={19} color="#059669" />;
  if (status === "error") return <X size={19} color="#DC2626" />;
  if (status === "skipped") return <Minus size={19} color="#71717A" />;
  return <Circle size={17} color="#A1A1AA" />;
}

export default function DevSeedScreen() {
  const router = useRouter();
  const [states, setStates] = useState(initialState);
  const [selected, setSelected] = useState(() => steps.map(() => true));
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  function updateState(index: number, patch: Partial<StepState>) {
    setStates((current) =>
      current.map((state, stateIndex) =>
        stateIndex === index ? { ...state, ...patch } : state
      )
    );
  }

  function toggleAll(value: boolean) {
    setSelected(steps.map(() => value));
  }

  function toggleSetupSteps(value: boolean) {
    setSelected((current) =>
      current.map((isSelected, index) =>
        index === 6 || index === 7 || (index >= 8 && index <= 11)
          ? value
          : isSelected
      )
    );
  }

  async function runSeed() {
    setRunning(true);
    setDone(false);
    setStates(initialState());
    const context: SeedContext = {};

    for (let index = 0; index < steps.length; index += 1) {
      if (!selected[index]) {
        updateState(index, { status: "skipped" });
        continue;
      }

      updateState(index, { status: "running", error: null, response: null });
      try {
        const response = await steps[index].run(context);
        updateState(index, { status: "success", response });
      } catch (error) {
        updateState(index, { status: "error", error: formatError(error) });
      }
    }

    setRunning(false);
    setDone(true);
  }

  const successCount = states.filter((state) => state.status === "success").length;
  const errorCount = states.filter((state) => state.status === "error").length;
  const skippedCount = states.filter((state) => state.status === "skipped").length;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.badge}>DEV ONLY</Text>
        <Text style={styles.title}>Seed de Dados</Text>
        <Text style={styles.subtitle}>
          Executa os requests de setup em sequência. Remover antes do deploy final.
        </Text>
        <View style={styles.controls}>
          <Pressable style={styles.controlButton} onPress={() => toggleAll(true)} disabled={running}>
            <Text style={styles.controlText}>Selecionar todos</Text>
          </Pressable>
          <Pressable style={styles.controlButton} onPress={() => toggleSetupSteps(false)} disabled={running}>
            <Text style={styles.controlText}>Desmarcar setup</Text>
          </Pressable>
        </View>
        <Pressable style={styles.runButton} onPress={runSeed} disabled={running}>
          {running ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.runText}>{done ? "Executar novamente" : "Executar seed"}</Text>}
        </Pressable>
        {done ? (
          <Text style={styles.summary}>
            {successCount} ok · {errorCount} erro(s) · {skippedCount} ignorado(s)
          </Text>
        ) : null}
        <Pressable onPress={() => router.replace("/(auth)/login")} style={styles.backButton}>
          <Text style={styles.backText}>Voltar para o login</Text>
        </Pressable>
      </View>

      <View style={styles.steps}>
        {steps.map((step, index) => {
          const state = states[index];
          const statusStyle =
            state.status === "running"
              ? styles.card_running
              : state.status === "success"
                ? styles.card_success
                : state.status === "error"
                  ? styles.card_error
                  : state.status === "skipped"
                    ? styles.card_skipped
                    : undefined;
          return (
            <View key={step.label} style={[styles.stepCard, statusStyle]}>
              <View style={styles.stepHeader}>
                <Pressable
                  onPress={() =>
                    setSelected((current) =>
                      current.map((value, itemIndex) =>
                        itemIndex === index ? !value : value
                      )
                    )
                  }
                  disabled={running}
                >
                  <Text style={[styles.checkbox, !selected[index] && styles.checkboxOff]}>
                    {selected[index] ? "☑" : "☐"}
                  </Text>
                </Pressable>
                <Text style={styles.stepNumber}>{index + 1}</Text>
                <View style={styles.stepInfo}>
                  <Text style={styles.stepLabel}>{step.label}</Text>
                  <Text style={styles.stepDescription}>{step.description}</Text>
                </View>
                <StatusIcon status={state.status} />
              </View>
              {state.response !== null ? (
                <Text style={styles.response}>{JSON.stringify(state.response, null, 2)}</Text>
              ) : null}
              {state.error ? <Text style={styles.error}>{state.error}</Text> : null}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#F9FAFB" },
  content: { padding: 20, paddingBottom: 48 },
  header: { alignItems: "center", marginBottom: 24 },
  badge: { color: "#DC2626", backgroundColor: "#FEE2E2", borderColor: "#FCA5A5", borderWidth: 1, borderRadius: 6, paddingHorizontal: 10, paddingVertical: 5, fontSize: 11, fontWeight: "800", letterSpacing: 1, marginBottom: 14 },
  title: { color: "#18181B", fontSize: 30, fontWeight: "800", marginBottom: 8 },
  subtitle: { color: "#52525B", textAlign: "center", lineHeight: 20, marginBottom: 18 },
  controls: { flexDirection: "row", gap: 8, marginBottom: 14 },
  controlButton: { borderWidth: 1, borderColor: "#D4D4D8", borderRadius: 7, paddingHorizontal: 10, paddingVertical: 8 },
  controlText: { color: "#52525B", fontSize: 12, fontWeight: "600" },
  runButton: { minWidth: 180, minHeight: 46, borderRadius: 10, backgroundColor: "#18181B", alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  runText: { color: "#FFFFFF", fontSize: 15, fontWeight: "700" },
  summary: { color: "#3F3F46", marginTop: 12, fontWeight: "600" },
  backButton: { marginTop: 14 },
  backText: { color: "#2563EB", textDecorationLine: "underline" },
  steps: { gap: 10 },
  stepCard: { backgroundColor: "#FFFFFF", borderWidth: 1, borderColor: "#E4E4E7", borderRadius: 12, padding: 14 },
  card_running: { backgroundColor: "#FAF5FF", borderColor: "#D8B4FE" },
  card_success: { backgroundColor: "#ECFDF5", borderColor: "#A7F3D0" },
  card_error: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  card_skipped: { backgroundColor: "#F4F4F5", opacity: 0.7 },
  stepHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  checkbox: { color: "#18181B", fontSize: 21 },
  checkboxOff: { color: "#A1A1AA" },
  stepNumber: { color: "#71717A", backgroundColor: "#F4F4F5", overflow: "hidden", borderRadius: 20, width: 27, height: 27, textAlign: "center", paddingTop: 5, fontSize: 12, fontWeight: "700" },
  stepInfo: { flex: 1 },
  stepLabel: { color: "#18181B", fontSize: 15, fontWeight: "700" },
  stepDescription: { color: "#71717A", fontSize: 11, marginTop: 3 },
  response: { color: "#166534", backgroundColor: "#F0FDF4", borderRadius: 8, padding: 10, marginTop: 12, fontSize: 11, lineHeight: 17 },
  error: { color: "#991B1B", backgroundColor: "#FEF2F2", borderRadius: 8, padding: 10, marginTop: 12, fontSize: 11, lineHeight: 17 },
});
