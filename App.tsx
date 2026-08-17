import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StyleSheet, Text, View } from 'react-native';
import BottomTabBar, { type TabName } from './src/components/BottomTabBar';
import OverviewScreen from './src/screens/OverviewScreen';
import CheckScheduleScreen from './src/screens/CheckScheduleScreen';
import PlansScreen from './src/screens/PlansScreen';

const queryClient = new QueryClient();

export default function App() {
  const [activeTab, setActiveTab] = useState<TabName>('home');

  function renderScreen() {
    if (activeTab === 'home') {
      return <OverviewScreen />;
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
      <StatusBar style="light" />
      {renderScreen()}
      <BottomTabBar activeTab={activeTab} onTabPress={setActiveTab} />
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
