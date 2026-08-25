import { StatusBar } from 'expo-status-bar';
import CheckScheduleScreen from './src/screens/CheckScheduleScreen';
import MoreOptionsScreen from './src/screens/MoreOptionsScreen';
import SetAvailabilityScreen from './src/screens/SetAvailabilityScreen'; 

import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';


const Stack = createNativeStackNavigator();
const queryClient = new QueryClient();

export default function App() {
  return (
    
   <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator 
          initialRouteName="Requests" 
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Requests" component={CheckScheduleScreen} />
          <Stack.Screen name="MoreOptions" component={MoreOptionsScreen} />
          <Stack.Screen name="SetAvailabilityScreen" component={SetAvailabilityScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </QueryClientProvider>
  );
}