import React from "react";
import {
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
  ActivityIndicator,
} from "react-native";
import { WebView } from "react-native-webview";

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
      <WebView
        source={{ uri: mapUrl }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#19587A" />
          </View>
        )}
      />
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
  webview: {
    flex: 1,
    borderRadius: 8,
  },
  loadingContainer: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F2F4F7",
  },
});
