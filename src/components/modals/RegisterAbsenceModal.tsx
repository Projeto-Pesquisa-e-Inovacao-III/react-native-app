import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { type: string; description: string }) => void | Promise<void>;
};

const ABSENCE_TYPES = ['Aluno', 'Personal'];

export default function RegisterAbsenceModal({ visible, onClose, onSubmit }: Props) {
  const [selectedType, setSelectedType] = useState<'Aluno' | 'Personal'>('Aluno');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  function reset() {
    setSelectedType('Aluno');
    setDescription('');
    setLoading(false);
  }

  async function handleSubmit() {
    setLoading(true);
    try {
      await onSubmit({ type: selectedType.toUpperCase(), description });
      reset();
      onClose();
    } catch {
      setLoading(false);
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => { reset(); onClose(); }}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.card}>
          <Text style={styles.title}>Registrar Ausência</Text>

          {/* Tipo de ausência */}
          <Text style={styles.label}>Tipo de ausência:</Text>
          <View style={styles.typeRow}>
            {ABSENCE_TYPES.map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.typeChip, selectedType === t && styles.typeChipActive]}
                onPress={() => setSelectedType(t as 'Aluno' | 'Personal')}
              >
                <Text style={[styles.typeChipText, selectedType === t && styles.typeChipTextActive]}>
                  {t}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Motivo */}
          <Text style={[styles.label, { marginTop: 16 }]}>
            Motivo {selectedType === 'Aluno' ? '(opcional):' : ':'}
          </Text>
          <TextInput
            style={styles.textarea}
            placeholder={
              selectedType === 'Aluno'
                ? 'Deixe vazio se não for justificado…'
                : 'Descreva o motivo da ausência…'
            }
            placeholderTextColor="#9ca3af"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />

          {/* Buttons */}
          <View style={styles.buttons}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => { reset(); onClose(); }}
              disabled={loading}
            >
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.disabled]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitText}>{loading ? 'Enviando…' : 'Registrar'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  typeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  typeChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
  },
  typeChipActive: {
    backgroundColor: '#192633',
    borderColor: '#192633',
  },
  typeChipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  typeChipTextActive: {
    color: '#fff',
  },
  textarea: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 90,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 13,
    borderRadius: 10,
    backgroundColor: '#dc2626',
    alignItems: 'center',
  },
  disabled: { opacity: 0.5 },
  submitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
