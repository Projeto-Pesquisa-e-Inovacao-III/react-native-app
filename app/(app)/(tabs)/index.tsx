import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Bell, QrCode, Sparkles } from "lucide-react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useNotifications } from "../../../src/contexts/NotificationContext";
import OverviewCardPackageStatus from "../../../src/components/OverviewCardPackageStatus";
import Calendar from "../../../src/components/Calendar";
import NewEvent, { type NewEventPayload } from "../../../src/components/NewEvent";
import NotificationCenterModal from "../../../src/components/modals/NotificationCenterModal";
import AiPanelModal from "../../../src/components/modals/AiPanelModal";
import QRCodeDisplayModal, { type AppointmentForQr } from "../../../src/components/modals/QRCodeDisplayModal";
import PopupModal, { type PopupAppointment } from "../../../src/components/modals/PopupModal";
import {
  findUserAppointments,
  appointmentAtCalendar,
  findAppointmentById,
  disabledPersonalDays,
  getPersonalList,
} from "../../../src/constants/schedule";
import { getTotalByClassType } from "../../../src/constants/overview";
import { actualPlan as getActualPlan } from "../../../src/constants/products";
import { appoitmentsCount, getPersonalHours } from "../../../src/constants/personal";
import { findUserData } from "../../../src/constants/user";
import type { AnaliseIa } from "../../../src/models/schedule";

type Role = "aluno" | "personal" | "admin";

type Plan = {
  nome: string;
  dataExpiracao: string;
};

type ClassBalance = {
  saldoPresencial: number;
  saldoFuncional: number;
  saldoResidencial: number;
};

type AppointmentItem = {
  agendamentoId: number;
  agendamentoStatus: string;
  data: string;
  datafim: string;
  personalNome: string;
  alunoNome: string;
  tipoAula: string;
  caminhoFoto?: string;
  descricao?: string;
  analiseIa?: AnaliseIa;
  endereco?: {
    logradouro?: string;
    bairro?: string;
    cidade?: string;
    uf?: string;
    numero?: string;
    complemento?: string;
    postalCode?: string;
  };
};

type CalendarEvent = {
  agendamentoId?: number;
  data: string;
};

type DisabledDay = {
  ativo: boolean;
  diaSemana: string;
};

type PersonalSummary = {
  id: number;
};

type ApiResponse<T> = {
  data: T;
};

type OverviewNativeProps = {
  userRoles: Role[] | null;
  actualPlan?: Plan | null;
  classBalance?: ClassBalance;
  appointments?: AppointmentItem[];
  calendarEvents?: CalendarEvent[];
  disabledDays?: string[];
  pendingAppointments?: number;
  todayAppointments?: number;
  loading?: boolean;
  availableHours?: string[];
  onGoSchedule?: () => void;
  onGoPending?: () => void;
  onGoPackages?: () => void;
  onNewEvent?: (payload?: NewEventPayload) => void;
};

type ModalState = {
  visible: boolean;
  title: string;
  description: string;
};

const STATUS_LABELS: Record<string, string> = {
  APROVADO: "Aprovado",
  PENDENTE_CLIENTE_APROVACAO: "Pendente aprovação do cliente",
  PENDENTE_PERSONAL_APROVACAO: "Pendente aprovação do personal",
  CONCLUIDO: "Concluído",
  PENDENTE_PERSONAL_CONCLUIR: "Pendente conclusão do personal",
  CANCELADO_CLIENTE: "Cancelado pelo cliente",
  CANCELADO_PERSONAL: "Cancelado pelo personal",
  AUSENCIA_CLIENTE: "Ausência do cliente",
  AUSENCIA_PERSONAL: "Ausência do personal",
};

function getStatusLabel(status: string) {
  return STATUS_LABELS[status] ?? status;
}

