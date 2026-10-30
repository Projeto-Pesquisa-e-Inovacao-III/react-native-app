import React from "react";
import { View, StyleSheet, StyleProp, ViewStyle } from "react-native";

interface GoogleMapEmbedProps {
  endereco: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
}

export function GoogleMapEmbed({
  endereco,
  height = 300,
  style,
}: GoogleMapEmbedProps) {
  if (!endereco || endereco === "Endereço não informado") {
    return null;
  }

  const encodedAddress = encodeURIComponent(endereco);
  const mapUrl = `https://www.google.com/maps?q=${encodedAddress}&output=embed`;

  return (
    <View style={[styles.container, { height }, style]}>
      {React.createElement("iframe", {
        title: "Mapa do Endereço",
        width: "100%",
        height: "100%",
        style: {
          border: 0,
          width: "100%",
          height: "100%",
          borderRadius: 8,
        },
        loading: "lazy",
        src: mapUrl,
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    borderRadius: 8,
    overflow: "hidden",
    marginTop: 12,
    backgroundColor: "#F2F4F7",
  },
});
