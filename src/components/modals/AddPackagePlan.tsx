import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  SafeAreaView,
} from "react-native";
import { ArrowLeft, Trash2, PlusCircle, XCircle, X } from "lucide-react-native";
import ErrorModal from "./ErrorModal";
import type { ProductExhibition } from "../../models/products";
type AddPackagePlanProps = {
  onClose: (saved: boolean) => void;
  title?: string;
  packageValues?: {
    id?: number;
    titulo: string;
    subtitulo: string;
    tipoAula: string;
    preco: number;
    duracaoMes: number | string;
    descricao: string;
    beneficios: { valor: string }[];
    quantidadeAula: number | null;
  };
  isEdit?: boolean;
  typePackage: "PACOTE" | "ADICIONAL";
  packageCreated?: React.Dispatch<React.SetStateAction<ProductExhibition[]>>; 
  callSuccessModal: () => void;
};

export default function AddPackagePlan({
  onClose,
  title,
  packageValues,
  callSuccessModal,
  isEdit,
}: AddPackagePlanProps) {
  const [loading, setLoading] = useState(false);
  const [openErrorModal, setOpenErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState({ title: "", content: "" });

  const [packageInfo, setPackageInfo] = useState({
    name: packageValues?.titulo || "",
    subtitle: packageValues?.subtitulo || "",
    type: packageValues?.tipoAula || "PRESENCIAL",
    price: packageValues?.preco?.toString() || "",
    deadline: packageValues?.duracaoMes?.toString() || "",
    benefits: packageValues?.beneficios ? packageValues.beneficios.map((b) => b.valor) : [""],
    quantity: packageValues?.quantidadeAula || null,
  });

  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    subtitle?: string;
    price?: string;
    quantity?: string;
    deadline?: string;
    benefits?: string;
  }>({});

  function handleAddBenefit() {
    if (packageInfo.benefits.length < 8) {
      setPackageInfo((prev) => ({ ...prev, benefits: [...prev.benefits, ""] }));
      setFieldErrors((prev) => ({ ...prev, benefits: undefined }));
    }
  }

  function handleBenefitChange(index: number, value: string) {
    const updated = [...packageInfo.benefits];
    updated[index] = value;
    setPackageInfo((prev) => ({ ...prev, benefits: updated }));
  }

  function handleRemoveBenefit(index: number) {
    setPackageInfo((prev) => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== index),
    }));
  }

  function handleSavePackage() {
    setLoading(true);
    const filteredBenefits = packageInfo.benefits.filter((b) => b.trim() !== "");

    const errors: typeof fieldErrors = {};
    if (!packageInfo.name.trim()) errors.name = "Preencha o nome do pacote.";
    if (!packageInfo.subtitle.trim()) errors.subtitle = "Preencha o subtítulo do pacote.";
    if (!packageInfo.price) errors.price = "Preencha o preço.";
    if (!packageInfo.quantity) errors.quantity = "Informe a quantidade de aulas.";
    if (!packageInfo.deadline.trim()) errors.deadline = "Informe a validade em meses.";
    if (filteredBenefits.length === 0) errors.benefits = "Deve haver entre 1 e 8 benefícios.";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setLoading(false);
      return;
    }
    setFieldErrors({});

    // Simulação visual de salvamento para desenvolvimento da tela
    setTimeout(() => {
      setLoading(false);
      callSuccessModal();
      onClose(true);
    }, 1000);
  }

  return (
    <Modal animationType="slide" transparent={false} visible={true}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => onClose(false)} style={styles.backButton}>
            <ArrowLeft size={22} color="#1e293b" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{title || "Criar Pacote"}</Text>
          <TouchableOpacity onPress={() => onClose(false)}>
            <X size={24} color="#909fb5" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.container}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome do Pacote</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Hipertrofia Avançada"
              placeholderTextColor="#94a3b8"
              maxLength={20}
              value={packageInfo.name}
              onChangeText={(name) => {
                setPackageInfo({ ...packageInfo, name });
                if (name.trim()) setFieldErrors((prev) => ({ ...prev, name: undefined }));
              }}
            />
            {fieldErrors.name && <Text style={styles.errorText}>{fieldErrors.name}</Text>}
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Subtítulo do Pacote</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Pacote adquirido de forma única."
              placeholderTextColor="#94a3b8"
              maxLength={80}
              value={packageInfo.subtitle}
              onChangeText={(subtitle) => {
                setPackageInfo({ ...packageInfo, subtitle });
                if (subtitle.trim()) setFieldErrors((prev) => ({ ...prev, subtitle: undefined }));
              }}
            />
            {fieldErrors.subtitle && <Text style={styles.errorText}>{fieldErrors.subtitle}</Text>}
          </View>

          <View style={styles.row}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Preço (R$)</Text>
              <TextInput
                style={styles.input}
                placeholder="0,00"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={packageInfo.price}
                onChangeText={(price) => {
                  setPackageInfo({ ...packageInfo, price });
                  if (price) setFieldErrors((prev) => ({ ...prev, price: undefined }));
                }}
              />
              {fieldErrors.price && <Text style={styles.errorText}>{fieldErrors.price}</Text>}
            </View>

            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Duração (Meses)</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 3"
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                maxLength={2}
                value={packageInfo.deadline}
                onChangeText={(deadline) => {
                  setPackageInfo({ ...packageInfo, deadline });
                  if (deadline) setFieldErrors((prev) => ({ ...prev, deadline: undefined }));
                }}
              />
              {fieldErrors.deadline && <Text style={styles.errorText}>{fieldErrors.deadline}</Text>}
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Quantidade de Aulas</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 12"
              placeholderTextColor="#94a3b8"
              keyboardType="numeric"
              maxLength={3}
              value={packageInfo.quantity ? String(packageInfo.quantity) : ""}
              onChangeText={(val) => {
                const num = val ? Number(val) : null;
                setPackageInfo({ ...packageInfo, quantity: num });
                if (num) setFieldErrors((prev) => ({ ...prev, quantity: undefined }));
              }}
            />
            {fieldErrors.quantity && <Text style={styles.errorText}>{fieldErrors.quantity}</Text>}
          </View>

          <View style={styles.benefitsHeader}>
            <Text style={styles.label}>Benefícios inclusos ({packageInfo.benefits.length}/8)</Text>
            {fieldErrors.benefits && <Text style={styles.errorText}>{fieldErrors.benefits}</Text>}
          </View>

          {packageInfo.benefits.map((benefit, index) => (
            <View key={index} style={styles.benefitRow}>
              <TextInput
                style={[styles.input, { flex: 1, marginBottom: 0 }]}
                placeholder={`Benefício ${index + 1}`}
                placeholderTextColor="#94a3b8"
                maxLength={50}
                value={benefit}
                onChangeText={(val) => handleBenefitChange(index, val)}
              />
              <TouchableOpacity onPress={() => handleRemoveBenefit(index)} style={styles.trashBtn}>
                <Trash2 color="#ca0909" size={20} />
              </TouchableOpacity>
            </View>
          ))}

          {packageInfo.benefits.length < 8 ? (
            <TouchableOpacity style={styles.addBenefitBtn} onPress={handleAddBenefit}>
              <PlusCircle size={20} color="#093A5D" />
              <Text style={styles.addBenefitText}>Adicionar Benefício</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.limitReachedBtn}>
              <XCircle size={20} color="#943032" />
              <Text style={styles.limitReachedText}>Limite de benefícios atingido</Text>
            </View>
          )}

          <View style={styles.footerButtons}>
            <TouchableOpacity
              style={[styles.btn, styles.saveBtn]}
              onPress={handleSavePackage}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.saveBtnText}>{isEdit ? "Salvar" : "Criar Pacote"}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={() => onClose(false)}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {openErrorModal && (
          <ErrorModal
            title={errorMessage.title}
            content={errorMessage.content}
            closeThen={() => setOpenErrorModal(false)}
          />
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#ffffff",
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  container: {
    padding: 16,
    paddingBottom: 40,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#f3f4f6",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: "#111827",
  },
  row: {
    flexDirection: "row",
    gap: 12,
  },
  errorText: {
    color: "#dc2626",
    fontSize: 11,
    marginTop: 4,
  },
  benefitsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  trashBtn: {
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  addBenefitBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderStyle: "dashed",
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  addBenefitText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#093A5D",
  },
  limitReachedBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fee2e2",
    borderWidth: 1,
    borderColor: "#fca5a5",
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 24,
  },
  limitReachedText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#991b1b",
  },
  footerButtons: {
    gap: 12,
    marginTop: 8,
  },
  btn: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtn: {
    backgroundColor: "#093A5D",
  },
  saveBtnText: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },
  cancelBtn: {
    backgroundColor: "#e2e8f0",
  },
  cancelBtnText: {
    color: "#334155",
    fontSize: 15,
    fontWeight: "600",
  },
});