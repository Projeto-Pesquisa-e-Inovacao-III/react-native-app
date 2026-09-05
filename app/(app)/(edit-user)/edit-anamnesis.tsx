import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Activity, ArrowLeft, Check, FileText, HeartPulse, Ruler, Undo2, Weight, X } from 'lucide-react-native';
import { getAnamnesis, updateAnamnesis } from '../../../src/constants/anamnesis';
import type { AnamnesisData, CondicaoDto } from '../../../src/models/anamnesis';
import { parseNumericValue, validateHeightWeightValues } from '../../../src/utils/validacao';

const CONDITIONS = ['Diabetes', 'Hipertensão', 'Dores Lombares', 'Asma/respiratório', 'Lesões Articulares'];
const OBJECTIVES = [
  { label: 'Ganho de massa muscular', value: 'GANHO_MASSA' },
  { label: 'Perda de peso', value: 'EMAGRECIMENTO' },
  { label: 'Saúde e bem-estar', value: 'SAUDE_BEM_ESTAR' },
  { label: 'Estética', value: 'ESTETICA' },
];
const ACTIVITIES = [
  { value: 'SEDENTARIO' as const, label: 'Sedentário', description: 'Pouco ou nenhum exercício.' },
  { value: 'ATIVO' as const, label: 'Ativo ocasionalmente', description: 'Exercício físico 3 a 5 dias por semana.' },
  { value: 'MUITO_ATIVO' as const, label: 'Ativo regularmente', description: 'Treinos intensos ou trabalho físico pesado.' },
];

const emptyData: AnamnesisData = {
  altura: 0,
  peso: 0,
  objectivoPrincipal: '',
  rotina: '',
  condicoes: [],
  nivelDeAtividade: 'SEDENTARIO',
  observacaoSaude: '',
};

