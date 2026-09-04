import React, { useEffect } from "react";
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, View } from "react-native";

type SmallerButtonProps = {
  type?: "button" | "submit";
  icon?: React.ReactNode;
  iconPosition?: "left" | "right";
  title?: string;
  value?: string;
  selected?: boolean;
  classname?: any; 
  handleButtonClick?: (value: string | boolean) => void;
  disabled?: boolean;
  loading?: boolean;
  textColor?: string;
};

export default function SmallerButton({
  icon,
  iconPosition = "left",
  title,
  value = "",
  selected,
  classname,
  handleButtonClick,
  disabled,
  loading,
  textColor,
}: SmallerButtonProps) {
  useEffect(() => {
    if (selected && handleButtonClick) {
      handleButtonClick(value);
    }
  }, [selected]);

  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      style={[
        styles.btnSched,
        isDisabled && styles.btnDisabled,
        loading && styles.loading,
        classname,
      ]}
      onPress={() => handleButtonClick?.(value)}
      disabled={isDisabled}
      activeOpacity={0.8}
    >
      {icon && iconPosition === "left" && <View style={styles.icon}>{icon}</View>}

      {loading ? (
        <ActivityIndicator size="small" color="#fff" />
      ) : (
        title ? <Text style={[styles.text, textColor ? { color: textColor } : null]}>{title}</Text> : null
      )}

      {icon && iconPosition === "right" && <View style={styles.icon}>{icon}</View>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btnSched: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    backgroundColor: "#093A5D", // Substitui var(--bg-blue)
    borderRadius: 6,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loading: {
    opacity: 0.6,
  },
  btnDisabled: {
    opacity: 0.5,
    backgroundColor: "#093A5D",
  },
  text: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  icon: {
    justifyContent: "center",
    alignItems: "center",
  },
});