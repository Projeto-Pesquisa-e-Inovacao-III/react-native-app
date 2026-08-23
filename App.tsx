import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CheckScheduleScreen from './src/screens/CheckScheduleScreen';
import PlansScreen from './src/screens/PlansScreen';

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <PlansScreen />
    </QueryClientProvider>
  );
}