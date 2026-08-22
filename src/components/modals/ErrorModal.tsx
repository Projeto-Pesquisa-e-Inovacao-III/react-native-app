import React from "react";
import { View, Text, StyleSheet, Modal, TouchableOpacity } from "react-native";
import SmallerButton from "../SmallerButton";

type ErrorModalProps = {
  closeThen: React.Dispatch<React.SetStateAction<boolean>>;
  title?: string;
  content?: string;
};

export default function ErrorModal({ closeThen, title, content }: ErrorModalProps) {
  const handleClose = () => {
    closeThen(false);
  };

  return (
    <Modal transparent animationType="fade" visible={true} onRequestClose={handleClose}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <Text style={styles.title}>{title || "Atenção!"}</Text>
          <Text style={styles.contentModal}>{content || "Ocorreu um erro."}</Text>

          {/* Ícone de Erro SVG nativo equivalente */}
          <View style={styles.iconContainer}>
            <View style={styles.svgCircle}>
              <Text style={styles.svgCross}>✕</Text>
            </View>
          </View>

          <SmallerButton
            classname={styles.buttonStyle}
            type="button"
            title="Fechar"
            handleButtonClick={handleClose}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    backgroundColor: "#ffffff",
    borderRadius: 16,
    padding: 24,
    width: "90%",
    maxWidth: 380,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#093A5D",
    marginBottom: 10,
    textAlign: "center",
  },
  contentModal: {
    fontSize: 14,
    color: "#4b5563",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  iconContainer: {
    marginBottom: 20,
    alignItems: "center",
  },
  svgCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#B64B44",
    justifyContent: "center",
    alignItems: "center",
  },
  svgCross: {
    color: "#ffffff",
    fontSize: 32,
    fontWeight: "bold",
  },
  buttonStyle: {
    width: "100%",
    height: 48,
    borderRadius: 12,
  },
});