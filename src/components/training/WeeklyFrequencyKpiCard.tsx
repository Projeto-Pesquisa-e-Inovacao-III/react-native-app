import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { CalendarCheck } from 'lucide-react-native';

type WeeklyFrequencyKpiCardProps = {
  frequenciaSemanal: number;
  periodoDias?: number;
};

const formatter = new Intl.NumberFormat('pt-BR', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export default function WeeklyFrequencyKpiCard({
  frequenciaSemanal,
  periodoDias = 90,
}: WeeklyFrequencyKpiCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <CalendarCheck size={18} color="#093A5D" />
        </View>
        <Text style={styles.label}>FREQUÊNCIA SEMANAL</Text>
      </View>
      <Text style={styles.value}>
        {formatter.format(frequenciaSemanal)}{' '}
        <Text style={styles.unit}>treinos/sem</Text>
      </Text>
      <Text style={styles.subtitle}>Últimos {periodoDias} dias</Text>
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
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  iconBox: {
    alignItems: 'center',
    backgroundColor: '#E8F2F8',
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  label: {
    color: '#64748B',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.7,
  },
  value: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '700',
  },
  unit: {
    color: '#64748B',
    fontSize: 16,
    fontWeight: '500',
  },
  subtitle: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 4,
  },
});

