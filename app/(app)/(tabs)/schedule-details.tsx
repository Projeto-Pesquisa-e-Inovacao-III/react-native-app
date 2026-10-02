import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { startOfDay } from "date-fns";
import {
  ArrowLeft,
  Ban,
  Building2,
  CalendarClock,
  CalendarDays,
  CalendarX,
  Check,
  ClipboardCheck,
  Clock,
  MapPin,
  MessageSquare,
  Navigation,
  Sparkles,
  UserX,
  X,
} from "lucide-react-native";

import { useAuth } from "../../../src/contexts/AuthContext";
import {
  acceptUserAppointment,
  appointmentAtCalendar,
  concludeAppointment,
  findAppointmentById,
  getAppointmentResumes,
  refuseAppointment,
  reportAbsencePersonal,
} from "../../../src/constants/schedule";
import type { AbsenceAppointment } from "../../../src/models/schedule";

import UserAvatar from "../../../src/components/UserAvatar";
import SummaryCard from "../../../src/components/SummaryCard";
import { GoogleMapEmbed } from "../../../src/components/GoogleMapEmbed";
import NewEvent from "../../../src/components/NewEvent";
import TimerModal from "../../../src/components/modals/TimerModal";
import ConcludeAppointmentModal from "../../../src/components/modals/ConcludeAppointmentModal";
import RegisterAbsenceModal from "../../../src/components/modals/RegisterAbsenceModal";
import SuccessModal from "../../../src/components/modals/SuccessModal";
import ErrorModal from "../../../src/components/modals/ErrorModal";
import AiPanelModal from "../../../src/components/modals/AiPanelModal";

type ModalType =
  | "reschedule"
  | "accept"
  | "conclude"
  | "decline"
  | "success"
  | "registerAbsence"
  | "cancel"
  | "error"
  | null;

const STATUS_CONFIG: Record<
  string,
  { text: string; bg: string; color: string }
> = {
  CONCLUIDO: { text: "Concluído", bg: "#EAFBF1", color: "#127B49" },
  PENDENTE_PERSONAL_CONCLUIR: {
    text: "Pendente",
    bg: "#FFF4ED",
    color: "#B43403",
  },
  APROVADO: { text: "Marcado", bg: "#EAFBF1", color: "#127B49" },
  PENDENTE_PERSONAL_APROVACAO: {
    text: "Em análise",
    bg: "#FEF3C7",
    color: "#92400E",
  },
  PENDENTE_CLIENTE_APROVACAO: {
    text: "Aprovação pendente",
    bg: "#FFF6D9",
    color: "#8A6300",
  },
  CANCELADO_PERSONAL: { text: "Cancelado", bg: "#FDECEC", color: "#B42318" },
  CANCELADO_CLIENTE: { text: "Cancelado", bg: "#FDECEC", color: "#B42318" },
  AUSENCIA_PERSONAL: { text: "Ausência", bg: "#FDECEC", color: "#B42318" },
  AUSENCIA_CLIENTE: { text: "Ausência", bg: "#FDECEC", color: "#B42318" },
};

