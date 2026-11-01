import React from 'react';
import {
  ActivityIndicator,
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
  recommendationText?: string | null;
  isLoading?: boolean;
  error?: string | null;
  notice?: string | null;
  onRetry?: () => void;
  note?: string;
  studentName?: string;
};

type RecommendationSection = {
  title: string;
  type: 'summary' | 'exercises' | 'care' | 'details';
  lines: string[];
};

const RECOMMENDATION_HEADINGS = new Set([
  'objetivo do treino',
  'nivel de intensidade',
  'grupos musculares principais',
  'exercicios',
  'cuidados',
]);

const normalizeHeading = (heading: string) =>
  heading
    .replace(/:$/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const getRecommendationSectionType = (
  heading: string,
): RecommendationSection['type'] => {
  const normalizedHeading = normalizeHeading(heading);
  if (normalizedHeading === 'exercicios') return 'exercises';
  if (normalizedHeading === 'cuidados') return 'care';
  if (RECOMMENDATION_HEADINGS.has(normalizedHeading)) return 'summary';
  return 'details';
};

const parseRecommendation = (text: string) => {
  const sections: RecommendationSection[] = [];
  let currentSection: RecommendationSection | null = null;
  let hasHeading = false;

  const addSection = (title: string, type: RecommendationSection['type']) => {
    currentSection = { title, type, lines: [] };
    sections.push(currentSection);
    hasHeading = true;
  };

  text.split(/\r?\n/).forEach((rawLine) => {
    const line = rawLine.trim();
    if (!line) return;

    const markdownHeading = line.match(/^#{1,6}\s+(.+)$/);
    const boldHeading = line.match(/^\*\*(.+)\*\*:?$/);
    const plainHeading = line.replace(/:$/, '');
    const isKnownHeading = RECOMMENDATION_HEADINGS.has(
      normalizeHeading(plainHeading),
    );

    if (markdownHeading || boldHeading || isKnownHeading) {
      const title = (markdownHeading?.[1] ?? boldHeading?.[1] ?? plainHeading)
        .replace(/\*\*/g, '')
        .replace(/:$/, '')
        .trim();
      addSection(title, getRecommendationSectionType(title));
      return;
    }

    if (!currentSection) {
      addSection('', 'details');
    }
    currentSection?.lines.push(line);
  });

  return { sections, hasHeading };
};

export default function AiPanelModal({
  visible,
  onClose,
  analiseIa,
  recommendationText,
  isLoading = false,
  error,
  notice,
  onRetry,
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

            {isLoading ? (
              <View style={styles.placeholderBox}>
                <ActivityIndicator size="large" color="#0f567f" />
                <Text style={styles.placeholderTitle}>Preparando recomendação</Text>
                <Text style={styles.placeholderText}>
                  A IA está analisando a anamnese e o histórico de treinos.
                </Text>
              </View>
            ) : error ? (
              <View style={styles.placeholderBox}>
                <Text style={styles.placeholderTitle}>Não foi possível carregar</Text>
                <Text style={styles.placeholderText}>{error}</Text>
                {onRetry ? (
                  <Pressable style={styles.retryButton} onPress={onRetry}>
                    <Text style={styles.retryButtonText}>Tentar novamente</Text>
                  </Pressable>
                ) : null}
              </View>
            ) : notice ? (
              <View style={styles.placeholderBox}>
                <Sparkles size={32} color="#0f567f" style={{ marginBottom: 12 }} />
                <Text style={styles.placeholderTitle}>
                  Recomendação após aprovação
                </Text>
                <Text style={styles.placeholderText}>{notice}</Text>
              </View>
            ) : recommendationText ? (
              (() => {
                const { sections, hasHeading } =
                  parseRecommendation(recommendationText);
                if (!hasHeading) {
                  return (
                    <Text style={styles.recommendationText}>
                      {recommendationText}
                    </Text>
                  );
                }

                return (
                  <View style={styles.recommendationSections}>
                    {sections.map((section, sectionIndex) => (
                      <View
                        key={`${section.title}-${sectionIndex}`}
                        style={[
                          styles.recommendationSection,
                          section.type === 'summary' && styles.summarySection,
                        ]}
                      >
                        {section.title ? (
                          <Text style={styles.recommendationSectionTitle}>
                            {section.title}
                          </Text>
                        ) : null}
                        {section.type === 'exercises' ? (
                          <View style={styles.exerciseList}>
                            {section.lines.map((line, index) => {
                              const exercise = line.replace(/^\d+[.)]\s*/, '');
                              const [name, ...prescriptionParts] =
                                exercise.split(/\s+[-–—]\s+/);
                              const prescription = prescriptionParts.join(' - ');

                              return (
                                <View
                                  key={`${line}-${index}`}
                                  style={styles.exerciseItem}
                                >
                                  <View style={styles.exerciseNumber}>
                                    <Text style={styles.exerciseNumberText}>
                                      {index + 1}
                                    </Text>
                                  </View>
                                  <View style={styles.exerciseTextWrapper}>
                                    <Text style={styles.exerciseName}>
                                      {name}
                                    </Text>
                                    {prescription ? (
                                      <Text style={styles.exercisePrescription}>
                                        {prescription}
                                      </Text>
                                    ) : null}
                                  </View>
                                </View>
                              );
                            })}
                          </View>
                        ) : section.type === 'care' ? (
                          <View style={styles.careList}>
                            {section.lines.map((line, index) => (
                              <View key={`${line}-${index}`} style={styles.careItem}>
                                <View style={styles.careBullet} />
                                <Text style={styles.careText}>
                                  {line.replace(/^[-*•]\s*/, '')}
                                </Text>
                              </View>
                            ))}
                          </View>
                        ) : section.type === 'summary' &&
                          normalizeHeading(section.title) ===
                            'grupos musculares principais' ? (
                          <View style={styles.muscleGroupList}>
                            {section.lines
                              .join(' ')
                              .split(/[,;•]/)
                              .map((group) => group.trim())
                              .filter(Boolean)
                              .map((group, index) => (
                                <View key={`${group}-${index}`} style={styles.muscleGroupChip}>
                                  <Text style={styles.muscleGroupText}>{group}</Text>
                                </View>
                              ))}
                          </View>
                        ) : (
                          <View style={styles.detailList}>
                            {section.lines.map((line, index) => (
                              <Text
                                key={`${line}-${index}`}
                                style={styles.recommendationDetail}
                              >
                                {line.replace(/^[-*•]\s*/, '')}
                              </Text>
                            ))}
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                );
              })()
            ) : analiseIa ? (
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
                <Text style={styles.placeholderTitle}>Nenhuma recomendação disponível</Text>
                <Text style={styles.placeholderText}>
                  Abra novamente o painel para gerar uma recomendação com base na anamnese
                  e no histórico de treinos deste aluno.
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
  recommendationText: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 22,
  },
  recommendationSections: {
    gap: 12,
  },
  recommendationSection: {
    backgroundColor: '#f8fafc',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#e5edf3',
    padding: 14,
  },
  summarySection: {
    backgroundColor: '#f0f7fc',
    borderColor: '#d9eaf5',
  },
  recommendationSectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0f567f',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  detailList: {
    gap: 4,
  },
  recommendationDetail: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 21,
  },
  exerciseList: {
    gap: 8,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 10,
    gap: 10,
  },
  exerciseNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e3f2fd',
  },
  exerciseNumberText: {
    color: '#0f567f',
    fontSize: 13,
    fontWeight: '800',
  },
  exerciseTextWrapper: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#173a52',
  },
  exercisePrescription: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 2,
  },
  careList: {
    gap: 9,
  },
  careItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
  },
  careBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#0f567f',
    marginTop: 7,
  },
  careText: {
    flex: 1,
    fontSize: 13,
    color: '#334155',
    lineHeight: 20,
  },
  muscleGroupList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  muscleGroupChip: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  muscleGroupText: {
    color: '#315b73',
    fontSize: 12,
    fontWeight: '700',
  },
  retryButton: {
    backgroundColor: '#0f567f',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    marginTop: 16,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
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
