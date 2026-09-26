import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Mic } from 'lucide-react-native';

export default function VoiceRecorderButton() {
  const router = useRouter();

  const handlePress = () => {
    router.push('/(app)/ai-voice');
  };

  return (
    <View style={styles.container} pointerEvents="box-none">
      <TouchableOpacity
        style={styles.touchableWrapper}
        onPress={handlePress}
        activeOpacity={0.85}
        accessibilityLabel="Agendar aula com IA"
        accessibilityRole="button"
      >
        <View style={styles.labelPill}>
          <Text style={styles.labelText}>Agendar aula com IA</Text>
        </View>

        <View style={styles.micButton}>
          <Mic color="#FFFFFF" size={26} strokeWidth={2.2} />
          <View style={styles.aiBadge}>
            <Text style={styles.aiBadgeText}>AI</Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    right: 16,
    zIndex: 200,
    elevation: 6,
  },
  touchableWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  labelPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  labelText: {
    color: '#1E293B',
    fontSize: 13,
    fontWeight: '700',
  },
  micButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0A3D62',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#001F3F',
    shadowOpacity: 0.28,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  aiBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#00A8E8',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
