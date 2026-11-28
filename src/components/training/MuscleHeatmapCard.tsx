import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Body from 'react-native-body-highlighter';
import type { ExtendedBodyPart, Slug } from 'react-native-body-highlighter';

import type { MuscleDistributionItem, MuscleGroupKey } from '@models/trainingMetrics';
import { MUSCLE_GROUP_LABELS } from '@constants/muscleGroups';

// ─── Heat level calculation ──────────────────────────────────────────
export function getHeatLevel(
  quantidade: number,
  maxTreinosGrupo: number,
): 0 | 1 | 2 | 3 | 4 {
  if (quantidade <= 0 || maxTreinosGrupo <= 0) return 0;
  const ratio = quantidade / maxTreinosGrupo;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

export const HEAT_COLORS = [
  '#E2E8F0', // 0 - not trained
  '#FDE68A', // 1 - low
  '#FDBA74', // 2 - moderate
  '#F97316', // 3 - high
  '#DC2626', // 4 - max
] as const;

// ─── Muscle group → body-highlighter slugs mapping ───────────────────
export const MUSCLE_GROUP_TO_SLUGS: Record<MuscleGroupKey, Slug[]> = {
  PEITO: ['chest'],
  COSTAS: ['upper-back', 'lower-back'],
  TRAPEZIO: ['trapezius'],
  BICEPS: ['biceps'],
  TRICEPS: ['triceps'],
  ANTEBRACO: ['forearm'],
  OMBRO: ['deltoids'],
  ABDOMEN: ['abs', 'obliques'],
  QUADRICEPS: ['quadriceps'],
  POSTERIOR: ['hamstring'],
  GLUTEO: ['gluteal'],
  PANTURRILHA: ['calves'],
};

// Inverse mapping: slug → MuscleGroupKey
export const SLUG_TO_MUSCLE_GROUP: Record<string, MuscleGroupKey> = {};
for (const [group, slugs] of Object.entries(MUSCLE_GROUP_TO_SLUGS)) {
  for (const slug of slugs) {
    SLUG_TO_MUSCLE_GROUP[slug] = group as MuscleGroupKey;
  }
}

const DISABLED_BODY_PARTS: Slug[] = [
  'head',
  'hair',
  'neck',
  'hands',
  'feet',
  'knees',
  'ankles',
  'adductors',
  'tibialis',
];

const percentFormatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

// ─── Props ───────────────────────────────────────────────────────────
type MuscleHeatmapCardProps = {
  distribuicaoMuscular: MuscleDistributionItem[];
  maxTreinosGrupo: number;
  compact?: boolean;
};

// ─── Component ───────────────────────────────────────────────────────
export default function MuscleHeatmapCard({
  distribuicaoMuscular,
  maxTreinosGrupo,
  compact = false,
}: MuscleHeatmapCardProps) {
  const [selectedGroup, setSelectedGroup] = useState<MuscleGroupKey | null>(null);

  // Build lookup from MuscleGroupKey → item
  const distributionMap = useMemo(() => {
    const map = new Map<MuscleGroupKey, MuscleDistributionItem>();
    for (const item of distribuicaoMuscular) {
      map.set(item.grupoMuscular, item);
    }
    return map;
  }, [distribuicaoMuscular]);

  // Build body-highlighter data array
  const bodyData: ExtendedBodyPart[] = useMemo(() => {
    const parts: ExtendedBodyPart[] = [];
    for (const [group, slugs] of Object.entries(MUSCLE_GROUP_TO_SLUGS)) {
      const groupKey = group as MuscleGroupKey;
      const item = distributionMap.get(groupKey);
      const level = getHeatLevel(item?.quantidade ?? 0, maxTreinosGrupo);
      const color = HEAT_COLORS[level];
      const isSelected = selectedGroup === groupKey;
      for (const slug of slugs) {
        parts.push({
          slug,
          color,
          styles: {
            fill: color,
            stroke: isSelected ? '#093A5D' : '#CBD5E1',
            strokeWidth: isSelected ? 4 : 1,
          },
        });
      }
    }
    return parts;
  }, [distributionMap, maxTreinosGrupo, selectedGroup]);

  const handleBodyPartPress = (part: ExtendedBodyPart) => {
    if (!part.slug) return;
    const group = SLUG_TO_MUSCLE_GROUP[part.slug];
    if (group) {
      setSelectedGroup((prev) => (prev === group ? null : group));
    }
  };

  const selectedItem = selectedGroup ? distributionMap.get(selectedGroup) : null;
  const selectedCount = selectedItem?.quantidade ?? 0;
  const selectedPercent = selectedItem?.percentual ?? 0;

  const isEmpty = maxTreinosGrupo === 0;
  const scale = compact ? 0.72 : 0.82;

  if (isEmpty) {
    return (
      <View style={styles.card}>
        <Text style={styles.title}>Distribuição muscular</Text>
        <Text style={styles.subtitle}>Últimos 90 dias</Text>
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>
            Nenhum treino concluído nos últimos 90 dias.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Distribuição muscular</Text>
      <Text style={styles.subtitle}>Últimos 90 dias</Text>

      <View style={styles.bodyRow}>
        <View style={styles.bodyCol}>
          <Body
            data={bodyData}
            side="front"
            scale={scale}
            border="#CBD5E1"
            defaultFill="#E2E8F0"
            disabledParts={DISABLED_BODY_PARTS}
            onBodyPartPress={handleBodyPartPress}
          />
          <Text style={styles.bodyLabel}>Frente</Text>
        </View>
        <View style={styles.bodyCol}>
          <Body
            data={bodyData}
            side="back"
            scale={scale}
            border="#CBD5E1"
            defaultFill="#E2E8F0"
            disabledParts={DISABLED_BODY_PARTS}
            onBodyPartPress={handleBodyPartPress}
          />
          <Text style={styles.bodyLabel}>Costas</Text>
        </View>
      </View>

      {/* Tooltip / selected muscle detail */}
      <Pressable
        style={styles.detailBox}
        onPress={() => setSelectedGroup(null)}
        accessibilityRole="text"
      >
        {selectedGroup ? (
          <Text style={styles.detailText}>
            <Text style={styles.detailName}>
              {MUSCLE_GROUP_LABELS[selectedGroup]}
            </Text>
            {' • '}
            {selectedCount} {selectedCount === 1 ? 'treino' : 'treinos'} (
            {percentFormatter.format(selectedPercent)}%)
          </Text>
        ) : (
          <Text style={styles.detailHint}>
            Toque em um músculo para ver detalhes
          </Text>
        )}
      </Pressable>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendLabel}>0 / Menos</Text>
        {HEAT_COLORS.map((color, i) => (
          <View key={i} style={[styles.legendSwatch, { backgroundColor: color }]} />
        ))}
        <Text style={styles.legendLabel}>Mais</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  title: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '600',
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 12,
    marginBottom: 8,
    marginTop: 2,
  },
  bodyRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  bodyCol: {
    alignItems: 'center',
    gap: 4,
  },
  bodyLabel: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  detailBox: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    marginTop: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  detailText: {
    color: '#334155',
    fontSize: 14,
    textAlign: 'center',
  },
  detailName: {
    fontWeight: '700',
  },
  detailHint: {
    color: '#94A3B8',
    fontSize: 13,
    fontStyle: 'italic',
  },
  legend: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    marginTop: 10,
  },
  legendSwatch: {
    borderRadius: 3,
    height: 14,
    width: 14,
  },
  legendLabel: {
    color: '#94A3B8',
    fontSize: 11,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderColor: '#E0E0E0',
    borderRadius: 8,
    borderStyle: 'dashed',
    borderWidth: 1,
    marginTop: 8,
    padding: 28,
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
  },
});
