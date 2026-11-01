import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Mic, X, Sparkles, RefreshCw } from "lucide-react-native";
import ErrorModal from "../../src/components/modals/ErrorModal";
import {
  ExpoSpeechRecognitionModule,
  useSpeechRecognitionEvent,
  isSpeechRecognitionAvailable,
} from "../../src/services/speechRecognition";
import { extractScheduleFromSpeech } from "../../src/constants/schedule";
import { isAxiosError } from "axios";

function getApiErrorMessage(error: unknown) {
  if (isAxiosError(error)) {
    if (error.response?.status === 405) {
      const allowedMethods = error.response.headers?.allow;
      return [
        "O backend recusou o método POST para a extração do agendamento.",
        "Confirme se o serviço atualizado disponibiliza POST /api/agendamentos/extrair.",
        typeof allowedMethods === "string" && allowedMethods
          ? `Métodos aceitos pela rota: ${allowedMethods}.`
          : "",
      ]
        .filter(Boolean)
        .join(" ");
    }

    const data: unknown = error.response?.data;
    if (typeof data === "string" && data.trim()) return data;
    if (data && typeof data === "object") {
      const message = Object.values(data).find(
        (value): value is string => typeof value === "string" && value.trim().length > 0,
      );
      if (message) return message;
    }
  }

  return "Não foi possível interpretar seu pedido. Tente novamente.";
}

type WaveformBarProps = {
  baseHeight: number;
  isActive: boolean;
  normalizedVolume: number;
};

function WaveformBar({
  baseHeight,
  isActive,
  normalizedVolume,
}: WaveformBarProps) {
  const animVal = useRef(new Animated.Value(0.12)).current;

  useEffect(() => {
    if (isActive) {
      const scale = 0.15 + normalizedVolume * 1.55;
      Animated.spring(animVal, {
        toValue: scale,
        useNativeDriver: true,
        damping: 5,
        stiffness: 180,
        mass: 0.5,
      }).start();
    } else {
      Animated.spring(animVal, {
        toValue: 0.12,
        useNativeDriver: true,
        damping: 10,
        stiffness: 80,
      }).start();
    }
  }, [isActive, normalizedVolume]);

  return (
    <Animated.View
      style={[
        styles.waveBar,
        {
          height: baseHeight,
          backgroundColor: "#0A3D62",
          transform: [{ scaleY: animVal }],
          opacity: isActive ? 1 : 0.25,
        },
      ]}
    />
  );
}

const BAR_BASE_HEIGHTS = [28, 44, 60, 36, 52, 40, 24];