export default function EditAnamnesisScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState<AnamnesisData>(emptyData);
  const [otherCondition, setOtherCondition] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ altura?: string; peso?: string }>({});

  const query = useQuery<AnamnesisData>({
    queryKey: ['anamnesisInfo'],
    queryFn: async () => (await getAnamnesis()).data,
  });

  useEffect(() => {
    if (query.data) setForm(query.data);
  }, [query.data]);

  const otherConditions = form.condicoes.filter((condition) => condition.tipo === 'OUTRO');
  const isOtherSelected = otherConditions.length > 0;
  const isKnownObjective = OBJECTIVES.some((objective) => objective.value === form.objectivoPrincipal);

  function updateField<K extends keyof AnamnesisData>(field: K, value: AnamnesisData[K]) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function toggleCondition(situacao: string) {
    setForm((previous) => {
      const exists = previous.condicoes.some((condition) => condition.situacao === situacao && condition.tipo === 'PADRAO');
      return {
        ...previous,
        condicoes: exists
          ? previous.condicoes.filter((condition) => !(condition.situacao === situacao && condition.tipo === 'PADRAO'))
          : [...previous.condicoes, { situacao, tipo: 'PADRAO' }],
      };
    });
  }

  function toggleOther() {
    if (isOtherSelected) {
      updateField('condicoes', form.condicoes.filter((condition) => condition.tipo !== 'OUTRO'));
    } else if (otherCondition.trim()) {
      addOtherCondition();
    }
  }

  function addOtherCondition() {
    const value = otherCondition.trim();
    if (!value || otherConditions.some((condition) => condition.situacao === value)) return;
    if (otherConditions.length >= 5) return;
    updateField('condicoes', [...form.condicoes, { situacao: value, tipo: 'OUTRO' }]);
    setOtherCondition('');
  }

  function removeOtherCondition(condition: CondicaoDto) {
    updateField('condicoes', form.condicoes.filter((item) => item !== condition));
  }

  async function handleSave() {
    const validation = validateHeightWeightValues(Number(form.altura), Number(form.peso), {
      minHeightCm: 100,
      maxHeightCm: 250,
      minWeightKg: 25,
      maxWeightKg: 350,
    });
    if (validation) {
      const nextErrors: { altura?: string; peso?: string } = {};
      if (Number(form.altura) < 100 || Number(form.altura) > 250) nextErrors.altura = 'Altura deve estar entre 100 e 250 cm.';
      if (Number(form.peso) < 25 || Number(form.peso) > 350) nextErrors.peso = 'Peso deve estar entre 25 e 350 kg.';
      setErrors(nextErrors);
      return;
    }

    setSaving(true);
    try {
      await updateAnamnesis({
        ...form,
        altura: parseNumericValue(String(form.altura)),
        peso: parseNumericValue(String(form.peso)),
        rotina: form.rotina?.trim() || null,
        observacaoSaude: form.observacaoSaude?.trim() || null,
      });
      Alert.alert('Anamnese atualizada!', 'Suas informações foram atualizadas com sucesso.', [
        { text: 'OK', onPress: () => router.replace('/(app)/(tabs)') },
      ]);
    } catch {
      Alert.alert('Erro ao atualizar anamnese', 'Ocorreu um erro. Tente novamente mais tarde.');
    } finally {
      setSaving(false);
    }
  }

  function handleUndo() {
    if (query.data) setForm(query.data);
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: Math.max(insets.top, 18), paddingBottom: Math.max(insets.bottom, 28) + 70 }]}
        refreshControl={<RefreshControl refreshing={query.isFetching} onRefresh={() => query.refetch()} colors={['#093A5D']} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.cardTitleRow}><HeartPulse size={22} color="#093A5D" /><Text style={styles.cardTitle}>Anamnese / Saúde</Text></View>

          {query.isLoading ? <ActivityIndicator size="large" color="#093A5D" style={styles.loader} /> : (
            <>
              <SectionTitle title="Dados pessoais" />
              <View style={styles.row}>
                <NumberField label="Altura (cm)" icon={<Ruler size={18} color="#64748B" />} value={String(form.altura || '')} onChangeText={(value) => updateField('altura', Number(value.replace(/\D/g, '').slice(0, 3)))} error={errors.altura} />
                <NumberField label="Peso (kg)" icon={<Weight size={18} color="#64748B" />} value={String(form.peso || '')} onChangeText={(value) => updateField('peso', Number(value.replace(',', '.').replace(/[^0-9.]/g, '').slice(0, 6)))} error={errors.peso} />
              </View>

              <SectionTitle title="Objetivo principal" />
              <View style={styles.optionGrid}>
                {OBJECTIVES.map((objective) => <Choice key={objective.value} label={objective.label} selected={form.objectivoPrincipal === objective.value} onPress={() => updateField('objectivoPrincipal', objective.value)} />)}
                <Choice label="Outro" selected={!isKnownObjective} onPress={() => updateField('objectivoPrincipal', isKnownObjective ? '' : form.objectivoPrincipal)} />
              </View>
              {!isKnownObjective && <Field label="Descreva seu objetivo" icon={<FileText size={18} color="#64748B" />} value={form.objectivoPrincipal} onChangeText={(value) => updateField('objectivoPrincipal', value.slice(0, 50))} />}

              <SectionTitle title="Nível de atividade atual" />
              {ACTIVITIES.map((activity) => <TouchableOpacity key={activity.value} style={[styles.activityOption, form.nivelDeAtividade === activity.value && styles.activityOptionSelected]} onPress={() => updateField('nivelDeAtividade', activity.value)}><View style={styles.radio}>{form.nivelDeAtividade === activity.value && <View style={styles.radioFill} />}</View><View><Text style={styles.optionLabel}>{activity.label}</Text><Text style={styles.optionDescription}>{activity.description}</Text></View></TouchableOpacity>)}

              <SectionTitle title="Condições de saúde" />
              <View style={styles.optionGrid}>
                {CONDITIONS.map((condition) => <Choice key={condition} label={condition} selected={form.condicoes.some((item) => item.situacao === condition && item.tipo === 'PADRAO')} onPress={() => toggleCondition(condition)} checkbox />)}
                <Choice label="Outro" selected={isOtherSelected} onPress={toggleOther} checkbox />
              </View>
              {isOtherSelected && <View style={styles.otherBox}><View style={styles.tagRow}>{otherConditions.map((condition) => <View key={condition.situacao} style={styles.tag}><Text style={styles.tagText}>{condition.situacao}</Text><TouchableOpacity onPress={() => removeOtherCondition(condition)}><X size={14} color="#0C6291" /></TouchableOpacity></View>)}</View><View style={styles.addOtherRow}><TextInput style={styles.input} placeholder="Ex: Enxaqueca crônica" value={otherCondition} onChangeText={setOtherCondition} /><TouchableOpacity style={styles.addButton} onPress={addOtherCondition}><Text style={styles.addButtonText}>Adicionar</Text></TouchableOpacity></View></View>}

              <SectionTitle title="Observações de saúde (opcional)" />
              <TextInput style={styles.textArea} multiline maxLength={250} placeholder="Adicione observações relevantes sobre sua saúde..." value={form.observacaoSaude ?? ''} onChangeText={(value) => updateField('observacaoSaude', value)} />
              <SectionTitle title="Descreva sua rotina diária atual (opcional)" />
              <TextInput style={styles.textArea} multiline maxLength={500} placeholder="Adicione observações relevantes..." value={form.rotina ?? ''} onChangeText={(value) => updateField('rotina', value)} />

              <View style={styles.actions}><TouchableOpacity style={styles.undoButton} onPress={handleUndo}><Undo2 size={17} color="#475569" /><Text style={styles.undoText}>Desfazer alterações</Text></TouchableOpacity><TouchableOpacity style={[styles.saveButton, saving && styles.disabled]} onPress={handleSave} disabled={saving}>{saving ? <ActivityIndicator color="#FFFFFF" /> : <><Check size={17} color="#FFFFFF" /><Text style={styles.saveText}>Atualizar Anamnese</Text></>}</TouchableOpacity></View>
            </>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function SectionTitle({ title }: { title: string }) { return <View style={styles.sectionTitle}><View style={styles.sectionDot} /><Text style={styles.sectionTitleText}>{title}</Text></View>; }
function NumberField({ label, icon, value, onChangeText, error }: { label: string; icon: React.ReactNode; value: string; onChangeText: (value: string) => void; error?: string }) { return <Field label={label} icon={icon} value={value} onChangeText={onChangeText} keyboardType="numeric" error={error} />; }
function Field({ label, icon, value, onChangeText, keyboardType, error }: { label: string; icon: React.ReactNode; value: string; onChangeText: (value: string) => void; keyboardType?: 'numeric' | 'default'; error?: string }) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><View style={styles.inputRow}>{icon}<TextInput style={styles.input} value={value} onChangeText={onChangeText} keyboardType={keyboardType} /></View>{error ? <Text style={styles.error}>{error}</Text> : null}</View>; }
function Choice({ label, selected, onPress, checkbox = false }: { label: string; selected: boolean; onPress: () => void; checkbox?: boolean }) { return <TouchableOpacity style={[styles.choice, selected && styles.choiceSelected]} onPress={onPress}><View style={[checkbox ? styles.checkbox : styles.radio, selected && (checkbox ? styles.checkboxSelected : styles.radioSelected)]}>{selected ? <Check size={13} color="#FFFFFF" /> : null}</View><Text style={styles.choiceText}>{label}</Text></TouchableOpacity>; }

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row', gap: 12, marginBottom: 2 },
  headerBackButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 10, borderWidth: 1, height: 40, justifyContent: 'center', width: 40 },
  headerPageTitle: { color: '#111827', fontSize: 24, fontWeight: '700' },
  screen: { flex: 1, backgroundColor: '#F3F4F6' }, container: { paddingHorizontal: 16, gap: 14 }, backButton: { alignItems: 'center', flexDirection: 'row', gap: 6, alignSelf: 'flex-start' }, backText: { color: '#475569', fontSize: 14 }, pageTitle: { color: '#333333', fontSize: 28, fontWeight: '600' }, card: { backgroundColor: '#FFFFFF', borderRadius: 12, padding: 18, gap: 12 }, cardTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 10, marginBottom: 6 }, cardTitle: { color: '#111827', fontSize: 21, fontWeight: '700' }, loader: { marginVertical: 40 }, sectionTitle: { alignItems: 'center', flexDirection: 'row', gap: 10, marginTop: 8 }, sectionDot: { backgroundColor: '#374151', borderRadius: 4, height: 8, width: 8 }, sectionTitleText: { color: '#6E6E6E', fontSize: 16, fontWeight: '600' }, row: { flexDirection: 'row', gap: 10 }, field: { flex: 1, gap: 5 }, label: { color: '#475569', fontSize: 13 }, inputRow: { alignItems: 'center', borderColor: '#D1D5DB', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 8, minHeight: 46, paddingHorizontal: 12 }, input: { color: '#334155', flex: 1, fontSize: 14, paddingVertical: 10 }, error: { color: '#EF4444', fontSize: 12 }, optionGrid: { gap: 8 }, choice: { alignItems: 'center', borderColor: '#E2E8F0', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 9, minHeight: 44, paddingHorizontal: 12 }, choiceSelected: { backgroundColor: '#EFF6FF', borderColor: '#93C5FD' }, choiceText: { color: '#334155', flex: 1, fontSize: 14 }, radio: { alignItems: 'center', borderColor: '#94A3B8', borderRadius: 10, borderWidth: 1.5, height: 19, justifyContent: 'center', width: 19 }, radioSelected: { backgroundColor: '#093A5D', borderColor: '#093A5D' }, radioFill: { backgroundColor: '#FFFFFF', borderRadius: 5, height: 8, width: 8 }, checkbox: { alignItems: 'center', borderColor: '#94A3B8', borderRadius: 4, borderWidth: 1.5, height: 19, justifyContent: 'center', width: 19 }, checkboxSelected: { backgroundColor: '#093A5D', borderColor: '#093A5D' }, activityOption: { alignItems: 'center', borderColor: '#E2E8F0', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 10, padding: 12 }, activityOptionSelected: { backgroundColor: '#F8FAFC', borderColor: '#93C5FD' }, optionLabel: { color: '#334155', fontSize: 14, fontWeight: '600' }, optionDescription: { color: '#64748B', fontSize: 12, marginTop: 2 }, otherBox: { backgroundColor: '#F8FAFC', borderRadius: 8, gap: 10, padding: 10 }, tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 }, tag: { alignItems: 'center', backgroundColor: '#E0F2FE', borderRadius: 16, flexDirection: 'row', gap: 5, paddingHorizontal: 9, paddingVertical: 5 }, tagText: { color: '#0C6291', fontSize: 12 }, addOtherRow: { alignItems: 'center', flexDirection: 'row', gap: 8 }, addButton: { backgroundColor: '#093A5D', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 11 }, addButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' }, textArea: { borderColor: '#D1D5DB', borderRadius: 8, borderWidth: 1, color: '#334155', fontSize: 14, minHeight: 90, padding: 12, textAlignVertical: 'top' }, actions: { gap: 10, marginTop: 10 }, undoButton: { alignItems: 'center', borderColor: '#CBD5E1', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 8, justifyContent: 'center', paddingVertical: 12 }, undoText: { color: '#475569', fontWeight: '600' }, saveButton: { alignItems: 'center', backgroundColor: '#093A5D', borderRadius: 8, flexDirection: 'row', gap: 8, justifyContent: 'center', paddingVertical: 13 }, saveText: { color: '#FFFFFF', fontWeight: '700' }, disabled: { opacity: 0.6 },
});
