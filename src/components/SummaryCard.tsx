import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export interface SummaryCardProps {
  dateStr: string;
  muscles?: string[];
  resumo?: string;
}

export default function SummaryCard({ dateStr, muscles = [], resumo }: SummaryCardProps) {
  const formattedMuscles = muscles
    .map((m) => m.charAt(0).toUpperCase() + m.slice(1).toLowerCase())
    .join(', ');

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.circle} />
          <Text style={styles.title}>{dateStr}</Text>
        </View>
        {muscles.length > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{formattedMuscles}</Text>
          </View>
        )}
      </View>
      <Text style={styles.desc}>
        {resumo || 'Sem observações'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  circle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#CCCCCC',
    backgroundColor: 'transparent',
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333333',
  },
  badge: {
    backgroundColor: '#DBEAFE',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1E40AF',
    textTransform: 'uppercase',
  },
  desc: {
    fontSize: 13,
    color: '#666666',
    fontStyle: 'italic',
    marginLeft: 20,
    lineHeight: 18,
  },
});
