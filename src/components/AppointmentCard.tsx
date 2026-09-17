import React, { useMemo } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import {
  Calendar,
  Check,
  ClipboardCheck,
  Clock,
  MapPin,
  QrCode,
  RefreshCw,
  Sparkles,
  UserX,
  X,
} from "lucide-react-native";
import UserAvatar from "./UserAvatar";

export const STATUS_CONFIG: Record<
  string,
  {
    label: string;
    variant: "confirmed" | "pending" | "completed" | "cancelled";
    bg: string;
    color: string;
    dot: string;
  }
> = {
  APROVADO: {
    label: "Marcado",
    variant: "confirmed",
    bg: "#EAF3DE",
    color: "#27500A",
    dot: "#3B6D11",
  },
  CONFIRMADO: {
    label: "Marcado",
    variant: "confirmed",
    bg: "#EAF3DE",
    color: "#27500A",
    dot: "#3B6D11",
  },
  PENDENTE_CLIENTE_APROVACAO: {
    label: "Pendente de confirmação",
    variant: "pending",
    bg: "#FAEEDA",
    color: "#633806",
    dot: "#BA7517",
  },
  PENDENTE_PERSONAL_APROVACAO: {
    label: "Aguardando personal",
    variant: "pending",
    bg: "#FAEEDA",
    color: "#633806",
    dot: "#BA7517",
  },
  CONCLUIDO: {
    label: "Concluído",
    variant: "completed",
    bg: "#E6F1FB",
    color: "#0C447C",
    dot: "#185FA5",
  },
  PENDENTE_PERSONAL_CONCLUIR: {
    label: "Pendente de conclusão",
    variant: "pending",
    bg: "#FAEEDA",
    color: "#633806",
    dot: "#BA7517",
  },
  CANCELADO_CLIENTE: {
    label: "Cancelado pelo aluno",
    variant: "cancelled",
    bg: "#FCEBEB",
    color: "#791F1F",
    dot: "#A32D2D",
  },
  CANCELADO_PERSONAL: {
    label: "Cancelado pelo personal",
    variant: "cancelled",
    bg: "#FCEBEB",
    color: "#791F1F",
    dot: "#A32D2D",
  },
  AUSENCIA_CLIENTE: {
    label: "Ausência do aluno",
    variant: "cancelled",
    bg: "#FCEBEB",
    color: "#791F1F",
    dot: "#A32D2D",
  },
  AUSENCIA_PERSONAL: {
    label: "Ausência do personal",
    variant: "cancelled",
    bg: "#FCEBEB",
    color: "#791F1F",
    dot: "#A32D2D",
  },
};

export interface AppointmentCardProps {
  agendamentoId: number;
  status: string;
  name: string;
  photoUrl?: string;
  date: string;
  time: string;
  type?: string;
  address?: string;
  analiseIa?: any;
  isAluno?: boolean;
  onPress?: () => void;
  onConfirm?: () => void;
  onReschedule?: () => void;
  onCancel?: () => void;
  onConclude?: () => void;
  onRegisterAbsence?: () => void;
  onOpenAi?: () => void;
  onShowQrCode?: () => void;
}

