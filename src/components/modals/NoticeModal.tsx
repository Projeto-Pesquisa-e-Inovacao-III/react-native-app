import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Info } from "lucide-react-native";

type NoticeModalProps = {
  visible: boolean;
  title: string;
  content: string;
  actionLabel: string;
  onAction: () => void;
};

export default function NoticeModal({
  visible,
  title,
  content,
  actionLabel,
  onAction,
}: NoticeModalProps) {
  if (!visible) return null;

  return (
    <View style={styles.overlay} accessibilityViewIsModal>
      <View style={styles.card}>
        <View style={styles.iconCircle}>
          <Info size={34} color="#FFFFFF" strokeWidth={2.5} />
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.content}>{content}</Text>
        <Pressable
          style={styles.button}
          onPress={onAction}
          accessibilityRole="button"
        >
          <Text style={styles.buttonText}>{actionLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 100000,
    elevation: 100000,
    backgroundColor: "rgba(15, 23, 42, 0.55)",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0EA5E9",
    marginBottom: 16,
  },
  title: {
    color: "#093A5D",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
  },
  content: {
    color: "#4B5563",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  button: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: "#093A5D",
    marginTop: 24,
    paddingHorizontal: 16,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
});
