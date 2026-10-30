import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ScheduleRoute from '../../app/(app)/(tabs)/schedule';
import PersonalScheduleRoute from '../../app/(app)/(tabs)/personal-schedule';

export type ScheduleDebugMode = 'student' | 'personal';

export default function ScheduleDebugSwitch() {
  const [mode, setMode] = useState<ScheduleDebugMode>('personal');

  return (
    <View style={styles.wrapper}>
      <View style={styles.debugBar}>
        <TouchableOpacity
          style={[styles.toggleChip, mode === 'student' && styles.toggleChipActive]}
          onPress={() => setMode('student')}
          activeOpacity={0.9}
        >
          <Text style={[styles.toggleText, mode === 'student' && styles.toggleTextActive]}>Aluno</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleChip, mode === 'personal' && styles.toggleChipActive]}
          onPress={() => setMode('personal')}
          activeOpacity={0.9}
        >
          <Text style={[styles.toggleText, mode === 'personal' && styles.toggleTextActive]}>Personal</Text>
        </TouchableOpacity>
      </View>

      {mode === 'student' ? <ScheduleRoute /> : <PersonalScheduleRoute />}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    backgroundColor: '#F5F7FB',
  },
  debugBar: {
    flexDirection: 'row',
    backgroundColor: '#EAF2FF',
    borderRadius: 999,
    padding: 6,
    marginHorizontal: 20,
    marginTop: 12,
    marginBottom: 8,
    gap: 8,
  },
  toggleChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 999,
  },
  toggleChipActive: {
    backgroundColor: '#1C6AAB',
  },
  toggleText: {
    color: '#1F2937',
    fontWeight: '700',
    fontSize: 13,
  },
  toggleTextActive: {
    color: '#FFFFFF',
  },
});
