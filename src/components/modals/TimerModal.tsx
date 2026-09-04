import React from "react";
import { View, Text, StyleSheet, Modal } from "react-native";
import SmallerButton from "../SmallerButton";

type TimerModalProps = {
  closeThen: (val: boolean) => void;
  title?: string;
  content?: string;
  callSuccessModal?: () => void;
  buttonTitle?: string;
};

export default function TimerModal({
  closeThen,
  title,
  content,
  callSuccessModal,
  buttonTitle,
}: TimerModalProps) {
  return (
    <Modal transparent animationType="fade" visible={true}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <Text style={styles.title}>{title || "Confirmar Exclusão"}</Text>
          <Text style={styles.contentModal}>{content || "Tem certeza de que deseja excluir este pacote?"}</Text>

          <View style={styles.actions}>
            <SmallerButton
              title={buttonTitle || "Excluir Pacote"}
              handleButtonClick={() => {
                callSuccessModal?.();
                closeThen(false);
              }}
              classname={styles.deleteBtn}
            />
            <SmallerButton
              title="Cancelar"
              handleButtonClick={() => closeThen(false)}
              classname={styles.cancelBtn}
              textColor="#334155"
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 360,
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
    textAlign: "center",
  },
  contentModal: {
    fontSize: 14,
    color: "#4b5563",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  actions: {
    gap: 10,
    width: "100%",
  },
  cancelBtn: {
    backgroundColor: "#e2e8f0",
  },
  deleteBtn: {
    backgroundColor: "#dc2626",
  },
});