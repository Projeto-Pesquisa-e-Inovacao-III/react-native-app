import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, Dumbbell } from 'lucide-react-native';

import { getStudentTrainingMetrics } from '@constants/schedule';
import WeeklyFrequencyKpiCard from './WeeklyFrequencyKpiCard';
import MuscleHeatmapCard from './MuscleHeatmapCard';

type StudentTrainingMetricsSectionProps = {
  alunoId?: number | null;
  enabled?: boolean;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  compact?: boolean;
};

export default function StudentTrainingMetricsSection({
  alunoId,
  enabled = true,
  collapsible = false,
  defaultExpanded = true,
  compact = false,
}: StudentTrainingMetricsSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const {
    data: metricsResponse,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['studentTrainingMetrics', alunoId, 90],
    queryFn: async () => {
      const res = await getStudentTrainingMetrics(alunoId!, 90);
      return res.data;
    },
    enabled: !!alunoId && enabled,
  });

  const metrics = metricsResponse ?? null;

  const renderContent = () => {
    if (isLoading) {
      return (
        <View style={styles.loadingBox}>
          <ActivityIndicator color="#093A5D" testID="training-metrics-loading" />
        </View>
      );
    }

    if (isError) {
      return (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>
            Não foi possível carregar as métricas de treino.
          </Text>
          <Pressable style={styles.retryButton} onPress={() => refetch()}>
            <Text style={styles.retryText}>Tentar novamente</Text>
          </Pressable>
        </View>
      );
    }

    if (!metrics) return null;

    return (
      <View style={styles.contentGap}>
        <WeeklyFrequencyKpiCard
          frequenciaSemanal={metrics.frequenciaSemanal}
          periodoDias={metrics.periodoDias}
        />
        <MuscleHeatmapCard
          distribuicaoMuscular={metrics.distribuicaoMuscular}
          maxTreinosGrupo={metrics.maxTreinosGrupo}
          compact={compact}
        />
      </View>
    );
  };

  if (collapsible) {
    return (
      <View style={styles.collapsibleCard}>
        <Pressable
          style={styles.collapsibleHeader}
          onPress={() => setExpanded((prev) => !prev)}
          accessibilityRole="button"
        >
          <View style={styles.headerLeft}>
            <View style={styles.iconBox}>
              <Dumbbell size={16} color="#093A5D" />
            </View>
            <Text style={styles.headerTitle}>Métricas de treino (90 dias)</Text>
          </View>
          {expanded ? (
            <ChevronUp size={20} color="#64748B" />
          ) : (
            <ChevronDown size={20} color="#64748B" />
          )}
        </Pressable>
        {expanded && renderContent()}
      </View>
    );
  }

  return renderContent();
}

const styles = StyleSheet.create({
  contentGap: {
    gap: 14,
  },
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  errorCard: {
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
    padding: 16,
  },
  errorText: {
    color: '#991B1B',
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#093A5D',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  collapsibleCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 14,
    gap: 14,
  },
  collapsibleHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  iconBox: {
    alignItems: 'center',
    backgroundColor: '#E8F2F8',
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  headerTitle: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '600',
  },
});

