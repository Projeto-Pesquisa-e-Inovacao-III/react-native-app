import { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

const MUSCLE_GROUPS = [
  { value: 'PEITO', label: 'Peito' },
  { value: 'COSTAS', label: 'Costas' },
  { value: 'TRAPEZIO', label: 'Trapézio' },
  { value: 'BICEPS', label: 'Bíceps' },
  { value: 'TRICEPS', label: 'Tríceps' },
  { value: 'ANTEBRACO', label: 'Antebraço' },
  { value: 'OMBRO', label: 'Ombro' },
  { value: 'ABDOMEN', label: 'Abdômen' },
  { value: 'QUADRICEPS', label: 'Quadríceps' },
  { value: 'POSTERIOR', label: 'Posterior' },
  { value: 'GLUTEO', label: 'Glúteo' },
  { value: 'PANTURRILHA', label: 'Panturrilha' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (data: { resumo: string; grupoMuscular: string[] }) => void | Promise<void>;
};

export default function ConcludeAppointmentModal({ visible, onClose, onSubmit }: Props) {
  const [resumo, setResumo] = useState('');
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function reset() {
    setResumo('');
    setSelectedMuscles([]);
    setError('');
    setLoading(false);
  }

  function toggleMuscle(value: string) {
    setError('');
    setSelectedMuscles((prev) =>
      prev.includes(value) ? prev.filter((m) => m !== value) : [...prev, value],
    );
  }

  async function handleSubmit() {
    if (!resumo.trim()) {
      setError('O resumo é obrigatório.');
      return;
    }
    if (selectedMuscles.length === 0) {
      setError('Selecione pelo menos um grupo muscular.');
      return;
    }
    setLoading(true);
    try {
      await onSubmit({ resumo: resumo.trim(), grupoMuscular: selectedMuscles });
      reset();
      onClose();
    } catch {
      setError('Erro ao concluir agendamento. Tente novamente.');
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
          <Text style={styles.title}>Conclusão de Agendamento</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Resumo */}
            <Text style={styles.label}>
              Resumo da Aula <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.textarea}
              placeholder="Descreva brevemente como foi a aula, desempenho do aluno, etc."
              placeholderTextColor="#9ca3af"
              value={resumo}
              onChangeText={(v) => { setResumo(v); setError(''); }}
              multiline
              numberOfLines={4}
              maxLength={200}
              textAlignVertical="top"
            />
            <Text style={styles.charCount}>{resumo.length}/200</Text>

            {/* Grupos musculares */}
            <Text style={[styles.label, { marginTop: 16 }]}>
              Grupos Musculares Trabalhados <Text style={styles.required}>*</Text>
            </Text>
            <Text style={styles.hint}>Toque para selecionar:</Text>
            <View style={styles.muscleGrid}>
              {MUSCLE_GROUPS.map((m) => {
                const selected = selectedMuscles.includes(m.value);
                return (
                  <TouchableOpacity
                    key={m.value}
                    style={[styles.muscleChip, selected && styles.muscleChipSelected]}
                    onPress={() => toggleMuscle(m.value)}
                  >
                    <Text style={[styles.muscleChipText, selected && styles.muscleChipTextSelected]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {error ? <Text style={styles.error}>{error}</Text> : null}
          </ScrollView>

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
              <Text style={styles.submitText}>{loading ? 'Salvando…' : 'Concluir'}</Text>
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
    maxHeight: '90%',
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
    marginBottom: 6,
  },
  required: {
    color: '#dc2626',
  },
  textarea: {
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#111827',
    minHeight: 100,
  },
  charCount: {
    fontSize: 11,
    color: '#9ca3af',
    textAlign: 'right',
    marginTop: 4,
  },
  hint: {
    fontSize: 12,
    color: '#6b7280',
    marginBottom: 8,
  },
  muscleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  muscleChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
  },
  muscleChipSelected: {
    backgroundColor: '#192633',
    borderColor: '#192633',
  },
  muscleChipText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
  },
  muscleChipTextSelected: {
    color: '#fff',
    fontWeight: '700',
  },
  error: {
    color: '#dc2626',
    fontSize: 13,
    marginTop: 10,
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
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
    backgroundColor: '#16a34a',
    alignItems: 'center',
  },
  disabled: { opacity: 0.5 },
  submitText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#fff',
  },
});
