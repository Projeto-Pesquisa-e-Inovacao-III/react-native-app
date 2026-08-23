import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BottomTabBar, { type TabName } from './src/components/BottomTabBar';
import OverviewScreen from './src/screens/OverviewScreen';
import CheckScheduleScreen from './src/screens/CheckScheduleScreen';
import PlansScreen from './src/screens/PlansScreen';

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

    return (
      <View style={styles.placeholderContainer}>
        <Text style={styles.placeholderTitle}>Em breve</Text>
        <Text style={styles.placeholderText}>Esta aba ainda nao foi implementada.</Text>
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        {renderScreen()}
        <BottomTabBar activeTab={activeTab} onTabPress={setActiveTab} />
      </SafeAreaProvider>
    </>
  );
}

const styles = StyleSheet.create({
  placeholderContainer: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#192633',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
  },
});
