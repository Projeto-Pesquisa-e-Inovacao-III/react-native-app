import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BottomTabBar, { type TabName } from './src/components/BottomTabBar';
import OverviewScreen from './src/screens/OverviewScreen';
import CheckScheduleScreen from './src/screens/CheckScheduleScreen';
import PlansScreen from './src/screens/PlansScreen';
import NotImplementedScreen from 'src/screens/NotImplementedScreen';

const queryClient = new QueryClient();

export default function App() {
  const [activeTab, setActiveTab] = useState<TabName>('home');

  function renderScreen() {
    if (activeTab === 'home') {
      // Admin
      // return <OverviewScreen userRoles={["admin"]}/>;

      // Aluno 
      // return <OverviewScreen userRoles={["aluno"]}/>;

      // No classes available, package expired
      // return <OverviewScreen
      //   userRoles={["aluno"]}
      //   actualPlan={{
      //     nome: "Plano Gold",
      //     dataExpiracao: "2026-12-10",
      //   }}
      //   classBalance={{
      //     saldoPresencial: 0,
      //     saldoFuncional: 0,
      //     saldoResidencial: 0,
      //   }}
      // />

      // Classes available to schedule
      return <OverviewScreen
        userRoles={["aluno"]}
        actualPlan={{
          nome: "Plano Gold",
          dataExpiracao: "2026-12-10",
        }}
        classBalance={{
          saldoPresencial: 5,
          saldoFuncional: 0,
          saldoResidencial: 0,
        }}
        onNewEvent={(date) => {
          console.log("Data escolhida:", date);
        }}
      />
    }

    if (activeTab === 'requests') {
      return <CheckScheduleScreen />;
    }

    if (activeTab === 'plans'){
      return <PlansScreen />
    }

    return <NotImplementedScreen/>
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        {renderScreen()}
        <BottomTabBar
          activeTab={activeTab}
          onTabPress={setActiveTab}
        />
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
