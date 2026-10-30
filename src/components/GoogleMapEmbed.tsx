import React from "react";
import {
  View,
  StyleSheet,
  StyleProp,
  ViewStyle,
  ActivityIndicator,
  Platform,
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

  if (Platform.OS === "web") {
    return (
      <View style={[styles.container, { height }, style]}>
        {React.createElement("iframe", {
          src: mapUrl,
          style: { width: "100%", height: "100%", border: 0, borderRadius: 8 },
          loading: "lazy",
          title: "Mapa do Google",
        })}
      </View>
    );
  }

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 100%; height: 100%; overflow: hidden; background-color: #F2F4F7; }
          iframe { width: 100%; height: 100%; border: 0; }
        </style>
      </head>
      <body>
        <iframe
          src="${mapUrl}"
          width="100%"
          height="100%"
          frameborder="0"
          style="border:0;"
          allowfullscreen=""
          loading="lazy"
        ></iframe>
      </body>
    </html>
  `;

  return (
    <View style={[styles.container, { height }, style]}>
      <WebView
        originWhitelist={["*"]}
        source={{ html: htmlContent, baseUrl: "https://www.google.com" }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        startInLoadingState={true}
        scrollEnabled={false}
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
