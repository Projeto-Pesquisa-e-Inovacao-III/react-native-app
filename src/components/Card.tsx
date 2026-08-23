import { Pressable, StyleSheet,Text, View } from "react-native";

export default function Card({title, subtitle, cta, onPress}: {
  title: string;
  subtitle: React.ReactNode;
  cta?: string;
  onPress?: () => void;
}) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {typeof subtitle === "string" || typeof subtitle === "number" ? (
        <Text style={styles.cardSubtitle}>{subtitle}</Text>
      ) : (
        <View>{subtitle}</View>
      )}
      {cta ? (
        <Pressable style={styles.cardButton} onPress={onPress}>
          <Text style={styles.cardButtonText}>{cta}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
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
    cardSubtitle: {
        color: "#39596f",
        fontSize: 20,
        lineHeight: 22,
        marginBottom: 8,
        fontWeight: "900",
    },
    cardButton: {
        marginTop: 6,
        backgroundColor: "#184763",
        borderWidth: 1,
        borderColor: "#b8d2e7",
        borderRadius: 10,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    cardButtonText: {
        color: "#f0f6fb",
        fontWeight: "700",
    },
})