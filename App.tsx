import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import LoginScreen from './src/screens/LoginScreen';
import CheckScheduleScreen from './src/screens/CheckScheduleScreen';
import { setOnUnauthorized } from './src/services/api';
import type { AuthResponseDTO } from './src/models/user';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<'login' | 'checkSchedule'>('login');
  const [authData, setAuthData] = useState<AuthResponseDTO | null>(null);

  useEffect(() => {
    // Interceptor 401 automático: se receber 401 desautorizado, volta para Login
    setOnUnauthorized(() => {
      setAuthData(null);
      setCurrentScreen('login');
    });

    return () => {
      setOnUnauthorized(null);
    };
  }, []);

  const handleLoginSuccess = (data?: AuthResponseDTO) => {
    if (data) setAuthData(data);
    setCurrentScreen('checkSchedule');
  };

  return (
    <>
      <StatusBar style="light" />
      {currentScreen === 'login' ? (
        <LoginScreen
          onLoginSuccess={handleLoginSuccess}
          onNavigateRegister={() => {
            console.log('Navegar para cadastro');
          }}
          onNavigateForgotPassword={() => {
            console.log('Navegar para recuperação de senha');
          }}
        />
      ) : (
        <CheckScheduleScreen />
      )}
    </>
  );
}
