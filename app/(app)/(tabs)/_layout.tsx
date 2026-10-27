import React from 'react';
import { Tabs, useRouter, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import BottomTabBar, { TabName } from '../../../src/components/BottomTabBar';
import { useAuth } from '../../../src/contexts/AuthContext';

export default function TabsLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const { roles } = useAuth();

  const isDarkHeader = (() => {
    if (pathname.includes('/personal-schedule')) return true;
    if (pathname.includes('/requests')) return true;
    if (pathname.endsWith('/more') || pathname.includes('/more/')) return true;
    if (
      pathname === '/' ||
      pathname === '/(app)/(tabs)' ||
      pathname === '/(app)/(tabs)/' ||
      pathname.endsWith('/tabs') ||
      pathname.endsWith('/(tabs)/index')
    ) {
      return true;
    }
    return false;
  })();

  const getActiveTab = (): TabName => {
    if (
      pathname.includes('/schedule-history') ||
      pathname.includes('/plans-history') ||
      pathname.includes('/create-personal') ||
      pathname.includes('/dashboard') ||
      pathname.includes('/set-availability') ||
      pathname.includes('/addresses')
    ) return 'more';
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

  const renderTabBar = React.useCallback(
    () => (
      <BottomTabBar
        activeTab={getActiveTab()}
        onTabPress={handleTabPress}
        userRoles={roles}
      />
    ),
    [pathname, roles]
  );

  return (
    <>
      <StatusBar style={isDarkHeader ? 'light' : 'dark'} animated />
      <Tabs
        backBehavior="history"
        screenOptions={{ headerShown: false }}
        tabBar={renderTabBar}
      >
        <Tabs.Screen name="index" options={{ title: 'Início' }} />
        <Tabs.Screen name="schedule" options={{ title: 'Agenda' }} />
        <Tabs.Screen name="personal-schedule" options={{ title: 'Agenda Personal' }} />
        <Tabs.Screen name="requests" options={{ title: 'Solicitações' }} />
        <Tabs.Screen name="plans" options={{ title: 'Planos' }} />
        <Tabs.Screen name="users" options={{ title: 'Usuários' }} />
        <Tabs.Screen name="more" options={{ title: 'Mais opções' }} />
        <Tabs.Screen name="schedule-details" options={{ title: 'Detalhes do Agendamento' }} />
        <Tabs.Screen name="schedule-history" options={{ title: 'Histórico de Agendamentos' }} />
        <Tabs.Screen name="plans-history" options={{ title: 'Histórico de Planos' }} />
        <Tabs.Screen name="plans-history-details" options={{ title: 'Detalhes do Plano' }} />
        <Tabs.Screen name="edit-user" options={{ title: 'Editar Usuário' }} />
        <Tabs.Screen name="edit-anamnesis" options={{ title: 'Editar Anamnese' }} />
        <Tabs.Screen name="set-availability" options={{ title: 'Ajustar Disponibilidade' }} />
        <Tabs.Screen name="create-personal" options={{ title: 'Criar Personal' }} />
        <Tabs.Screen name="dashboard" options={{ title: 'Dashboard' }} />
        <Tabs.Screen name="addresses" options={{ title: 'Endereços' }} />
      </Tabs>
    </>
  );
}
