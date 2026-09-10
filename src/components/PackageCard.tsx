import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import SmallerButton from "./SmallerButton";
import { Calendar, Dumbbell, Home, HeartPulse, Pencil, Trash2 } from "lucide-react-native";

type PackageCardProps = {
  titlebtn?: string | React.ReactNode;
  titulo?: string | React.ReactNode;
  subtitulo?: string | React.ReactNode;
  preco?: number | React.ReactNode;
  duracaoMes?: number | React.ReactNode;
  tipoAula?: string | React.ReactNode;
  quantidadeAula?: number | React.ReactNode;
  descricao: string[];
  beneficios?: { valor: string }[];
  onClick?: () => void;
  setHandleEdit?: () => void;
  setHandleDelete?: () => void;
  isLoading?: boolean;
  variant?: "consultoria" | "adicional";
  isAdmin?: boolean;
  isPersonal?: boolean;
  isDisabled?: boolean;
  onDisabledClick?: () => void;
};

export function PackageCard(props: PackageCardProps) {
  const { variant = "consultoria", isDisabled = false, isAdmin = false, isPersonal = false } = props;
  const [isExpanded, setIsExpanded] = useState(false);

  const tipoAulaStr = props.tipoAula?.toString().toUpperCase() || "";
  const tipoAulaFormatted = tipoAulaStr
    ? tipoAulaStr.charAt(0) + tipoAulaStr.slice(1).toLowerCase()
    : "";
  const modalityColor =
    tipoAulaStr === "RESIDENCIAL"
      ? "#F26430"
      : tipoAulaStr === "FUNCIONAL"
        ? "#82ADC5"
        : "#093A5D";
  const modalityBadgeBackground =
    tipoAulaStr === "RESIDENCIAL"
      ? "#EB825C36"
      : tipoAulaStr === "FUNCIONAL"
        ? "#C4E0F081"
        : "#BBD8EC81";

  return (
    <View
      style={[
        styles.packageCardContainer,
        tipoAulaStr === "PRESENCIAL" && styles.packageCardPresential,
        tipoAulaStr === "RESIDENCIAL" && styles.packageCardHome,
        tipoAulaStr === "FUNCIONAL" && styles.packageCardFunctional,
      ]}
    >
      <View style={styles.cardContent}>
        {/* Cabeçalho do Card */}
        <View style={styles.headerRow}>
          <View style={styles.headerBadges}>
            <View style={[styles.tipoAulaBadge, { backgroundColor: modalityBadgeBackground }]}>
              <Text style={[styles.cardTipoAulaText, { color: modalityColor }]}>
                {tipoAulaFormatted}
              </Text>
            </View>
            <View style={[styles.agendamentoBadge, { backgroundColor: modalityColor }]}>
              <Text style={styles.agendamentoText}>
                {props.quantidadeAula && Number(props.quantidadeAula) > 1
                  ? `${props.quantidadeAula} agendamentos`
                  : `${props.quantidadeAula} agendamento`}
              </Text>
            </View>
          </View>
          <View style={styles.iconContainer}>
            {tipoAulaStr === "PRESENCIAL" && <Dumbbell size={24} color={modalityColor} />}
            {tipoAulaStr === "RESIDENCIAL" && <Home size={24} color={modalityColor} />}
            {tipoAulaStr === "FUNCIONAL" && <HeartPulse size={24} color={modalityColor} />}
          </View>
        </View>

        {/* Título e Subtítulo */}
        <Text style={styles.cardTitle}>{props.titulo}</Text>
        <Text style={styles.cardSubtitle}>
          {props.subtitulo || "Esse pacote é adquirido de forma única e não possui cobrança automática."}
        </Text>

        {/* Preço */}
        <View style={styles.cardPriceSection}>
          <Text style={styles.currencySymbol}>R$</Text>
          <Text style={styles.cardPriceValue}>{props.preco}</Text>
        </View>

        {/* Duração e Pagamento */}
        <View style={styles.cardDuration}>
          <Calendar size={16} color="#4b5563" />
          <Text style={styles.durationText}>
            {Number(props.duracaoMes) > 1 ? `Válido por ${props.duracaoMes} meses` : "Válido por 1 mês"}
          </Text>
        </View>
        <Text style={styles.cardPaymentInfo}>Pagamento único</Text>

        {/* Lista de Benefícios */}
        {props.descricao && props.descricao.length > 0 && (
          <View style={styles.benefitsList}>
            {props.descricao.map((beneficio, index) => (
              <View key={index} style={styles.benefitItem}>
                <View style={styles.checkIcon}>
                  <Text style={styles.checkText}>✓</Text>
                </View>
                <Text style={styles.benefitText}>{beneficio}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Botões de Ação (Admin vs Aluno) */}
      {isAdmin ? (
        <View style={styles.cardBtnPersonal}>
          <SmallerButton
            type="button"
            title="Editar"
            classname={styles.editButton}
            handleButtonClick={props.setHandleEdit}
            icon={<Pencil size={16} color="rgb(255, 255, 255)" />}
          />
          <SmallerButton
            type="button"
            title="Deletar"
            classname={styles.deleteButton}
            handleButtonClick={props.setHandleDelete}
            icon={<Trash2 size={16} color="rgb(255, 255, 255)" />}
          />
        </View>
      ) : (
        !isPersonal && (
          <TouchableOpacity
            style={[styles.cardBtn, isDisabled && styles.cardBtnDisabled]}
            onPress={isDisabled ? props.onDisabledClick : props.onClick}
            activeOpacity={0.8}
          >
            <Text style={styles.cardBtnText}>
              {isDisabled ? "Nenhum pacote de consultoria ativo" : "Comprar"}
            </Text>
          </TouchableOpacity>
        )
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  packageCardContainer: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 20,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  packageCardPresential: {
    borderTopColor: "#093A5D",
    borderTopWidth: 15,
  },
  packageCardHome: {
    borderTopColor: "#F26430",
    borderTopWidth: 15,
  },
  packageCardFunctional: {
    borderTopColor: "#82ADC5",
    borderTopWidth: 15,
  },
  cardContent: {
    marginBottom: 16,
  },
  headerRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    width: "100%",
  },
  headerBadges: {
    alignItems: "center",
    flexDirection: "row",
    flexShrink: 1,
    gap: 8,
  },
  tipoAulaBadge: {
    borderRadius: 16,
    flexShrink: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#f3f4f6",
  },
  cardTipoAulaText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#093A5D",
    flexShrink: 1,
    textTransform: "uppercase",
  },
  agendamentoBadge: {
    backgroundColor: "#093A5D",
    flexShrink: 0,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  agendamentoText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  iconContainer: {
    alignItems: "center",
    backgroundColor: "#ECECEC81",
    borderRadius: 8,
    flexShrink: 0,
    justifyContent: "center",
    marginLeft: 10,
    padding: 8,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 16,
    lineHeight: 18,
  },
  cardPriceSection: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: 8,
  },
  currencySymbol: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginRight: 4,
  },
  cardPriceValue: {
    fontSize: 28,
    fontWeight: "800",
    color: "#111827",
  },
  cardDuration: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  durationText: {
    fontSize: 13,
    color: "#4b5563",
    fontWeight: "500",
  },
  cardPaymentInfo: {
    alignSelf: "flex-start",
    backgroundColor: "#ddffe9",
    borderRadius: 8,
    color: "#0d8037",
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 16,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  benefitsList: {
    gap: 10,
    marginTop: 8,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#dcfce7",
    justifyContent: "center",
    alignItems: "center",
  },
  checkText: {
    color: "#16a34a",
    fontSize: 11,
    fontWeight: "bold",
  },
  benefitText: {
    fontSize: 13,
    color: "#374151",
    flex: 1,
  },
  cardBtnPersonal: {
    flexDirection: "row",
    gap: 10,
  },
  editButton: {
    flex: 1,
    backgroundColor: "#093A5D",
  },
  deleteButton: {
    flex: 1,
    backgroundColor: "#bd3838",
  },
  cardBtn: {
    backgroundColor: "#093A5D",
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBtnDisabled: {
    backgroundColor: "#9ca3af",
  },
  cardBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
});