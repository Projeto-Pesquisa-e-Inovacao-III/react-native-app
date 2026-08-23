import React, { useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View} from "react-native";
import Card from "../components/Card";
import Calendar from "../components/Calendar";
import NewEvent, { type NewEventPayload } from "../components/NewEvent";
import { MOCK_APPOINTMENTS } from "../mocks/newEventMock";

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
  endereco?: {
    bairro?: string;
    cidade?: string;
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

function BalanceBar({ label, current }: { label: string; current: number }) {
  const safeCurrent = Math.max(0, current);
  const percentage = Math.min(100, (safeCurrent / TOTAL_AULAS) * 100);
  return (
    <View style={styles.balanceItem}>
      <View style={styles.balanceHeader}>
        <Text style={styles.balanceLabel}>{label}</Text>
        <Text style={styles.balanceValue}>{safeCurrent + " / " + TOTAL_AULAS}</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: percentage }]} />
      </View>
    </View>
  );
}

function AppointmentRow({ item, isAluno }: { item: AppointmentItem; isAluno: boolean }) {
  const personName = isAluno ? item.personalNome : item.alunoNome;
  const address = [item.endereco?.bairro, item.endereco?.cidade].filter(Boolean).join(", ");

  return (
    <View style={styles.appointmentCard}>
      <View style={styles.rowBetween}>
        <Text style={styles.status}>{getStatusLabel(item.agendamentoStatus)}</Text>
        <Text style={styles.typeBadge}>{item.tipoAula}</Text>
      </View>
      <Text style={styles.appointmentName}>{personName || "Sem nome"}</Text>
      <Text style={styles.appointmentMeta}>{formatDate(item.data)}</Text>
      <Text style={styles.appointmentMeta}>{formatHour(item.data) + " - " + formatHour(item.datafim)}</Text>
      <Text style={styles.appointmentMeta}>{address || "Endereco nao informado"}</Text>
    </View>
  );
}

