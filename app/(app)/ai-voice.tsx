import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Mic, X, Sparkles, RefreshCw } from 'lucide-react-native';
import {
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
  useAudioStream,
} from 'expo-audio';

const BAR_BASE_HEIGHTS = [28, 44, 60, 36, 52, 40, 24];

function rmsFromBuffer(buffer: ArrayBuffer): number {
  const samples = new Float32Array(buffer);
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    sum += samples[i] * samples[i];
  }
  const rms = Math.sqrt(sum / samples.length);
  return Math.min(1, Math.pow(rms * 4, 0.5));
}

type WaveformBarProps = {
  baseHeight: number;
  isActive: boolean;
  normalizedVolume: number;
};

function WaveformBar({ baseHeight, isActive, normalizedVolume }: WaveformBarProps) {
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
          backgroundColor: '#0A3D62',
          transform: [{ scaleY: animVal }],
          opacity: isActive ? 1 : 0.25,
        },
      ]}
    />
  );
}

const RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
};

export default function AiVoiceScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const audioRecorder = useAudioRecorder(RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(audioRecorder, 80);
  const isRecording = recorderState.isRecording;

  const [normalizedVolume, setNormalizedVolume] = useState(0);
  const { stream } = useAudioStream({
    channels: 1,
    sampleRate: 16000,
    encoding: 'float32',
    onBuffer: (buffer) => {
      if (!buffer?.data) return;
      setNormalizedVolume(rmsFromBuffer(buffer.data));
    },
  });

  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionText, setTranscriptionText] = useState<string | null>(null);

  const startRecording = useCallback(async () => {
    try {
      setTranscriptionText(null);
      setIsTranscribing(false);

      const status = await requestRecordingPermissionsAsync();
      if (!status.granted) {
        Alert.alert(
          'Permissão negada',
          'Permita o acesso ao microfone nas configurações do dispositivo para gravar seu agendamento.',
          [{ text: 'OK', onPress: () => router.back() }]
        );
        return;
      }

      if (Platform.OS === 'ios') {
        await setAudioModeAsync({
          playsInSilentMode: true,
          allowsRecording: true,
        });
      }

      await stream.start();

      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      console.error('Erro ao iniciar gravação:', error);
      Alert.alert('Erro ao gravar', message || 'Não foi possível iniciar a gravação de áudio.');
    }
  }, [audioRecorder, stream, router]);

  const stopRecording = useCallback(async () => {
    try {
      stream.stop();
      setNormalizedVolume(0);
      await audioRecorder.stop();
      setIsTranscribing(true);

      setTimeout(() => {
        setIsTranscribing(false);
        setTranscriptionText('Gostaria de agendar uma aula presencial com meu personal...');
      }, 1500);
    } catch (error) {
      console.error('Erro ao finalizar gravação:', error);
      setIsTranscribing(false);
    }
  }, [audioRecorder, stream]);

  const startRecordingRef = useRef(startRecording);
  useEffect(() => {
    startRecordingRef.current = startRecording;
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      startRecordingRef.current();
    }, 600);

    return () => {
      clearTimeout(timer);
      try {
        stream.stop();
        if (audioRecorder.isRecording) {
          audioRecorder.stop();
        }
      } catch {
      }
    };
  }, [audioRecorder, stream]);

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
          <Text style={styles.aiTagText}>Agendamento por voz!</Text>
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
            onPress={isRecording ? stopRecording : startRecording}
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
            <View style={styles.stopSquare} />
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
    paddingHorizontal: 20,
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
  waveformArea: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 120,
    marginBottom: 32,
    gap: 16,
  },
  waveformSide: {
    flexDirection: 'row',
    alignItems: 'center',
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
    backgroundColor: '#0A3D62',
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
    gap: 10,
    backgroundColor: '#EF4444',
    paddingVertical: 15,
    borderRadius: 28,
    shadowColor: '#EF4444',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  stopSquare: {
    width: 14,
    height: 14,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
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
