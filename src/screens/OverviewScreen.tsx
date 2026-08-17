import React, { useState } from "react";
import { FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, View, Image} from "react-native";
import Card from "src/components/Card";
import Calendar from "src/components/Calendar";

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
  onGoSchedule?: () => void;
  onGoPending?: () => void;
  onGoPackages?: () => void;
  onNewEvent?: () => void;
};

type ModalState = {
  visible: boolean;
  title: string;
  description: string;
};

const TOTAL_AULAS = 20;

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
        <Text style={styles.status}>{item.agendamentoStatus}</Text>
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
  const isAluno = !!userRoles?.includes("aluno");

  function openError(title: string, description: string) {
    setModal({ visible: true, title, description });
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

    onNewEvent?.();
  }

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        {isAluno ? (
          <>
            <Card
              title="Saldo de aulas"
              subtitle={
                <View>
                  <BalanceBar label="Presencial" current={classBalance?.saldoPresencial ?? 0} />
                  <BalanceBar label="Funcional" current={classBalance?.saldoFuncional ?? 0} />
                  <BalanceBar label="Residencial" current={classBalance?.saldoResidencial ?? 0} />
                </View>
              }
              cta="Ver meus agendamentos"
              onPress={onGoSchedule}
            />

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
        ) : (
          <>
            <Card
              title="Aulas para realizar hoje"
              subtitle={todayAppointments}
              cta="Ir para agendamentos"
              onPress={onGoSchedule}
            />
            <Card
              title="Aulas pendentes para aprovação"
              subtitle={pendingAppointments}
              cta="Ir para solicitacoes"
              onPress={onGoPending}
            />
          </>
        )}

        <Calendar calendarEvents={calendarEvents} disabledDays={disabledDays} />

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
          ) : appointments.length === 0 ? (
            <Text style={styles.emptyText}>Nenhum agendamento encontrado.</Text>
          ) : (
            <FlatList
              data={appointments}
              keyExtractor={(item) => String(item.agendamentoId)}
              renderItem={({ item }) => <AppointmentRow item={item} isAluno={isAluno} />}
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
            <Pressable style={styles.modalButton} onPress={() => setModal((prev) => ({ ...prev, visible: false }))}>
              <Text style={styles.modalButtonText}>Fechar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    paddingTop: 30,
    paddingBottom: 100,
    backgroundColor: "#e8eef4",
  },
  content: {
    padding: 16,
    paddingBottom: 28,
    gap: 14,
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