export default function OverviewScreen({
  userRoles,
  actualPlan,
  classBalance,
  appointments = [],
  calendarEvents = [],
  disabledDays = [],
  pendingAppointments = 0,
  todayAppointments = 0,
  loading = false,
  availableHours = [],
  onGoSchedule,
  onGoPending,
  onGoPackages,
  onNewEvent,
}: OverviewNativeProps) {
  const [modal, setModal] = useState<ModalState>({
    visible: false,
    title: "",
    description: "",
  });
  const [selectedDate, setSelectedDate] = useState<string>();
  const [newEventVisible, setNewEventVisible] = useState(false);
  const [localAppointments, setLocalAppointments] = useState<AppointmentItem[]>(() => (
    appointments.length > 0 ? appointments : MOCK_APPOINTMENTS
  ));
  const isAluno = !!userRoles?.includes("aluno");
  const headerTitle = isAluno ? "Meu painel" : "Painel de agendamentos";
  const headerSubtitle = isAluno
    ? "Acompanhe seu plano e saldo disponível"
    : "Gerencie as aulas do dia e solicitações pendentes";

  const displayedAppointments = localAppointments;
  const displayedCalendarEvents = [
    ...calendarEvents,
    ...displayedAppointments.map((appointment) => ({ data: appointment.data })),
  ];

  function openError(title: string, description: string) {
    setModal({ visible: true, title, description });
  }

  function handleCalendarDayPress(date: string) {
    const dayAppointments = displayedAppointments.filter(
      (appointment) => appointment.data?.split("T")[0] === date
    );

    if (dayAppointments.length === 0) {
      if (!isAluno) return;

      if (!actualPlan) {
        openError("Erro", "Voce precisa ter um plano ativo para agendar uma aula.");
        return;
      }

      const hasBalance =
        (classBalance?.saldoPresencial ?? 0) > 0 ||
        (classBalance?.saldoFuncional ?? 0) > 0 ||
        (classBalance?.saldoResidencial ?? 0) > 0;

      if (!hasBalance) {
        openError(
          "Aulas indisponiveis",
          "Voce nao possui aulas disponiveis para agendamento. Adquira um plano ou contate seu personal."
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

    if (!actualPlan) {
      openError("Erro", "Voce precisa ter um plano ativo para agendar uma aula.");
      return;
    }

    const hasBalance =
      (classBalance?.saldoPresencial ?? 0) > 0 ||
      (classBalance?.saldoFuncional ?? 0) > 0 ||
      (classBalance?.saldoResidencial ?? 0) > 0;

    if (!hasBalance) {
      openError(
        "Erro",
        "Voce nao possui aulas disponiveis para agendamento. Adquira um plano ou contate seu personal."
      );
      return;
    }

    setSelectedDate(undefined);
    setNewEventVisible(true);
  }

  function handleScheduleSubmit(payload: NewEventPayload) {
    const newAppointment: AppointmentItem = {
      agendamentoId: Date.now(),
      agendamentoStatus: "PENDENTE_PERSONAL_APROVACAO",
      data: payload.date + "T" + payload.startHour,
      datafim: payload.date + "T" + payload.endHour,
      personalNome: payload.personal.nome,
      alunoNome: "Aluno atual",
      tipoAula: payload.type,
      endereco: {
        bairro: payload.address.street,
        cidade: payload.address.city,
      },
    };

    setLocalAppointments((previous) => [...previous, newAppointment]);
    setNewEventVisible(false);
    onNewEvent?.(payload);
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{headerTitle}</Text>
        <Text style={styles.headerSubtitle}>{headerSubtitle}</Text>

        {isAluno ? (
          <View style={styles.headerStatsRow}>
            <View style={styles.headerStatCard}>
              <Text style={styles.headerStatValue}>{classBalance?.saldoPresencial ?? 0}</Text>
              <Text style={styles.headerStatLabel}>Presencial</Text>
            </View>
            <View style={styles.headerStatCard}>
              <Text style={styles.headerStatValue}>{classBalance?.saldoFuncional ?? 0}</Text>
              <Text style={styles.headerStatLabel}>Funcional</Text>
            </View>
            <View style={styles.headerStatCard}>
              <Text style={styles.headerStatValue}>{classBalance?.saldoResidencial ?? 0}</Text>
              <Text style={styles.headerStatLabel}>Residencial</Text>
            </View>
          </View>
        ) : (
          <View style={styles.headerStatsRow}>
            <View style={styles.headerStatCard}>
              <Text style={styles.headerStatValue}>{todayAppointments}</Text>
              <Text style={styles.headerStatLabel}>Hoje</Text>
            </View>
            <View style={styles.headerStatCard}>
              <Text style={styles.headerStatValue}>{pendingAppointments}</Text>
              <Text style={styles.headerStatLabel}>Pendentes</Text>
            </View>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {isAluno ? (
          <>
            <Card
              title="Status do plano"
              subtitle={
                actualPlan
                  ? "Plano: " + actualPlan.nome + "\nExpira em: " + formatDate(actualPlan.dataExpiracao)
                  : "Voce nao possui plano ativo"
              }
              cta={actualPlan ? undefined : "Ver planos"}
              onPress={onGoPackages}
            />
          </>
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
                <Text style={styles.primaryButtonText}>Novo agendamento</Text>
              </Pressable>
            ) : null}
          </View>

          {loading ? (
            <Text style={styles.loadingText}>Carregando...</Text>
          ) : displayedAppointments.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum agendamento encontrado.</Text>
          ) : (
            <FlatList
              data={displayedAppointments}
              keyExtractor={(item: AppointmentItem) => String(item.agendamentoId)}
              renderItem={({ item }: { item: AppointmentItem }) => <AppointmentRow item={item} isAluno={isAluno} />}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
        </View>
      </ScrollView>

      <Modal transparent animationType="fade" visible={modal.visible} onRequestClose={() => setModal((prev) => ({ ...prev, visible: false }))}>
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

      <NewEvent
        key={`${newEventVisible}-${selectedDate ?? "new"}`}
        visible={newEventVisible}
        initialDate={selectedDate}
        availableHours={availableHours}
        onClose={() => setNewEventVisible(false)}
        onSubmit={handleScheduleSubmit}
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
  balanceItem: {
    marginBottom: 10,
  },
  balanceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  balanceLabel: {
    color: "#2a4f66",
    fontWeight: "600",
  },
  balanceValue: {
    color: "#1b3d53",
    fontWeight: "700",
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: "#dce9f2",
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#0f567f",
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
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
  separator: {
    height: 10,
  },
  loadingText: {
    color: "#4d6b80",
    fontStyle: "italic",
  },
  emptyText: {
    color: "#4d6b80",
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
      marginBottom: 8,
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