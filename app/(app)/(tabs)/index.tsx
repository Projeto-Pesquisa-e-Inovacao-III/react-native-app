import React, { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Bell, Sparkles } from "lucide-react-native";
import { useAuth } from "../../../src/contexts/AuthContext";
import { useNotifications } from "../../../src/contexts/NotificationContext";
import Card from "../../../src/components/Card";
import Calendar from "../../../src/components/Calendar";
import NewEvent, { type NewEventPayload } from "../../../src/components/NewEvent";
import NotificationCenterModal from "../../../src/components/modals/NotificationCenterModal";
import AiPanelModal from "../../../src/components/modals/AiPanelModal";
import { MOCK_APPOINTMENTS } from "../../../src/mocks/newEventMock";
import {
  findUserAppointments,
  appointmentAtCalendar,
} from "../../../src/constants/schedule";
import { getTotalByClassType } from "../../../src/constants/overview";
import { actualPlan as getActualPlan } from "../../../src/constants/products";
import { appoitmentsCount } from "../../../src/constants/personal";
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
    bairro?: string;
    cidade?: string;
    logradouro?: string;
    numero?: string;
  };
};

type CalendarEvent = {
  data: string;
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

const TOTAL_AULAS = 20;

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

function AppointmentRow({
  item,
  isAluno,
  onOpenAi,
}: {
  item: AppointmentItem;
  isAluno: boolean;
  onOpenAi?: (item: AppointmentItem) => void;
}) {
  const personName = isAluno ? item.personalNome : item.alunoNome;
  const address = [item.endereco?.bairro, item.endereco?.cidade]
    .filter(Boolean)
    .join(", ");

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
  pendingAppointments: propsPendingAppointments = 0,
  todayAppointments: propsTodayAppointments = 0,
  loading: propsLoading = false,
  availableHours = [],
  onGoPackages,
  onNewEvent,
}: Partial<OverviewNativeProps> = {}) {
  const { roles: authRoles, isAuthenticated } = useAuth();
  const userRoles = propsUserRoles ?? (authRoles as Role[] | null) ?? ["aluno"];
  const { scheduleAppointmentNotification, unreadCount } = useNotifications();

  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [modal, setModal] = useState<ModalState>({
    visible: false,
    title: "",
    description: "",
  });
  const [selectedDate, setSelectedDate] = useState<string>();
  const [newEventVisible, setNewEventVisible] = useState(false);

  // Estados locais com dados dinâmicos da API
  const [localAppointments, setLocalAppointments] = useState<AppointmentItem[]>(() =>
    propsAppointments.length > 0 ? propsAppointments : MOCK_APPOINTMENTS
  );
  const [localCalendarEvents, setLocalCalendarEvents] = useState<CalendarEvent[]>(
    propsCalendarEvents
  );
  const [localPlan, setLocalPlan] = useState<Plan | null>(
    propsActualPlan ?? {
      nome: "Plano Gold",
      dataExpiracao: "2026-12-10",
    }
  );
  const [localClassBalance, setLocalClassBalance] = useState<ClassBalance>(
    propsClassBalance ?? {
      saldoPresencial: 5,
      saldoFuncional: 0,
      saldoResidencial: 0,
    }
  );
  const [localTodayAppointments, setLocalTodayAppointments] = useState<number>(
    propsTodayAppointments
  );
  const [localPendingAppointments, setLocalPendingAppointments] = useState<number>(
    propsPendingAppointments
  );
  const [localLoading, setLocalLoading] = useState<boolean>(propsLoading);

  // Modal de IA (Dica do Treinador IA)
  const [aiModalVisible, setAiModalVisible] = useState(false);
  const [selectedAiAppointment, setSelectedAiAppointment] = useState<AppointmentItem | null>(null);

  const isAluno = !!userRoles?.includes("aluno");
  const headerTitle = isAluno ? "Meu painel" : "Painel de agendamentos";
  const headerSubtitle = isAluno
    ? "Acompanhe seu plano e saldo disponível"
    : "Gerencie as aulas do dia e solicitações pendentes";

  const displayedAppointments = localAppointments;
  const displayedCalendarEvents = [
    ...localCalendarEvents,
    ...displayedAppointments.map((appointment) => ({ data: appointment.data })),
  ];

  // Carrega dados da API do backend
  const loadOverviewData = useCallback(async () => {
    if (!isAuthenticated) return;
    setLocalLoading(true);
    try {
      const promises: Promise<any>[] = [
        findUserAppointments().catch(() => null),
        appointmentAtCalendar().catch(() => null),
      ];

      if (isAluno) {
        promises.push(getTotalByClassType().catch(() => null));
        promises.push(getActualPlan().catch(() => null));
      } else {
        const todayStr = new Date().toISOString().split("T")[0];
        promises.push(
          appoitmentsCount({ status: "APROVADO", data: todayStr }).catch(() => null)
        );
        promises.push(
          appoitmentsCount({ status: "PENDENTE_PERSONAL_APROVACAO" }).catch(() => null)
        );
      }

      const [apptsRes, calRes, res3, res4] = await Promise.all(promises);

      if (apptsRes?.data && Array.isArray(apptsRes.data)) {
        setLocalAppointments(apptsRes.data);
      }

      if (calRes?.data && Array.isArray(calRes.data)) {
        setLocalCalendarEvents(calRes.data);
      }

      if (isAluno) {
        if (res3 && typeof res3 === "object") {
          setLocalClassBalance({
            saldoPresencial: res3.saldoPresencial ?? 0,
            saldoFuncional: res3.saldoFuncional ?? 0,
            saldoResidencial: res3.saldoResidencial ?? 0,
          });
        }
        if (res4?.data) {
          setLocalPlan({
            nome: res4.data.nomeProduto || res4.data.nome || "Plano Ativo",
            dataExpiracao: res4.data.dataExpiracao || res4.data.dataFim || "",
          });
        }
      } else {
        if (typeof res3?.data === "number") {
          setLocalTodayAppointments(res3.data);
        }
        if (typeof res4?.data === "number") {
          setLocalPendingAppointments(res4.data);
        }
      }
    } catch {
      // Mantém fallback atual se houver erro
    } finally {
      setLocalLoading(false);
    }
  }, [isAuthenticated, isAluno]);

  useEffect(() => {
    loadOverviewData();
  }, [loadOverviewData]);

  function handleOpenAi(item: AppointmentItem) {
    setSelectedAiAppointment(item);
    setAiModalVisible(true);
  }

  function openError(title: string, description: string) {
    setModal({ visible: true, title, description });
  }

  function handleCalendarDayPress(date: string) {
    const dayAppointments = displayedAppointments.filter(
      (appointment) => appointment.data?.split("T")[0] === date
    );

    if (dayAppointments.length === 0) {
      if (!isAluno) return;

      if (!localPlan) {
        openError("Erro", "Você precisa ter um plano ativo para agendar uma aula.");
        return;
      }

      const hasBalance =
        (localClassBalance?.saldoPresencial ?? 0) > 0 ||
        (localClassBalance?.saldoFuncional ?? 0) > 0 ||
        (localClassBalance?.saldoResidencial ?? 0) > 0;

      if (!hasBalance) {
        openError(
          "Aulas indisponíveis",
          "Você não possui aulas disponíveis para agendamento. Adquira um pacote ou plano para prosseguir."
        );
        return;
      }

      setSelectedDate(date);
      setNewEventVisible(true);
      return;
    }

    const description = dayAppointments
      .map((appointment) => {
        const personName = isAluno ? appointment.personalNome : appointment.alunoNome;
        return [
          personName || "Sem nome",
          formatHour(appointment.data) + " - " + formatHour(appointment.datafim),
          appointment.tipoAula,
        ].join(" | ");
      })
      .join("\n");

    setModal({
      visible: true,
      title: dayAppointments.length > 1 ? "Agendamentos" : "Agendamento",
      description: formatDate(date) + "\n\n" + description,
    });
  }

  function handleModalAction() {
    setModal((previous) => ({ ...previous, visible: false }));
  }

  function handleNewEvent() {
    if (!isAluno) {
      onNewEvent?.();
      return;
    }

    if (!localPlan) {
      openError("Erro", "Você precisa ter um plano ativo para agendar uma aula.");
      return;
    }

    const hasBalance =
      (localClassBalance?.saldoPresencial ?? 0) > 0 ||
      (localClassBalance?.saldoFuncional ?? 0) > 0 ||
      (localClassBalance?.saldoResidencial ?? 0) > 0;

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
    // Recarrega os dados do painel atualizados da API
    loadOverviewData();

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
                {localClassBalance?.saldoPresencial ?? 0}
              </Text>
              <Text style={styles.headerStatLabel}>Presencial</Text>
            </View>
            <View style={styles.headerStatCard}>
              <Text style={styles.headerStatValue}>
                {localClassBalance?.saldoFuncional ?? 0}
              </Text>
              <Text style={styles.headerStatLabel}>Funcional</Text>
            </View>
            <View style={styles.headerStatCard}>
              <Text style={styles.headerStatValue}>
                {localClassBalance?.saldoResidencial ?? 0}
              </Text>
              <Text style={styles.headerStatLabel}>Residencial</Text>
            </View>
          </View>
        ) : (
          <View style={styles.headerStatsRow}>
            <View style={styles.headerStatCard}>
              <Text style={styles.headerStatValue}>{localTodayAppointments}</Text>
              <Text style={styles.headerStatLabel}>Hoje</Text>
            </View>
            <View style={styles.headerStatCard}>
              <Text style={styles.headerStatValue}>{localPendingAppointments}</Text>
              <Text style={styles.headerStatLabel}>Pendentes</Text>
            </View>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {isAluno ? (
          <Card
            title="Status do plano"
            subtitle={
              localPlan
                ? "Plano: " +
                  localPlan.nome +
                  "\nExpira em: " +
                  formatDate(localPlan.dataExpiracao)
                : "Você não possui plano ativo"
            }
            cta={localPlan ? undefined : "Ver planos"}
            onPress={onGoPackages}
          />
        ) : null}

        <Calendar
          calendarEvents={displayedCalendarEvents}
          disabledDays={disabledDays}
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

          {localLoading ? (
            <ActivityIndicator size="small" color="#0f567f" style={{ marginVertical: 14 }} />
          ) : displayedAppointments.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum agendamento encontrado.</Text>
          ) : (
            <FlatList
              data={displayedAppointments}
              keyExtractor={(item: AppointmentItem) => String(item.agendamentoId)}
              renderItem={({ item }: { item: AppointmentItem }) => (
                <AppointmentRow
                  item={item}
                  isAluno={isAluno}
                  onOpenAi={handleOpenAi}
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
    display: "flex",
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    shadowColor: "#001f33",
    shadowOpacity: 0.09,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    gap: 10,
    alignItems: "center",
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
});