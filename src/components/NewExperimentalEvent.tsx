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
import { UserPlus, Calendar, MapPin, ChevronRight, ChevronLeft } from "lucide-react-native";
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
  dataNascimento: string; // DD/MM/AAAA
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
    sexo: "",
    email: "",
    cpf: "",
    dataNascimento: "",
    ddd: "",
    numero: "",
    pais: "55",
  });

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
      setStudent({ nome: "", sexo: "", email: "", cpf: "", dataNascimento: "", ddd: "", numero: "", pais: "55" });
      setDate(getTomorrowDateString());
      setStartHour("");
      setClassType("PRESENCIAL");
      setAddress({ postalCode: "", street: "", city: "", state: "", number: "", complement: "", neighborhood: "" });
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
    } else if (nascDigits.length !== 8) {
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

  // ── Autofill para Desenvolvimento/Testes ──────────────────────────────────
  function handleAutoFillStudent() {
    setStudent({
      nome: "Carlos Eduardo Silva",
      sexo: "MASCULINO",
      email: "carlos.experimental@email.com",
      cpf: "120.791.650-11",
      dataNascimento: "15/05/1998",
      ddd: "11",
      numero: "998877665",
      pais: "55",
    });
    setFieldErrors({});
  }

  function handleAutoFillStudent2() {
    setStudent({
      nome: "Mariana Costa",
      sexo: "FEMININO",
      email: "mariana.experimental@email.com",
      cpf: "775.813.720-22",
      dataNascimento: "22/08/2001",
      ddd: "11",
      numero: "987654321",
      pais: "55",
    });
    setFieldErrors({});
  }

  function handleAutoFillAddress() {
    setSelectedAddressId(undefined);
    setAddress({
      postalCode: "01001-000",
      street: "Praça da Sé",
      number: "100",
      complement: "Apto 42",
      neighborhood: "Sé",
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
    if (!address.postalCode || !address.street || !address.number || !address.city || !address.state) {
      setErrorModal({ visible: true, title: "Endereço incompleto", content: "Preencha CEP, logradouro, número, cidade e estado." });
      return;
    }

    const selectedSlot = dynamicSchedules.find((s) => s.startHour === startHour);
    const cleanHour = startHour.length === 5 ? `${startHour}:00` : startHour;
    const formattedDateHour = `${date}T${cleanHour}`;
    const cleanCep = address.postalCode.replace(/\D/g, "");

    let isoDataNascimento = student.dataNascimento;
    if (student.dataNascimento.includes("/")) {
      const [dd, mm, yyyy] = student.dataNascimento.split("/");
      if (dd && mm && yyyy) {
        isoDataNascimento = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
      }
    }

    const payload = {
      nomeAluno: student.nome.trim(),
      sexo: student.sexo || undefined,
      emailAluno: student.email.trim(),
      cpfAluno: stripNonDigit(student.cpf),
      dataNascimento: isoDataNascimento,
      ddd: student.ddd,
      numero: student.numero,
      pais: student.pais || "55",
      agendamentoDTO: {
        data: formattedDateHour,
        descricao: `${date} - ${startHour}`,
        novoEndereco: {
          numero: address.number,
          complemento: address.complement || "",
          tipo: classType,
          cep: {
            id: cleanCep,
            logradouro: address.street,
            bairro: address.neighborhood || "",
            localidade: address.city,
            uf: address.state,
          },
        },
        personalId: Number(selectedPersonal?.id ?? 0),
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
                  <Text style={styles.btnAutoFillText}>Aluno 1</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.btnAutoFill}
                  onPress={handleAutoFillStudent2}
                  activeOpacity={0.7}
                >
                  <Text style={styles.btnAutoFillText}>Aluno 2</Text>
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
              {["MASCULINO", "FEMININO", "OUTRO"].map((s) => (
                <Pressable
                  key={s}
                  style={[styles.option, student.sexo === s && styles.optionSelected]}
                  onPress={() => updateStudent("sexo", s)}
                >
                  <Text style={[styles.optionText, student.sexo === s && styles.optionTextSelected]}>
                    {s === "MASCULINO" ? "Masculino" : s === "FEMININO" ? "Feminino" : "Outro"}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Telefone *</Text>
            <View style={styles.phoneRow}>
              <TextInput
                style={[styles.input, styles.phoneCountry, !!fieldErrors.pais && styles.inputError]}
                value={student.pais}
                onChangeText={(v) => updateStudent("pais", stripNonDigit(v))}
                placeholder="+55"
                keyboardType="numeric"
                maxLength={3}
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
            <View style={styles.summaryBox}>
              <Text style={styles.summaryTitle}>Resumo do agendamento</Text>
              <Text style={styles.summaryLine}>👤 {student.nome}</Text>
              <Text style={styles.summaryLine}>🏋️ {selectedPersonal?.nome ?? "-"}</Text>
              <Text style={styles.summaryLine}>📅 {formatDate(date)} às {startHour}</Text>
              <Text style={styles.summaryLine}>🏷️ {classType}</Text>
            </View>

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
              <TextInput style={[styles.input, styles.halfInput]} value={address.city} onChangeText={(v) => updateAddress("city", v)} placeholder="Cidade *" />
              <TextInput style={[styles.input, styles.stateInput]} value={address.state} onChangeText={(v) => updateAddress("state", v)} placeholder="UF *" maxLength={2} autoCapitalize="characters" />
            </View>

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
  phoneCountry: { flex: 0.3, minWidth: 0, marginBottom: 0 },
  phoneDdd: { flex: 0.25, minWidth: 0, marginBottom: 0 },
  phoneNumber: { flex: 1, minWidth: 0, marginBottom: 0 },

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

  summaryBox: { backgroundColor: "#e8f3fa", borderRadius: 14, padding: 16, borderWidth: 1, borderColor: "#c8e0ee", marginBottom: 4 },
  summaryTitle: { fontSize: 15, fontWeight: "800", color: "#173a52", marginBottom: 10 },
  summaryLine: { color: "#355c73", fontSize: 13, marginBottom: 4 },

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
});
