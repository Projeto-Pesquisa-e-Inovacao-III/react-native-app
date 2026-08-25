import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";

type Props = {
  visible: boolean;
  title?: string;
  content?: string;
  onClose: () => void;
};

export default function ErrorModal(props: Props) {
  return (
    <Modal visible={props.visible} animationType="fade" transparent>
      <Pressable style={styles.backdrop} onPress={props.onClose} />
      <View style={styles.wrapper}>
        <View style={styles.card}>
          <Text style={styles.title}>{props.title || "Erro ao salvar"}</Text>
          <Text style={styles.content}>{props.content || "Ocorreu um erro."}</Text>
          <Pressable style={styles.button} onPress={props.onClose}>
            <Text style={styles.buttonText}>Fechar</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  wrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#B64B44",
    marginBottom: 8,
  },
  content: {
    fontSize: 15,
    color: "#334155",
    marginBottom: 18,
  },
  button: {
    backgroundColor: "#0B3A5D",
    borderRadius: 10,
    height: 46,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});