export function AppointmentCard({
  agendamentoId,
  status,
  name,
  photoUrl,
  date,
  time,
  type = "PRESENCIAL",
  address,
  analiseIa,
  isAluno = false,
  onPress,
  onConfirm,
  onReschedule,
  onCancel,
  onConclude,
  onRegisterAbsence,
  onOpenAi,
  onShowQrCode,
}: AppointmentCardProps) {
  const router = useRouter();

  const statusKey = (status || "").toUpperCase();
  const statusInfo = STATUS_CONFIG[statusKey] || {
    label: status || "Agendado",
    variant: "confirmed" as const,
    bg: "#F3F4F6",
    color: "#374151",
    dot: "#9CA3AF",
  };

  const formattedDate = useMemo(() => {
    if (!date) return "--";
    if (date.includes("-") && date.length >= 10) {
      const parts = date.split("T")[0].split("-");
      if (parts.length === 3) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    return date;
  }, [date]);

  const formattedTime = useMemo(() => {
    if (!time) return "--:--";
    return time;
  }, [time]);

  const isPendingConclusion =
    statusKey === "PENDENTE_PERSONAL_CONCLUIR";
  const isApproved = statusKey === "APROVADO" || statusKey === "CONFIRMADO";

  function handleNavigateToDetail() {
    if (onPress) {
      onPress();
      return;
    }
    if (agendamentoId) {
      router.push({
        pathname: "/(app)/(tabs)/schedule-details",
        params: { id: String(agendamentoId) },
      });
    }
  }

  const hasActionButtons =
    !!onConfirm ||
    !!onReschedule ||
    !!onCancel ||
    !!onConclude ||
    !!onRegisterAbsence;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={handleNavigateToDetail}
      activeOpacity={0.85}
    >
      {/* Header do Card */}
      <View style={styles.header}>
        <View style={[styles.badge, { backgroundColor: statusInfo.bg }]}>
          <View style={[styles.badgeDot, { backgroundColor: statusInfo.dot }]} />
          <Text style={[styles.badgeText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
        </View>

        <View style={styles.headerRight}>
          <Text style={styles.typeText}>{type}</Text>
          {analiseIa && onOpenAi && (
            <TouchableOpacity
              style={styles.sparklesHeaderBtn}
              onPress={onOpenAi}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Sparkles size={14} color="#0F567F" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Corpo do Card */}
      <View style={styles.body}>
        <View style={styles.leftCol}>
          <UserAvatar foto={photoUrl} userName={name} size={40} />

          <View style={styles.userTextCol}>
            <Text style={styles.userName} numberOfLines={1}>
              {name || "Sem nome"}
            </Text>
            <View style={styles.addressRow}>
              <MapPin size={12} color="#6B7280" />
              <Text style={styles.addressText} numberOfLines={1}>
                {address || "Endereço não informado"}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.rightCol}>
          <View style={styles.metaRow}>
            <Calendar size={12} color="#6B7280" />
            <Text style={styles.dateText}>{formattedDate}</Text>
          </View>
          <View style={styles.metaRow}>
            <Clock size={12} color="#6B7280" />
            <Text style={styles.timeText}>{formattedTime}</Text>
          </View>
        </View>
      </View>

      {/* Dica IA */}
      {analiseIa && onOpenAi && (
        <TouchableOpacity
          style={styles.aiHintBanner}
          onPress={onOpenAi}
          activeOpacity={0.8}
        >
          <Sparkles size={13} color="#0284C7" />
          <Text style={styles.aiHintBannerText}>Ver dica do Treinador IA</Text>
        </TouchableOpacity>
      )}

      {/* QR Code para Aluno */}
      {isAluno && (isPendingConclusion || isApproved) && onShowQrCode && (
        <TouchableOpacity
          style={[
            styles.qrButton,
            isPendingConclusion && styles.qrButtonHighlight,
          ]}
          onPress={onShowQrCode}
          activeOpacity={0.85}
        >
          <QrCode
            size={14}
            color={isPendingConclusion ? "#FFFFFF" : "#0F567F"}
          />
          <Text
            style={[
              styles.qrButtonText,
              isPendingConclusion && styles.qrButtonTextHighlight,
            ]}
          >
            {isPendingConclusion
              ? "Apresentar QR Code ao Personal"
              : "Ver QR Code da Aula"}
          </Text>
        </TouchableOpacity>
      )}

      {/* Ações (se passadas) */}
      {hasActionButtons && (
        <View style={styles.actionsRow}>
          {onConfirm && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <Check size={13} color="#27500A" />
              <Text style={[styles.actionText, styles.actionConfirmText]}>
                Confirmar
              </Text>
            </TouchableOpacity>
          )}

          {onReschedule && (
            <TouchableOpacity
              style={[
                styles.actionBtn,
                onConfirm && styles.actionBorderLeft,
              ]}
              onPress={onReschedule}
              activeOpacity={0.7}
            >
              <RefreshCw size={12} color="#4B5563" />
              <Text style={styles.actionText}>Reagendar</Text>
            </TouchableOpacity>
          )}

          {onCancel && (
            <TouchableOpacity
              style={[
                styles.actionBtn,
                (onConfirm || onReschedule) && styles.actionBorderLeft,
              ]}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <X size={13} color="#791F1F" />
              <Text style={[styles.actionText, styles.actionCancelText]}>
                Cancelar
              </Text>
            </TouchableOpacity>
          )}

          {onConclude && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={onConclude}
              activeOpacity={0.7}
            >
              <ClipboardCheck size={13} color="#27500A" />
              <Text style={[styles.actionText, styles.actionConfirmText]}>
                Concluir aula
              </Text>
            </TouchableOpacity>
          )}

          {onRegisterAbsence && (
            <TouchableOpacity
              style={[
                styles.actionBtn,
                onConclude && styles.actionBorderLeft,
              ]}
              onPress={onRegisterAbsence}
              activeOpacity={0.7}
            >
              <UserX size={13} color="#791F1F" />
              <Text style={[styles.actionText, styles.actionCancelText]}>
                Registrar ausência
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    overflow: "hidden",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
    width: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    backgroundColor: "#FFFFFF",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 3.5,
    borderRadius: 999,
  },
  badgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  typeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#888888",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  sparklesHeaderBtn: {
    padding: 2,
  },
  body: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  leftCol: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minWidth: 0,
  },
  userTextCol: {
    flex: 1,
    minWidth: 0,
  },
  userName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  addressText: {
    fontSize: 12,
    color: "#6B7280",
    flex: 1,
  },
  divider: {
    width: 1,
    height: 40,
    backgroundColor: "#E5E7EB",
    marginHorizontal: 12,
  },
  rightCol: {
    alignItems: "flex-end",
    justifyContent: "center",
    minWidth: 80,
    gap: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dateText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#111827",
  },
  timeText: {
    fontSize: 12,
    color: "#6B7280",
  },
  // Actions
  actionsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 9,
    paddingHorizontal: 8,
  },
  actionBorderLeft: {
    borderLeftWidth: 1,
    borderLeftColor: "#F1F5F9",
  },
  actionText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#4B5563",
  },
  actionConfirmText: {
    color: "#27500A",
    fontWeight: "600",
  },
  actionCancelText: {
    color: "#791F1F",
  },
  // AI Hint banner
  aiHintBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F0F9FF",
    borderTopWidth: 1,
    borderTopColor: "#E0F2FE",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  aiHintBannerText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0284C7",
  },
  // QR Code
  qrButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    backgroundColor: "#F8FAFC",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  qrButtonHighlight: {
    backgroundColor: "#0F567F",
  },
  qrButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0F567F",
  },
  qrButtonTextHighlight: {
    color: "#FFFFFF",
  },
});

export default AppointmentCard;