export default function AiVoiceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [transcriptionText, setTranscriptionText] = useState<string | null>(null);
  const [hasFinalTranscription, setHasFinalTranscription] = useState(false);
  const [normalizedVolume, setNormalizedVolume] = useState(0);
  const [errorModal, setErrorModal] = useState<{
    visible: boolean;
    title: string;
    content: string;
    onClose?: () => void;
  }>({
    visible: false,
    title: "",
    content: "",
  });
  const isCancellingRef = useRef(false);
  const isStartingRef = useRef(false);
  const isRecognitionActiveRef = useRef(false);

  useSpeechRecognitionEvent('start', () => {
    isRecognitionActiveRef.current = true;
    isStartingRef.current = false;
    setIsRecording(true);
    setIsProcessing(false);
  });

  useSpeechRecognitionEvent('end', () => {
    isRecognitionActiveRef.current = false;
    isStartingRef.current = false;
    setIsRecording(false);
    setIsProcessing(false);
  });

  useSpeechRecognitionEvent('result', (event) => {
    const best = event.results[0]?.transcript;
    if (best) {
      setTranscriptionText(best);
      if (event.isFinal) {
        setHasFinalTranscription(true);
        setIsProcessing(false);
      }
    }
  });

  useSpeechRecognitionEvent('error', (event) => {
    isRecognitionActiveRef.current = false;
    isStartingRef.current = false;
    setIsProcessing(false);
    setIsRecording(false);

    if (event.error === 'aborted' || (event.error === 'no-speech' && isCancellingRef.current)) {
      return;
    }

    const messages: Record<string, string> = {
      'not-allowed': 'Permissão de microfone/fala não concedida.',
      'no-speech': 'Nenhuma fala detectada. Tente novamente.',
      'network': 'Falha na rede. Verifique sua conexão.',
      'service-not-allowed': 'Serviço de reconhecimento indisponível.',
      'audio-capture': 'Erro na captura de áudio.',
      'language-not-supported': 'Idioma pt-BR não suportado neste dispositivo.',
    };

    const message = messages[event.error] ?? 'Erro desconhecido ao transcrever áudio.';
    if (event.error === 'no-speech') {
      setTranscriptionText(null);
      setHasFinalTranscription(false);
      console.warn('Speech recognition did not detect speech:', event.message);
      setErrorModal({
        visible: true,
        title: 'Nenhuma fala detectada',
        content: 'Fale mais perto do microfone e tente novamente.',
      });
      return;
    }

    console.error('Speech recognition error:', event.error, event.message);

    if (event.error === 'not-allowed') {
      setErrorModal({
        visible: true,
        title: 'Permissão negada',
        content: message,
        onClose: () => router.back(),
      });
    } else if (event.error !== 'no-speech') {
      setErrorModal({
        visible: true,
        title: 'Erro',
        content: message,
      });
    }
  });

  useSpeechRecognitionEvent('nomatch', () => {
    setIsProcessing(false);
    setTranscriptionText(null);
    setHasFinalTranscription(false);
  });

  useSpeechRecognitionEvent('volumechange', (event) => {
    const vol = Math.max(0, Math.min(1, (event.value + 2) / 12));
    setNormalizedVolume(vol);
  });

  const startRecording = useCallback(async () => {
    if (!isSpeechRecognitionAvailable) {
      setErrorModal({
        visible: true,
        title: 'Recurso indisponível',
        content:
          Platform.OS === "web"
            ? "Este navegador não oferece suporte ao reconhecimento de fala. Abra o app em um navegador compatível e permita o acesso ao microfone."
            : "O reconhecimento de fala requer uma compilação de desenvolvimento nativa (development build) e não está disponível no Expo Go.",
        onClose: () => router.back(),
      });
      return;
    }

    if (isStartingRef.current || isRecognitionActiveRef.current) {
      return;
    }

    isStartingRef.current = true;
    isCancellingRef.current = false;
    setTranscriptionText(null);
    setHasFinalTranscription(false);
    setIsProcessing(false);

    try {
      const options = {
        lang: 'pt-BR',
        interimResults: true,
        iosVoiceProcessingEnabled: true,
        volumeChangeEventOptions: {
          enabled: true,
          intervalMillis: 100,
        },
      };

      if (Platform.OS === "web") {
        ExpoSpeechRecognitionModule.start(options);
        return;
      }

      const result = await ExpoSpeechRecognitionModule.requestPermissionsAsync();
      if (!result.granted) {
        isStartingRef.current = false;
        setErrorModal({
          visible: true,
          title: 'Permissão negada',
          content: 'Permita o acesso ao microfone e reconhecimento de fala nas configurações do dispositivo para gravar e transcrever seu agendamento.',
          onClose: () => router.back(),
        });
        return;
      }

      if (!isStartingRef.current || isRecognitionActiveRef.current) {
        return;
      }

      ExpoSpeechRecognitionModule.start(options);
    } catch (error) {
      isStartingRef.current = false;
      isRecognitionActiveRef.current = false;
      setIsRecording(false);
      setIsProcessing(false);
      console.error('Failed to start speech recognition:', error);
      const errorName =
        error && typeof error === "object" && "name" in error
          ? String(error.name)
          : "";
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido.";
      setErrorModal({
        visible: true,
        title: "Não foi possível iniciar o áudio",
        content:
          Platform.OS === "web" &&
          (errorName === "NotAllowedError" || errorName === "SecurityError")
            ? "O navegador bloqueou o microfone. Inicie a gravação pelo botão e permita o acesso ao microfone nas configurações do site."
            : `Não foi possível iniciar o reconhecimento de fala. Verifique a permissão do microfone e tente novamente. (${errorMessage})`,
      });
    }
  }, [router]);

  const stopRecording = useCallback(() => {
    if (!isRecognitionActiveRef.current) {
      return;
    }

    isCancellingRef.current = false;
    setIsProcessing(true);
    ExpoSpeechRecognitionModule.stop();
  }, []);

  const cancelRecording = useCallback(() => {
    isCancellingRef.current = true;
    isStartingRef.current = false;
    isRecognitionActiveRef.current = false;
    setIsProcessing(false);
    setIsRecording(false);
    setTranscriptionText(null);
    setHasFinalTranscription(false);
    ExpoSpeechRecognitionModule.abort();
    router.back();
  }, [router]);

  const continueToConfirmation = useCallback(async () => {
    const text = transcriptionText?.trim();
    if (!text || !hasFinalTranscription || isExtracting) return;

    setIsExtracting(true);
    try {
      const response = await extractScheduleFromSpeech(text);
      router.push({
        pathname: "/(app)/confirm-schedule",
        params: { extractedSchedule: JSON.stringify(response.data) },
      });
    } catch (error) {
      console.error("Failed to extract appointment details from speech:", error);
      setErrorModal({
        visible: true,
        title: "Não foi possível interpretar",
        content: getApiErrorMessage(error),
      });
    } finally {
      setIsExtracting(false);
    }
  }, [hasFinalTranscription, isExtracting, router, transcriptionText]);

  const startRecordingRef = useRef(startRecording);
  useEffect(() => {
    startRecordingRef.current = startRecording;
  });

  useEffect(() => {
    if (!isSpeechRecognitionAvailable) {
      setErrorModal({
        visible: true,
        title: 'Recurso indisponível',
        content:
          Platform.OS === "web"
            ? "Este navegador não oferece suporte ao reconhecimento de fala. Abra o app em um navegador compatível e permita o acesso ao microfone."
            : "O reconhecimento de fala requer uma compilação de desenvolvimento nativa (development build) e não está disponível no Expo Go.",
        onClose: () => router.back(),
      });
      return;
    }

    if (Platform.OS === "web") {
      return;
    }

    const timer = setTimeout(() => {
      startRecordingRef.current();
    }, 600);
    return () => {
      clearTimeout(timer);
      ExpoSpeechRecognitionModule.abort();
    };
  }, [router]);

  return (
    <>
      <AiVoiceUI
        insets={insets}
        isRecording={isRecording}
        isTranscribing={isProcessing}
        isExtracting={isExtracting}
        transcriptionText={transcriptionText}
        hasFinalTranscription={hasFinalTranscription}
        normalizedVolume={normalizedVolume}
        onStart={startRecording}
        onStop={stopRecording}
        onCancel={cancelRecording}
        onContinue={continueToConfirmation}
      />
      <ErrorModal
        visible={errorModal.visible}
        title={errorModal.title}
        content={errorModal.content}
        onClose={() => {
          const cb = errorModal.onClose;
          setErrorModal({ visible: false, title: "", content: "" });
          cb?.();
        }}
      />
    </>
  );
}

