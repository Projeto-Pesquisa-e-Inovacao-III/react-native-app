import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mic, Square, X, Sparkles, RefreshCw } from 'lucide-react-native';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

export default function AiVoiceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(audioRecorder);
  const isRecording = recorderState.isRecording;

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionText, setTranscriptionText] = useState<string | null>(null);
  const [hasStartedOnce, setHasStartedOnce] = useState(false);

  const pulseAnim1 = useRef(new Animated.Value(1)).current;
  const pulseAnim2 = useRef(new Animated.Value(1)).current;
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  const startPulse = useCallback(() => {
    pulseLoop.current = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseAnim1, {
            toValue: 1.35,
            duration: 900,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim1, {
            toValue: 1,
            duration: 900,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(pulseAnim2, {
            toValue: 1.6,
            duration: 1200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim2, {
            toValue: 1,
            duration: 1200,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );
    pulseLoop.current.start();
  }, [pulseAnim1, pulseAnim2]);

  const stopPulse = useCallback(() => {
    pulseLoop.current?.stop();
    Animated.timing(pulseAnim1, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
    Animated.timing(pulseAnim2, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [pulseAnim1, pulseAnim2]);

  const startRecording = useCallback(async () => {
    try {
      setTranscriptionText(null);
      setIsTranscribing(false);

      const status = await AudioModule.requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert(
          'Permissão negada',
          'Permita o acesso ao microfone nas configurações do dispositivo para gravar seu agendamento.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
      });

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      setHasStartedOnce(true);
      startPulse();
    } catch (error) {
      console.error('Erro ao iniciar gravação:', error);
      Alert.alert('Erro', 'Não foi possível iniciar a gravação de áudio.');
    }
  }, [audioRecorder, router, startPulse]);

  const stopRecording = useCallback(async () => {
    try {
      await audioRecorder.stop();
      stopPulse();
      setIsTranscribing(true);

      setTimeout(() => {
        setIsTranscribing(false);
        setTranscriptionText('Gostaria de agendar uma aula presencial com meu personal...');
      }, 1500);
    } catch (error) {
      console.error('Erro ao finalizar gravação:', error);
      stopPulse();
      setIsTranscribing(false);
    }
  }, [audioRecorder, stopPulse]);

  useEffect(() => {
    const timer = setTimeout(() => {
      startRecording();
    }, 400);

    return () => {
      clearTimeout(timer);
      stopPulse();
      try {
        if (audioRecorder.isRecording) {
          audioRecorder.stop();
        }
      } catch {
      }
    };
  }, []);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 24), paddingBottom: Math.max(insets.bottom, 24) }]}>
      <View style={styles.topBar}>
        <View style={styles.dragHandle} />
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
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
          <Text style={styles.aiTagText}>IA Voice Assistant</Text>
        </View>

        <Text style={styles.title}>
          {isTranscribing
            ? 'Transcrevendo áudio...'
            : isRecording
            ? 'Ouvindo você...'
            : transcriptionText
            ? 'Transcrição concluída'
            : 'Pronto para gravar'}
        </Text>

        <Text style={styles.subtitle}>
          {isTranscribing
            ? 'Nossa inteligência artificial está processando sua fala.'
            : isRecording
            ? 'Fale livremente o que deseja agendar (ex: dia, horário ou modalidade).'
            : transcriptionText
            ? 'Confira o texto transcrito ou grave novamente se desejar.'
            : 'Toque no microfone para iniciar a gravação.'}
        </Text>

        <View style={styles.micArea}>
          {isRecording && (
            <>
              <Animated.View
                style={[
                  styles.pulseRing,
                  { transform: [{ scale: pulseAnim2 }], opacity: 0.18 },
                ]}
              />
              <Animated.View
                style={[
                  styles.pulseRing,
                  { transform: [{ scale: pulseAnim1 }], opacity: 0.28 },
                ]}
              />
            </>
          )}

          <TouchableOpacity
            style={[
              styles.micCircle,
              isRecording && styles.micCircleRecording,
              isTranscribing && styles.micCircleTranscribing,
            ]}
            onPress={isRecording ? stopRecording : startRecording}
            activeOpacity={0.85}
            disabled={isTranscribing}
          >
            {isRecording ? (
              <Square color="#FFFFFF" size={32} fill="#FFFFFF" />
            ) : isTranscribing ? (
              <RefreshCw color="#FFFFFF" size={32} />
            ) : (
              <Mic color="#FFFFFF" size={38} strokeWidth={2.2} />
            )}
          </TouchableOpacity>
        </View>

        {transcriptionText && (
          <View style={styles.transcriptionCard}>
            <Text style={styles.transcriptionLabel}>Transcrição:</Text>
            <Text style={styles.transcriptionContent}>"{transcriptionText}"</Text>
          </View>
        )}
      </View>

      <View style={styles.bottomActions}>
        {isRecording ? (
          <TouchableOpacity
            style={styles.stopActionBtn}
            onPress={stopRecording}
            activeOpacity={0.8}
          >
            <Square color="#FFFFFF" size={18} fill="#FFFFFF" />
            <Text style={styles.stopActionText}>Parar e transcrever</Text>
          </TouchableOpacity>
        ) : transcriptionText ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.retryActionBtn}
              onPress={startRecording}
              activeOpacity={0.8}
            >
              <RefreshCw color="#0A3D62" size={18} />
              <Text style={styles.retryActionText}>Gravar novamente</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.confirmActionBtn}
              onPress={() => {
                Alert.alert(
                  'Agendamento',
                  'Integração com o serviço de agendamento por IA em andamento!',
                  [{ text: 'OK', onPress: () => router.back() }]
                );
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmActionText}>Continuar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={() => router.back()}
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
    backgroundColor: '#F8FAFC',
    justifyContent: 'space-between',
  },
  topBar: {
    position: 'relative',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  dragHandle: {
    width: 44,
    height: 5,
    backgroundColor: '#CBD5E1',
    borderRadius: 3,
    marginBottom: 10,
  },
  closeButton: {
    position: 'absolute',
    top: 6,
    right: 18,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E0F2FE',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 16,
  },
  aiTagText: {
    color: '#0284C7',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 21,
    maxWidth: 320,
    marginBottom: 36,
  },
  micArea: {
    width: 180,
    height: 180,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 28,
  },
  pulseRing: {
    position: 'absolute',
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#0A3D62',
  },
  micCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#0A3D62',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#001F3F',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  micCircleRecording: {
    backgroundColor: '#EF4444',
  },
  micCircleTranscribing: {
    backgroundColor: '#64748B',
  },
  transcriptionCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
    marginTop: 8,
  },
  transcriptionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94A3B8',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  transcriptionContent: {
    fontSize: 15,
    color: '#1E293B',
    fontStyle: 'italic',
    lineHeight: 22,
  },
  bottomActions: {
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  stopActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#EF4444',
    paddingVertical: 15,
    borderRadius: 28,
    shadowColor: '#EF4444',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  stopActionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  retryActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#E2E8F0',
    paddingVertical: 14,
    borderRadius: 28,
  },
  retryActionText: {
    color: '#0A3D62',
    fontSize: 14,
    fontWeight: '700',
  },
  confirmActionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0A3D62',
    paddingVertical: 14,
    borderRadius: 28,
  },
  confirmActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  cancelBtnText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
});
