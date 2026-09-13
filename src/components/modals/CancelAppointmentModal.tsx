import { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { X } from 'lucide-react-native';

export type CancelAppointmentData = {
  id: number;
  agendamentoId?: number;
  name: string;
  type: string;
  start: string;
  end?: string;
  address: string;
};

type Props = {
  visible: boolean;
  appointment: CancelAppointmentData | null;
  onClose: () => void;
  onConfirm: (id: number) => Promise<void> | void;
  userLabel?: string;
  title?: string;
  subtitle?: string;
  confirmText?: string;
  countdownSeconds?: number;
};

function formatDate(iso: string) {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return iso;
  }
}

function formatTime(startIso: string, endIso?: string) {
  if (!startIso) return '';
  try {
    const dStart = new Date(startIso);
    const startStr = new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(dStart);

    if (!endIso) return startStr;
    const dEnd = new Date(endIso);
    const endStr = new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(dEnd);

    return `${startStr} - ${endStr}`;
  } catch {
    return '';
  }
}

export default function CancelAppointmentModal({
  visible,
  appointment,
  onClose,
  onConfirm,
  userLabel = 'Aluno',
  title = 'Cancelar agendamento',
  subtitle = 'Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.',
  confirmText = 'Cancelar agendamento',
  countdownSeconds = 3,
}: Props) {
  const [countdown, setCountdown] = useState(countdownSeconds);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      setCountdown(countdownSeconds);
      setLoading(false);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 18, stiffness: 280 }),
      ]).start();

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    } else {
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.9);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }, [visible, countdownSeconds]);

  if (!visible) return null;

  const targetId = appointment?.agendamentoId ?? appointment?.id;

  async function handleConfirm() {
    if (!targetId || loading) return;
    setLoading(true);
    try {
      await onConfirm(targetId);
    } finally {
      setLoading(false);
    }
  }

  function handleClose() {
    if (loading) return;
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
      Animated.timing(scaleAnim, { toValue: 0.9, duration: 180, useNativeDriver: true }),
    ]).start(() => {
      onClose();
    });
  }

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose} statusBarTranslucent>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          {/* Ícone de aviso destrutivo */}
          <View style={styles.iconWrapper}>
            <View style={styles.iconBg}>
              <X size={28} color="#B42318" />
            </View>
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          {/* Dados do agendamento */}
          {appointment && (
            <View style={styles.infoBox}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>{userLabel}</Text>
                <Text style={styles.infoValue} numberOfLines={1}>{appointment.name}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Tipo</Text>
                <Text style={styles.infoValue}>{appointment.type}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Data</Text>
                <Text style={styles.infoValue}>{formatDate(appointment.start)}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Horário</Text>
                <Text style={styles.infoValue}>
                  {formatTime(appointment.start, appointment.end)}
                </Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Local</Text>
                <Text style={[styles.infoValue, { flexShrink: 1, textAlign: 'right', maxWidth: '65%' }]}>
                  {appointment.address || 'Local não informado'}
                </Text>
              </View>
            </View>
          )}

          {/* Countdown timer */}
          {countdown > 0 && (
            <View style={styles.countdownRow}>
              <View style={styles.countdownBadge}>
                <Text style={styles.countdownText}>{countdown}</Text>
              </View>
              <Text style={styles.countdownHint}>Aguarde para confirmar</Text>
            </View>
          )}

          {/* Botões de ação */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.backBtn}
              onPress={handleClose}
              disabled={loading}
              activeOpacity={0.8}
            >
              <Text style={styles.backText}>Voltar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.confirmBtn,
                (countdown > 0 || loading) && styles.confirmBtnDisabled,
              ]}
              onPress={handleConfirm}
              disabled={countdown > 0 || loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.confirmText}>{confirmText}</Text>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 24,
    width: '100%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  iconWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  iconBg: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEE4E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 18,
  },
  infoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  infoValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1E293B',
  },
  infoDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  countdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    backgroundColor: '#FFF6D9',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  countdownBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F59E0B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  countdownText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 15,
  },
  countdownHint: {
    color: '#8A6300',
    fontSize: 13,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  backBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 14,
  },
  confirmBtn: {
    flex: 2,
    backgroundColor: '#B42318',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: '#D1D5DB',
  },
  confirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});
