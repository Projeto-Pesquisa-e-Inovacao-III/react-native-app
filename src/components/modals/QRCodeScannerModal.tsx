import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Flashlight, FlashlightOff, X, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const SCAN_AREA_SIZE = Math.min(width * 0.72, 280);

type Props = {
  visible: boolean;
  appointmentId: number;
  studentName?: string;
  onClose: () => void;
  onSuccess: () => void;
};

/**
 * Parses and extracts appointment ID from QR code content.
 * Accepts:
 * - Direct ID number (e.g. "123")
 * - JSON format (e.g. {"agendamentoId": 123} or {"id": 123})
 * - URL format (e.g. ".../schedule-details?id=123" or ".../agendamentos/123")
 */
function extractAppointmentId(scannedData: string): number | null {
  if (!scannedData) return null;
  const trimmed = scannedData.trim();

  // 1. Direct number check
  if (/^\d+$/.test(trimmed)) {
    const parsed = parseInt(trimmed, 10);
    return isNaN(parsed) ? null : parsed;
  }

  // 2. JSON check
  try {
    const json = JSON.parse(trimmed);
    const id = json.agendamentoId ?? json.id ?? json.appointmentId;
    if (typeof id === 'number' || (typeof id === 'string' && /^\d+$/.test(id))) {
      return Number(id);
    }
  } catch {
    // Not valid JSON, continue to URL/regex
  }

  // 3. URL search params or path (e.g. id=123 or /agendamentos/123)
  const idParamMatch = trimmed.match(/[?&]id=(\d+)/i);
  if (idParamMatch && idParamMatch[1]) {
    return parseInt(idParamMatch[1], 10);
  }

  const pathMatch = trimmed.match(/agendamentos?\/(\d+)/i);
  if (pathMatch && pathMatch[1]) {
    return parseInt(pathMatch[1], 10);
  }

  return null;
}

