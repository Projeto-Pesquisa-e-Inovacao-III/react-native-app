import React from "react";
import { View, Text, StyleSheet, Modal, ActivityIndicator } from "react-native";

export default function PagBankModal() {
  return (
    <Modal transparent animationType="fade" visible={true}>
      <View style={styles.overlay}>
        <View style={styles.modalCard}>
          <Text style={styles.title}>Aguarde...</Text>
          
          <View style={styles.spinnerContainer}>
            <ActivityIndicator size="large" color="#093A5D" />
          </View>

          <Text style={styles.contentModal}>
            Você será redirecionado para o ambiente seguro do PagBank em instantes.
          </Text>
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
    marginBottom: 12,
  },
  spinnerContainer: {
    marginVertical: 16,
  },
  contentModal: {
    fontSize: 14,
    color: "#4b5563",
    textAlign: "center",
    lineHeight: 20,
  },
});