export default function ScheduleDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { roles } = useAuth();
  const { id } = useLocalSearchParams<{ id?: string }>();

  const appointmentId = Number(Array.isArray(id) ? id[0] : id);

  const isPersonal = roles?.includes("personal");
  const isAdmin = roles?.includes("admin");
  const isAluno = !isPersonal && !isAdmin;

  const [openModal, setOpenModal] = useState<ModalType>(null);
  const [modalTargetId, setModalTargetId] = useState<number>(0);
  const [successModalInfo, setSuccessModalInfo] = useState<{
    title: string;
    content: string;
  } | null>(null);
  const [aiPanelOpen, setAiPanelOpen] = useState(false);

  // 1. Busca detalhes do agendamento
  const {
    data: appointmentData,
    isLoading: isLoadingAppointment,
    isError: isAppointmentError,
    error: appointmentError,
    refetch: refetchAppointment,
    isFetching: isFetchingAppointment,
  } = useQuery({
    queryKey: ["appointmentDetails", appointmentId],
    queryFn: async () => {
      const res = await findAppointmentById(appointmentId);
      return res.data;
    },
    enabled: !Number.isNaN(appointmentId) && appointmentId > 0,
    retry: (failureCount, error: any) => {
      if (error?.response?.status === 400 || error?.response?.status === 404)
        return false;
      return failureCount < 2;
    },
  });

  // Redireciona caso o ID seja inválido ou não encontrado
  useEffect(() => {
    if (isAppointmentError) {
      const error = appointmentError as any;
      if (error?.response?.status === 400 || error?.response?.status === 404) {
        router.replace("/(app)/(tabs)");
      }
    }
  }, [isAppointmentError, appointmentError, router]);

  // 2. Busca eventos do calendário (para checagem no reagendamento)
  const { data: calendarData } = useQuery({
    queryKey: ["appointmentsAtCalendar"],
    queryFn: () => appointmentAtCalendar(),
  });

  // 3. Resumos anteriores do aluno (apenas para personal e admin)
  const alunoId = appointmentData?.aluno?.id;
  const {
    data: resumosData,
    isLoading: isLoadingResumos,
    isFetching: isFetchingResumos,
  } = useQuery({
    queryKey: ["appointmentResumes", alunoId],
    queryFn: () => getAppointmentResumes(alunoId!, 0, 3),
    enabled: !!alunoId && (isPersonal || isAdmin),
  });

  const last3Appointments: any[] = resumosData?.data?.content ?? [];

  // Condição para liberação dos botões de conclusão/ausência pelo personal (a partir do dia da aula)
  const buttonsActionsCondition = useMemo(() => {
    if (!appointmentData?.dataInicio) return false;
    const today = new Date(startOfDay(new Date()));
    const appt = new Date(startOfDay(new Date(appointmentData.dataInicio)));
    return today >= appt;
  }, [appointmentData?.dataInicio]);

  const onRefresh = useCallback(async () => {
    await Promise.all([
      refetchAppointment(),
      queryClient.invalidateQueries({
        queryKey: ["appointmentResumes", alunoId],
      }),
    ]);
  }, [refetchAppointment, queryClient, alunoId]);

  function handleSuccessModal(title: string, content: string) {
    setSuccessModalInfo({ title, content });
    setOpenModal("success");
  }

  function handleErrorModal(title: string, content: string) {
    setSuccessModalInfo({ title, content });
    setOpenModal("error");
  }

  const handleActionSuccess = async (title: string, content: string) => {
    handleSuccessModal(title, content);
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["appointmentDetails", appointmentId],
      }),
      queryClient.invalidateQueries({ queryKey: ["appointmentsAtCalendar"] }),
      queryClient.invalidateQueries({ queryKey: ["personalWeeklySchedule"] }),
      queryClient.invalidateQueries({ queryKey: ["userAppointments"] }),
      queryClient.invalidateQueries({ queryKey: ["overview"] }),
    ]);
  };

  const handleActionError = (
    title: string,
    error: any,
    defaultMessage: string,
  ) => {
    const message =
      error?.response?.data?.Exception ||
      error?.response?.data?.message ||
      defaultMessage;
    handleErrorModal(title, message);
  };

  async function acceptAppointment(idToAccept: number) {
    try {
      await acceptUserAppointment(idToAccept);
      await handleActionSuccess(
        "Agendamento Aceito",
        "O agendamento foi aceito com sucesso.",
      );
    } catch (error) {
      handleActionError(
        "Erro ao aceitar o agendamento",
        error,
        "Ocorreu um erro ao aceitar o agendamento.",
      );
    }
  }

  async function declineAppointment(idToDecline: number) {
    try {
      await refuseAppointment(idToDecline);
      await handleActionSuccess(
        "Agendamento Recusado",
        "O agendamento foi recusado.",
      );
    } catch (error) {
      handleActionError(
        "Erro ao recusar o agendamento",
        error,
        "Ocorreu um erro ao recusar o agendamento.",
      );
    }
  }

  async function cancelAppointment(idToCancel: number) {
    try {
      await refuseAppointment(idToCancel);
      await handleActionSuccess(
        "Agendamento Cancelado",
        "O agendamento foi cancelado com sucesso.",
      );
    } catch (error) {
      handleActionError(
        "Erro ao cancelar o agendamento",
        error,
        "Ocorreu um erro ao cancelar o agendamento.",
      );
    }
  }

  async function registerAbsenceAppointment(data: {
    type: string;
    description: string;
  }) {
    const payload: AbsenceAppointment = {
      idAgendamento: modalTargetId,
      tipoUsuario: data.type,
      descricaoCancelamento: data.description || "",
    };
    try {
      await reportAbsencePersonal(payload);
      await handleActionSuccess(
        "Ausência Registrada",
        "A ausência foi registrada com sucesso.",
      );
    } catch (error) {
      handleActionError(
        "Erro ao registrar a ausência",
        error,
        "Ocorreu um erro ao registrar a ausência.",
      );
    }
  }

  async function handleConcludeAppointment(
    idToConclude: number,
    data: { resumo: string; grupoMuscular: string[] },
  ) {
    try {
      await concludeAppointment(idToConclude, data);
      await handleActionSuccess(
        "Agendamento Concluído",
        "O agendamento foi concluído com sucesso.",
      );
      await queryClient.invalidateQueries({ queryKey: ["appointmentResumes"] });
    } catch (error) {
      handleActionError(
        "Erro ao concluir o agendamento",
        error,
        "Ocorreu um erro ao concluir o agendamento.",
      );
    }
  }

  async function handleSuccessReschedule() {
    await handleActionSuccess(
      "Reagendado com sucesso",
      "Horário reagendado com sucesso.",
    );
  }

  function handleOpenModal(targetId: number, type: ModalType) {
    setModalTargetId(targetId);
    setOpenModal(type);
  }

  function handleWhatsAppClick() {
    const phone = appointmentData?.personal?.telefone?.numero;
    if (phone) {
      const cleanPhone = phone.replace(/\D/g, "");
      Linking.openURL(
        `https://api.whatsapp.com/send?phone=${cleanPhone}&text=Ol%C3%A1%2C%20tudo%20bem%3F`,
      );
    }
  }

  const mapQueryAddress = useMemo(() => {
    const end = appointmentData?.endereco;
    if (!end) return "";
    const parts = [
      end?.cep?.logradouro,
      end?.numero,
      end?.cep?.bairro,
      end?.cep?.uf,
    ].filter(Boolean);
    return parts.join(" ");
  }, [appointmentData?.endereco]);

  function handleGoogleMapsClick() {
    const query = mapQueryAddress || fullAddress;
    if (!query || query === "Endereço não informado") return;
    const encoded = encodeURIComponent(query);
    Linking.openURL(
      `https://www.google.com/maps/dir/?api=1&destination=${encoded}`,
    );
  }

  // Formatações visuais
  const formattedDate = useMemo(() => {
    if (!appointmentData?.dataInicio) return "--";
    try {
      const d = new Date(appointmentData.dataInicio);
      return d.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "--";
    }
  }, [appointmentData?.dataInicio]);

  const formattedTimeRange = useMemo(() => {
    const start =
      appointmentData?.dataInicio?.split("T")[1]?.slice(0, 5) || "--:--";
    const end = appointmentData?.dataFim?.split("T")[1]?.slice(0, 5) || "--:--";
    return `${start} - ${end}`;
  }, [appointmentData?.dataInicio, appointmentData?.dataFim]);

  const fullAddress = useMemo(() => {
    const end = appointmentData?.endereco;
    if (!end) return "Endereço não informado";
    const parts = [
      end?.cep?.logradouro,
      end?.numero ? `nº ${end.numero}` : null,
      end?.cep?.bairro,
      end?.cep?.uf,
    ].filter(Boolean);
    return parts.join(" – ") || "Endereço não informado";
  }, [appointmentData?.endereco]);

  const statusConfig = appointmentData?.status
    ? STATUS_CONFIG[appointmentData.status]
    : null;

  const displayName = isAluno
    ? appointmentData?.personal?.nome
    : appointmentData?.aluno?.nome;
  const displayRole = isAluno ? "Personal Trainer" : "Aluno";
  const displayAge = isAluno
    ? appointmentData?.personal?.idade
    : appointmentData?.aluno?.idade;
  const displayAvatar = isAluno
    ? appointmentData?.personal?.avatarUrl
    : appointmentData?.aluno?.avatarUrl;

  const lastNote = appointmentData?.descricao || "";

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      {/* Top Header Bar */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={22} color="#0F1E2E" />
        </TouchableOpacity>

        {statusConfig && (
          <View
            style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}
          >
            <Text
              style={[styles.statusBadgeText, { color: statusConfig.color }]}
            >
              {statusConfig.text}
            </Text>
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Math.max(insets.bottom, 16) + 90 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isFetchingAppointment || isFetchingResumos}
            onRefresh={onRefresh}
            colors={["#19587A"]}
            tintColor="#19587A"
          />
        }
      >
        <Text style={styles.pageTitle}>Detalhes do agendamento</Text>

        {isLoadingAppointment ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#19587A" />
            <Text style={styles.loadingText}>Carregando informações...</Text>
          </View>
        ) : (
          <>
            {/* Card do Usuário (Personal ou Aluno) */}
            <View style={styles.card}>
              <TouchableOpacity
                disabled={!isPersonal || !appointmentData?.aluno?.id}
                onPress={() => {
                  if (appointmentData?.aluno?.id) {
                    router.push({
                      pathname: "/(app)/(tabs)/users/view-user-data",
                      params: { id: appointmentData.aluno.id },
                    });
                  }
                }}
                activeOpacity={0.8}
                style={styles.profileSection}
              >
                <UserAvatar
                  foto={displayAvatar}
                  userName={displayName || ""}
                  size={84}
                />
                <Text style={styles.profileName}>
                  {displayName || "Nome não informado"}
                </Text>
                <Text style={styles.profileSub}>{displayRole}</Text>
              </TouchableOpacity>

              {displayAge != null && (
                <View style={styles.ageDivider}>
                  <Text style={styles.ageLabel}>Idade</Text>
                  <Text style={styles.ageValue}>{displayAge} anos</Text>
                </View>
              )}

              {/* Botão de contato via WhatsApp (para o aluno) */}
              {isAluno && appointmentData?.personal?.telefone?.numero && (
                <TouchableOpacity
                  style={styles.whatsAppButton}
                  onPress={handleWhatsAppClick}
                  activeOpacity={0.8}
                >
                  <MessageSquare size={18} color="#FFFFFF" />
                  <Text style={styles.whatsAppButtonText}>
                    Conversar no WhatsApp
                  </Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Linha de Data e Horário */}
            <View style={styles.row}>
              <View style={[styles.card, styles.dateTimeCard]}>
                <CalendarDays size={20} color="#19587A" />
                <View style={styles.dateTimeTextCol}>
                  <Text style={styles.metricLabel}>DATA</Text>
                  <Text style={styles.metricValue}>{formattedDate}</Text>
                </View>
              </View>

              <View style={[styles.card, styles.dateTimeCard]}>
                <Clock size={20} color="#19587A" />
                <View style={styles.dateTimeTextCol}>
                  <Text style={styles.metricLabel}>HORÁRIO</Text>
                  <Text style={styles.metricValue}>{formattedTimeRange}</Text>
                </View>
              </View>
            </View>

            {/* Linha de Tipo de Atendimento e Ambiente */}
            <View style={styles.row}>
              <View style={[styles.card, styles.infoCard]}>
                <View style={styles.infoCardHeader}>
                  <Building2 size={15} color="#667085" />
                  <Text style={styles.infoCardLabel}>TIPO DE ATENDIMENTO</Text>
                </View>
                <Text style={styles.infoCardValue}>
                  {appointmentData?.tipoAula
                    ? appointmentData.tipoAula.charAt(0).toUpperCase() +
                      appointmentData.tipoAula.slice(1).toLowerCase()
                    : "Presencial"}
                </Text>
              </View>

              <View style={[styles.card, styles.infoCard]}>
                <View style={styles.infoCardHeader}>
                  <MapPin size={15} color="#667085" />
                  <Text style={styles.infoCardLabel}>AMBIENTE</Text>
                </View>
                <Text style={styles.infoCardValue}>
                  {appointmentData?.endereco?.tipo
                    ? appointmentData.endereco.tipo.charAt(0).toUpperCase() +
                      appointmentData.endereco.tipo.slice(1).toLowerCase()
                    : "Presencial"}
                </Text>
              </View>
            </View>

            {/* Card de Dica de IA (quando disponível) */}
            {/* {(isPersonal || isAdmin) &&
              appointmentData?.status === "APROVADO" && (
                <TouchableOpacity
                  style={styles.aiBannerCard}
                  onPress={() => setAiPanelOpen(true)}
                  activeOpacity={0.85}
                >
                  <View style={styles.aiBannerIcon}>
                    <Sparkles size={20} color="#FFFFFF" />
                  </View>
                  <View style={styles.aiBannerTextCol}>
                    <Text style={styles.aiBannerTitle}>
                      Dica do Treinador IA
                    </Text>
                    <Text style={styles.aiBannerSub}>
                      Toque para ver orientações de treino
                    </Text>
                  </View>
                </TouchableOpacity>
              )} */}

            {/* Card de Endereço Completo */}
            <View style={styles.card}>
              <View style={styles.mapCardHeader}>
                <Text style={styles.infoCardLabel}>ENDEREÇO COMPLETO</Text>
                <TouchableOpacity
                  style={styles.directionsBtn}
                  onPress={handleGoogleMapsClick}
                  activeOpacity={0.7}
                >
                  <Navigation size={14} color="#19587A" />
                  <Text style={styles.directionsBtnText}>Direções</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.addressText}>{fullAddress}</Text>

              {/* Mapa interativo Embed */}
              {isLoadingAppointment ? (
                <View style={styles.mapLoadingContainer}>
                  <ActivityIndicator size="small" color="#19587A" />
                </View>
              ) : (
                <GoogleMapEmbed
                  endereco={mapQueryAddress || fullAddress}
                  height={320}
                />
              )}
            </View>

            {/* Resumos anteriores (apenas para Personal e Admin) */}
            {(isPersonal || isAdmin) && (
              <View style={styles.summariesSection}>
                <Text style={styles.sectionTitle}>Resumos anteriores</Text>

                {isLoadingResumos ? (
                  <View style={[styles.card, styles.emptyStateCard]}>
                    <ActivityIndicator size="small" color="#19587A" />
                  </View>
                ) : last3Appointments.length > 0 ? (
                  last3Appointments.map((item: any, idx: number) => {
                    const dateStr = item.agendamento?.data
                      ? new Date(item.agendamento.data).toLocaleDateString(
                          "pt-BR",
                          {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          },
                        )
                      : "--";
                    const muscles: string[] = item.grupoMuscular ?? [];
                    return (
                      <SummaryCard
                        key={item.id ?? idx}
                        dateStr={dateStr}
                        muscles={muscles}
                        resumo={item.resumo}
                      />
                    );
                  })
                ) : (
                  <View style={[styles.card, styles.emptyStateCard]}>
                    <CalendarX size={24} color="#94A3B8" />
                    <Text style={styles.emptyStateText}>
                      Nenhum agendamento anterior encontrado.
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Botões de Ação de acordo com perfil e status */}
            <View style={styles.actionButtonsContainer}>
              {/* 1. Personal concluindo aula do dia ou anterior */}
              {isPersonal &&
                buttonsActionsCondition &&
                appointmentData?.status === "PENDENTE_PERSONAL_CONCLUIR" && (
                  <View style={styles.buttonsColumn}>
                    <TouchableOpacity
                      style={[styles.btnAction, styles.btnAccept]}
                      onPress={() =>
                        handleOpenModal(appointmentData.id, "conclude")
                      }
                      activeOpacity={0.85}
                    >
                      <ClipboardCheck
                        size={18}
                        color="#FFFFFF"
                        strokeWidth={2.5}
                      />
                      <Text style={styles.btnActionTextWhite}>
                        Concluir aula
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.btnAction, styles.btnDecline]}
                      onPress={() =>
                        handleOpenModal(appointmentData.id, "registerAbsence")
                      }
                      activeOpacity={0.85}
                    >
                      <UserX size={18} color="#FFFFFF" strokeWidth={2.5} />
                      <Text style={styles.btnActionTextWhite}>
                        Registrar ausência
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

              {/* 2. Aprovação pendente (Personal analisando ou Aluno analisando pedido do personal) */}
              {((!isAluno &&
                appointmentData?.status === "PENDENTE_PERSONAL_APROVACAO") ||
                (isAluno &&
                  appointmentData?.status ===
                    "PENDENTE_CLIENTE_APROVACAO")) && (
                <View style={styles.buttonsColumn}>
                  <TouchableOpacity
                    style={[styles.btnAction, styles.btnAccept]}
                    onPress={() =>
                      handleOpenModal(appointmentData.id, "accept")
                    }
                    activeOpacity={0.85}
                  >
                    <Check size={18} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={styles.btnActionTextWhite}>Aceitar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btnAction, styles.btnDecline]}
                    onPress={() =>
                      handleOpenModal(appointmentData.id, "decline")
                    }
                    activeOpacity={0.85}
                  >
                    <X size={18} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={styles.btnActionTextWhite}>Recusar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btnAction, styles.btnOther]}
                    onPress={() =>
                      handleOpenModal(appointmentData.id, "reschedule")
                    }
                    activeOpacity={0.85}
                  >
                    <CalendarClock size={18} color="#19587A" strokeWidth={2} />
                    <Text style={styles.btnActionTextBlue}>Reagendar</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 3. Aprovado: Reagendar ou Cancelar */}
              {appointmentData?.status === "APROVADO" && (
                <View style={styles.buttonsColumn}>
                  <TouchableOpacity
                    style={[styles.btnAction, styles.btnOther]}
                    onPress={() =>
                      handleOpenModal(appointmentData.id, "reschedule")
                    }
                    activeOpacity={0.85}
                  >
                    <CalendarClock size={18} color="#19587A" strokeWidth={2} />
                    <Text style={styles.btnActionTextBlue}>Reagendar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.btnAction, styles.btnDecline]}
                    onPress={() =>
                      handleOpenModal(appointmentData.id, "cancel")
                    }
                    activeOpacity={0.85}
                  >
                    <Ban size={18} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={styles.btnActionTextWhite}>
                      Cancelar agendamento
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* 4. Aluno com pendência de aprovação pelo personal */}
              {isAluno &&
                appointmentData?.status === "PENDENTE_PERSONAL_APROVACAO" && (
                  <View style={styles.buttonsColumn}>
                    <TouchableOpacity
                      style={[styles.btnAction, styles.btnOther]}
                      onPress={() =>
                        handleOpenModal(appointmentData.id, "reschedule")
                      }
                      activeOpacity={0.85}
                    >
                      <CalendarClock
                        size={18}
                        color="#19587A"
                        strokeWidth={2}
                      />
                      <Text style={styles.btnActionTextBlue}>Reagendar</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.btnAction, styles.btnDecline]}
                      onPress={() =>
                        handleOpenModal(appointmentData.id, "cancel")
                      }
                      activeOpacity={0.85}
                    >
                      <Ban size={18} color="#FFFFFF" strokeWidth={2.5} />
                      <Text style={styles.btnActionTextWhite}>
                        Cancelar agendamento
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Modais de Ações */}
      {openModal === "accept" && (
        <TimerModal
          title="Aceitar Agendamento"
          content="Tem certeza de que deseja aceitar este agendamento?"
          buttonTitle="Aceitar agendamento"
          callSuccessModal={() => acceptAppointment(modalTargetId)}
          closeThen={() => setOpenModal(null)}
        />
      )}

      {openModal === "decline" && (
        <TimerModal
          title="Recusar agendamento"
          content="Tem certeza de que deseja recusar este agendamento?"
          buttonTitle="Recusar agendamento"
          callSuccessModal={() => declineAppointment(modalTargetId)}
          closeThen={() => setOpenModal(null)}
        />
      )}

      {openModal === "cancel" && (
        <TimerModal
          title="Cancelar agendamento"
          content="Tem certeza de que deseja cancelar este agendamento?"
          buttonTitle="Cancelar agendamento"
          callSuccessModal={() => cancelAppointment(modalTargetId)}
          closeThen={() => setOpenModal(null)}
        />
      )}

      {openModal === "conclude" && (
        <ConcludeAppointmentModal
          visible={true}
          onClose={() => setOpenModal(null)}
          onSubmit={(data) => handleConcludeAppointment(modalTargetId, data)}
        />
      )}

      {openModal === "registerAbsence" && (
        <RegisterAbsenceModal
          visible={true}
          onClose={() => setOpenModal(null)}
          onSubmit={registerAbsenceAppointment}
        />
      )}

      {openModal === "reschedule" && (
        <NewEvent
          visible={true}
          onClose={() => setOpenModal(null)}
          isReschedule={true}
          rescheduleId={modalTargetId}
          appoitmentData={appointmentData}
          title="Reagendar horário"
          buttonTitle={isPersonal ? "Reagendar" : "Avançar"}
          goToNextStep={!isPersonal}
          openModalExtern={handleSuccessReschedule}
          errorModal={(t, m) => handleErrorModal(t, m)}
          typeUser={roles || []}
        />
      )}

      {openModal === "success" && (
        <SuccessModal
          visible={true}
          title={successModalInfo?.title}
          content={successModalInfo?.content}
          onClose={() => setOpenModal(null)}
        />
      )}

      {openModal === "error" && (
        <ErrorModal
          visible={true}
          title={successModalInfo?.title}
          content={successModalInfo?.content}
          onClose={() => setOpenModal(null)}
        />
      )}

      {/* Painel de Análise do Treinador IA */}
      <AiPanelModal
        visible={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
        analiseIa={appointmentData?.analiseIa}
        note={lastNote}
        studentName={displayName}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEEEEE",
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F1F5F9",
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 13,
    fontWeight: "700",
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 48,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: "#0F1E2E",
    marginBottom: 20,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
    color: "#64748B",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  profileSection: {
    alignItems: "center",
    gap: 8,
  },
  profileName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#0F1E2E",
    textAlign: "center",
    marginTop: 4,
  },
  profileSub: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
  },
  ageDivider: {
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 12,
    marginTop: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ageLabel: {
    fontSize: 14,
    color: "#64748B",
  },
  ageValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#0F1E2E",
  },
  whatsAppButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#25D366",
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  whatsAppButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "600",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  dateTimeCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 14,
  },
  dateTimeTextCol: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F1E2E",
    marginTop: 2,
  },
  infoCard: {
    flex: 1,
    padding: 16,
  },
  infoCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  infoCardLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  infoCardValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#0F1E2E",
  },
  aiBannerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    gap: 14,
  },
  aiBannerIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  aiBannerTextCol: {
    flex: 1,
  },
  aiBannerTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1E40AF",
  },
  aiBannerSub: {
    fontSize: 13,
    color: "#3B82F6",
    marginTop: 2,
  },
  mapCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  directionsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  directionsBtnText: {
    fontSize: 13,
    color: "#19587A",
    fontWeight: "600",
  },
  addressText: {
    fontSize: 15,
    fontWeight: "500",
    color: "#0F1E2E",
    lineHeight: 22,
    marginBottom: 14,
  },
  mapLoadingContainer: {
    height: 320,
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  summariesSection: {
    marginTop: 8,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#0F1E2E",
    marginBottom: 12,
  },
  emptyStateCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    gap: 8,
    borderStyle: "dashed",
  },
  emptyStateText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
  },
  actionButtonsContainer: {
    marginTop: 8,
    marginBottom: 30,
  },
  buttonsColumn: {
    gap: 12,
  },
  btnAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  btnAccept: {
    backgroundColor: "#16A34A",
  },
  btnDecline: {
    backgroundColor: "#DC2626",
  },
  btnOther: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "#19587A",
  },
  btnActionTextWhite: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  btnActionTextBlue: {
    color: "#19587A",
    fontSize: 15,
    fontWeight: "700",
  },
});