export default function QRCodeScannerModal({
  visible,
  appointmentId,
  studentName,
  onClose,
  onSuccess,
}: Props) {
  const [permission, requestPermission] = useCameraPermissions();
  const [torch, setTorch] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  // Scanning laser animation
  const scanAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && scanStatus === 'idle') {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      scanAnim.stopAnimation();
    }
  }, [visible, scanStatus, scanAnim]);

  // Reset state when visibility changes
  useEffect(() => {
    if (visible) {
      setTorch(false);
      setIsProcessing(false);
      setScanStatus('idle');
      setErrorMessage('');
    }
  }, [visible]);

  function handleBarcodeScanned({ data }: { type: string; data: string }) {
    if (isProcessing || scanStatus !== 'idle') return;

    setIsProcessing(true);
    const scannedId = extractAppointmentId(data);
    // appointmentId às vezes chega como string (ex.: vindo de route params do
    // Expo Router), mesmo a prop sendo tipada como number. Normalizamos os dois
    // lados para number antes de comparar, senão "101" === 101 falha sempre.
    const expectedId = Number(appointmentId);

    if (__DEV__) {
      console.log('[QRCodeScannerModal] scanned:', data, '-> parsed:', scannedId, 'expected:', appointmentId, typeof appointmentId);
    }

    if (scannedId !== null && !Number.isNaN(expectedId) && scannedId === expectedId) {
      // Success!
      setScanStatus('success');
      setTimeout(() => {
        onSuccess();
      }, 700);
    } else {
      // Invalid code or different appointment
      setScanStatus('error');
      if (Number.isNaN(expectedId)) {
        setErrorMessage('Agendamento inválido para validação. Feche e tente novamente.');
      } else if (scannedId !== null) {
        setErrorMessage(`QR Code de outro agendamento (#${scannedId}). Esperado: #${expectedId}`);
      } else {
        setErrorMessage('QR Code inválido ou não reconhecido.');
      }
    }
  }

  function handleRetry() {
    setIsProcessing(false);
    setScanStatus('idle');
    setErrorMessage('');
  }

  function handleSimulateSuccess() {
    // Helpful dev fallback for emulators or testing
    setIsProcessing(true);
    setScanStatus('success');
    setTimeout(() => {
      onSuccess();
    }, 500);
  }

  const translateY = scanAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, SCAN_AREA_SIZE - 4],
  });

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        {/* Permission Request State */}
        {!permission?.granted ? (
          <View style={styles.permissionContainer}>
            <AlertCircle size={54} color="#f59e0b" style={{ marginBottom: 16 }} />
            <Text style={styles.permissionTitle}>Permissão de Câmera Necessária</Text>
            <Text style={styles.permissionText}>
              Para validar a aula com o aluno, precisamos acessar a câmera do seu dispositivo para ler o QR Code.
            </Text>

            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestPermission}
              activeOpacity={0.8}
            >
              <Text style={styles.permissionButtonText}>Conceder Permissão</Text>
            </TouchableOpacity>

            {/* Dev bypass for simulators */}
            {__DEV__ && (
              <TouchableOpacity
                style={[styles.permissionButton, styles.devButton]}
                onPress={handleSimulateSuccess}
                activeOpacity={0.8}
              >
                <Text style={styles.devButtonText}>[DEV] Simular Leitura do QR Code</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.cancelPermissionButton}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelPermissionText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Active Camera View */
          <View style={styles.cameraWrapper}>
            <CameraView
              style={StyleSheet.absoluteFillObject}
              facing="back"
              enableTorch={torch}
              barcodeScannerSettings={{
                barcodeTypes: ['qr'],
              }}
              onBarcodeScanned={isProcessing ? undefined : handleBarcodeScanned}
            />

            {/* Dark mask overlay around viewfinder */}
            <View style={styles.maskContainer}>
              {/* Top mask */}
              <View style={styles.maskSide}>
                {/* Header */}
                <View style={styles.headerRow}>
                  <TouchableOpacity
                    style={styles.headerButton}
                    onPress={onClose}
                    activeOpacity={0.8}
                  >
                    <X size={22} color="#ffffff" />
                  </TouchableOpacity>

                  <View style={styles.headerTitles}>
                    <Text style={styles.headerTitle}>Escanear QR Code</Text>
                    <Text style={styles.headerSubtitle}>
                      {studentName ? `Aluno: ${studentName}` : `Agendamento #${appointmentId}`}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.headerButton, torch && styles.headerButtonActive]}
                    onPress={() => setTorch((prev) => !prev)}
                    activeOpacity={0.8}
                  >
                    {torch ? (
                      <FlashlightOff size={22} color="#f59e0b" />
                    ) : (
                      <Flashlight size={22} color="#ffffff" />
                    )}
                  </TouchableOpacity>
                </View>

                <Text style={styles.instructionText}>
                  Aponte a câmera para o QR Code gerado no dispositivo do aluno
                </Text>
              </View>

              {/* Middle row containing cutout */}
              <View style={styles.middleRow}>
                <View style={styles.maskSide} />

                {/* Viewfinder Target */}
                <View
                  style={[
                    styles.viewfinder,
                    scanStatus === 'success' && styles.viewfinderSuccess,
                    scanStatus === 'error' && styles.viewfinderError,
                  ]}
                >
                  {/* Corner Accents */}
                  <View style={[styles.corner, styles.topLeft]} />
                  <View style={[styles.corner, styles.topRight]} />
                  <View style={[styles.corner, styles.bottomLeft]} />
                  <View style={[styles.corner, styles.bottomRight]} />

                  {/* Animated scanning line */}
                  {scanStatus === 'idle' && (
                    <Animated.View
                      style={[
                        styles.scanLine,
                        { transform: [{ translateY }] },
                      ]}
                    />
                  )}

                  {/* Status Overlay */}
                  {scanStatus === 'success' && (
                    <View style={styles.statusBadge}>
                      <CheckCircle2 size={48} color="#22c55e" />
                      <Text style={styles.statusSuccessText}>QR Code Validado!</Text>
                    </View>
                  )}

                  {scanStatus === 'error' && (
                    <View style={styles.statusBadge}>
                      <AlertCircle size={48} color="#ef4444" />
                      <Text style={styles.statusErrorText}>Código Incorreto</Text>
                    </View>
                  )}
                </View>

                <View style={styles.maskSide} />
              </View>

              {/* Bottom mask */}
              <View style={styles.maskBottom}>
                {scanStatus === 'error' ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorMessage}>{errorMessage}</Text>
                    <TouchableOpacity
                      style={styles.retryButton}
                      onPress={handleRetry}
                      activeOpacity={0.85}
                    >
                      <RefreshCw size={16} color="#ffffff" style={{ marginRight: 6 }} />
                      <Text style={styles.retryButtonText}>Tentar Novamente</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.infoBox}>
                    <Text style={styles.infoText}>
                      O QR Code confirma a presença e autoriza o preenchimento do treino realizado.
                    </Text>
                    {__DEV__ && (
                      <TouchableOpacity
                        style={styles.devQuickButton}
                        onPress={handleSimulateSuccess}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.devQuickText}>[DEV] Simular Leitura Correta</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0f18',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 28,
    backgroundColor: '#0f172a',
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 10,
  },
  permissionText: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  permissionButton: {
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  devButton: {
    backgroundColor: '#334155',
  },
  devButtonText: {
    color: '#93c5fd',
    fontSize: 13,
    fontWeight: '600',
  },
  cancelPermissionButton: {
    paddingVertical: 12,
  },
  cancelPermissionText: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  cameraWrapper: {
    flex: 1,
  },
  maskContainer: {
    flex: 1,
  },
  maskSide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Platform.OS === 'ios' ? 54 : 36,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.25)',
    borderWidth: 1,
    borderColor: '#f59e0b',
  },
  headerTitles: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#cbd5e1',
    marginTop: 2,
  },
  instructionText: {
    color: '#e2e8f0',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 32,
    marginTop: 10,
    marginBottom: 18,
  },
  middleRow: {
    flexDirection: 'row',
    height: SCAN_AREA_SIZE,
  },
  viewfinder: {
    width: SCAN_AREA_SIZE,
    height: SCAN_AREA_SIZE,
    position: 'relative',
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  viewfinderSuccess: {
    borderColor: '#22c55e',
    borderWidth: 2,
    borderRadius: 16,
  },
  viewfinderError: {
    borderColor: '#ef4444',
    borderWidth: 2,
    borderRadius: 16,
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#38bdf8',
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  scanLine: {
    height: 3,
    backgroundColor: '#38bdf8',
    width: '100%',
    shadowColor: '#38bdf8',
    shadowOpacity: 0.9,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  statusBadge: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusSuccessText: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  statusErrorText: {
    color: '#ef4444',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 8,
  },
  maskBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  infoBox: {
    alignItems: 'center',
  },
  infoText: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  devQuickButton: {
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  devQuickText: {
    color: '#93c5fd',
    fontSize: 11,
  },
  errorBox: {
    alignItems: 'center',
    width: '100%',
  },
  errorMessage: {
    color: '#f87171',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});