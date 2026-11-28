import type { MuscleGroupKey } from '../models/trainingMetrics';

export const MUSCLE_GROUP_LABELS: Record<MuscleGroupKey, string> = {
  PEITO: 'Peito',
  COSTAS: 'Costas',
  TRAPEZIO: 'Trapézio',
  BICEPS: 'Bíceps',
  TRICEPS: 'Tríceps',
  ANTEBRACO: 'Antebraço',
  OMBRO: 'Ombro',
  ABDOMEN: 'Abdômen',
  QUADRICEPS: 'Quadríceps',
  POSTERIOR: 'Posterior',
  GLUTEO: 'Glúteo',
  PANTURRILHA: 'Panturrilha',
};

export const MUSCLE_GROUPS = (
  Object.entries(MUSCLE_GROUP_LABELS) as [MuscleGroupKey, string][]
).map(([value, label]) => ({ value, label }));

export function formatMuscleGroupLabel(muscle: string): string {
  const upper = muscle.toUpperCase() as MuscleGroupKey;
  if (upper in MUSCLE_GROUP_LABELS) {
    return MUSCLE_GROUP_LABELS[upper];
  }
  return muscle.charAt(0).toUpperCase() + muscle.slice(1).toLowerCase();
}
