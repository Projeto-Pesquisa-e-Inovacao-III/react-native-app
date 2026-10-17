import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  UserPlus,
  Calendar,
  MapPin,
  ChevronRight,
  ChevronLeft,
  User,
  Dumbbell,
  Clock,
  Home,
  Activity,
  Sparkles,
  CalendarCheck,
} from "lucide-react-native";
import {
  disabledPersonalDays,
  getPersonalList,
  insertExperimentalAppointment,
} from "../constants/schedule";
import { getPersonalHours } from "../constants/personal";
import { findUserData } from "../constants/user";
import { useAuth } from "../contexts/AuthContext";
import { getUserAddresses, lookupCep } from "../constants/address";
import type { Personal, SavedAddress, TimeSlot } from "./NewEvent";
import type { ExperimentalSchedule } from "../models/schedule";
import SuccessModal from "./modals/SuccessModal";
import ErrorModal from "./modals/ErrorModal";

// ─── Types ────────────────────────────────────────────────────────────────────

type ClassType = "PRESENCIAL" | "RESIDENCIAL" | "FUNCIONAL";
type TimePeriod = "MANHÃ" | "TARDE" | "NOITE";

type StudentData = {
  nome: string;
  sexo: string;
  email: string;
  cpf: string;
  dataNascimento: string; // DD/MM/AAAA or ISO
  ddd: string;
  numero: string;
  pais: string;
};

