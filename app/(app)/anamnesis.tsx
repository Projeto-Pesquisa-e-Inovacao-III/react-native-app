import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Ruler,
  Weight,
  HeartPulse,
  Sparkles,
  BicepsFlexed,
  ArrowLeft,
  ArrowRight,
  Check,
  Plus,
  X,
  Activity,
  FileText,
  Cross,
} from 'lucide-react-native';

import { useAuth } from '../../src/contexts/AuthContext';
import {
  createAnamnesis,
  updateAnamnesis,
  getAnamnesis,
} from '../../src/constants/anamnesis';
import type { AnamnesisData, CondicaoDto } from '../../src/models/anamnesis';
import {
  parseNumericValue,
  validateHeightWeightValues,
} from '../../src/utils/validacao';
import SuccessModal from '../../src/components/modals/SuccessModal';
import ErrorModal from '../../src/components/modals/ErrorModal';

const MIN_HEIGHT_CM = 100;
const MAX_HEIGHT_CM = 250;
const MIN_WEIGHT_KG = 25;
const MAX_WEIGHT_KG = 350;

const OBJECTIVE_OPTIONS = [
  { label: 'Emagrecimento', value: 'EMAGRECIMENTO', icon: Weight },
  { label: 'Ganho de massa', value: 'GANHO_MASSA', icon: BicepsFlexed },
  { label: 'Saúde e bem-estar', value: 'SAUDE_BEM_ESTAR', icon: HeartPulse },
  { label: 'Estética', value: 'ESTETICA', icon: Sparkles },
  { label: 'Outro', value: 'OUTRO', icon: Activity },
];

const ACTIVITY_LEVELS: Array<{
  value: AnamnesisData['nivelDeAtividade'];
  label: string;
  description: string;
}> = [
  {
    value: 'SEDENTARIO',
    label: 'Sedentário',
    description: 'Pouca ou nenhuma atividade física regular na semana.',
  },
  {
    value: 'ATIVO',
    label: 'Ativo regularmente',
    description: 'Pratica exercícios de 1 a 3 vezes por semana.',
  },
  {
    value: 'MUITO_ATIVO',
    label: 'Muito ativo',
    description: 'Exercícios físicos intensos 4 ou mais vezes por semana.',
  },
];

const DEFAULT_CONDITIONS = [
  'Diabetes',
  'Hipertensão',
  'Dores Lombares',
  'Asma/respiratório',
  'Lesões Articulares',
];

