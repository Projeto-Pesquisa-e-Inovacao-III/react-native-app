import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  Calendar,
  CalendarCheck,
  CheckCircle2,
  Clock,
  Clock3,
  Dumbbell,
  Home,
  Activity,
  Info,
} from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { getPersonalList, insertAppointment, disabledPersonalDays, rescheduleAppointment } from "../constants/schedule";
import { getPersonalHours } from "../constants/personal";
import { getUserAddresses, lookupCep } from "../constants/address";
import { useAuth } from "../contexts/AuthContext";
import type { Schedule, ScheduleReschedule } from "../models/schedule";
import SuccessModal from "./modals/SuccessModal";
import ErrorModal from "./modals/ErrorModal";
import NoticeModal from "./modals/NoticeModal";

export type Personal = {
  id: number;
  nome: string;
  especialidade: string;
  caminhoFoto?: string;
};

export type TimeSlot = {
  startHour: string;
  endHour: string;
};

export type SavedAddress = {
  id: number;
  label: string;
  postalCode: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  number: string;
  complement: string;
};

export type NewEventPayload = {
  date: string;
  startHour: string;
  endHour: string;
  type: "PRESENCIAL" | "RESIDENCIAL" | "FUNCIONAL";
  location: string;
  personal: Personal;
  address: {
    postalCode: string;
    street: string;
    city: string;
    state: string;
    number: string;
    complement: string;
    neighborhood?: string;
  };
};

type NewEventProps = {
  visible: boolean;
  initialDate?: string;
  initialStartHour?: string;
  initialAddress?: SavedAddress;
  onClose: () => void;
  onSubmit?: (payload: NewEventPayload) => void;
  availableHours?: string[];
  personals?: Personal[];
  schedules?: TimeSlot[];
  addresses?: SavedAddress[];
  isReschedule?: boolean;
  rescheduleId?: number;
  appoitmentData?: any;
  title?: string;
  buttonTitle?: string;
  goToNextStep?: boolean;
  openModalExtern?: () => void;
  onRescheduleSuccess?: () => void;
  errorModal?: (title: string, description: string) => void;
  typeUser?: string[];
  voiceAssisted?: boolean;
};

type TimePeriod = "MANHÃ" | "TARDE" | "NOITE";
type Address = NewEventPayload["address"];

const CLASS_TYPES: NewEventPayload["type"][] = [
  "PRESENCIAL",
  "RESIDENCIAL",
  "FUNCIONAL",
];

function getTomorrowDateString() {
  const d = new Date(Date.now() + 86400000);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(date: string) {
  if (!date) return "";
  const parsed = new Date(date + "T12:00:00");
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString("pt-BR");
}

function getClassTypeBadge(type: string) {
  const upper = (type || "").toUpperCase();
  if (upper.includes("RESIDENCIAL")) {
    return {
      label: "Residencial",
      bg: "#fef3c7",
      color: "#92400e",
      borderColor: "#fde68a",
      icon: Home,
    };
  }
  if (upper.includes("FUNCIONAL")) {
    return {
      label: "Funcional",
      bg: "#f3e8ff",
      color: "#6b21a8",
      borderColor: "#e9d5ff",
      icon: Activity,
    };
  }
  return {
    label: "Presencial",
    bg: "#e0f2fe",
    color: "#0369a1",
    borderColor: "#bae6fd",
    icon: Dumbbell,
  };
}

function getPeriod(hour: string): TimePeriod {
  const value = Number(hour.split(":")[0]);
  if (value < 12) return "MANHÃ";
  if (value < 18) return "TARDE";
  return "NOITE";
}

function isDateAtLeastTomorrow(dateStr: string) {
  if (!dateStr) return false;
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length !== 3) return false;
  const target = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return target.getTime() > todayStart.getTime();
}

function isCompleteAddress(address: Address) {
  const cepDigits = address.postalCode.replace(/\D/g, "");
  return (
    cepDigits.length === 8 &&
    address.street.trim().length > 0 &&
    address.number.trim().length > 0 &&
    address.city.trim().length > 0 &&
    address.state.trim().length === 2
  );
}

function hasAddressDetails(address?: SavedAddress) {
  if (!address) return false;
  return [
    address.postalCode,
    address.street,
    address.neighborhood,
    address.city,
    address.state,
    address.number,
    address.complement,
  ].some((value) => value?.trim().length);
}