// ─── Componente de UI compartilhado entre web e native ───────────────────────
type AiVoiceUIProps = {
  insets: { top: number; bottom: number };
  isRecording: boolean;
  isTranscribing: boolean;
  isExtracting: boolean;
  transcriptionText: string | null;
  hasFinalTranscription: boolean;
  normalizedVolume: number;
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;
  onContinue: () => void;
};

function AiVoiceUI({
  insets,
  isRecording,
  isTranscribing,
  isExtracting,
  transcriptionText,
  hasFinalTranscription,
  normalizedVolume,
  onStart,
  onStop,
  onCancel,
  onContinue,
}: AiVoiceUIProps) {
  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: Math.max(insets.top, 24),
          paddingBottom: Math.max(insets.bottom, 24),
        },
      ]}
    >
      <View style={styles.topBar}>
        <View style={styles.dragHandle} />
        <TouchableOpacity
          style={styles.closeButton}
          onPress={onCancel}
          activeOpacity={0.7}
          accessibilityLabel="Fechar tela de gravação"
          accessibilityRole="button"
        >
          <X color="#64748B" size={24} />
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.aiTag}>
          <Sparkles color="#00A8E8" size={16} />
          <Text style={styles.aiTagText}>Agendamento por voz!</Text>
        </View>

        <Text style={styles.title}>
          {isExtracting
            ? "Interpretando seu pedido..."
            : isTranscribing
            ? 'Transcrevendo áudio...'
            : isRecording
              ? "Ouvindo você..."
              : transcriptionText
                ? "Transcrição concluída"
                : "Pronto para gravar"}
        </Text>

        <Text style={styles.subtitle}>
          {isExtracting
            ? "A inteligência artificial está organizando os dados do agendamento."
            : isTranscribing
            ? 'Aguardando a transcrição do áudio.'
            : isRecording
              ? "Fale livremente o que deseja agendar (ex: dia, horário ou modalidade)."
              : transcriptionText
                ? "Confira o texto transcrito ou grave novamente se desejar."
                : "Toque no microfone para iniciar a gravação."}
        </Text>

        <View style={styles.waveformArea}>
          <View style={styles.waveformSide}>
            {BAR_BASE_HEIGHTS.map((h, i) => (
              <WaveformBar
                key={`left-${i}`}
                baseHeight={h}
                isActive={isRecording}
                normalizedVolume={normalizedVolume}
              />
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.micCircle,
              isRecording && styles.micCircleRecording,
              isTranscribing && styles.micCircleTranscribing,
            ]}
            onPress={isRecording ? onStop : onStart}
            activeOpacity={0.85}
            disabled={isTranscribing}
            accessibilityLabel={isRecording ? 'Parar gravação' : 'Iniciar gravação'}
            accessibilityRole="button"
          >
            {isTranscribing ? (
              <RefreshCw color="#FFFFFF" size={28} />
            ) : (
              <Mic color="#FFFFFF" size={32} strokeWidth={2.2} />
            )}
          </TouchableOpacity>

          <View style={styles.waveformSide}>
            {BAR_BASE_HEIGHTS.map((h, i) => (
              <WaveformBar
                key={`right-${i}`}
                baseHeight={h}
                isActive={isRecording}
                normalizedVolume={normalizedVolume}
              />
            ))}
          </View>
        </View>

        {transcriptionText && (
          <View style={styles.transcriptionCard}>
            <Text style={styles.transcriptionLabel}>Transcrição:</Text>
            <Text style={styles.transcriptionContent}>
              "{transcriptionText}"
            </Text>
          </View>
        )}
      </View>

      <View style={styles.bottomActions}>
        {isRecording ? (
          <TouchableOpacity
            style={styles.stopActionBtn}
            onPress={onStop}
            activeOpacity={0.8}
          >
            <View style={styles.stopSquare} />
            <Text style={styles.stopActionText}>Parar e transcrever</Text>
          </TouchableOpacity>
        ) : transcriptionText ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.retryActionBtn}
              onPress={onStart}
              activeOpacity={0.8}
            >
              <RefreshCw color="#0A3D62" size={18} />
              <Text style={styles.retryActionText}>Gravar novamente</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmActionBtn, isExtracting && styles.confirmActionBtnDisabled]}
              onPress={onContinue}
              disabled={isExtracting || !hasFinalTranscription}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmActionText}>
                {isExtracting
                  ? "Interpretando..."
                  : hasFinalTranscription
                    ? "Continuar"
                    : "Aguardando transcrição"}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onCancel}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelBtnText}>Cancelar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    justifyContent: "space-between",
  },
  topBar: {
    position: "relative",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  dragHandle: {
    width: 44,
    height: 5,
    backgroundColor: "#CBD5E1",
    borderRadius: 3,
    marginBottom: 10,
  },
  closeButton: {
    position: "absolute",
    top: 6,
    right: 18,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  aiTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#E0F2FE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  aiTagText: {
    color: "#0284C7",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 21,
    maxWidth: 320,
    marginBottom: 36,
  },
  waveformArea: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 120,
    marginBottom: 32,
    gap: 16,
  },
  waveformSide: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  waveBar: {
    width: 5,
    borderRadius: 3,
  },
  micCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#0A3D62",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#001F3F",
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  micCircleRecording: {
    backgroundColor: "#0A3D62",
  },
  micCircleTranscribing: {
    backgroundColor: "#64748B",
  },
  transcriptionCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginTop: 8,
  },
  transcriptionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#94A3B8",
    textTransform: "uppercase",
    marginBottom: 6,
  },
  transcriptionContent: {
    fontSize: 15,
    color: "#1E293B",
    fontStyle: "italic",
    lineHeight: 22,
  },
  bottomActions: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  stopActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#EF4444",
    paddingVertical: 15,
    borderRadius: 28,
    shadowColor: "#EF4444",
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  stopSquare: {
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: "#FFFFFF",
  },
  stopActionText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
  },
  retryActionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#E2E8F0",
    paddingVertical: 14,
    borderRadius: 28,
  },
  retryActionText: {
    color: "#0A3D62",
    fontSize: 14,
    fontWeight: "700",
  },
  confirmActionBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0A3D62",
    paddingVertical: 14,
    borderRadius: 28,
  },
  confirmActionBtnDisabled: {
    opacity: 0.6,
  },
  confirmActionText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  cancelBtnText: {
    color: "#64748B",
    fontSize: 14,
    fontWeight: "600",
  },
});