export default function AnamnesisScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { refreshAuth } = useAuth();

  const [step, setStep] = useState<1 | 2>(1);
  const [submitting, setSubmitting] = useState(false);
  const [isExisting, setIsExisting] = useState(false);

  // Formulário
  const [height, setHeight] = useState('');
  const [weight, setWeight] = useState('');
  const [objectiveValue, setObjectiveValue] = useState<string | null>(null);
  const [objectiveObservation, setObjectiveObservation] = useState('');

  const [activityLevel, setActivityLevel] = useState<AnamnesisData['nivelDeAtividade'] | null>(null);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);
  const [otherConditions, setOtherConditions] = useState<string[]>([]);
  const [newOtherTag, setNewOtherTag] = useState('');
  const [isOtherConditionChecked, setIsOtherConditionChecked] = useState(false);

  const [healthObservations, setHealthObservations] = useState('');
  const [dailyRoutine, setDailyRoutine] = useState('');

  // Erros e Modais
  const [stepOneError, setStepOneError] = useState('');
  const [stepTwoError, setStepTwoError] = useState('');
  const [openModal, setOpenModal] = useState<'success' | 'error' | null>(null);
  const [modalText, setModalText] = useState({ title: '', content: '' });

  // Verifica se o aluno já possui anamnese preenchida (edição)
  const existingQuery = useQuery({
    queryKey: ['anamnesisData'],
    queryFn: async () => {
      try {
        const res = await getAnamnesis();
        return res.data;
      } catch {
        return null;
      }
    },
    retry: false,
  });

  useEffect(() => {
    if (!existingQuery.data) return;
    const d = existingQuery.data;
    setIsExisting(true);

    if (d.altura) setHeight(String(d.altura));
    if (d.peso) setWeight(String(d.peso));

    const isPredefinedObjective = OBJECTIVE_OPTIONS.some((opt) => opt.value === d.objectivoPrincipal);
    if (isPredefinedObjective) {
      setObjectiveValue(d.objectivoPrincipal);
    } else if (d.objectivoPrincipal) {
      setObjectiveValue('OUTRO');
      setObjectiveObservation(d.objectivoPrincipal);
    }

    if (d.nivelDeAtividade) setActivityLevel(d.nivelDeAtividade);
    if (d.observacaoSaude) setHealthObservations(d.observacaoSaude);
    if (d.rotina) setDailyRoutine(d.rotina);

    if (d.condicoes && Array.isArray(d.condicoes)) {
      const standards = d.condicoes
        .filter((c: CondicaoDto) => c.tipo === 'PADRAO')
        .map((c: CondicaoDto) => c.situacao);
      const others = d.condicoes
        .filter((c: CondicaoDto) => c.tipo === 'OUTRO')
        .map((c: CondicaoDto) => c.situacao);

      setSelectedConditions(standards);
      if (others.length > 0) {
        setIsOtherConditionChecked(true);
        setOtherConditions(others);
      }
    }
  }, [existingQuery.data]);

  function handleConditionToggle(item: string) {
    if (item === 'Outro') {
      setIsOtherConditionChecked((prev) => {
        if (prev) setOtherConditions([]);
        return !prev;
      });
      return;
    }

    setSelectedConditions((prev) =>
      prev.includes(item) ? prev.filter((c) => c !== item) : [...prev, item]
    );
  }

  function handleAddOtherTag() {
    const trimmed = newOtherTag.trim();
    if (!trimmed) return;
    if (!otherConditions.includes(trimmed) && otherConditions.length < 5) {
      setOtherConditions((prev) => [...prev, trimmed]);
    }
    setNewOtherTag('');
  }

  function handleRemoveOtherTag(tag: string) {
    setOtherConditions((prev) => prev.filter((t) => t !== tag));
  }

  function handleStepOneNext() {
    if (!height.trim() || !weight.trim() || !objectiveValue) {
      setStepOneError('Preencha a altura, o peso e selecione um objetivo.');
      return;
    }

    if (objectiveValue === 'OUTRO' && !objectiveObservation.trim()) {
      setStepOneError('Descreva seu objetivo para continuar.');
      return;
    }

    const hNum = parseNumericValue(height);
    const wNum = parseNumericValue(weight);

    const valError = validateHeightWeightValues(hNum, wNum, {
      minHeightCm: MIN_HEIGHT_CM,
      maxHeightCm: MAX_HEIGHT_CM,
      minWeightKg: MIN_WEIGHT_KG,
      maxWeightKg: MAX_WEIGHT_KG,
    });

    if (valError) {
      setStepOneError(valError);
      return;
    }

    setStepOneError('');
    setStep(2);
  }

  async function handleConclude() {
    if (!activityLevel) {
      setStepTwoError('Selecione seu nível de atividade física.');
      return;
    }

    if (isOtherConditionChecked && otherConditions.length === 0) {
      setStepTwoError('Adicione pelo menos uma condição personalizada ou desmarque "Outro".');
      return;
    }

    setStepTwoError('');
    setSubmitting(true);

    const hNum = parseNumericValue(height);
    const wNum = parseNumericValue(weight);
    const finalObjective =
      objectiveValue === 'OUTRO' ? objectiveObservation.trim() : (objectiveValue || '');

    const defaultConds = selectedConditions.map((cond) => ({
      situacao: cond,
      tipo: 'PADRAO' as const,
    }));

    const otherConds = isOtherConditionChecked
      ? otherConditions.map((cond) => ({
          situacao: cond,
          tipo: 'OUTRO' as const,
        }))
      : [];

    const payload: AnamnesisData = {
      altura: hNum,
      peso: wNum,
      objectivoPrincipal: finalObjective,
      rotina: dailyRoutine.trim().length > 0 ? dailyRoutine.trim() : null,
      condicoes: [...defaultConds, ...otherConds],
      nivelDeAtividade: activityLevel,
      observacaoSaude: healthObservations.trim().length > 0 ? healthObservations.trim() : null,
    };

    try {
      if (isExisting) {
        await updateAnamnesis(payload);
      } else {
        await createAnamnesis(payload);
      }

      await refreshAuth();
      await queryClient.refetchQueries({ queryKey: ['userData'] });

      setModalText({
        title: 'Anamnese concluída!',
        content: 'Suas informações de saúde foram salvas com sucesso.',
      });
      setOpenModal('success');
    } catch (err: any) {
      console.error('Erro ao salvar anamnese:', err);
      const msg =
        err?.response?.data?.Exception ||
        err?.response?.data?.message ||
        'Não foi possível salvar a anamnese. Tente novamente.';
      setModalText({
        title: 'Houve um erro',
        content: msg,
      });
      setOpenModal('error');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, 20),
            paddingBottom: Math.max(insets.bottom, 24) + 40,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Cabeçalho */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => (step === 2 ? setStep(1) : router.back())}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color="#0F172A" />
          </TouchableOpacity>
          <View style={styles.headerTitleBox}>
            <Text style={styles.headerTitle}>Anamnese de Saúde</Text>
            <Text style={styles.headerSubtitle}>
              {step === 1 ? 'Etapa 1 de 2: Dados Físicos' : 'Etapa 2 de 2: Condições & Rotina'}
            </Text>
          </View>
        </View>

        {/* Barra de Progresso */}
        <View style={styles.progressContainer}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: step === 1 ? '50%' : '100%' },
              ]}
            />
          </View>
          <View style={styles.progressStepsRow}>
            <View style={styles.stepBadge}>
              <View style={[styles.stepCircle, styles.stepCircleActive]}>
                <Text style={styles.stepCircleText}>1</Text>
              </View>
              <Text style={styles.stepBadgeText}>Dados Físicos</Text>
            </View>

            <View style={styles.stepBadge}>
              <View
                style={[
                  styles.stepCircle,
                  step === 2 ? styles.stepCircleActive : styles.stepCircleInactive,
                ]}
              >
                <Text
                  style={[
                    styles.stepCircleText,
                    step === 2 ? styles.stepCircleTextActive : styles.stepCircleTextInactive,
                  ]}
                >
                  2
                </Text>
              </View>
              <Text
                style={[
                  styles.stepBadgeText,
                  step === 2 && { color: '#093A5D', fontWeight: '700' },
                ]}
              >
                Saúde & Rotina
              </Text>
            </View>
          </View>
        </View>

        {/* ETAPA 1 */}
        {step === 1 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <HeartPulse size={22} color="#093A5D" />
              <Text style={styles.cardTitle}>Dados Físicos & Objetivo</Text>
            </View>
            <Text style={styles.cardSubtitle}>
              Precisamos de algumas medidas básicas e do seu objetivo principal para calibrar seu treino.
            </Text>

            {/* Altura e Peso */}
            <View style={styles.measurementsRow}>
              <View style={[styles.fieldWrapper, { flex: 1 }]}>
                <Text style={styles.inputLabel}>
                  Altura (cm) <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputBox}>
                  <Ruler size={18} color="#64748B" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ex: 175"
                    keyboardType="numeric"
                    maxLength={3}
                    value={height}
                    onChangeText={(val) => {
                      setHeight(val.replace(/\D/g, ''));
                      setStepOneError('');
                    }}
                  />
                  <Text style={styles.inputUnit}>cm</Text>
                </View>
              </View>

              <View style={[styles.fieldWrapper, { flex: 1 }]}>
                <Text style={styles.inputLabel}>
                  Peso (kg) <Text style={styles.required}>*</Text>
                </Text>
                <View style={styles.inputBox}>
                  <Weight size={18} color="#64748B" />
                  <TextInput
                    style={styles.textInput}
                    placeholder="Ex: 72.5"
                    keyboardType="decimal-pad"
                    maxLength={5}
                    value={weight}
                    onChangeText={(val) => {
                      setWeight(val);
                      setStepOneError('');
                    }}
                  />
                  <Text style={styles.inputUnit}>kg</Text>
                </View>
              </View>
            </View>

            {/* Objetivo Principal */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.inputLabel}>
                Objetivo Principal <Text style={styles.required}>*</Text>
              </Text>

              <View style={styles.objectivesGrid}>
                {OBJECTIVE_OPTIONS.map((item) => {
                  const isSelected = objectiveValue === item.value;
                  const IconComp = item.icon;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      style={[styles.objectiveCard, isSelected && styles.objectiveCardSelected]}
                      onPress={() => {
                        setObjectiveValue(item.value);
                        setStepOneError('');
                      }}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.objectiveIconBox,
                          isSelected && styles.objectiveIconBoxSelected,
                        ]}
                      >
                        <IconComp size={20} color={isSelected ? '#FFFFFF' : '#093A5D'} />
                      </View>
                      <Text
                        style={[
                          styles.objectiveCardText,
                          isSelected && styles.objectiveCardTextSelected,
                        ]}
                      >
                        {item.label}
                      </Text>
                      {isSelected && <Check size={16} color="#093A5D" style={styles.checkBadge} />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Se "Outro" estiver selecionado */}
              {objectiveValue === 'OUTRO' && (
                <View style={styles.otherInputWrapper}>
                  <Text style={styles.inputLabel}>Especifique seu objetivo:</Text>
                  <TextInput
                    style={styles.otherInput}
                    placeholder="Descreva detalhadamente seu objetivo..."
                    value={objectiveObservation}
                    onChangeText={(val) => {
                      setObjectiveObservation(val);
                      setStepOneError('');
                    }}
                    maxLength={100}
                  />
                </View>
              )}
            </View>

            {/* Erro da Etapa 1 */}
            {stepOneError.length > 0 && (
              <Text style={styles.errorText}>{stepOneError}</Text>
            )}

            {/* Botão Próximo */}
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={handleStepOneNext}
              activeOpacity={0.8}
            >
              <Text style={styles.primaryBtnText}>Continuar para Etapa 2</Text>
              <ArrowRight size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* ETAPA 2 */}
        {step === 2 && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <Activity size={22} color="#093A5D" />
              <Text style={styles.cardTitle}>Condições de Saúde & Rotina</Text>
            </View>
            <Text style={styles.cardSubtitle}>
              Esses dados garantem que seus treinos respeitem seus limites físicos e disponibilidade.
            </Text>

            {/* Nível de Atividade */}
            <View style={styles.fieldWrapper}>
              <Text style={styles.inputLabel}>
                Nível de Atividade Física <Text style={styles.required}>*</Text>
              </Text>

              <View style={styles.activityList}>
                {ACTIVITY_LEVELS.map((item) => {
                  const isSelected = activityLevel === item.value;
                  return (
                    <TouchableOpacity
                      key={item.value}
                      style={[styles.activityItem, isSelected && styles.activityItemSelected]}
                      onPress={() => {
                        setActivityLevel(item.value);
                        setStepTwoError('');
                      }}
                      activeOpacity={0.8}
                    >
                      <View
                        style={[
                          styles.radioCircle,
                          isSelected && styles.radioCircleSelected,
                        ]}
                      >
                        {isSelected && <View style={styles.radioInnerCircle} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.activityLabel,
                            isSelected && styles.activityLabelSelected,
                          ]}
                        >
                          {item.label}
                        </Text>
                        <Text style={styles.activityDesc}>{item.description}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Condições de Saúde */}
            <View style={styles.fieldWrapper}>
              <View style={styles.conditionHeaderRow}>
                <Text style={styles.inputLabel}>Condições Pré-existentes</Text>
                <Text style={styles.optionalBadge}>(Opcional)</Text>
              </View>

              <View style={styles.chipsWrap}>
                {DEFAULT_CONDITIONS.map((cond) => {
                  const isSelected = selectedConditions.includes(cond);
                  return (
                    <TouchableOpacity
                      key={cond}
                      style={[styles.chip, isSelected && styles.chipSelected]}
                      onPress={() => handleConditionToggle(cond)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                        {cond}
                      </Text>
                      {isSelected && <Check size={14} color="#FFFFFF" />}
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  style={[styles.chip, isOtherConditionChecked && styles.chipSelected]}
                  onPress={() => handleConditionToggle('Outro')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.chipText,
                      isOtherConditionChecked && styles.chipTextSelected,
                    ]}
                  >
                    Outro
                  </Text>
                  {isOtherConditionChecked && <Check size={14} color="#FFFFFF" />}
                </TouchableOpacity>
              </View>

              {/* Tags de Outras Condições */}
              {isOtherConditionChecked && (
                <View style={styles.otherTagsBox}>
                  <Text style={styles.inputLabel}>
                    Especifique sua condição (máx. 5):
                  </Text>
                  <View style={styles.tagInputRow}>
                    <TextInput
                      style={styles.tagInput}
                      placeholder="Ex: Enxaqueca, Escoliose..."
                      value={newOtherTag}
                      onChangeText={setNewOtherTag}
                      onSubmitEditing={handleAddOtherTag}
                      maxLength={40}
                    />
                    <TouchableOpacity
                      style={styles.addTagBtn}
                      onPress={handleAddOtherTag}
                      activeOpacity={0.7}
                    >
                      <Plus size={18} color="#FFFFFF" />
                      <Text style={styles.addTagBtnText}>Adicionar</Text>
                    </TouchableOpacity>
                  </View>

                  {otherConditions.length > 0 && (
                    <View style={styles.tagsContainer}>
                      {otherConditions.map((tag) => (
                        <View key={tag} style={styles.tagPill}>
                          <Text style={styles.tagPillText}>{tag}</Text>
                          <TouchableOpacity
                            onPress={() => handleRemoveOtherTag(tag)}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <X size={14} color="#DC2626" />
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Observações de Saúde */}
            <View style={styles.fieldWrapper}>
              <View style={styles.conditionHeaderRow}>
                <Text style={styles.inputLabel}>Observações Médicas / Cirurgias</Text>
                <Text style={styles.optionalBadge}>(Opcional)</Text>
              </View>
              <TextInput
                style={styles.textArea}
                placeholder="Alergias, medicamentos, cirurgias passadas..."
                multiline
                numberOfLines={3}
                value={healthObservations}
                onChangeText={setHealthObservations}
                maxLength={400}
              />
            </View>

            {/* Rotina Diária */}
            <View style={styles.fieldWrapper}>
              <View style={styles.conditionHeaderRow}>
                <Text style={styles.inputLabel}>Descreva sua rotina diária</Text>
                <Text style={styles.optionalBadge}>(Opcional)</Text>
              </View>
              <TextInput
                style={styles.textArea}
                placeholder="Horários de trabalho, sono, alimentação, estresse..."
                multiline
                numberOfLines={3}
                value={dailyRoutine}
                onChangeText={setDailyRoutine}
                maxLength={400}
              />
            </View>

            {/* Erro da Etapa 2 */}
            {stepTwoError.length > 0 && (
              <Text style={styles.errorText}>{stepTwoError}</Text>
            )}

            {/* Botões de Ação */}
            <View style={styles.buttonsRow}>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => setStep(1)}
                activeOpacity={0.7}
              >
                <ArrowLeft size={18} color="#475569" />
                <Text style={styles.secondaryBtnText}>Anterior</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.primaryBtn, { flex: 1 }, submitting && styles.btnDisabled]}
                onPress={handleConclude}
                disabled={submitting}
                activeOpacity={0.8}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>
                      {isExisting ? 'Atualizar Anamnese' : 'Concluir Anamnese'}
                    </Text>
                    <Check size={18} color="#FFFFFF" />
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Modais de Feedback */}
      <SuccessModal
        visible={openModal === 'success'}
        onClose={async () => {
          setOpenModal(null);
          router.replace('/(app)/(tabs)' as any);
        }}
        title={modalText.title}
        content={modalText.content}
      />

      {openModal === 'error' && (
        <ErrorModal
          closeThen={() => setOpenModal(null)}
          title={modalText.title}
          content={modalText.content}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  container: {
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBox: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  progressContainer: {
    marginBottom: 18,
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#093A5D',
    borderRadius: 3,
  },
  progressStepsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepCircleActive: {
    backgroundColor: '#093A5D',
  },
  stepCircleInactive: {
    backgroundColor: '#CBD5E1',
  },
  stepCircleText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepCircleTextActive: {
    color: '#FFFFFF',
  },
  stepCircleTextInactive: {
    color: '#475569',
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  cardSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 18,
  },
  fieldWrapper: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6,
  },
  required: {
    color: '#EF4444',
  },
  optionalBadge: {
    fontSize: 12,
    color: '#94A3B8',
  },
  measurementsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 12,
    backgroundColor: '#F8FAFC',
    height: 48,
    gap: 8,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#0F172A',
  },
  inputUnit: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94A3B8',
  },
  objectivesGrid: {
    gap: 8,
  },
  objectiveCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#F8FAFC',
    gap: 12,
  },
  objectiveCardSelected: {
    borderColor: '#093A5D',
    backgroundColor: '#F0F9FF',
  },
  objectiveIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E0F2FE',
    alignItems: 'center',
    justifyContent: 'center',
  },
  objectiveIconBoxSelected: {
    backgroundColor: '#093A5D',
  },
  objectiveCardText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  objectiveCardTextSelected: {
    color: '#093A5D',
    fontWeight: '700',
  },
  checkBadge: {
    marginLeft: 6,
  },
  otherInputWrapper: {
    marginTop: 12,
  },
  otherInput: {
    borderWidth: 1.5,
    borderColor: '#093A5D',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    fontSize: 14,
    color: '#0F172A',
  },
  activityList: {
    gap: 10,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    padding: 14,
    backgroundColor: '#F8FAFC',
    gap: 12,
  },
  activityItemSelected: {
    borderColor: '#093A5D',
    backgroundColor: '#F0F9FF',
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#94A3B8',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  radioCircleSelected: {
    borderColor: '#093A5D',
  },
  radioInnerCircle: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#093A5D',
  },
  activityLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 2,
  },
  activityLabelSelected: {
    color: '#093A5D',
  },
  activityDesc: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 16,
  },
  conditionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipSelected: {
    backgroundColor: '#093A5D',
    borderColor: '#093A5D',
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextSelected: {
    color: '#FFFFFF',
  },
  otherTagsBox: {
    marginTop: 12,
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tagInputRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  tagInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    fontSize: 13,
  },
  addTagBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#093A5D',
    paddingHorizontal: 12,
    borderRadius: 8,
    justifyContent: 'center',
  },
  addTagBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEE2E2',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 14,
  },
  tagPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#991B1B',
  },
  textArea: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    fontSize: 14,
    color: '#0F172A',
    minHeight: 70,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 13,
    color: '#EF4444',
    fontWeight: '600',
    marginBottom: 12,
  },
  primaryBtn: {
    backgroundColor: '#093A5D',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#093A5D',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
    marginTop: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  btnDisabled: {
    opacity: 0.6,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
  },
  secondaryBtnText: {
    color: '#475569',
    fontSize: 14,
    fontWeight: '600',
  },
});
