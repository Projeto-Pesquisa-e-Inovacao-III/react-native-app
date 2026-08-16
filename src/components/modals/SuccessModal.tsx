import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { useState, useEffect } from 'react';

type Props = {
  visible: boolean;
  title?: string;
  content?: string;
  onClose: () => void;
};

export default function SuccessModal({ visible, title, content, onClose }: Props) {
  const scaleAnim = useState(new Animated.Value(0.85))[0];
  const fadeAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
        Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, damping: 14, stiffness: 160 }),
      ]).start();
    } else {
      scaleAnim.setValue(0.85);
      fadeAnim.setValue(0);
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
          {/* Checkmark */}
          <View style={styles.iconWrapper}>
            <View style={styles.iconCircle}>
              <Text style={styles.checkmark}>✓</Text>
            </View>
          </View>

          <Text style={styles.title}>{title ?? 'Sucesso!'}</Text>
          <Text style={styles.content}>{content ?? 'Operação realizada com sucesso.'}</Text>

          <TouchableOpacity style={styles.btn} onPress={onClose}>
            <Text style={styles.btnText}>Fechar</Text>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 28,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    marginBottom: 4,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#22c55e',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmark: {
    fontSize: 32,
    color: '#fff',
    fontWeight: '700',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
  },
  content: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 20,
  },
  btn: {
    marginTop: 8,
    backgroundColor: '#192633',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 10,
    width: '100%',
    alignItems: 'center',
  },
  btnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },
});