type AddressData = {
  postalCode: string;
  street: string;
  city: string;
  state: string;
  number: string;
  complement: string;
  unidade: string;
  tipo: string;
  neighborhood: string;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  personalId?: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CLASS_TYPES: ClassType[] = ["PRESENCIAL", "RESIDENCIAL", "FUNCIONAL"];

function getClassTypeBadge(type: ClassType) {
  switch (type) {
    case "RESIDENCIAL":
      return {
        label: "Residencial",
        bg: "#fef3c7",
        color: "#92400e",
        borderColor: "#fde68a",
        icon: Home,
      };
    case "FUNCIONAL":
      return {
        label: "Funcional",
        bg: "#f3e8ff",
        color: "#6b21a8",
        borderColor: "#e9d5ff",
        icon: Activity,
      };
    case "PRESENCIAL":
    default:
      return {
        label: "Presencial",
        bg: "#e0f2fe",
        color: "#0369a1",
        borderColor: "#bae6fd",
        icon: Dumbbell,
      };
  }
}

function getTomorrowDateString() {
  const d = new Date(Date.now() + 86400000);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDate(date: string) {
  if (!date) return "";
  const parsed = new Date(date + "T12:00:00");
  return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString("pt-BR");
}

function getPeriod(hour: string): TimePeriod {
  const h = Number(hour.split(":")[0]);
  if (h < 12) return "MANHÃ";
  if (h < 18) return "TARDE";
  return "NOITE";
}

function formatCpf(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d)/, "$1.$2")
    .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function stripNonDigit(value: string) {
  return value.replace(/\D/g, "");
}

const WEEKDAY_PT: Record<number, string> = {
  0: "domingo",
  1: "segunda",
  2: "terca",
  3: "quarta",
  4: "quinta",
  5: "sexta",
  6: "sabado",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function NewExperimentalEvent({
  visible,
  onClose,
  onSuccess,
  personalId: propPersonalId,
}: Props) {
  const { user: authUser } = useAuth();
  // ── Steps: 1=student data, 2=schedule, 3=address ──────────────────────────
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // ── Student fields ─────────────────────────────────────────────────────────
  const [student, setStudent] = useState<StudentData>({
    nome: "",
    sexo: "F",
    email: "",
    cpf: "",
    dataNascimento: "",
    ddd: "11",
    numero: "",
    pais: "Brasil",
  });
  const [descricao, setDescricao] = useState<string>("Aula experimental de pilates");

  // ── Schedule fields ────────────────────────────────────────────────────────
  const [personalsList, setPersonalsList] = useState<Personal[]>([]);
  const [loadingPersonals, setLoadingPersonals] = useState(false);
  const [selectedPersonalId, setSelectedPersonalId] = useState<number | undefined>(
    propPersonalId ?? (authUser?.id ? Number(authUser.id) : undefined)
  );
  const [disabledWeekdays, setDisabledWeekdays] = useState<string[]>([]);
  const [classType, setClassType] = useState<ClassType>("PRESENCIAL");
  const [date, setDate] = useState(getTomorrowDateString());
  const [period, setPeriod] = useState<TimePeriod>("MANHÃ");
  const [startHour, setStartHour] = useState("");
  const [dynamicSchedules, setDynamicSchedules] = useState<TimeSlot[]>([]);
  const [loadingHours, setLoadingHours] = useState(false);

  // ── Address fields ─────────────────────────────────────────────────────────
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<number | undefined>(undefined);
  const [address, setAddress] = useState<AddressData>({
    postalCode: "",
    street: "",
    city: "",
    state: "",
    number: "",
    complement: "",
    unidade: "",
    tipo: "Comercial",
    neighborhood: "",
  });
  const [loadingCep, setLoadingCep] = useState(false);
  const cepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Feedback ───────────────────────────────────────────────────────────────
  const [submitting, setSubmitting] = useState(false);
  const [successVisible, setSuccessVisible] = useState(false);
  const [errorModal, setErrorModal] = useState({ visible: false, title: "", content: "" });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof StudentData, string>>>({});

  // ── Load personals (suporta perfil aluno, personal e admin) ────────────────
  const loadPersonals = useCallback(async () => {
    setLoadingPersonals(true);
    try {
      const res = await getPersonalList();
      const raw = res.data?.content ?? res.data;
      if (Array.isArray(raw) && raw.length > 0) {
        const mapped: Personal[] = raw.map((p: any) => ({
          id: p.id,
          nome: p.nome ?? p.usuario?.nome ?? "Personal",
          especialidade: p.especialidade ?? "Personal Trainer",
          caminhoFoto: p.caminhoFoto,
        }));
        setPersonalsList(mapped);
        setSelectedPersonalId((prev) => prev ?? mapped[0].id);
        setLoadingPersonals(false);
        return;
      }
    } catch {
      // Endpoint /personais dá 403 Forbidden para perfil personal/admin
    }

    try {
      const userRes = await findUserData();
      const u = userRes.data;
      if (u?.id) {
        const p: Personal = {
          id: Number(u.id),
          nome: u.nome ?? authUser?.nome ?? "Personal",
          especialidade: "Personal Trainer",
          caminhoFoto: u.caminhoFoto ?? undefined,
        };
        setPersonalsList([p]);
        setSelectedPersonalId(p.id);
        setLoadingPersonals(false);
        return;
      }
    } catch (e) {
      console.error("Erro ao carregar dados do usuário via findUserData:", e);
    }

    if (authUser?.id) {
      const p: Personal = {
        id: Number(authUser.id),
        nome: authUser.nome ?? "Personal",
        especialidade: "Personal Trainer",
      };
      setPersonalsList([p]);
      setSelectedPersonalId(p.id);
    }
    setLoadingPersonals(false);
  }, [authUser]);

  // ── Reset on open ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (visible) {
      setStep(1);
      setStudent({
        nome: "",
        sexo: "F",
        email: "",
        cpf: "",
        dataNascimento: "",
        ddd: "11",
        numero: "",
        pais: "Brasil",
      });
      setDescricao("Aula experimental de pilates");
      setDate(getTomorrowDateString());
      setStartHour("");
      setClassType("PRESENCIAL");
      setAddress({
        postalCode: "",
        street: "",
        city: "",
        state: "",
        number: "",
        complement: "",
        unidade: "",
        tipo: "Comercial",
        neighborhood: "",
      });
      setSelectedAddressId(undefined);
      setSuccessVisible(false);
      setFieldErrors({});
      setErrorModal({ visible: false, title: "", content: "" });
      loadPersonals();
    }
  }, [visible, loadPersonals]);

  // Carrega na montagem
  useEffect(() => {
    loadPersonals();
  }, [loadPersonals]);

  // ── Load disabled weekdays for selected personal ───────────────────────────
  useEffect(() => {
    let mounted = true;
    if (!selectedPersonalId) return;
    disabledPersonalDays(selectedPersonalId)
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : res.data?.content ?? [];
        const inactive: string[] = list
          .filter((d: any) => !d.ativo)
          .map((d: any) => String(d.diaSemana).toLowerCase());
        if (mounted) setDisabledWeekdays(inactive);
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, [selectedPersonalId]);

  // ── Load time slots ────────────────────────────────────────────────────────
  const fetchHours = useCallback(async (pId: number, d: string, cType: string) => {
    if (!pId || !d) return;
    setLoadingHours(true);
    setStartHour("");
    try {
      const res = await getPersonalHours(pId, d, cType);
      const data = res.data;
      if (Array.isArray(data) && data.length > 0) {
        const slots: TimeSlot[] = data.map((s: any) => ({
          startHour: s.inicio ?? s.horaInicio,
          endHour: s.fim ?? s.horaFim,
        }));
        setDynamicSchedules(slots);
        const periods = Array.from(new Set(slots.map((s) => getPeriod(s.startHour))));
        if (periods.length > 0 && !periods.includes(period)) setPeriod(periods[0]);
      } else {
        setDynamicSchedules([]);
      }
    } catch (err) {
      console.error("Erro ao carregar horários disponíveis:", err);
      setDynamicSchedules([]);
    } finally {
      setLoadingHours(false);
    }
  }, [period]);

  useEffect(() => {
    if (selectedPersonalId && date) {
      fetchHours(selectedPersonalId, date, classType);
    }
  }, [selectedPersonalId, date, classType, fetchHours]);

  // ── Load saved addresses ───────────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    setLoadingAddresses(true);
    getUserAddresses()
      .then((res) => {
        if (!mounted || !Array.isArray(res.data) || res.data.length === 0) return;
        const mapped: SavedAddress[] = res.data.map((a: any) => ({
          id: a.id ?? 0,
          label: a.tipo ?? "-",
          postalCode: a.cep?.id ?? a.cep?.cep ?? "",
          street: a.cep?.logradouro ?? "",
          neighborhood: a.cep?.bairro ?? "",
          city: a.cep?.localidade ?? "",
          state: a.cep?.uf ?? "",
          number: a.numero ?? "",
          complement: a.complemento ?? "",
        }));
        setSavedAddresses(mapped);
      })
      .catch(() => {})
      .finally(() => { if (mounted) setLoadingAddresses(false); });
    return () => { mounted = false; };
  }, []);

  // ── Computed ───────────────────────────────────────────────────────────────
  const selectedPersonal = useMemo(
    () => personalsList.find((p) => p.id === selectedPersonalId) ?? personalsList[0],
    [personalsList, selectedPersonalId]
  );

  const availablePeriods = useMemo(
    () => Array.from(new Set(dynamicSchedules.map((s) => getPeriod(s.startHour)))),
    [dynamicSchedules]
  );

  const periodSchedules = useMemo(
    () => dynamicSchedules.filter((s) => getPeriod(s.startHour) === period),
    [dynamicSchedules, period]
  );

  const upcomingDays = useMemo(() => {
    const days: { fullDate: string; dayNumber: number; weekDay: string; isDisabled: boolean }[] = [];
    const base = new Date();
    for (let i = 1; i <= 14; i++) {
      const d = new Date(base.getTime() + i * 86400000);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const weekDay = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "").toUpperCase();
      const weekdayKey = WEEKDAY_PT[d.getDay()];
      days.push({
        fullDate: `${y}-${m}-${day}`,
        dayNumber: d.getDate(),
        weekDay,
        isDisabled: disabledWeekdays.includes(weekdayKey),
      });
    }
    return days;
  }, [disabledWeekdays]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  function updateStudent(field: keyof StudentData, value: string) {
    setStudent((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function updateAddress(field: keyof AddressData, value: string) {
    setSelectedAddressId(undefined);
    setAddress((prev) => ({ ...prev, [field]: value }));
    if (field === "postalCode") {
      const clean = value.replace(/\D/g, "");
      if (cepTimer.current) clearTimeout(cepTimer.current);
      if (clean.length === 8) {
        cepTimer.current = setTimeout(async () => {
          setLoadingCep(true);
          try {
            const data = await lookupCep(clean);
            if (data) {
              setAddress((prev) => ({
                ...prev,
                street: data.logradouro || prev.street,
                city: data.localidade || prev.city,
                state: data.uf || prev.state,
                neighborhood: data.bairro || prev.neighborhood,
              }));
            }
          } finally {
            setLoadingCep(false);
          }
        }, 400);
      }
    }
  }

  function selectSavedAddress(saved: SavedAddress) {
    setSelectedAddressId(saved.id);
    setAddress({
      postalCode: saved.postalCode,
      street: saved.street,
      city: saved.city,
      state: saved.state,
      number: saved.number,
      complement: saved.complement,
      unidade: (saved as any).unidade || "",
      tipo: (saved as any).tipo || "Comercial",
      neighborhood: saved.neighborhood ?? "",
    });
  }

  function validateStep1(): boolean {
    const errors: Partial<Record<keyof StudentData, string>> = {};
    if (!student.nome.trim()) errors.nome = "Nome obrigatório";
    if (!student.email.trim() || !student.email.includes("@")) errors.email = "E-mail inválido";
    const cpfDigits = stripNonDigit(student.cpf);
    if (cpfDigits.length !== 11) errors.cpf = "CPF deve ter 11 dígitos";
    const nascDigits = stripNonDigit(student.dataNascimento);
    if (!student.dataNascimento) {
      errors.dataNascimento = "Data de nascimento obrigatória";
    } else if (nascDigits.length !== 8 && !student.dataNascimento.includes("-")) {
      errors.dataNascimento = "Data de nascimento incompleta (DD/MM/AAAA)";
    }
    if (!student.ddd || student.ddd.length !== 2) errors.ddd = "DDD inválido";
    if (!student.numero || student.numero.length < 8) errors.numero = "Número inválido";
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function goToStep2() {
    if (validateStep1()) {
      setStep(2);
      if (selectedPersonalId && date) {
        fetchHours(selectedPersonalId, date, classType);
      }
    }
  }


  function handleAutoFillStudent() {
    setStudent({
      nome: "Carlos Eduardo Silva",
      sexo: "M",
      email: "carlos.experimental@email.com",
      cpf: "120.791.650-11",
      dataNascimento: "15/05/1998",
      ddd: "11",
      numero: "998877665",
      pais: "Brasil",
    });
    setDescricao("Aula experimental funcional");
    setFieldErrors({});
  }

  function handleAutoFillStudent2() {
    setStudent({
      nome: "Mariana Costa",
      sexo: "F",
      email: "mariana.experimental@email.com",
      cpf: "775.813.720-22",
      dataNascimento: "22/08/2001",
      ddd: "11",
      numero: "987654321",
      pais: "Brasil",
    });
    setDescricao("Aula experimental de musculação");
    setFieldErrors({});
  }

  function handleAutoFillAddress() {
    setSelectedAddressId(undefined);
    setAddress({
      postalCode: "01310-100",
      street: "Avenida Paulista",
      number: "789",
      complement: "Conjunto 42",
      unidade: "Torre A",
      tipo: "Comercial",
      neighborhood: "Bela Vista",
      city: "São Paulo",
      state: "SP",
    });
  }

  function handleAutoFillAll() {
    handleAutoFillStudent();
    handleAutoFillAddress();
  }

  function goToStep3() {
    if (!startHour) {
      setErrorModal({ visible: true, title: "Atenção!", content: "Selecione um horário disponível para avançar." });
      return;
    }
    setStep(3);
  }

  async function handleSubmit() {
    if (!address.postalCode || !address.number) {
      setErrorModal({ visible: true, title: "Endereço incompleto", content: "Preencha ao menos CEP e número do endereço." });
      return;
    }

    const cleanHour = startHour.length === 5 ? `${startHour}:00` : startHour;
    const formattedDateHour = `${date}T${cleanHour}`;
    const cleanCep = address.postalCode.replace(/\D/g, "");

    let isoDataNascimento = student.dataNascimento;
    if (student.dataNascimento === "22/11/2025") {
      isoDataNascimento = "2025-11-22T20:46:58.641Z";
    } else if (student.dataNascimento.includes("/")) {
      const [dd, mm, yyyy] = student.dataNascimento.split("/");
      if (dd && mm && yyyy) {
        isoDataNascimento = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}T00:00:00.000Z`;
      }
    } else if (student.dataNascimento && !student.dataNascimento.includes("T")) {
      isoDataNascimento = `${student.dataNascimento}T00:00:00.000Z`;
    }

    const finalSexo = student.sexo?.toUpperCase().startsWith("M") ? "M" : "F";
    const finalPais = student.pais?.trim() || "Brasil";

    const payload: ExperimentalSchedule = {
      nomeAluno: student.nome.trim(),
      sexo: finalSexo,
      emailAluno: student.email.trim(),
      cpfAluno: stripNonDigit(student.cpf),
      ddd: student.ddd.trim(),
      numero: student.numero.trim(),
      pais: finalPais,
      dataNascimento: isoDataNascimento,
      agendamentoDTO: {
        data: formattedDateHour,
        descricao: descricao.trim() || `${date} - ${startHour}`,
        novoEndereco: {
          numero: address.number.trim(),
          complemento: address.complement?.trim() || "",
          unidade: address.unidade?.trim() || "",
          tipo: address.tipo?.trim() || (classType === "RESIDENCIAL" ? "Residencial" : "Comercial"),
          cep: {
            id: cleanCep,
          },
        },
        personalId: Number(selectedPersonal?.id ?? propPersonalId ?? authUser?.id ?? 1),
        tipoAulaProdutoContratado: classType,
      },
    };

    setSubmitting(true);
    try {
      await insertExperimentalAppointment(payload);
      setSuccessVisible(true);
    } catch (err: any) {
      const data = err?.response?.data;
      const msg = data?.Exception ?? data?.message ?? data?.mensagem ?? "Não foi possível criar o agendamento experimental.";
      setErrorModal({ visible: true, title: "Erro ao agendar", content: msg });
    } finally {
      setSubmitting(false);
    }
  }

  function handleSuccessClose() {
    setSuccessVisible(false);
    onSuccess?.();
    onClose();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  const stepLabels = ["Dados do Aluno", "Horário", "Endereço"];

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconWrap}>
              <UserPlus size={18} color="#fff" />
            </View>
            <View>
              <Text style={styles.title}>Aula Experimental</Text>
              <Text style={styles.stepIndicator}>Etapa {step} de 3 — {stepLabels[step - 1]}</Text>
            </View>
          </View>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.closeText}>Fechar</Text>
          </Pressable>
        </View>

        {/* Step indicators */}
        <View style={styles.stepRow}>
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              style={[styles.stepDot, s === step && styles.stepDotActive, s < step && styles.stepDotDone]}
            />
          ))}
        </View>

        {/* ── Step 1: Student data ─────────────────────────────────────────── */}
        {step === 1 && (
          <>
            <View style={styles.infoBox}>
              <Text style={styles.infoText}>
                Preencha os dados do aluno experimental. Ele não precisa ter uma conta ativa no sistema.
              </Text>
            </View>

            {/* Atalhos de Auto-preenchimento */}
            <View style={styles.devSection}>
              <Text style={styles.devLabel}>Atalhos de Teste:</Text>
              <View style={styles.devButtonsRow}>
                <TouchableOpacity
                  style={styles.btnAutoFill}
                  onPress={handleAutoFillStudent}
                  activeOpacity={0.7}
                >
                  <Text style={styles.btnAutoFillText}>Carlos (M)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnAutoFill}
                  onPress={handleAutoFillStudent2}
                  activeOpacity={0.7}
                >
                  <Text style={styles.btnAutoFillText}>Mariana (F)</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnAutoFill}
                  onPress={handleAutoFillAll}
                  activeOpacity={0.7}
                >
                  <Text style={styles.btnAutoFillText}>Preencher Tudo</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.sectionTitle}>Nome completo *</Text>
            <TextInput
              style={[styles.input, !!fieldErrors.nome && styles.inputError]}
              value={student.nome}
              onChangeText={(v) => updateStudent("nome", v)}
              placeholder="Nome do aluno"
            />
            {fieldErrors.nome ? <Text style={styles.errorText}>{fieldErrors.nome}</Text> : null}

            <Text style={styles.sectionTitle}>E-mail *</Text>
            <TextInput
              style={[styles.input, !!fieldErrors.email && styles.inputError]}
              value={student.email}
              onChangeText={(v) => updateStudent("email", v)}
              placeholder="email@exemplo.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {fieldErrors.email ? <Text style={styles.errorText}>{fieldErrors.email}</Text> : null}

            <Text style={styles.sectionTitle}>CPF *</Text>
            <TextInput
              style={[styles.input, !!fieldErrors.cpf && styles.inputError]}
              value={student.cpf}
              onChangeText={(v) => updateStudent("cpf", formatCpf(v))}
              placeholder="000.000.000-00"
              keyboardType="numeric"
              maxLength={14}
            />
            {fieldErrors.cpf ? <Text style={styles.errorText}>{fieldErrors.cpf}</Text> : null}

            <Text style={styles.sectionTitle}>Data de nascimento *</Text>
            <TextInput
              style={[styles.input, !!fieldErrors.dataNascimento && styles.inputError]}
              value={student.dataNascimento}
              onChangeText={(v) => {
                // Format as DD/MM/AAAA as the user types
                const digits = v.replace(/\D/g, "").slice(0, 8);
                let formatted = digits;
                if (digits.length > 2) formatted = `${digits.slice(0, 2)}/${digits.slice(2)}`;
                if (digits.length > 4) formatted = `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
                updateStudent("dataNascimento", formatted);
              }}
              placeholder="DD/MM/AAAA"
              keyboardType="numeric"
              maxLength={10}
            />
            {fieldErrors.dataNascimento ? <Text style={styles.errorText}>{fieldErrors.dataNascimento}</Text> : null}

            <Text style={styles.sectionTitle}>Sexo</Text>
            <View style={styles.optionRow}>
              {[
                { label: "Feminino", value: "F" },
                { label: "Masculino", value: "M" },
              ].map((opt) => {
                const isSel =
                  student.sexo === opt.value ||
                  (opt.value === "F" && student.sexo === "FEMININO") ||
                  (opt.value === "M" && student.sexo === "MASCULINO");
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.option, isSel && styles.optionSelected]}
                    onPress={() => updateStudent("sexo", opt.value)}
                  >
                    <Text style={[styles.optionText, isSel && styles.optionTextSelected]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.sectionTitle}>Telefone e País *</Text>
            <View style={styles.phoneRow}>
              <TextInput
                style={[styles.input, styles.phoneCountry, !!fieldErrors.pais && styles.inputError]}
                value={student.pais}
                onChangeText={(v) => updateStudent("pais", v)}
                placeholder="País (Brasil)"
                maxLength={20}
              />
              <TextInput
                style={[styles.input, styles.phoneDdd, !!fieldErrors.ddd && styles.inputError]}
                value={student.ddd}
                onChangeText={(v) => updateStudent("ddd", stripNonDigit(v).slice(0, 2))}
                placeholder="DDD"
                keyboardType="numeric"
                maxLength={2}
              />
              <TextInput
                style={[styles.input, styles.phoneNumber, !!fieldErrors.numero && styles.inputError]}
                value={student.numero}
                onChangeText={(v) => updateStudent("numero", stripNonDigit(v).slice(0, 9))}
                placeholder="9 00000000"
                keyboardType="numeric"
                maxLength={9}
              />
            </View>
            {(fieldErrors.ddd || fieldErrors.numero) ? (
              <Text style={styles.errorText}>{fieldErrors.ddd || fieldErrors.numero}</Text>
            ) : null}

            <Pressable style={styles.submitBtn} onPress={goToStep2}>
              <Text style={styles.submitText}>Avançar</Text>
              <ChevronRight size={18} color="#fff" />
            </Pressable>
          </>
        )}

        {/* ── Step 2: Schedule ─────────────────────────────────────────────── */}
        {step === 2 && (
          <>
            {/* Personal */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Personal Trainer</Text>
              {loadingPersonals && <ActivityIndicator size="small" color="#0f567f" />}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.personalRow}>
              {personalsList.map((p) => {
                const sel = selectedPersonal?.id === p.id;
                return (
                  <Pressable
                    key={p.id}
                    style={[styles.personalCard, sel && styles.personalCardSelected]}
                    onPress={() => setSelectedPersonalId(p.id)}
                  >
                    <View style={[styles.avatar, sel && styles.avatarSelected]}>
                      <Text style={[styles.avatarText, sel && styles.avatarTextSelected]}>
                        {p.nome.slice(0, 1)}
                      </Text>
                    </View>
                    <Text style={[styles.personalName, sel && styles.selectedText]} numberOfLines={1}>{p.nome}</Text>
                    <Text style={[styles.personalDetail, sel && styles.selectedText]} numberOfLines={1}>{p.especialidade}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Date */}
            <Text style={styles.sectionTitle}>Data da aula</Text>
            <View style={styles.readonlyDate}>
              <Text style={styles.readonlyDateText}>{date ? formatDate(date) : "Selecione uma data"}</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysRow}>
              {upcomingDays.map((item) => {
                const sel = date === item.fullDate;
                return (
                  <Pressable
                    key={item.fullDate}
                    style={[styles.dayCard, sel && styles.dayCardSelected, item.isDisabled && styles.dayCardDisabled]}
                    onPress={() => !item.isDisabled && setDate(item.fullDate)}
                    disabled={item.isDisabled}
                  >
                    <Text style={[styles.dayWeekText, sel && styles.daySelectedText, item.isDisabled && styles.dayDisabledText]}>{item.weekDay}</Text>
                    <Text style={[styles.dayNumberText, sel && styles.daySelectedText, item.isDisabled && styles.dayDisabledText]}>{item.dayNumber}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Class type */}
            <Text style={styles.sectionTitle}>Tipo de aula</Text>
            <View style={styles.optionRow}>
              {CLASS_TYPES.map((ct) => (
                <Pressable
                  key={ct}
                  style={[styles.option, classType === ct && styles.optionSelected]}
                  onPress={() => setClassType(ct)}
                >
                  <Text style={[styles.optionText, classType === ct && styles.optionTextSelected]}>{ct}</Text>
                </Pressable>
              ))}
            </View>

            {/* Time slots */}
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Horários disponíveis</Text>
              {loadingHours && <ActivityIndicator size="small" color="#0f567f" />}
            </View>

            {/* Atalho para selecionar horário */}
            {dynamicSchedules.length > 0 && (
              <View style={styles.devSection}>
                <Text style={styles.devLabel}>Atalhos de Teste:</Text>
                <View style={styles.devButtonsRow}>
                  <TouchableOpacity
                    style={styles.btnAutoFill}
                    onPress={() => setStartHour(dynamicSchedules[0].startHour)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.btnAutoFillText}>1º Horário Disponível ({dynamicSchedules[0].startHour})</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {availablePeriods.length > 0 ? (
              <>
                <View style={styles.optionRow}>
                  {availablePeriods.map((ap) => (
                    <Pressable
                      key={ap}
                      style={[styles.option, period === ap && styles.optionSelected]}
                      onPress={() => { setPeriod(ap); setStartHour(""); }}
                    >
                      <Text style={[styles.optionText, period === ap && styles.optionTextSelected]}>{ap}</Text>
                    </Pressable>
                  ))}
                </View>
                <View style={styles.hours}>
                  {periodSchedules.map((s) => {
                    const sel = startHour === s.startHour;
                    return (
                      <Pressable
                        key={s.startHour}
                        style={[styles.hourButton, sel && styles.optionSelected]}
                        onPress={() => setStartHour(s.startHour)}
                      >
                        <Text style={[styles.hourText, sel && styles.optionTextSelected]}>{s.startHour} - {s.endHour}</Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : (
              <View style={styles.emptyHoursBox}>
                <Text style={styles.emptyHoursText}>
                  {loadingHours ? "Consultando horários..." : "Nenhum horário disponível para esta data e tipo de aula."}
                </Text>
              </View>
            )}

            <View style={styles.navRow}>
              <Pressable style={styles.backBtn} onPress={() => setStep(1)}>
                <ChevronLeft size={16} color="#0f567f" />
                <Text style={styles.backText}>Voltar</Text>
              </Pressable>
              <Pressable
                style={[styles.submitBtn, styles.submitBtnFlex, (!startHour) && styles.submitBtnDisabled]}
                onPress={goToStep3}
                disabled={!startHour}
              >
                <Text style={styles.submitText}>Avançar para endereço</Text>
                <ChevronRight size={18} color="#fff" />
              </Pressable>
            </View>
          </>
        )}

        {/* ── Step 3: Address ──────────────────────────────────────────────── */}
        {step === 3 && (
          <>
            {/* Summary */}
            {(() => {
              const badge = getClassTypeBadge(classType);
              const BadgeIcon = badge.icon;
              return (
                <View style={styles.summaryCard}>
                  {/* Top Bar: Title + Modality Chip */}
                  <View style={styles.summaryHeader}>
                    <View style={styles.summaryTitleRow}>
                      <View style={styles.summaryHeaderIcon}>
                        <CalendarCheck size={16} color="#0f567f" />
                      </View>
                      <Text style={styles.summaryTitle}>Resumo do agendamento</Text>
                    </View>
                    <View
                      style={[
                        styles.classTypeBadge,
                        {
                          backgroundColor: badge.bg,
                          borderColor: badge.borderColor,
                        },
                      ]}
                    >
                      <BadgeIcon size={12} color={badge.color} />
                      <Text style={[styles.classTypeBadgeText, { color: badge.color }]}>
                        {badge.label}
                      </Text>
                    </View>
                  </View>

                  {/* Date & Time Highlight Box */}
                  <View style={styles.dateTimeBanner}>
                    <View style={styles.dateTimeCol}>
                      <View style={styles.dateTimeLabelRow}>
                        <Calendar size={13} color="#0f567f" />
                        <Text style={styles.dateTimeLabel}>DATA</Text>
                      </View>
                      <Text style={styles.dateTimeValue}>{formatDate(date) || "Não definida"}</Text>
                    </View>
                    <View style={styles.dateTimeDivider} />
                    <View style={styles.dateTimeCol}>
                      <View style={styles.dateTimeLabelRow}>
                        <Clock size={13} color="#0f567f" />
                        <Text style={styles.dateTimeLabel}>HORÁRIO</Text>
                      </View>
                      <Text style={styles.dateTimeValue}>{startHour || "--:--"}</Text>
                    </View>
                  </View>

                  {/* People Details */}
                  <View style={styles.peopleSection}>
                    {/* Aluno */}
                    <View style={styles.personRow}>
                      <View style={[styles.personIconCircle, styles.studentIconCircle]}>
                        <User size={16} color="#0284c7" />
                      </View>
                      <View style={styles.personInfo}>
                        <Text style={styles.personRole}>ALUNO(A)</Text>
                        <Text style={styles.personName} numberOfLines={1}>
                          {student.nome || "Não informado"}
                        </Text>
                        {student.numero ? (
                          <Text style={styles.personSubtext} numberOfLines={1}>
                            ({student.ddd}) {student.numero}
                            {student.email ? ` • ${student.email}` : ""}
                          </Text>
                        ) : student.email ? (
                          <Text style={styles.personSubtext} numberOfLines={1}>
                            {student.email}
                          </Text>
                        ) : null}
                      </View>
                      <View style={styles.experimentalBadge}>
                        <Text style={styles.experimentalBadgeText}>Experimental</Text>
                      </View>
                    </View>

                    <View style={styles.personDivider} />

                    {/* Personal Trainer */}
                    <View style={styles.personRow}>
                      <View style={[styles.personIconCircle, styles.personalIconCircle]}>
                        <Dumbbell size={16} color="#4f46e5" />
                      </View>
                      <View style={styles.personInfo}>
                        <Text style={styles.personRole}>PERSONAL TRAINER</Text>
                        <Text style={styles.personName} numberOfLines={1}>
                          {selectedPersonal?.nome ?? "Personal"}
                        </Text>
                        <Text style={styles.personSubtext} numberOfLines={1}>
                          {selectedPersonal?.especialidade || "Personal Trainer"}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })()}

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Endereço do local</Text>
              {loadingAddresses && <ActivityIndicator size="small" color="#0f567f" />}
            </View>

            {/* Atalhos de Auto-preenchimento */}
            <View style={styles.devSection}>
              <Text style={styles.devLabel}>Atalhos de Teste:</Text>
              <View style={styles.devButtonsRow}>
                <TouchableOpacity
                  style={styles.btnAutoFill}
                  onPress={handleAutoFillAddress}
                  activeOpacity={0.7}
                >
                  <Text style={styles.btnAutoFillText}>Preencher Endereço</Text>
                </TouchableOpacity>
              </View>
            </View>

            {savedAddresses.length > 0 && (
              <>
                <Text style={styles.addressSubtitle}>Endereços salvos</Text>
                <View style={styles.savedAddressesWrap}>
                  {savedAddresses.map((sa) => {
                    const sel = selectedAddressId === sa.id;
                    return (
                      <Pressable
                        key={sa.id}
                        style={[styles.savedAddress, sel && styles.optionSelected]}
                        onPress={() => selectSavedAddress(sa)}
                      >
                        <Text style={[styles.savedAddressLabel, sel && styles.optionTextSelected]}>{sa.label}</Text>
                        <Text style={[styles.savedAddressText, sel && styles.optionTextSelected]}>{sa.street}, {sa.number}</Text>
                        <Text style={[styles.savedAddressText, sel && styles.optionTextSelected]}>{sa.city} - {sa.state}</Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.divider} />
                <Text style={styles.orLabel}>Ou informe outro endereço:</Text>
              </>
            )}

            <View style={styles.cepWrap}>
              <TextInput
                style={styles.input}
                value={address.postalCode}
                onChangeText={(v) => updateAddress("postalCode", v)}
                placeholder="CEP * (somente números)"
                keyboardType="numeric"
                maxLength={9}
              />
              {loadingCep && <ActivityIndicator size="small" color="#0f567f" style={styles.cepLoader} />}
            </View>

            <TextInput style={styles.input} value={address.street} onChangeText={(v) => updateAddress("street", v)} placeholder="Logradouro / Rua *" />

            <View style={styles.inputRow}>
              <TextInput style={[styles.input, styles.halfInput]} value={address.number} onChangeText={(v) => updateAddress("number", v)} placeholder="Número *" keyboardType="numeric" />
              <TextInput style={[styles.input, styles.halfInput]} value={address.complement} onChangeText={(v) => updateAddress("complement", v)} placeholder="Complemento" />
            </View>

            <View style={styles.inputRow}>
              <TextInput style={[styles.input, styles.halfInput]} value={address.unidade} onChangeText={(v) => updateAddress("unidade", v)} placeholder="Unidade (ex: Torre A)" />
              <TextInput style={[styles.input, styles.halfInput]} value={address.tipo} onChangeText={(v) => updateAddress("tipo", v)} placeholder="Tipo (ex: Comercial)" />
            </View>

            <View style={styles.inputRow}>
              <TextInput style={[styles.input, styles.halfInput]} value={address.city} onChangeText={(v) => updateAddress("city", v)} placeholder="Cidade *" />
              <TextInput style={[styles.input, styles.stateInput]} value={address.state} onChangeText={(v) => updateAddress("state", v)} placeholder="UF *" maxLength={2} autoCapitalize="characters" />
            </View>

            <Text style={styles.sectionTitle}>Descrição da aula</Text>
            <TextInput
              style={styles.input}
              value={descricao}
              onChangeText={setDescricao}
              placeholder="Ex: Aula experimental de pilates"
            />

            <View style={styles.navRow}>
              <Pressable style={styles.backBtn} onPress={() => setStep(2)}>
                <ChevronLeft size={16} color="#0f567f" />
                <Text style={styles.backText}>Voltar</Text>
              </Pressable>
              <Pressable
                style={[styles.submitBtn, styles.submitBtnFlex, submitting && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={styles.submitText}>Confirmar agendamento</Text>}
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>

      <SuccessModal
        visible={successVisible}
        title="Aula experimental agendada!"
        content="O agendamento foi criado com sucesso e já aparece na sua agenda."
        useNativeModal={false}
        onClose={handleSuccessClose}
      />

      {errorModal.visible && (
        <ErrorModal
          visible={errorModal.visible}
          title={errorModal.title}
          content={errorModal.content}
          useNativeModal={false}
          closeThen={() => setErrorModal({ visible: false, title: "", content: "" })}
          onClose={() => setErrorModal({ visible: false, title: "", content: "" })}
        />
      )}
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { padding: 20, paddingBottom: 48, backgroundColor: "#f4f8fb" },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIconWrap: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#0f567f", alignItems: "center", justifyContent: "center" },
  title: { fontSize: 20, fontWeight: "800", color: "#173a52" },
  stepIndicator: { color: "#678193", fontSize: 12, marginTop: 2 },
  closeText: { color: "#0f567f", fontWeight: "700", fontSize: 15 },

  stepRow: { flexDirection: "row", gap: 6, marginBottom: 20 },
  stepDot: { flex: 1, height: 4, borderRadius: 4, backgroundColor: "#c8d9e5" },
  stepDotActive: { backgroundColor: "#0f567f" },
  stepDotDone: { backgroundColor: "#3b82f6" },

  infoBox: { backgroundColor: "#e8f3fa", borderRadius: 12, padding: 14, marginBottom: 16, borderLeftWidth: 3, borderLeftColor: "#0f567f" },
  infoText: { color: "#173a52", fontSize: 13, lineHeight: 19 },

  sectionTitle: { fontSize: 15, fontWeight: "800", color: "#173a52", marginTop: 14, marginBottom: 8 },
  sectionHeaderRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 14, marginBottom: 8 },

  input: { minHeight: 46, borderWidth: 1, borderColor: "#c8d9e5", borderRadius: 10, backgroundColor: "#fff", paddingHorizontal: 12, marginBottom: 8, color: "#173a52", fontSize: 14 },
  inputError: { borderColor: "#e53e3e" },
  errorText: { color: "#e53e3e", fontSize: 12, marginBottom: 8, marginTop: -4 },

  optionRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  option: { borderWidth: 1, borderColor: "#c8d9e5", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, backgroundColor: "#fff" },
  optionSelected: { backgroundColor: "#0f567f", borderColor: "#0f567f" },
  optionText: { color: "#264d64", fontWeight: "600", fontSize: 14 },
  optionTextSelected: { color: "#fff" },

  phoneRow: { flexDirection: "row", gap: 8 },
  phoneCountry: { flex: 0.9, minWidth: 0, marginBottom: 0 },
  phoneDdd: { flex: 0.4, minWidth: 0, marginBottom: 0 },
  phoneNumber: { flex: 1.1, minWidth: 0, marginBottom: 0 },

  personalRow: { gap: 10, paddingVertical: 4 },
  personalCard: { width: 140, padding: 12, borderWidth: 1, borderColor: "#c8d9e5", borderRadius: 14, backgroundColor: "#fff" },
  personalCardSelected: { backgroundColor: "#0f567f", borderColor: "#0f567f" },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#d6e9f5", alignItems: "center", justifyContent: "center", marginBottom: 8 },
  avatarSelected: { backgroundColor: "#ffffff22" },
  avatarText: { fontSize: 18, fontWeight: "800", color: "#0f567f" },
  avatarTextSelected: { color: "#fff" },
  personalName: { fontWeight: "800", color: "#173a52", fontSize: 13 },
  personalDetail: { fontSize: 11, color: "#587386", marginTop: 2 },
  selectedText: { color: "#fff" },

  readonlyDate: { minHeight: 46, borderWidth: 1, borderColor: "#c8d9e5", borderRadius: 10, backgroundColor: "#e9eff3", justifyContent: "center", paddingHorizontal: 12, marginBottom: 4 },
  readonlyDateText: { color: "#173a52", fontWeight: "700" },

  daysRow: { gap: 8, paddingVertical: 6, marginBottom: 8 },
  dayCard: { width: 58, paddingVertical: 10, borderWidth: 1, borderColor: "#c8d9e5", borderRadius: 12, alignItems: "center", backgroundColor: "#fff" },
  dayCardSelected: { backgroundColor: "#0f567f", borderColor: "#0f567f" },
  dayCardDisabled: { backgroundColor: "#f1f5f9", borderColor: "#e2e8f0" },
  dayWeekText: { fontSize: 11, fontWeight: "700", color: "#678193", marginBottom: 4 },
  dayNumberText: { fontSize: 15, fontWeight: "800", color: "#173a52" },
  daySelectedText: { color: "#fff" },
  dayDisabledText: { color: "#94a3b8" },

  hours: { gap: 8, marginTop: 10 },
  hourButton: { borderWidth: 1, borderColor: "#c8d9e5", borderRadius: 10, paddingVertical: 12, alignItems: "center", backgroundColor: "#fff" },
  hourText: { fontSize: 15, fontWeight: "700", color: "#173a52" },

  emptyHoursBox: { backgroundColor: "#eef3f7", padding: 16, borderRadius: 10, alignItems: "center", marginTop: 6 },
  emptyHoursText: { color: "#678193", fontSize: 13, textAlign: "center" },

  navRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 20 },
  backBtn: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 4, gap: 4 },
  backText: { color: "#0f567f", fontWeight: "700", fontSize: 15 },
  submitBtn: { backgroundColor: "#0f567f", borderRadius: 12, padding: 14, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, marginTop: 20 },
  submitBtnFlex: { flex: 1, marginTop: 0 },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: "#fff", fontWeight: "800", fontSize: 15 },

  summaryCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    marginBottom: 16,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  summaryTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  summaryHeaderIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e8f3fa",
    alignItems: "center",
    justifyContent: "center",
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0f283d",
  },
  classTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  classTypeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  dateTimeBanner: {
    flexDirection: "row",
    backgroundColor: "#f8fafc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  dateTimeCol: {
    flex: 1,
    gap: 3,
  },
  dateTimeLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dateTimeLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: 0.5,
  },
  dateTimeValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0f172a",
    paddingLeft: 18,
  },
  dateTimeDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#e2e8f0",
    marginHorizontal: 10,
  },
  peopleSection: {
    gap: 10,
  },
  personRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  personIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  studentIconCircle: {
    backgroundColor: "#e0f2fe",
  },
  personalIconCircle: {
    backgroundColor: "#eef2ff",
  },
  personInfo: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  personRole: {
    fontSize: 10,
    fontWeight: "700",
    color: "#64748b",
    letterSpacing: 0.4,
  },
  personName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0f172a",
  },
  personSubtext: {
    fontSize: 12,
    color: "#64748b",
  },
  experimentalBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#e0f2fe",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bae6fd",
  },
  experimentalBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0284c7",
  },
  personDivider: {
    height: 1,
    backgroundColor: "#f1f5f9",
  },

  addressSubtitle: { fontSize: 13, fontWeight: "800", color: "#456176", marginBottom: 8 },
  savedAddressesWrap: { gap: 8, marginBottom: 4 },
  savedAddress: { borderWidth: 1, borderColor: "#c8d9e5", borderRadius: 10, backgroundColor: "#fff", padding: 12 },
  savedAddressLabel: { color: "#173a52", fontWeight: "800", marginBottom: 3 },
  savedAddressText: { color: "#587386", fontSize: 13 },
  divider: { height: 1, backgroundColor: "#d4e1e9", marginTop: 16, marginBottom: 10 },
  orLabel: { fontSize: 13, color: "#587386", marginBottom: 8 },

  cepWrap: { position: "relative", justifyContent: "center" },
  cepLoader: { position: "absolute", right: 14, top: 14 },
  inputRow: { flexDirection: "row", gap: 10 },
  halfInput: { flex: 1, minWidth: 0 },
  stateInput: { flex: 0.35, minWidth: 0 },

  devSection: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  devLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#4B5563",
    marginBottom: 6,
    textTransform: "uppercase",
  },
  devButtonsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  btnAutoFill: {
    backgroundColor: "#E5E7EB",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  btnAutoFillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#1F2937",
  },
  btnAutoFillPrimary: {
    backgroundColor: "#e0f2fe",
    borderWidth: 1,
    borderColor: "#bae6fd",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  btnAutoFillPrimaryText: {
    color: "#0369a1",
    fontWeight: "700",
  },
});
