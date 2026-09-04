import React from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { X, QrCode, Calendar, Clock, MapPin, CheckCircle2 } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const QR_MODAL_SIZE = Math.min(width * 0.65, 230);

export type AppointmentForQr = {
  id: number;
  name: string;
  type: string;
  start: string;
  end: string;
  address: string;
};

type Props = {
  visible: boolean;
  appointment: AppointmentForQr | null;
  onClose: () => void;
};

function formatTime(isoString: string) {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
  } catch {
    return '--:--';
  }
}

function formatDate(isoString: string) {
  try {
    const d = new Date(isoString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return '';
  }
}

export default function QRCodeDisplayModal({ visible, appointment, onClose }: Props) {
  if (!appointment) return null;

  // Formato padronizado aceito pelo QRCodeScannerModal (JSON com agendamentoId)
  const qrPayload = JSON.stringify({
    agendamentoId: appointment.id,
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.iconCircle}>
                <QrCode size={20} color="#19587A" />
              </View>
              <View>
                <Text style={styles.title}>QR Code de Aprovação</Text>
                <Text style={styles.subtitle}>Validação do treino</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
              <X size={20} color="#667085" />
            </TouchableOpacity>
          </View>

          {/* Info Card */}
          <View style={styles.infoBox}>
            <View style={styles.infoRow}>
              <Text style={styles.infoPersonal}>{appointment.name}</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{appointment.type}</Text>
              </View>
            </View>

            <View style={styles.metaRow}>
              <Calendar size={14} color="#667085" />
              <Text style={styles.metaText}>{formatDate(appointment.start)}</Text>
            </View>

            <View style={styles.metaRow}>
              <Clock size={14} color="#667085" />
              <Text style={styles.metaText}>
                {formatTime(appointment.start)} - {formatTime(appointment.end)}
              </Text>
            </View>

            {appointment.address ? (
              <View style={styles.metaRow}>
                <MapPin size={14} color="#667085" />
                <Text style={styles.metaText} numberOfLines={1}>
                  {appointment.address}
                </Text>
              </View>
            ) : null}
          </View>

          {/* QR Code Container */}
          <View style={styles.qrWrapper}>
            <View style={styles.qrFrame}>
              <QRCode
                value={qrPayload}
                size={QR_MODAL_SIZE}
                color="#0F172A"
                backgroundColor="#FFFFFF"
              />
            </View>
            <Text style={styles.qrIdLabel}>Agendamento #{appointment.id}</Text>
          </View>

          {/* Instructions */}
          <View style={styles.instructionBox}>
            <CheckCircle2 size={16} color="#127B49" style={{ marginTop: 2 }} />
            <Text style={styles.instructionText}>
              Apresente este QR Code ao personal trainer. Ele irá escanear pelo celular dele para validar a presença e concluir a aula.
            </Text>
          </View>

          {/* Action */}
          <TouchableOpacity style={styles.doneButton} onPress={onClose} activeOpacity={0.9}>
            <Text style={styles.doneButtonText}>Fechar</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 22,
    width: '100%',
    maxWidth: 380,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EEF4FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  closeButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  infoBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoPersonal: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1E293B',
  },
  badge: {
    backgroundColor: '#EEF4FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#19587A',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    color: '#475467',
    flexShrink: 1,
  },
  qrWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  qrFrame: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  qrIdLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 10,
    letterSpacing: 0.5,
  },
  instructionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  instructionText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: '#166534',
    fontWeight: '500',
  },
  doneButton: {
    backgroundColor: '#19587A',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