export default function NewEvent({
  visible,
  initialDate = "",
  initialStartHour = "",
  initialAddress,
  onClose,
  onSubmit,
  personals: propPersonals,
  schedules: propSchedules,
  addresses: propAddresses,
  isReschedule = false,
  rescheduleId,
  appoitmentData,
  title,
  buttonTitle,
  goToNextStep,
  openModalExtern,
  onRescheduleSuccess,
  errorModal: propErrorModal,
  typeUser,
  voiceAssisted = false,
}: NewEventProps) {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [date, setDate] = useState<string>(() => {
    if (appoitmentData?.dataInicio) {
      return String(appoitmentData.dataInicio).split("T")[0];
    }
    if (initialDate && isDateAtLeastTomorrow(initialDate)) {
      return initialDate;
    }
    return getTomorrowDateString();
  });
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [errorModal, setErrorModal] = useState<{
    visible: boolean;
    title: string;
    content: string;
  }>({
    visible: false,
    title: "",
    content: "",
  });
  const [savedPayload, setSavedPayload] = useState<NewEventPayload | null>(null);

  useEffect(() => {
    if (visible) {
      if (isReschedule && appoitmentData?.dataInicio) {
        setDate(String(appoitmentData.dataInicio).split("T")[0]);
      } else if (initialDate && isDateAtLeastTomorrow(initialDate)) {
        setDate(initialDate);
      } else {
        setDate(getTomorrowDateString());
      }

      if (appoitmentData?.tipoAula) {
        setType(appoitmentData.tipoAula as NewEventPayload["type"]);
      }

      if (appoitmentData?.personal?.id) {
        setSelectedPersonalId(appoitmentData.personal.id);
      }

      setStartHour(initialStartHour);
      if (initialAddress) {
        setAddress({
          postalCode: initialAddress.postalCode,
          street: initialAddress.street,
          city: initialAddress.city,
          state: initialAddress.state,
          number: initialAddress.number,
          complement: initialAddress.complement,
          neighborhood: initialAddress.neighborhood || "",
        });
      }

      setStep(voiceAssisted ? 2 : 1);
      setError("");
      setRequestedPersonalNotFound(false);
      setShowPersonalNotice(false);
      setShowMissingAddressNotice(false);
      setShowVoicePersonalPicker(false);
      setVoiceAvailability(voiceAssisted ? "checking" : "available");
      setSuccessModalVisible(false);
      setErrorModal({ visible: false, title: "", content: "" });
      setSavedPayload(null);
    }
  }, [visible, initialDate, initialStartHour, initialAddress, isReschedule, appoitmentData, voiceAssisted]);

  // Autenticação e perfil
  const { roles } = useAuth();
  const isPersonalOrAdmin = roles ? (roles.includes("personal") || roles.includes("admin")) : false;

  // Personais
  const [personalsList, setPersonalsList] = useState<Personal[]>(
    propPersonals && propPersonals.length > 0 ? propPersonals : []
  );
  const [loadingPersonals, setLoadingPersonals] = useState(false);
  const [selectedPersonalId, setSelectedPersonalId] = useState<number | undefined>(undefined);
  const [requestedPersonalNotFound, setRequestedPersonalNotFound] = useState(false);
  const [showPersonalNotice, setShowPersonalNotice] = useState(false);
  const [showMissingAddressNotice, setShowMissingAddressNotice] = useState(false);
  const [showVoicePersonalPicker, setShowVoicePersonalPicker] = useState(false);
  const [personalNotice, setPersonalNotice] = useState({
    title: "Personal não encontrado",
    content: "",
    actionLabel: "Escolher personal",
    canChoose: true,
  });
  const [disabledWeekdays, setDisabledWeekdays] = useState<string[]>([]);

  // Tipo de aula e Horários
  const [type, setType] = useState<NewEventPayload["type"]>("PRESENCIAL");
  const [period, setPeriod] = useState<TimePeriod>("MANHÃ");
  const [startHour, setStartHour] = useState("");
  const [dynamicSchedules, setDynamicSchedules] = useState<TimeSlot[]>(
    propSchedules && propSchedules.length > 0 ? propSchedules : []
  );
  const [loadingHours, setLoadingHours] = useState(false);
  const [voiceAvailability, setVoiceAvailability] = useState<
    "checking" | "available" | "unavailable" | "error"
  >(voiceAssisted ? "checking" : "available");

  // Endereço
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>(
    propAddresses && propAddresses.length > 0 ? propAddresses : []
  );
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<number>();
  const [address, setAddress] = useState<Address>({
    postalCode: initialAddress?.postalCode ?? "",
    street: initialAddress?.street ?? "",
    city: initialAddress?.city ?? "",
    state: initialAddress?.state ?? "",
    number: initialAddress?.number ?? "",
    complement: initialAddress?.complement ?? "",
    neighborhood: initialAddress?.neighborhood ?? "",
  });
  const [loadingCep, setLoadingCep] = useState(false);
  const addressIsComplete = isCompleteAddress(address);

  // Estado de submissão e erro
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const cepDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Carregar lista de personais da API (apenas quando modal estiver visível e perfil for aluno)
  useEffect(() => {
    if (!visible || isPersonalOrAdmin) return;
    let isMounted = true;
    async function fetchPersonals() {
      setLoadingPersonals(true);
      const startedAt = Date.now();
      try {
        const response = await getPersonalList();
        const rawContent = response.data?.content || response.data;
        if (__DEV__) {
          console.info("[Agendamento] Personais carregados", {
            endpoint: "/personais",
            status: response.status,
            durationMs: Date.now() - startedAt,
            total: Array.isArray(rawContent) ? rawContent.length : null,
          });
        }
        if (isMounted && Array.isArray(rawContent) && rawContent.length > 0) {
          const mapped: Personal[] = rawContent.map((p: any) => ({
            id: p.id,
            nome: p.nome || p.usuario?.nome || "Personal",
            especialidade: p.especialidade || "Personal Trainer",
            caminhoFoto: p.caminhoFoto,
          }));
          setPersonalsList(mapped);
          const requestedPersonalId = Number(appoitmentData?.personal?.id);
          const requestedPersonalName = String(appoitmentData?.personal?.nome ?? "")
            .trim()
            .toLocaleLowerCase();
          const normalizeName = (name: string) =>
            name
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, "")
              .toLocaleLowerCase();
          const normalizedRequestedName = normalizeName(requestedPersonalName);
          const preferredPersonal =
            mapped.find((personal) => personal.id === requestedPersonalId) ??
            mapped.find(
              (personal) => {
                const normalizedName = normalizeName(personal.nome.trim());
                return (
                  normalizedRequestedName.length > 0 &&
                  (normalizedName === normalizedRequestedName ||
                    normalizedName.includes(normalizedRequestedName) ||
                    normalizedRequestedName.includes(normalizedName))
                );
              },
            );
          if (preferredPersonal) {
            setSelectedPersonalId(preferredPersonal.id);
            setRequestedPersonalNotFound(false);
          } else if (voiceAssisted) {
            setSelectedPersonalId(undefined);
            setRequestedPersonalNotFound(true);
            setVoiceAvailability("unavailable");
            setPersonalNotice({
              title: "Personal não encontrado",
              content: `A IA identificou "${requestedPersonalName}", mas não encontramos esse profissional. Escolha abaixo qual personal deve receber o agendamento.`,
              actionLabel: "Escolher personal",
              canChoose: mapped.length > 0,
            });
            setShowPersonalNotice(true);
            if (__DEV__) {
              console.warn("[Agendamento IA] Personal reconhecido não encontrado na lista", {
                personalSolicitado: appoitmentData?.personal?.nome,
                personaisDisponiveis: mapped.map((personal) => ({
                  id: personal.id,
                  nome: personal.nome,
                })),
              });
            }
          } else {
            setSelectedPersonalId(mapped[0].id);
          }
        } else if (isMounted && voiceAssisted) {
          setSelectedPersonalId(undefined);
          setRequestedPersonalNotFound(true);
          setVoiceAvailability("unavailable");
          setPersonalNotice({
            title: "Nenhum personal disponível",
            content: "Não foi possível carregar a lista de personais. Tente novamente mais tarde.",
            actionLabel: "Fechar",
            canChoose: false,
          });
          setShowPersonalNotice(true);
        }
      } catch (error) {
        if (isMounted && voiceAssisted) {
          setSelectedPersonalId(undefined);
          setRequestedPersonalNotFound(true);
          setVoiceAvailability("error");
          setPersonalNotice({
            title: "Não foi possível validar o personal",
            content: "Ocorreu um erro ao consultar os personais disponíveis. Verifique sua conexão e tente novamente.",
            actionLabel: "Fechar",
            canChoose: false,
          });
          setShowPersonalNotice(true);
        }
        if (__DEV__) {
          console.error("[Agendamento] Falha ao carregar personais", {
            endpoint: "/personais",
            durationMs: Date.now() - startedAt,
            error,
          });
        }
      } finally {
        if (isMounted) setLoadingPersonals(false);
      }
    }

    fetchPersonals();
    return () => {
      isMounted = false;
    };
  }, [visible, isPersonalOrAdmin, appoitmentData, voiceAssisted]);

  // 1b. Carregar dias desabilitados do personal selecionado (apenas quando visível)
  useEffect(() => {
    if (!visible || isPersonalOrAdmin || !selectedPersonalId) return;
    const personalId = selectedPersonalId;
    let isMounted = true;
    async function fetchDisabledDays() {
      try {
        const res = await disabledPersonalDays(personalId);
        const data = res.data;
        const list = Array.isArray(data) ? data : data?.content ?? [];
        const inactive: string[] = Array.from(
          new Set(
            list
              .filter((d: { ativo: boolean; diaSemana: string }) => !d.ativo)
              .map((d: { ativo: boolean; diaSemana: string }) => d.diaSemana.toLowerCase())
          )
        );
        if (isMounted) setDisabledWeekdays(inactive);
      } catch {
        // mantém sem restrição em caso de falha
      }
    }
    fetchDisabledDays();
    return () => { isMounted = false; };
  }, [visible, isPersonalOrAdmin, selectedPersonalId]);

  // 2. Carregar endereços salvos da API
  useEffect(() => {
    let isMounted = true;
    async function fetchAddresses() {
      setLoadingAddresses(true);
      try {
        const response = await getUserAddresses();
        const data = response.data;
        if (isMounted && Array.isArray(data) && data.length > 0) {
          const mapped: SavedAddress[] = data.map((addr: any) => ({
            id: addr.id ?? 0,
            label: addr.tipo || "-",
            postalCode: addr.cep?.id || addr.cep?.cep || "",
            street: addr.cep?.logradouro || "",
            neighborhood: addr.cep?.bairro || "",
            city: addr.cep?.localidade || "",
            state: addr.cep?.uf || "",
            number: addr.numero || "",
            complement: addr.complemento || "",
          }));
          setSavedAddresses(mapped);
          if (initialAddress && hasAddressDetails(initialAddress)) {
            const matchingAddress = mapped.find(
              (savedAddress) =>
                savedAddress.postalCode.replace(/\D/g, "") ===
                  initialAddress.postalCode.replace(/\D/g, "") &&
                savedAddress.number === initialAddress.number,
            );
            setAddress({
              postalCode: initialAddress.postalCode,
              street: initialAddress.street,
              city: initialAddress.city,
              state: initialAddress.state,
              number: initialAddress.number,
              complement: initialAddress.complement,
              neighborhood: initialAddress.neighborhood || "",
            });
            setSelectedAddressId(matchingAddress?.id);
          }
        } else if (
          isMounted &&
          voiceAssisted &&
          !hasAddressDetails(initialAddress)
        ) {
          setSavedAddresses([]);
          setShowMissingAddressNotice(true);
        }
      } catch (error) {
        if (__DEV__) {
          console.error("[Agendamento IA] Falha ao consultar endereços salvos", {
            endpoint: "/enderecos",
            error,
          });
        }
      } finally {
        if (isMounted) setLoadingAddresses(false);
      }
    }

    fetchAddresses();
    return () => {
      isMounted = false;
    };
  }, [initialAddress]);

  // 3. Carregar horários disponíveis do personal selecionado para a data e tipo
  useEffect(() => {
    let isMounted = true;
    async function fetchHours() {
      if (!selectedPersonalId || !date) return;
      setLoadingHours(true);
      setStartHour("");
      if (voiceAssisted) setVoiceAvailability("checking");
      const startedAt = Date.now();
      try {
        const response = await getPersonalHours(selectedPersonalId, date, type);
        const data = response.data;
        if (__DEV__) {
          console.info("[Agendamento] Horários consultados", {
            endpoint: `/personais/${selectedPersonalId}/horarios-disponiveis`,
            params: { data: date, tipoAula: type },
            status: response.status,
            durationMs: Date.now() - startedAt,
            data,
          });
        }
        if (isMounted) {
          if (Array.isArray(data) && data.length > 0) {
            const mappedSlots: TimeSlot[] = data.map((slot: any) => ({
              startHour: slot.inicio || slot.horaInicio,
              endHour: slot.fim || slot.horaFim,
            }));
            setDynamicSchedules(mappedSlots);
            if (initialStartHour) {
              const normalizedInitialHour = initialStartHour.slice(0, 5);
              const matchingSlot = mappedSlots.find(
                (slot) => slot.startHour.slice(0, 5) === normalizedInitialHour,
              );
              if (matchingSlot) {
                setStartHour(matchingSlot.startHour);
                if (voiceAssisted) setVoiceAvailability("available");
              } else if (voiceAssisted) {
                setVoiceAvailability("unavailable");
              }
            } else if (voiceAssisted) {
              setVoiceAvailability("unavailable");
            }

            // Ajusta o período ativo se o atual não tiver slots
            const periods = Array.from(
              new Set(mappedSlots.map((s) => getPeriod(s.startHour)))
            );
            if (periods.length > 0 && !periods.includes(period)) {
              setPeriod(periods[0]);
            }
          } else {
            setDynamicSchedules([]);
            if (voiceAssisted) setVoiceAvailability("unavailable");
          }
        }
      } catch (error) {
        // Se a API de horários falhar, exibe mensagem de sem disponibilidade
        if (isMounted) {
          setDynamicSchedules(voiceAssisted ? [] : propSchedules || []);
          if (voiceAssisted) setVoiceAvailability("error");
        }
        if (__DEV__) {
          console.error("[Agendamento] Falha ao consultar horários", {
            endpoint: `/personais/${selectedPersonalId}/horarios-disponiveis`,
            params: { data: date, tipoAula: type },
            durationMs: Date.now() - startedAt,
            error,
          });
        }
      } finally {
        if (isMounted) setLoadingHours(false);
      }
    }

    fetchHours();
    return () => {
      isMounted = false;
    };
  }, [selectedPersonalId, date, type, propSchedules, initialStartHour, voiceAssisted]);

  const selectedPersonal = useMemo(() => {
    return (
      personalsList.find((p) => p.id === selectedPersonalId) ??
      (voiceAssisted ? undefined : personalsList[0]) ??
      undefined
    );
  }, [personalsList, selectedPersonalId, voiceAssisted]);

  const availablePeriods = useMemo(
    () =>
      Array.from(
        new Set(dynamicSchedules.map((schedule) => getPeriod(schedule.startHour)))
      ),
    [dynamicSchedules]
  );

  const periodSchedules = useMemo(
    () =>
      dynamicSchedules.filter(
        (schedule) => getPeriod(schedule.startHour) === period
      ),
    [dynamicSchedules, period]
  );

  // Lista de próximos dias para seleção fácil de data
  // Mapeia índice do getDay() para o nome PT usado na API (igual ao MonthlyCalendar)
  const WEEKDAY_PT_NAMES: Record<number, string> = {
    0: 'domingo',
    1: 'segunda',
    2: 'terca',
    3: 'quarta',
    4: 'quinta',
    5: 'sexta',
    6: 'sabado',
  };

  const upcomingDays = useMemo(() => {
    const days: { fullDate: string; dayNumber: number; weekDay: string; isDisabled: boolean }[] = [];
    const base = new Date();
    // Inicia a partir de amanhã devido à regra de 24h de antecedência
    for (let i = 1; i <= 14; i++) {
      const d = new Date(base.getTime() + i * 86400000);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const weekDay = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
      const weekdayKey = WEEKDAY_PT_NAMES[d.getDay()];
      const isDisabled = disabledWeekdays.includes(weekdayKey);
      days.push({
        fullDate: `${year}-${month}-${day}`,
        dayNumber: d.getDate(),
        weekDay: weekDay.toUpperCase(),
        isDisabled,
      });
    }
    return days;
  }, [disabledWeekdays]);

  function selectAddress(savedAddress: SavedAddress) {
    setSelectedAddressId(savedAddress.id);
    setAddress({
      postalCode: savedAddress.postalCode,
      street: savedAddress.street,
      city: savedAddress.city,
      state: savedAddress.state,
      number: savedAddress.number,
      complement: savedAddress.complement,
      neighborhood: savedAddress.neighborhood || "",
    });
  }

  function updateAddress(field: keyof Address, value: string) {
    const inputValue =
      field === "postalCode" || field === "number"
        ? value.replace(/\D/g, "")
        : value;
    setSelectedAddressId(undefined);
    setAddress((previous) => ({ ...previous, [field]: inputValue }));

    // Se o campo for CEP, faz busca automática via ViaCEP com debounce
    if (field === "postalCode") {
      const cleanDigits = inputValue;
      if (cepDebounceTimer.current) clearTimeout(cepDebounceTimer.current);

      if (cleanDigits.length === 8) {
        cepDebounceTimer.current = setTimeout(async () => {
          setLoadingCep(true);
          try {
            const data = await lookupCep(cleanDigits);
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

  function goToAddress() {
    if (!date || !startHour) {
      const msg = "Selecione uma data e um horário disponível para avançar.";
      setError(msg);
      setErrorModal({
        visible: true,
        title: "Atenção!",
        content: msg,
      });
      return;
    }

    // Validação estrita de 24 horas de antecedência
    const parts = date.split("-").map(Number);
    const hourParts = startHour.split(":").map(Number);
    if (parts.length === 3 && hourParts.length >= 2) {
      const scheduledDateTime = new Date(
        parts[0],
        parts[1] - 1,
        parts[2],
        hourParts[0],
        hourParts[1],
        0
      );
      const now = new Date();
      const diffHours = (scheduledDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (diffHours < 24) {
        const msg = "Aulas só podem ser agendadas com pelo menos 24 horas de antecedência.";
        setError(msg);
        setErrorModal({
          visible: true,
          title: "Antecedência mínima",
          content: msg,
        });
        return;
      }
    }

    setError("");
    setStep(2);
  }

  async function submit() {
    if (!selectedPersonal) {
      const msg = "Não foi possível identificar o personal para este agendamento.";
      setError(msg);
      setErrorModal({
        visible: true,
        title: "Personal não identificado",
        content: msg,
      });
      return;
    }

    if (!addressIsComplete) {
      const msg = "Informe um CEP válido com 8 dígitos e preencha logradouro, número, cidade e UF.";
      setError(msg);
      setErrorModal({
        visible: true,
        title: "Endereço incompleto",
        content: msg,
      });
      return;
    }

    const selectedSchedule = dynamicSchedules.find(
      (schedule) => schedule.startHour === startHour
    );
    const endHour = selectedSchedule?.endHour ?? startHour;

    const cleanCep = address.postalCode.replace(/\D/g, "");
    const formattedDateHour = `${date}T${startHour.length === 5 ? startHour + ":00" : startHour}`;

    const apiPayload: Schedule = {
      data: formattedDateHour,
      descricao: `${date} - ${startHour}`,
      novoEndereco: {
        numero: address.number,
        complemento: address.complement || "",
        tipo: type,
        cep: {
          id: cleanCep,
          logradouro: address.street,
          bairro: address.neighborhood || "",
          localidade: address.city,
          uf: address.state,
        },
      },
      personalId: selectedPersonal.id,
      tipoAulaProdutoContratado: type,
    };

    setSubmitting(true);
    setError("");
    const requestStartedAt = Date.now();

    try {
      if (__DEV__) {
        console.info("[Agendamento] Enviando solicitação para personal", {
          method: "POST",
          endpoint: "/agendamentos",
          payload: apiPayload,
        });
      }

      const response = await insertAppointment(apiPayload);
      void queryClient.invalidateQueries({ queryKey: ["overview"] });
      if (__DEV__) {
        console.info("[Agendamento] Solicitação aceita pelo backend", {
          endpoint: "/agendamentos",
          status: response.status,
          durationMs: Date.now() - requestStartedAt,
          data: response.data,
        });
      }

      const payload: NewEventPayload = {
        date,
        startHour,
        endHour,
        type,
        location: type,
        personal: selectedPersonal,
        address,
      };

      setSavedPayload(payload);
      setSuccessModalVisible(true);
    } catch (err: any) {
      const responseData = err?.response?.data;
      if (__DEV__) {
        console.error("[Agendamento] Falha ao solicitar aula", {
          endpoint: "/agendamentos",
          status: err?.response?.status ?? null,
          durationMs: Date.now() - requestStartedAt,
          response: responseData ?? null,
          message: err?.message,
        });
      }
      const apiMessage =
        responseData?.Exception ||
        responseData?.message ||
        responseData?.mensagem ||
        "Não foi possível concluir o agendamento. Verifique se você possui saldo de aulas deste tipo e tente novamente.";
      setError(apiMessage);
      setErrorModal({
        visible: true,
        title: "Não foi possível agendar",
        content: apiMessage,
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReschedule() {
    if (!date || !startHour) {
      const msg = "Selecione uma data e um horário disponível.";
      setError(msg);
      if (propErrorModal) {
        propErrorModal("Erro ao reagendar", msg);
      } else {
        setErrorModal({
          visible: true,
          title: "Atenção!",
          content: msg,
        });
      }
      return;
    }

    const appointmentPersonalId =
      selectedPersonal?.id ??
      appoitmentData?.personal?.id ??
      appoitmentData?.personalId;
    const numericPersonalId = Number(appointmentPersonalId);
    if (!Number.isFinite(numericPersonalId) || numericPersonalId <= 0) {
      const msg = "Não foi possível identificar o personal deste agendamento.";
      setError(msg);
      if (propErrorModal) {
        propErrorModal("Erro ao reagendar", msg);
      } else {
        setErrorModal({
          visible: true,
          title: "Erro ao reagendar",
          content: msg,
        });
      }
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const cleanHour = startHour.length === 5 ? `${startHour}:00` : startHour;
      const formattedDateHour = `${date}T${cleanHour}`;
      const payload: ScheduleReschedule = {
        idAgendamento: rescheduleId,
        data: formattedDateHour,
        descricao: `${date} - ${startHour}`,
        endereco: null,
        personalId: numericPersonalId,
        tipoAulaProdutoContratado: String(type || appoitmentData?.tipoAula || "PRESENCIAL").toUpperCase(),
      };

      await rescheduleAppointment(payload);
      if (openModalExtern) {
        openModalExtern();
      } else if (onRescheduleSuccess) {
        onRescheduleSuccess();
      } else {
        setSuccessModalVisible(true);
      }
    } catch (err: any) {
      const responseData = err?.response?.data;
      const apiMessage =
        responseData?.Exception ||
        responseData?.message ||
        responseData?.mensagem ||
        "Não foi possível reagendar o horário.";
      setError(apiMessage);
      if (propErrorModal) {
        propErrorModal("Erro ao reagendar", apiMessage);
      } else {
        setErrorModal({
          visible: true,
          title: "Erro ao reagendar",
          content: apiMessage,
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleSuccessClose() {
    setSuccessModalVisible(false);
    if (savedPayload) {
      onSubmit?.(savedPayload);
    }
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView
        style={styles.formScroll}
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, 20),
            paddingBottom: Math.max(insets.bottom + 24, 40),
          },
        ]}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator
        overScrollMode="always"
        contentInsetAdjustmentBehavior="never"
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>{title || (isReschedule ? "Reagendar horário" : "Agendar aula")}</Text>
            {(!isReschedule || goToNextStep !== false) && (
              <Text style={styles.stepIndicator}>
                {voiceAssisted
                  ? step === 1
                    ? "Escolha o horário"
                    : "Confira o endereço"
                  : `Etapa ${step} de 2`}
              </Text>
            )}
          </View>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>Fechar</Text>
          </Pressable>
        </View>

        {step === 1 ? (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Personal Trainer</Text>
              {loadingPersonals ? (
                <ActivityIndicator size="small" color="#0f567f" />
              ) : null}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.personalRow}
            >
              {personalsList.map((personal) => {
                const isSelected = selectedPersonal?.id === personal.id;
                return (
                  <Pressable
                    key={personal.id}
                    style={[styles.personalCard, isSelected && styles.selectedCard]}
                    onPress={() => setSelectedPersonalId(personal.id)}
                  >
                    <View style={[styles.avatar, isSelected && styles.avatarSelected]}>
                      <Text
                        style={[
                          styles.avatarText,
                          isSelected && styles.avatarTextSelected,
                        ]}
                      >
                        {personal.nome.slice(0, 1)}
                      </Text>
                    </View>
                    <Text
                      style={[styles.personalName, isSelected && styles.selectedText]}
                      numberOfLines={1}
                    >
                      {personal.nome}
                    </Text>
                    <Text
                      style={[styles.personalDetail, isSelected && styles.selectedText]}
                      numberOfLines={1}
                    >
                      {personal.especialidade}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionTitle}>Data da aula</Text>
            <View style={styles.readonlyDate}>
              <Text style={styles.readonlyDateText}>
                {date ? formatDate(date) : "Selecione uma data"}
              </Text>
            </View>

            {/* Seletor rápido de dias */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.daysRow}
            >
              {upcomingDays.map((item) => {
                const isDaySelected = date === item.fullDate;
                return (
                  <Pressable
                    key={item.fullDate}
                    style={[
                      styles.dayCard,
                      isDaySelected && styles.dayCardSelected,
                      item.isDisabled && styles.dayCardDisabled,
                    ]}
                    onPress={() => !item.isDisabled && setDate(item.fullDate)}
                    disabled={item.isDisabled}
                  >
                    <Text
                      style={[
                        styles.dayWeekText,
                        isDaySelected && styles.daySelectedText,
                        item.isDisabled && styles.dayDisabledText,
                      ]}
                    >
                      {item.weekDay}
                    </Text>
                    <Text
                      style={[
                        styles.dayNumberText,
                        isDaySelected && styles.daySelectedText,
                        item.isDisabled && styles.dayDisabledText,
                      ]}
                    >
                      {item.dayNumber}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionTitle}>Tipo de aula</Text>
            <View style={styles.options}>
              {CLASS_TYPES.map((classType) => (
                <Pressable
                  key={classType}
                  style={[
                    styles.option,
                    type === classType && styles.optionSelected,
                  ]}
                  onPress={() => setType(classType)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      type === classType && styles.optionTextSelected,
                    ]}
                  >
                    {classType}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Horários disponíveis</Text>
              {loadingHours ? (
                <ActivityIndicator size="small" color="#0f567f" />
              ) : null}
            </View>

            {requestedPersonalNotFound && voiceAssisted ? null : availablePeriods.length > 0 ? (
              <>
                <View style={styles.options}>
                  {availablePeriods.map((availablePeriod) => (
                    <Pressable
                      key={availablePeriod}
                      style={[
                        styles.option,
                        period === availablePeriod && styles.optionSelected,
                      ]}
                      onPress={() => {
                        setPeriod(availablePeriod);
                        setStartHour("");
                      }}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          period === availablePeriod && styles.optionTextSelected,
                        ]}
                      >
                        {availablePeriod}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.hours}>
                  {periodSchedules.map((schedule) => {
                    const isSelected = startHour === schedule.startHour;
                    return (
                      <Pressable
                        key={schedule.startHour}
                        style={[
                          styles.hourButton,
                          isSelected && styles.optionSelected,
                        ]}
                        onPress={() => setStartHour(schedule.startHour)}
                      >
                        <Text
                          style={[
                            styles.hourButtonText,
                            isSelected && styles.optionTextSelected,
                          ]}
                        >
                          {schedule.startHour + " - " + schedule.endHour}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : (
              <View style={styles.emptyHoursBox}>
                <Text style={styles.emptyHoursText}>
                  {loadingHours
                    ? "Consultando horários livres do personal..."
                    : "Nenhum horário disponível para esta data e tipo de aula."}
                </Text>
              </View>
            )}

            <Pressable
              style={[styles.submit, (!date || !startHour || submitting || requestedPersonalNotFound) && styles.submitDisabled]}
              onPress={isReschedule && goToNextStep === false ? handleReschedule : goToAddress}
              disabled={!date || !startHour || submitting || requestedPersonalNotFound}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.submitText}>
                  {isReschedule && goToNextStep === false
                    ? (buttonTitle || "Reagendar")
                    : (buttonTitle || (voiceAssisted ? "Continuar para endereço" : "Avançar para endereço"))}
                </Text>
              )}
            </Pressable>
          </>
        ) : (
          <>
            {(() => {
              const badge = getClassTypeBadge(type);
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
              );
            })()}

            {voiceAssisted ? (
              <View
                style={[
                  styles.voiceAvailabilityBox,
                  voiceAvailability === "available" && styles.voiceAvailabilitySuccess,
                  (voiceAvailability === "unavailable" || requestedPersonalNotFound) &&
                    styles.voiceAvailabilityWarning,
                  voiceAvailability === "error" && styles.voiceAvailabilityError,
                ]}
              >
                <View style={styles.voiceAvailabilityIcon}>
                  {voiceAvailability === "available" ? (
                    <CheckCircle2 size={20} color="#15803D" strokeWidth={2.2} />
                  ) : voiceAvailability === "checking" ? (
                    <Clock3 size={20} color="#0F567F" strokeWidth={2.2} />
                  ) : voiceAvailability === "error" ? (
                    <Info size={20} color="#B42318" strokeWidth={2.2} />
                  ) : (
                    <Info size={20} color="#B45309" strokeWidth={2.2} />
                  )}
                </View>
                <View style={styles.voiceAvailabilityContent}>
                  <Text style={styles.voiceAvailabilityTitle}>
                    {requestedPersonalNotFound
                      ? "Escolha o profissional"
                      : voiceAvailability === "checking"
                        ? "Verificando disponibilidade"
                        : voiceAvailability === "available"
                          ? "Horário disponível"
                          : voiceAvailability === "unavailable"
                            ? "Horário indisponível"
                            : "Não foi possível verificar"}
                  </Text>
                  <Text style={styles.voiceAvailabilityText}>
                    {requestedPersonalNotFound
                      ? "Escolha qual personal deve receber este agendamento."
                      : voiceAvailability === "checking"
                        ? "Confirmando se o horário informado está disponível..."
                        : voiceAvailability === "available"
                          ? `Horário confirmado: ${formatDate(date)} às ${startHour.slice(0, 5)} com ${selectedPersonal?.nome}.`
                          : voiceAvailability === "unavailable"
                            ? "O horário indicado pela IA não está disponível para esse personal."
                            : "Não foi possível confirmar a disponibilidade do horário. Volte ao resumo e tente novamente."}
                  </Text>

                {voiceAvailability === "unavailable" &&
                !requestedPersonalNotFound &&
                dynamicSchedules.length > 0 ? (
                  <View style={styles.voiceAlternatives}>
                    <Text style={styles.voiceAlternativeTitle}>
                      Escolha um horário disponível
                    </Text>
                    <View style={styles.voiceAlternativeOptions}>
                      {dynamicSchedules.map((schedule) => {
                        const selected = startHour === schedule.startHour;
                        return (
                          <Pressable
                            key={schedule.startHour}
                            style={[
                              styles.voiceTimeOption,
                              selected && styles.voiceTimeOptionSelected,
                            ]}
                            onPress={() => {
                              setStartHour(schedule.startHour);
                              setVoiceAvailability("available");
                            }}
                          >
                            <Text
                              style={[
                                styles.voiceTimeOptionText,
                                selected && styles.voiceTimeOptionTextSelected,
                              ]}
                            >
                              {schedule.startHour.slice(0, 5)}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                ) : null}

                {voiceAvailability === "unavailable" &&
                !requestedPersonalNotFound &&
                dynamicSchedules.length === 0 &&
                !loadingHours ? (
                  <View style={styles.voiceAlternatives}>
                    <Text style={styles.voiceAlternativeTitle}>
                      Não há horários livres nesta data. Escolha outro dia:
                    </Text>
                    <View style={styles.voiceAlternativeOptions}>
                      {upcomingDays
                        .filter((day) => !day.isDisabled)
                        .map((day) => {
                          const selected = date === day.fullDate;
                          return (
                            <Pressable
                              key={day.fullDate}
                              style={[
                                styles.voiceDateOption,
                                selected && styles.voiceTimeOptionSelected,
                              ]}
                              onPress={() => {
                                setDate(day.fullDate);
                                setStartHour("");
                                setVoiceAvailability("checking");
                              }}
                            >
                              <Text
                                style={[
                                  styles.voiceTimeOptionText,
                                  selected && styles.voiceTimeOptionTextSelected,
                                ]}
                              >
                                {day.weekDay} {day.dayNumber}
                              </Text>
                            </Pressable>
                          );
                        })}
                    </View>
                  </View>
                ) : null}
                </View>
              </View>
            ) : null}

            {voiceAssisted && showVoicePersonalPicker ? (
              <View style={styles.voicePersonalPicker}>
                <Text style={styles.addressSectionTitle}>
                  Escolha o personal para este agendamento
                </Text>
                {personalsList.map((personal) => {
                  const isSelected = selectedPersonalId === personal.id;
                  return (
                    <Pressable
                      key={personal.id}
                      style={[
                        styles.savedAddress,
                        isSelected && styles.optionSelected,
                      ]}
                      onPress={() => {
                        setSelectedPersonalId(personal.id);
                        setRequestedPersonalNotFound(false);
                        setVoiceAvailability("checking");
                        setStartHour("");
                        setShowVoicePersonalPicker(false);
                      }}
                    >
                      <Text
                        style={[
                          styles.savedAddressLabel,
                          isSelected && styles.optionTextSelected,
                        ]}
                      >
                        {personal.nome}
                      </Text>
                      <Text
                        style={[
                          styles.savedAddressText,
                          isSelected && styles.optionTextSelected,
                        ]}
                      >
                        {personal.especialidade || "Personal Trainer"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Endereço do local</Text>
              {loadingAddresses ? (
                <ActivityIndicator size="small" color="#0f567f" />
              ) : null}
            </View>

            {savedAddresses.length > 0 ? (
              <>
                <Text style={styles.addressSectionTitle}>Endereços salvos</Text>
                <View style={styles.savedAddresses}>
                  {savedAddresses.map((savedAddress) => {
                    const isSelected = selectedAddressId === savedAddress.id;
                    return (
                      <Pressable
                        key={savedAddress.id}
                        style={[
                          styles.savedAddress,
                          isSelected && styles.optionSelected,
                        ]}
                        onPress={() => selectAddress(savedAddress)}
                      >
                        <Text
                          style={[
                            styles.savedAddressLabel,
                            isSelected && styles.optionTextSelected,
                          ]}
                        >
                          {savedAddress.label}
                        </Text>
                        <Text
                          style={[
                            styles.savedAddressText,
                            isSelected && styles.optionTextSelected,
                          ]}
                        >
                          {savedAddress.street + ", " + savedAddress.number}
                        </Text>
                        <Text
                          style={[
                            styles.savedAddressText,
                            isSelected && styles.optionTextSelected,
                          ]}
                        >
                          {savedAddress.city + " - " + savedAddress.state}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.addressDivider} />
                <Text style={styles.label}>Ou informe outro endereço:</Text>
              </>
            ) : null}

            <View style={styles.cepInputContainer}>
              <TextInput
                style={styles.input}
                value={address.postalCode}
                onChangeText={(value: string) => updateAddress("postalCode", value)}
                placeholder="CEP * (somente números)"
                placeholderTextColor="#678193"
                keyboardType="numeric"
                maxLength={8}
              />
              {loadingCep ? (
                <ActivityIndicator
                  size="small"
                  color="#0f567f"
                  style={styles.cepLoader}
                />
              ) : null}
            </View>

            <TextInput
              style={styles.input}
              value={address.street}
              onChangeText={(value: string) => updateAddress("street", value)}
              placeholder="Logradouro / Rua *"
              placeholderTextColor="#678193"
            />

            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                value={address.number}
                onChangeText={(value: string) => updateAddress("number", value)}
                placeholder="Número *"
                placeholderTextColor="#678193"
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                value={address.complement}
                onChangeText={(value: string) => updateAddress("complement", value)}
                placeholder="Complemento"
                placeholderTextColor="#678193"
              />
            </View>

            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                value={address.city}
                onChangeText={(value: string) => updateAddress("city", value)}
                placeholder="Cidade *"
                placeholderTextColor="#678193"
              />
              <TextInput
                style={[styles.input, styles.stateInput]}
                value={address.state}
                onChangeText={(value: string) => updateAddress("state", value)}
                placeholder="UF *"
                placeholderTextColor="#678193"
                maxLength={2}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.actions}>
              <Pressable
                style={styles.backButton}
                disabled={submitting}
                onPress={() => {
                  setError("");
                  if (voiceAssisted) {
                    onClose();
                  } else {
                    setStep(1);
                  }
                }}
              >
                <Text style={styles.backText}>
                  {voiceAssisted ? "Voltar ao resumo" : "Voltar"}
                </Text>
              </Pressable>

              <Pressable
                style={[
                  styles.submit,
                  (submitting ||
                    loadingCep ||
                    (!isReschedule && !addressIsComplete) ||
                    (voiceAssisted &&
                      (voiceAvailability !== "available" || requestedPersonalNotFound))) &&
                    styles.submitDisabled,
                ]}
                onPress={isReschedule ? handleReschedule : submit}
                disabled={
                  submitting ||
                  loadingCep ||
                  (!isReschedule && !addressIsComplete) ||
                  (voiceAssisted &&
                    (voiceAvailability !== "available" || requestedPersonalNotFound))
                }
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.submitText}>
                    {isReschedule ? "Confirmar reagendamento" : "Confirmar agendamento"}
                  </Text>
                )}
              </Pressable>
            </View>
            {!isReschedule && !addressIsComplete ? (
              <Text style={styles.addressValidationHint}>
                Para confirmar, informe CEP válido (8 dígitos), logradouro, número, cidade e UF.
              </Text>
            ) : null}
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      {/* Modal de Sucesso */}
      <SuccessModal
        visible={successModalVisible}
        title="Agendamento solicitado!"
        content="Sua solicitação de aula foi enviada com sucesso ao personal trainer."
        useNativeModal={false}
        onClose={handleSuccessClose}
      />

      {/* Modal de Erro */}
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
      <NoticeModal
        visible={showPersonalNotice}
        title={personalNotice.title}
        content={personalNotice.content}
        actionLabel={personalNotice.actionLabel}
        onAction={() => {
          setShowPersonalNotice(false);
          setShowVoicePersonalPicker(personalNotice.canChoose);
        }}
      />
      <NoticeModal
        visible={showMissingAddressNotice && !showPersonalNotice}
        title="Endereço não informado"
        content="A IA não identificou um endereço no pedido e você ainda não tem endereços cadastrados. Preencha os dados do endereço abaixo para continuar com o agendamento."
        actionLabel="Entendi"
        onAction={() => setShowMissingAddressNotice(false)}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  formScroll: {
    flex: 1,
    backgroundColor: "#f4f8fb",
  },
  container: {
    flexGrow: 1,
    padding: 20,
    paddingBottom: 40,
    backgroundColor: "#f4f8fb",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#173a52",
  },
  stepIndicator: {
    color: "#678193",
    marginTop: 3,
    fontSize: 13,
  },
  voiceAvailabilityBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  voiceAvailabilitySuccess: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  voiceAvailabilityWarning: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
  },
  voiceAvailabilityError: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  voiceAvailabilityIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  voiceAvailabilityContent: {
    flex: 1,
  },
  voiceAvailabilityTitle: {
    color: "#173A52",
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },
  voiceAvailabilityText: {
    color: "#456176",
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 19,
  },
  voiceAlternatives: {
    marginTop: 12,
    gap: 8,
  },
  voiceAlternativeTitle: {
    color: "#173a52",
    fontSize: 13,
    fontWeight: "700",
  },
  voiceAlternativeOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  voiceTimeOption: {
    minWidth: 64,
    minHeight: 42,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#c8d9e5",
    backgroundColor: "#FFFFFF",
  },
  voiceDateOption: {
    minHeight: 38,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#c8d9e5",
    backgroundColor: "#FFFFFF",
  },
  voiceTimeOptionSelected: {
    borderColor: "#0f567f",
    backgroundColor: "#0f567f",
  },
  voiceTimeOptionText: {
    color: "#264d64",
    fontSize: 14,
    fontWeight: "700",
  },
  voiceTimeOptionTextSelected: {
    color: "#FFFFFF",
  },
  voicePersonalPicker: {
    gap: 8,
    marginBottom: 8,
  },
  close: {
    color: "#0f567f",
    fontWeight: "700",
    fontSize: 15,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    marginTop: 18,
    marginBottom: 10,
    fontSize: 17,
    fontWeight: "800",
    color: "#173a52",
  },
  addressSectionTitle: {
    marginTop: 6,
    marginBottom: 10,
    fontSize: 14,
    fontWeight: "800",
    color: "#456176",
  },
  label: {
    fontSize: 13,
    color: "#587386",
    marginBottom: 8,
  },
  personalRow: {
    gap: 10,
    paddingVertical: 4,
  },
  personalCard: {
    width: 150,
    padding: 12,
    borderWidth: 1,
    borderColor: "#c8d9e5",
    borderRadius: 14,
    backgroundColor: "#fff",
  },
  selectedCard: {
    backgroundColor: "#0f567f",
    borderColor: "#0f567f",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#d6e9f5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatarSelected: {
    backgroundColor: "#ffffff22",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f567f",
  },
  avatarTextSelected: {
    color: "#ffffff",
  },
  personalName: {
    fontWeight: "800",
    color: "#173a52",
    fontSize: 14,
  },
  personalDetail: {
    marginTop: 3,
    fontSize: 12,
    color: "#587386",
  },
  selectedText: {
    color: "#fff",
  },
  daysRow: {
    gap: 8,
    paddingVertical: 6,
    marginBottom: 8,
  },
  dayCard: {
    width: 60,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#c8d9e5",
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  dayCardSelected: {
    backgroundColor: "#0f567f",
    borderColor: "#0f567f",
  },
  dayCardDisabled: {
    backgroundColor: "#f1f5f9",
    borderColor: "#e2e8f0",
  },
  dayDisabledText: {
    color: "#475569",
  },
  dayWeekText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#678193",
    marginBottom: 4,
  },
  dayNumberText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#173a52",
  },
  daySelectedText: {
    color: "#ffffff",
  },
  readonlyDate: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#c8d9e5",
    borderRadius: 10,
    backgroundColor: "#e9eff3",
    justifyContent: "center",
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  readonlyDateText: {
    color: "#173a52",
    fontWeight: "700",
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  option: {
    borderWidth: 1,
    borderColor: "#c8d9e5",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
  },
  optionSelected: {
    backgroundColor: "#0f567f",
    borderColor: "#0f567f",
  },
  optionText: {
    color: "#264d64",
    fontWeight: "600",
    fontSize: 14,
  },
  optionTextSelected: {
    color: "#fff",
  },
  hours: {
    gap: 8,
    marginTop: 12,
  },
  hourButton: {
    borderWidth: 1,
    borderColor: "#c8d9e5",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  hourButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#173a52",
  },
  emptyHoursBox: {
    backgroundColor: "#eef3f7",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 6,
  },
  emptyHoursText: {
    color: "#678193",
    fontSize: 13,
    textAlign: "center",
  },
  savedAddresses: {
    gap: 8,
    marginBottom: 4,
  },
  savedAddress: {
    borderWidth: 1,
    borderColor: "#c8d9e5",
    borderRadius: 10,
    backgroundColor: "#fff",
    padding: 12,
  },
  savedAddressLabel: {
    color: "#173a52",
    fontWeight: "800",
    marginBottom: 3,
  },
  savedAddressText: {
    color: "#587386",
    fontSize: 13,
  },
  addressDivider: {
    height: 1,
    backgroundColor: "#d4e1e9",
    marginTop: 18,
    marginBottom: 10,
  },
  cepInputContainer: {
    position: "relative",
    justifyContent: "center",
  },
  cepLoader: {
    position: "absolute",
    right: 14,
    top: 14,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#c8d9e5",
    borderRadius: 10,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    marginBottom: 10,
    color: "#173a52",
    fontSize: 14,
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
  },
  halfInput: {
    flex: 1,
    minWidth: 0,
  },
  stateInput: {
    flex: 0.35,
    minWidth: 0,
  },
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
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
  },
  backButton: {
    padding: 14,
  },
  backText: {
    color: "#0f567f",
    fontWeight: "700",
    fontSize: 16,
  },
  error: {
    color: "#b3393a",
    marginTop: 14,
    fontWeight: "600",
    fontSize: 13,
    backgroundColor: "#fde8e8",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f8b4b4",
  },
  addressValidationHint: {
    color: "#678193",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 8,
    textAlign: "center",
  },
  submit: {
    flex: 1,
    backgroundColor: "#0f567f",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
});
