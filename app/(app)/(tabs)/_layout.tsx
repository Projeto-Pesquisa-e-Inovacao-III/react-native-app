import React from 'react';
import { Tabs, useRouter, usePathname } from 'expo-router';
import BottomTabBar, { TabName } from '../../../src/components/BottomTabBar';
import { useAuth } from '../../../src/contexts/AuthContext';

export default function TabsLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { roles } = useAuth();

  const getActiveTab = (): TabName => {
    if (pathname.includes('/schedule') || pathname.includes('/personal-schedule')) return 'schedule';
    if (pathname.includes('/requests')) return 'requests';
    if (pathname.includes('/plans')) return 'plans';
    if (pathname.includes('/users')) return 'users';
    if (pathname.includes('/more')) return 'more';
    return 'home';
  };

  const handleTabPress = (tab: TabName) => {
    switch (tab) {
      case 'home':
        router.push('/(app)/(tabs)');
        break;
      case 'schedule':
        const isPersonalOrAdmin = roles?.includes('personal') || roles?.includes('admin');
        if (isPersonalOrAdmin) {
          router.push('/(app)/(tabs)/personal-schedule');
        } else {
          router.push('/(app)/(tabs)/schedule');
        }
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
  };

  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={() => (
        <BottomTabBar
          activeTab={getActiveTab()}
          onTabPress={handleTabPress}
          userRoles={roles}
        />
      )}
    >
      <Tabs.Screen name="index" options={{ title: 'Início' }} />
      <Tabs.Screen name="schedule" options={{ title: 'Agenda' }} />
      <Tabs.Screen name="personal-schedule" options={{ title: 'Agenda Personal', href: null }} />
      <Tabs.Screen name="requests" options={{ title: 'Solicitações' }} />
      <Tabs.Screen name="plans" options={{ title: 'Planos' }} />
      <Tabs.Screen name="users" options={{ title: 'Usuários' }} />
      <Tabs.Screen name="edit-user" options={{ title: 'Editar Perfil', href: null }} />
      <Tabs.Screen name="more" options={{ title: 'Mais opções' }} />
    </Tabs>
  );
}