function formatDate(dateISO: string) {
  const date = new Date(dateISO);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatHour(dateISO: string) {
  const date = new Date(dateISO);
  if (Number.isNaN(date.getTime())) return "--:--";
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function getApiList<T>(data: unknown): T[] {
  if (Array.isArray(data)) {
    return data as T[];
  }

  if (data && typeof data === "object" && "content" in data) {
    const content = (data as { content?: unknown }).content;
    if (Array.isArray(content)) {
      return content as T[];
    }
  }

  if (data && typeof data === "object" && "data" in data) {
    return getApiList((data as { data?: unknown }).data);
  }

  return [];
}

function normalizeAppointment(data: unknown): AppointmentItem | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const item = data as Record<string, unknown>;
  const personal =
    item.personal && typeof item.personal === "object"
      ? (item.personal as { nome?: string })
      : undefined;
  const aluno =
    item.aluno && typeof item.aluno === "object"
      ? (item.aluno as { nome?: string })
      : undefined;
  const id = getNumericId(item.agendamentoId ?? item.id);
  const startDate = item.data ?? item.dataInicio;
  if (id === undefined || typeof startDate !== "string") {
    return null;
  }

  return {
    agendamentoId: id,
    agendamentoStatus: String(item.agendamentoStatus ?? item.status ?? ""),
    data: startDate,
    datafim: String(item.datafim ?? item.dataFim ?? item.dataFinal ?? item.data),
    personalNome: String(item.personalNome ?? personal?.nome ?? ""),
    alunoNome: String(item.alunoNome ?? aluno?.nome ?? ""),
    tipoAula: String(item.tipoAula ?? item.tipo ?? ""),
    caminhoFoto: typeof item.caminhoFoto === "string" ? item.caminhoFoto : undefined,
    descricao: typeof item.descricao === "string" ? item.descricao : undefined,
    analiseIa: item.analiseIa as AnaliseIa | undefined,
    endereco: (() => {
      const end = item.endereco as Record<string, unknown> | undefined;
      if (!end) return undefined;
      const cep = end.cep && typeof end.cep === 'object'
        ? (end.cep as Record<string, unknown>)
        : undefined;
      return {
        logradouro: String(cep?.logradouro ?? end.logradouro ?? ''),
        bairro: String(cep?.bairro ?? end.bairro ?? ''),
        cidade: String(cep?.localidade ?? end.localidade ?? end.cidade ?? ''),
        uf: String(cep?.uf ?? end.uf ?? ''),
        numero: String(end.numero ?? ''),
        complemento: String(end.complemento ?? ''),
        postalCode: String(cep?.id ?? cep?.cep ?? ''),
      };
    })(),
  };
}

function normalizeAppointments(data: unknown) {
  return getApiList<unknown>(data)
    .map(normalizeAppointment)
    .filter((item): item is AppointmentItem => item !== null);
}

function getNumericId(value: unknown) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

function normalizeClassBalance(data: unknown): ClassBalance {
  if (!data || typeof data !== "object") {
    return { saldoPresencial: 0, saldoFuncional: 0, saldoResidencial: 0 };
  }

  const balance = data as Partial<ClassBalance>;
  return {
    saldoPresencial: balance.saldoPresencial ?? 0,
    saldoFuncional: balance.saldoFuncional ?? 0,
    saldoResidencial: balance.saldoResidencial ?? 0,
  };
}

function normalizePlan(data: unknown): Plan | null {
  if (!data || typeof data !== "object") {
    return null;
  }

  const plan = data as {
    nomeProduto?: string;
    nome?: string;
    dataExpiracao?: string;
    dataFim?: string;
  };

  return {
    nome: plan.nomeProduto || plan.nome || "Plano Ativo",
    dataExpiracao: plan.dataExpiracao || plan.dataFim || "",
  };
}

function getTodayDate() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDisabledDayNames(data: unknown) {
  return Array.from(
    new Set(
      getApiList<DisabledDay>(data)
        .filter((day) => !day.ativo)
        .map((day) => day.diaSemana.toLowerCase())
    )
  );
}

function AppointmentRow({
  item,
  isAluno,
  onOpenAi,
  onShowQrCode,
}: {
  item: AppointmentItem;
  isAluno: boolean;
  onOpenAi?: (item: AppointmentItem) => void;
  onShowQrCode?: (item: AppointmentItem) => void;
}) {
  const personName = isAluno ? item.personalNome : item.alunoNome;
  const address = [
    item.endereco?.logradouro,
    item.endereco?.numero,
    item.endereco?.complemento,
    item.endereco?.bairro,
    item.endereco?.cidade,
  ].filter(Boolean).join(", ");
  const isPendingConclusion = item.agendamentoStatus === "PENDENTE_PERSONAL_CONCLUIR";
  const isApproved = item.agendamentoStatus === "APROVADO";

  return (
    <View style={styles.appointmentCard}>
      <View style={styles.rowBetween}>
        <Text style={styles.status}>{getStatusLabel(item.agendamentoStatus)}</Text>
        <View style={styles.headerRightActions}>
          <Text style={styles.typeBadge}>{item.tipoAula}</Text>
          {item.analiseIa ? (
            <TouchableOpacity
              style={styles.sparklesButton}
              onPress={() => onOpenAi?.(item)}
              activeOpacity={0.8}
            >
              <Sparkles size={16} color="#0f567f" />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
      <Text style={styles.appointmentName}>{personName || "Sem nome"}</Text>
      <Text style={styles.appointmentMeta}>{formatDate(item.data)}</Text>
      <Text style={styles.appointmentMeta}>
        {formatHour(item.data) + " - " + formatHour(item.datafim)}
      </Text>
      <Text style={styles.appointmentMeta}>
        {address || "Endereço não informado"}
      </Text>

      {item.analiseIa ? (
        <TouchableOpacity
          style={styles.aiHintBanner}
          onPress={() => onOpenAi?.(item)}
          activeOpacity={0.8}
        >
          <Sparkles size={14} color="#0f567f" />
          <Text style={styles.aiHintBannerText}>Ver dica do Treinador IA</Text>
        </TouchableOpacity>
      ) : null}

      {isAluno && (isPendingConclusion || isApproved) ? (
        <TouchableOpacity
          style={[
            styles.qrCodeButton,
            isPendingConclusion && styles.qrCodeButtonHighlight,
          ]}
          onPress={() => onShowQrCode?.(item)}
          activeOpacity={0.85}
        >
          <QrCode
            size={16}
            color={isPendingConclusion ? "#FFFFFF" : "#0f567f"}
          />
          <Text
            style={[
              styles.qrCodeButtonText,
              isPendingConclusion && styles.qrCodeButtonTextHighlight,
            ]}
          >
            {isPendingConclusion
              ? "Apresentar QR Code ao Personal"
              : "Ver QR Code da Aula"}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function OverviewScreen({
  userRoles: propsUserRoles,
  actualPlan: propsActualPlan,
  classBalance: propsClassBalance,
  appointments: propsAppointments = [],
  calendarEvents: propsCalendarEvents = [],
  disabledDays = [],
  pendingAppointments: propsPendingAppointments,
  todayAppointments: propsTodayAppointments,
  loading: propsLoading = false,
  availableHours = [],
  onGoPackages,
  onNewEvent,
}: Partial<OverviewNativeProps> = {}) {
  const { roles: authRoles, isAuthenticated } = useAuth();
  const userRoles = propsUserRoles ?? (authRoles as Role[] | null) ?? ['aluno'];
  const { unreadCount } = useNotifications();
  const queryClient = useQueryClient();

  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const isAluno = !!userRoles?.includes("aluno");
  const [modal, setModal] = useState<ModalState>({
    visible: false,
    title: "",
    description: "",
  });
  const [selectedDate, setSelectedDate] = useState<string>();
  const [newEventVisible, setNewEventVisible] = useState(false);
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [selectedAiAppointment, setSelectedAiAppointment] = useState<AppointmentItem | null>(null);
  const [selectedQrAppointment, setSelectedQrAppointment] = useState<AppointmentForQr | null>(null);
  const [qrModalVisible, setQrModalVisible] = useState(false);
  const [popupModalVisible, setPopupModalVisible] = useState(false);
  const [popupDate, setPopupDate] = useState("");
  const [popupAppointments, setPopupAppointments] = useState<PopupAppointment[]>([]);
  const [unavailableDates, setUnavailableDates] = useState<string[]>([]);

  const appointmentsQuery = useQuery({
    queryKey: ["overview", "appointments"],
    queryFn: () => findUserAppointments(),
    select: (response: ApiResponse<unknown>) => normalizeAppointments(response.data),
    enabled: isAuthenticated,
    retry: false,
  });

  const calendarQuery = useQuery({
    queryKey: ["overview", "calendar"],
    queryFn: () => appointmentAtCalendar(),
    select: (response: ApiResponse<unknown>) => getApiList<CalendarEvent>(response.data),
    enabled: isAuthenticated,
    retry: false,
  });

  const calendarAppointmentDetailsQuery = useQuery({
    queryKey: [
      "overview",
      "calendarAppointmentDetails",
      calendarQuery.data?.map((event) => event.agendamentoId).filter(Boolean),
    ],
    queryFn: async () => {
      const ids = (calendarQuery.data ?? [])
        .map((event) => event.agendamentoId)
        .filter((id): id is number => id !== undefined);
      const responses = await Promise.all(ids.map((id) => findAppointmentById(id)));
      return responses
        .map((response) => normalizeAppointment(response.data))
        .filter((item): item is AppointmentItem => item !== null);
    },
    enabled:
      isAuthenticated &&
      appointmentsQuery.isFetched &&
      (appointmentsQuery.data?.length ?? 0) === 0 &&
      (calendarQuery.data ?? []).some((event) => event.agendamentoId !== undefined),
    retry: false,
  });

  const planQuery = useQuery({
    queryKey: ["overview", "actualPlan"],
    queryFn: () => getActualPlan(),
    select: (response: ApiResponse<unknown>) => normalizePlan(response.data),
    enabled: isAuthenticated && isAluno && !propsActualPlan,
    retry: false,
  });

  const classBalanceQuery = useQuery({
    queryKey: ["overview", "classBalance"],
    queryFn: getTotalByClassType,
    select: (data: unknown) => normalizeClassBalance(data),
    enabled: isAuthenticated && isAluno && !propsClassBalance,
    retry: false,
  });

  const todayAppointmentsQuery = useQuery({
    queryKey: ["overview", "todayAppointments", getTodayDate()],
    queryFn: () => appoitmentsCount({ status: "APROVADO", data: getTodayDate() }),
    select: (response: ApiResponse<number>) => {
      const val = response?.data;
      return typeof val === "number" ? val : Number(val) || 0;
    },
    enabled: isAuthenticated && !isAluno,
    retry: false,
  });

  const pendingAppointmentsQuery = useQuery({
    queryKey: ["overview", "pendingAppointments"],
    queryFn: () => appoitmentsCount({ status: "PENDENTE_PERSONAL_APROVACAO" }),
    select: (response: ApiResponse<number>) => {
      const val = response?.data;
      return typeof val === "number" ? val : Number(val) || 0;
    },
    enabled: isAuthenticated && !isAluno,
    retry: false,
  });

  const personalQuery = useQuery({
    queryKey: ["overview", "personal"],
    queryFn: isAluno ? getPersonalList : findUserData,
    select: (response: ApiResponse<unknown>) => {
      if (isAluno) {
        return getNumericId(
          getApiList<PersonalSummary>(response.data)[0]?.id
        );
      }

      if (response.data && typeof response.data === "object" && "id" in response.data) {
        return getNumericId(response.data.id);
      }

      return undefined;
    },
    enabled: isAuthenticated,
    retry: false,
  });

  const disabledDaysQuery = useQuery({
    queryKey: ["overview", "disabledDays", personalQuery.data],
    queryFn: () => disabledPersonalDays(personalQuery.data!),
    select: (response: ApiResponse<unknown>) =>
      getDisabledDayNames(response.data),
    enabled: isAuthenticated && personalQuery.data !== undefined,
    retry: false,
  });

  const displayedAppointments = propsAppointments.length
    ? propsAppointments
    : appointmentsQuery.data?.length
      ? appointmentsQuery.data
      : calendarAppointmentDetailsQuery.data ?? [];
  // Usa SEMPRE o endpoint /agendamentos/calendario como fonte dos marcadores do
  // calendário (dots). Esse endpoint é controlado pelo backend e devolve apenas
  // os agendamentos que devem aparecer no calendário — sem histórico completo.
  const displayedCalendarEvents = useMemo(() => {
    if (propsCalendarEvents.length > 0) {
      return propsCalendarEvents;
    }

    const source: CalendarEvent[] = calendarQuery.data ?? [];

    const seen = new Set<number>();
    return source.filter((ev) => {
      if (ev.agendamentoId !== undefined && ev.agendamentoId !== null) {
        if (seen.has(ev.agendamentoId)) return false;
        seen.add(ev.agendamentoId);
      }
      return true;
    });
  }, [propsCalendarEvents, calendarQuery.data]);
  const actualPlan = propsActualPlan ?? planQuery.data ?? null;
  const classBalance = propsClassBalance ?? classBalanceQuery.data;
  const todayAppointments =
    propsTodayAppointments ?? todayAppointmentsQuery.data ?? 0;
  const pendingAppointments =
    propsPendingAppointments ?? pendingAppointmentsQuery.data ?? 0;
  const isTodayLoading =
    propsTodayAppointments === undefined && todayAppointmentsQuery.isLoading;
  const isPendingLoading =
    propsPendingAppointments === undefined && pendingAppointmentsQuery.isLoading;
  const calendarDisabledDays = disabledDays.length
    ? disabledDays
    : disabledDaysQuery.data ?? [];

  // Checa disponibilidade dos próximos 14 dias para bloquear datas sem horário
  useEffect(() => {
    let isMounted = true;
    async function checkUpcomingAvailability() {
      const pid = personalQuery.data;
      if (!pid) return;

      const datesToDisable: string[] = [];
      const base = new Date();
      const promises = [];

      for (let i = 1; i <= 14; i++) {
        const d = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayStr = String(d.getDate()).padStart(2, '0');
        const isoDate = `${y}-${m}-${dayStr}`;

        const WEEKDAY_PT: Record<number, string> = {
          0: 'domingo', 1: 'segunda', 2: 'terca', 3: 'quarta', 4: 'quinta', 5: 'sexta', 6: 'sabado',
        };
        const weekday = WEEKDAY_PT[d.getDay()];
        if (calendarDisabledDays.includes(weekday)) continue;

        promises.push(
          getPersonalHours(pid, isoDate, 'PRESENCIAL')
            .then((res) => {
              const hours = res.data;
              if (!Array.isArray(hours) || hours.length === 0) {
                datesToDisable.push(isoDate);
              }
            })
            .catch(() => {})
        );
      }

      await Promise.all(promises);
      if (isMounted && datesToDisable.length > 0) {
        setUnavailableDates((prev) => Array.from(new Set([...prev, ...datesToDisable])));
      }
    }

    checkUpcomingAvailability();
    return () => {
      isMounted = false;
    };
  }, [personalQuery.data, calendarDisabledDays]);
  const loading =
    propsLoading ||
    appointmentsQuery.isLoading ||
    calendarQuery.isLoading ||
    calendarAppointmentDetailsQuery.isLoading ||
    (isAluno
      ? planQuery.isLoading || classBalanceQuery.isLoading
      : todayAppointmentsQuery.isLoading || pendingAppointmentsQuery.isLoading);

  function handleOpenQr(item: AppointmentItem) {
    const address = [
      item.endereco?.logradouro,
      item.endereco?.numero,
      item.endereco?.complemento,
      item.endereco?.bairro,
      item.endereco?.cidade,
    ].filter(Boolean).join(", ");
    setSelectedQrAppointment({
      id: item.agendamentoId,
      name: item.personalNome || "Personal Trainer",
      type: item.tipoAula,
      start: item.data,
      end: item.datafim,
      address: address || "Local a combinar",
    });
    setQrModalVisible(true);
  }
  const headerTitle = isAluno ? "Meu painel" : "Painel de agendamentos";
  const headerSubtitle = isAluno
    ? "Acompanhe seu plano e saldo disponível"
    : "Gerencie as aulas do dia e solicitações pendentes";

  function handleOpenAi(item: AppointmentItem) {
    setSelectedAiAppointment(item);
    setAiModalVisible(true);
  }

  function openError(title: string, description: string) {
    setModal({ visible: true, title, description });
  }

  function handleCalendarDayPress(date: string) {
    setSelectedDate(date);
    const dayAppointments = displayedAppointments.filter(
      (appointment) => appointment.data?.split("T")[0] === date
    );

    if (dayAppointments.length === 0) {
      if (!isAluno) return;

      // 1. Validação de 24 horas: o aluno só pode marcar aula depois de 24h (a partir de amanhã)
      const parts = date.split("-").map(Number);
      if (parts.length === 3) {
        const clickedDateStart = new Date(parts[0], parts[1] - 1, parts[2]);
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        if (clickedDateStart.getTime() <= todayStart.getTime()) {
          openError(
            "Antecedência mínima",
            "Aulas só podem ser agendadas com pelo menos 24 horas de antecedência. Selecione uma data a partir de amanhã."
          );
          return;
        }

        // 2. Validação de dias da semana em que o personal não atende
        const WEEKDAY_PT: Record<number, string> = {
          0: 'domingo',
          1: 'segunda',
          2: 'terca',
          3: 'quarta',
          4: 'quinta',
          5: 'sexta',
          6: 'sabado',
        };
        const weekday = WEEKDAY_PT[clickedDateStart.getDay()];
        if (calendarDisabledDays.includes(weekday)) {
          openError(
            "Personal indisponível",
            "O personal não atende neste dia da semana. Selecione outro dia disponível no calendário."
          );
          return;
        }
      }

      // 3. Validação de plano ativo
      if (!actualPlan) {
        openError("Erro", "Você precisa ter um plano ativo para agendar uma aula.");
        return;
      }

      // 4. Validação de saldo de aulas
      const hasBalance =
        (classBalance?.saldoPresencial ?? 0) > 0 ||
        (classBalance?.saldoFuncional ?? 0) > 0 ||
        (classBalance?.saldoResidencial ?? 0) > 0;

      if (!hasBalance) {
        openError(
          "Aulas indisponíveis",
          "Você não possui aulas disponíveis para agendamento. Adquira um pacote ou plano para prosseguir."
        );
        return;
      }

      // 5. Validação de disponibilidade de horários do personal
      if (personalQuery.data) {
        getPersonalHours(personalQuery.data, date, "PRESENCIAL")
          .then((res) => {
            const hours = res.data;
            if (!Array.isArray(hours) || hours.length === 0) {
              openError(
                "Sem disponibilidade",
                "O personal não possui horários disponíveis para esta data. Selecione outro dia no calendário."
              );
              return;
            }
            setSelectedDate(date);
            setNewEventVisible(true);
          })
          .catch(() => {
            setSelectedDate(date);
            setNewEventVisible(true);
          });
        return;
      }

      setSelectedDate(date);
      setNewEventVisible(true);
      return;
    }

    // Se o dia possuir agendamentos, abre o PopupModal com os detalhes oficiais
    const mappedAppointments: PopupAppointment[] = dayAppointments.map((appointment) => {
      const personName = (isAluno ? appointment.personalNome : appointment.alunoNome) || "Personal Trainer";
      const addr = [
        appointment.endereco?.logradouro,
        appointment.endereco?.numero,
        appointment.endereco?.complemento,
        appointment.endereco?.bairro,
        appointment.endereco?.cidade,
      ]
        .filter(Boolean)
        .join(", ") || "Local a combinar";

      return {
        id: appointment.agendamentoId,
        agendamentoId: appointment.agendamentoId,
        name: personName,
        type: appointment.tipoAula || "Personal",
        start: appointment.data,
        end: appointment.datafim || appointment.data,
        address: addr,
        status: appointment.agendamentoStatus,
        photoUrl: appointment.caminhoFoto,
      };
    });

    setPopupDate(date);
    setPopupAppointments(mappedAppointments);
    setPopupModalVisible(true);
  }

  function handleModalAction() {
    setModal((previous) => ({ ...previous, visible: false }));
  }

  function handleNewEvent() {
    if (!isAluno) {
      onNewEvent?.();
      return;
    }

    if (!actualPlan) {
      openError("Erro", "Você precisa ter um plano ativo para agendar uma aula.");
      return;
    }

    const hasBalance =
      (classBalance?.saldoPresencial ?? 0) > 0 ||
      (classBalance?.saldoFuncional ?? 0) > 0 ||
      (classBalance?.saldoResidencial ?? 0) > 0;

    if (!hasBalance) {
      openError(
        "Saldo insuficiente",
        "Você não possui saldo de aulas disponível para agendamento. Adquira um plano ou contate seu personal."
      );
      return;
    }

    setSelectedDate(undefined);
    setNewEventVisible(true);
  }

  function handleScheduleSubmit(payload: NewEventPayload) {
    void queryClient.invalidateQueries({ queryKey: ["overview"] });
    onNewEvent?.(payload);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <View style={styles.headerTopRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>{headerTitle}</Text>
            <Text style={styles.headerSubtitle}>{headerSubtitle}</Text>
          </View>
          <TouchableOpacity
            style={styles.bellButton}
            onPress={() => setNotificationModalVisible(true)}
            activeOpacity={0.8}
          >
            <Bell size={22} color="#FFFFFF" />
            {unreadCount > 0 && (
              <View style={styles.headerBadge}>
                <Text style={styles.headerBadgeText}>
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {isAluno ? (
          <View style={styles.headerStatsRow}>
            <View style={styles.headerStatCard}>
              <Text style={styles.headerStatValue}>
                {classBalance?.saldoPresencial ?? 0}
              </Text>
              <Text style={styles.headerStatLabel}>Presencial</Text>
            </View>
            <View style={styles.headerStatCard}>
              <Text style={styles.headerStatValue}>
                {classBalance?.saldoFuncional ?? 0}
              </Text>
              <Text style={styles.headerStatLabel}>Funcional</Text>
            </View>
            <View style={styles.headerStatCard}>
              <Text style={styles.headerStatValue}>
                {classBalance?.saldoResidencial ?? 0}
              </Text>
              <Text style={styles.headerStatLabel}>Residencial</Text>
            </View>
          </View>
        ) : (
          <View style={styles.headerStatsRow}>
            <View style={styles.headerStatCard}>
              {isTodayLoading ? (
                <ActivityIndicator size="small" color="#0f567f" style={styles.kpiLoader} />
              ) : (
                <Text style={styles.headerStatValue}>{todayAppointments}</Text>
              )}
              <Text style={styles.headerStatLabel}>Hoje</Text>
            </View>
            <View style={styles.headerStatCard}>
              {isPendingLoading ? (
                <ActivityIndicator size="small" color="#0f567f" style={styles.kpiLoader} />
              ) : (
                <Text style={styles.headerStatValue}>{pendingAppointments}</Text>
              )}
              <Text style={styles.headerStatLabel}>Pendentes</Text>
            </View>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isAluno ? (
          <OverviewCardPackageStatus
            actualPlan={actualPlan}
            onPackages={onGoPackages}
          />
        ) : null}

        <Calendar
          selectedDate={selectedDate}
          calendarEvents={displayedCalendarEvents}
          disabledDays={calendarDisabledDays}
          disabledDates={unavailableDates}
          onDayPress={handleCalendarDayPress}
        />

        <View style={styles.card}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Agendamentos</Text>
            {isAluno ? (
              <Pressable style={styles.primaryButton} onPress={handleNewEvent}>
                <Text style={styles.primaryButtonText}>+ Novo agendamento</Text>
              </Pressable>
            ) : null}
          </View>

          {loading ? (
            <ActivityIndicator size="small" color="#0f567f" style={{ marginVertical: 14 }} />
          ) : displayedAppointments.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum agendamento encontrado.</Text>
          ) : (
            <FlatList
              data={displayedAppointments}
              keyExtractor={(item: AppointmentItem) => String(item.agendamentoId)}
              style={styles.appointmentList}
              contentContainerStyle={styles.appointmentListContent}
              renderItem={({ item }: { item: AppointmentItem }) => (
                <AppointmentRow
                  item={item}
                  isAluno={isAluno}
                  onOpenAi={handleOpenAi}
                  onShowQrCode={handleOpenQr}
                />
              )}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
        </View>
      </ScrollView>

      {/* Modal de detalhes simples de agendamento */}
      <Modal
        transparent
        animationType="fade"
        visible={modal.visible}
        onRequestClose={() => setModal((prev) => ({ ...prev, visible: false }))}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{modal.title}</Text>
            <Text style={styles.modalDescription}>{modal.description}</Text>
            <Pressable style={styles.modalButton} onPress={handleModalAction}>
              <Text style={styles.modalButtonText}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Modal de Agendamento com API integrada */}
      <NewEvent
        key={`${newEventVisible}-${selectedDate ?? "new"}`}
        visible={newEventVisible}
        initialDate={selectedDate}
        availableHours={availableHours}
        onClose={() => setNewEventVisible(false)}
        onSubmit={handleScheduleSubmit}
      />

      {/* PopupModal para visualização de agendamentos do dia */}
      <PopupModal
        visible={popupModalVisible}
        date={popupDate}
        appointments={popupAppointments}
        canCreateNewEvent={isAluno}
        onClose={() => setPopupModalVisible(false)}
        onNewEvent={() => {
          setSelectedDate(popupDate);
          setNewEventVisible(true);
        }}
        onShowQrCode={(item) => {
          setSelectedQrAppointment({
            id: item.agendamentoId ?? item.id,
            name: item.name,
            type: item.type,
            start: item.start,
            end: item.end,
            address: item.address,
          });
          setPopupModalVisible(false);
          setQrModalVisible(true);
        }}
      />

      {/* Modal da Central de Notificações */}
      <NotificationCenterModal
        visible={notificationModalVisible}
        onClose={() => setNotificationModalVisible(false)}
      />

      {/* Modal de Dica do Treinador IA */}
      <AiPanelModal
        visible={aiModalVisible}
        onClose={() => {
          setAiModalVisible(false);
          setSelectedAiAppointment(null);
        }}
        analiseIa={selectedAiAppointment?.analiseIa}
        note={selectedAiAppointment?.descricao}
        studentName={selectedAiAppointment?.alunoNome}
      />

      {/* Modal de QR Code para validação do treino pelo personal */}
      <QRCodeDisplayModal
        visible={qrModalVisible}
        appointment={selectedQrAppointment}
        onClose={() => {
          setQrModalVisible(false);
          setSelectedQrAppointment(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#e8eef4",
  },
  content: {
    paddingTop: 14,
    paddingHorizontal: 16,
    paddingBottom: 120,
    gap: 14,
  },
  header: {
    backgroundColor: "#192633",
    width: "100%",
    paddingHorizontal: 16,
    paddingTop: 44,
    paddingBottom: 14,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  bellButton: {
    position: "relative",
    padding: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  headerBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#EF4444",
    borderRadius: 999,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  headerBadgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  headerTitle: {
    color: "#ffffff",
    fontSize: 27,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: "#c6d4df",
    fontSize: 13,
    marginTop: 4,
    marginBottom: 12,
  },
  headerStatsRow: {
    flexDirection: "row",
    gap: 10,
  },
  headerStatCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  headerStatValue: {
    color: "#192633",
    fontSize: 22,
    fontWeight: "800",
  },
  headerStatLabel: {
    color: "#58667a",
    fontSize: 12,
    fontWeight: "600",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    width: "100%",
  },
  headerRightActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sparklesButton: {
    padding: 4,
    borderRadius: 8,
    backgroundColor: "#e0f2fe",
  },
  primaryButton: {
    backgroundColor: "#0f567f",
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  },
  appointmentCard: {
    backgroundColor: "#f7fbff",
    borderColor: "#d8e8f4",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    width: "100%",
    alignSelf: "stretch",
  },
  status: {
    fontSize: 12,
    color: "#3b6078",
    fontWeight: "700",
  },
  typeBadge: {
    fontSize: 11,
    color: "#0f567f",
    backgroundColor: "#e5f3fc",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    overflow: "hidden",
  },
  appointmentName: {
    marginTop: 6,
    marginBottom: 4,
    fontSize: 16,
    fontWeight: "700",
    color: "#173a52",
  },
  appointmentMeta: {
    color: "#4f6d80",
    fontSize: 13,
    marginBottom: 2,
  },
  aiHintBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#eff8ff",
    borderWidth: 1,
    borderColor: "#bee3f8",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    marginTop: 8,
  },
  aiHintBannerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0f567f",
  },
  separator: {
    height: 10,
  },
  emptyText: {
    color: "#4d6b80",
    textAlign: "center",
    paddingVertical: 14,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#001f33",
    shadowOpacity: 0.09,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    gap: 10,
    width: "100%",
    alignSelf: "stretch",
  },
  appointmentList: {
    width: "100%",
    alignSelf: "stretch",
  },
  appointmentListContent: {
    width: "100%",
  },
  kpiLoader: {
    height: 27,
    alignSelf: "flex-start",
    justifyContent: "center",
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#173a52",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#18384f",
    marginBottom: 8,
  },
  modalDescription: {
    color: "#3f6077",
    lineHeight: 21,
    marginBottom: 14,
  },
  modalButton: {
    alignSelf: "flex-end",
    backgroundColor: "#0f567f",
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  modalButtonText: {
    color: "#ffffff",
    fontWeight: "700",
  },
  qrCodeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
    backgroundColor: "#EEF4FF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  qrCodeButtonHighlight: {
    backgroundColor: "#0f567f",
    borderColor: "#0f567f",
  },
  qrCodeButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0f567f",
  },
  qrCodeButtonTextHighlight: {
    color: "#FFFFFF",
  },
});