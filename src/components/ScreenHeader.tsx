import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Bell } from 'lucide-react-native';
import FocusAwareStatusBar from './FocusAwareStatusBar';

type Props = {
  title: string;
  subtitle?: string;
  unreadCount?: number;
  onBellPress?: () => void;
  /** Optional extra content rendered below the title/bell row */
  children?: React.ReactNode;
};

/**
 * ScreenHeader — cabeçalho padrão dark (#192633) com:
 *  - Título + subtítulo opcionais
 *  - Botão de sino com badge de não-lidas
 *  - Padding de topo automático via useSafeAreaInsets (status bar)
 *  - Slot `children` para conteúdo extra (KPIs, filtros, etc.)
 */
export default function ScreenHeader({
  title,
  subtitle,
  unreadCount = 0,
  onBellPress,
  children,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
      <FocusAwareStatusBar style="light" />
      {/* Linha título + sino */}
      <View style={styles.topRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>

        {onBellPress !== undefined && (
          <TouchableOpacity
            style={styles.bellButton}
            onPress={onBellPress}
            activeOpacity={0.8}
          >
            <Bell size={22} color="#FFFFFF" />
            {unreadCount > 0 && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Conteúdo extra opcional (KPIs, chips de filtro, etc.) */}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: '#192633',
    width: '100%',
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: '#c6d4df',
    fontSize: 13,
    marginTop: 4,
  },
  bellButton: {
    position: 'relative',
    padding: 8,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 999,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
});
