import React from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsideEditUser from '../../../src/components/AsideEditUser';
import BottomTabBar, { type TabName } from '../../../src/components/BottomTabBar';
import { useAuth } from '../../../src/contexts/AuthContext';

export default function EditUserLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { roles } = useAuth();
  const activeTab = pathname.includes('edit-anamnesis')
    ? 'anamnesis'
    : pathname.includes('security')
      ? 'security'
      : 'edituser';

  function handleTabPress(tab: TabName) {
    switch (tab) {
      case 'home':
        router.push('/(app)/(tabs)');
        break;
      case 'schedule':
        router.push(roles?.includes('personal') || roles?.includes('admin')
          ? '/(app)/(tabs)/personal-schedule'
          : '/(app)/(tabs)/schedule');
        break;
      case 'requests':
        router.push('/(app)/(tabs)/requests');
        break;
      case 'plans':
        router.push('/(app)/(tabs)/plans');
        break;
      case 'users':
        router.push('/(app)/(tabs)/users');
        break;
      case 'more':
        router.push('/(app)/(tabs)/more');
        break;
    }
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.headerArea, { paddingTop: Math.max(insets.top, 18) }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.title}>Editar Perfil</Text>
        </View>
        <AsideEditUser activeTab={activeTab} />
      </View>

      <Stack screenOptions={{ headerShown: false }} />
      <BottomTabBar activeTab="more" onTabPress={handleTabPress} userRoles={roles} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F3F4F6' },
  headerArea: { backgroundColor: '#F3F4F6', paddingHorizontal: 16, zIndex: 2 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12, marginBottom: 2 },
  backButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 10, borderWidth: 1, height: 40, justifyContent: 'center', width: 40 },
  title: { color: '#0F172A', fontSize: 24, fontWeight: '700' },
});
