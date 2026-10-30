import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Sparkles, X, Lightbulb } from 'lucide-react-native';
import type { AnaliseIa } from '../../models/schedule';

type AiPanelModalProps = {
  visible: boolean;
  onClose: () => void;
  analiseIa?: AnaliseIa | null;
  note?: string;
  studentName?: string;
};

export default function AiPanelModal({
  visible,
  onClose,
  analiseIa,
  note,
  studentName,
}: AiPanelModalProps) {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.iconBadge}>
                <Sparkles size={20} color="#0f567f" />
              </View>
              <View>
                <Text style={styles.title}>Dica do Treinador IA</Text>
                <Text style={styles.subtitle}>
                  {studentName ? `Análise para ${studentName}` : 'Análise personalizada'}
                </Text>
              </View>
            </View>
            <Pressable onPress={onClose} hitSlop={12} style={styles.closeButton}>
              <X size={20} color="#678193" />
            </Pressable>
          </View>

          <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
            {note ? (
              <View style={styles.quoteBox}>
                <Text style={styles.quoteLabel}>Observações do último treino:</Text>
                <Text style={styles.quoteText}>"{note}"</Text>
              </View>
            ) : null}

            {analiseIa ? (
              <>
                {analiseIa.intro ? (
                  <Text style={styles.introText}>{analiseIa.intro}</Text>
                ) : null}

                {analiseIa.tips && analiseIa.tips.length > 0 ? (
                  <View style={styles.tipsList}>
                    {analiseIa.tips.map((tip, index) => (
                      <View key={index} style={styles.tipItem}>
                        <View style={styles.tipIconWrapper}>
                          <Lightbulb size={16} color="#0f567f" />
                        </View>
                        <View style={styles.tipTextWrapper}>
                          <Text style={styles.tipTitle}>{tip.title}</Text>
                          <Text style={styles.tipDescription}>{tip.text}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ) : null}
              </>
            ) : (
              <View style={styles.placeholderBox}>
                <Sparkles size={32} color="#0f567f" style={{ marginBottom: 12 }} />
                <Text style={styles.placeholderTitle}>Treinador IA em preparação</Text>
                <Text style={styles.placeholderText}>
                  A inteligência artificial analisa o histórico de treinos e anamnese do aluno
                  para gerar recomendações personalizadas a cada aula concluída.
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.footer}>
            <Pressable style={styles.actionButton} onPress={onClose}>
              <Text style={styles.actionButtonText}>Entendido</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eef3f7',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#e3f2fd',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#173a52',
  },
  subtitle: {
    fontSize: 13,
    color: '#678193',
    marginTop: 1,
  },
  closeButton: {
    padding: 6,
    borderRadius: 20,
  },
  body: {
    maxHeight: 420,
  },
  bodyContent: {
    padding: 20,
  },
  quoteBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#0f567f',
    marginBottom: 16,
  },
  quoteLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  quoteText: {
    fontSize: 14,
    color: '#334155',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  introText: {
    fontSize: 15,
    color: '#334155',
    lineHeight: 22,
    marginBottom: 16,
  },
  tipsList: {
    gap: 12,
  },
  tipItem: {
    flexDirection: 'row',
    backgroundColor: '#f4f8fb',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#e2edf5',
  },
  tipIconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#e1effa',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  tipTextWrapper: {
    flex: 1,
  },
  tipTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#173a52',
    marginBottom: 3,
  },
  tipDescription: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 18,
  },
  placeholderBox: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 12,
  },
  placeholderTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#173a52',
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 13,
    color: '#678193',
    textAlign: 'center',
    lineHeight: 20,
  },
  footer: {
    padding: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eef3f7',
  },
  actionButton: {
    backgroundColor: '#0f567f',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
});
