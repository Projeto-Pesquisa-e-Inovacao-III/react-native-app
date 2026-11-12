import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { AuthProvider } from '../src/contexts/AuthContext';
import { NotificationProvider } from '../src/contexts/NotificationContext';
import { logBufferService } from '../src/services/logBufferService';
import '../src/services/notificationService';

const queryClient = new QueryClient();

export default function RootLayout() {
  useEffect(() => {
    const cleanupBuffer = logBufferService.initialize();

    const errorUtils = (globalThis as any).ErrorUtils;
    const previousHandler = errorUtils?.getGlobalHandler?.();

    if (errorUtils?.setGlobalHandler) {
      errorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
        void logBufferService.recordUnhandledException(error, Boolean(isFatal));
        if (typeof previousHandler === 'function') {
          previousHandler(error, isFatal);
        }
      });
    }

    const onUnhandledRejection = (event: any) => {
      const reason = event?.reason ?? event;
      void logBufferService.recordUnhandledRejection(reason);
    };

    const canListenRejection = typeof (globalThis as any).addEventListener === 'function';
    if (canListenRejection) {
      (globalThis as any).addEventListener('unhandledrejection', onUnhandledRejection);
    }

    return () => {
      cleanupBuffer();
      if (errorUtils?.setGlobalHandler && typeof previousHandler === 'function') {
        errorUtils.setGlobalHandler(previousHandler);
      }
      if (canListenRejection && typeof (globalThis as any).removeEventListener === 'function') {
        (globalThis as any).removeEventListener('unhandledrejection', onUnhandledRejection);
      }
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <AuthProvider>
          <NotificationProvider>
            <StatusBar style="dark" />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(auth)" options={{ headerShown: false }} />
              <Stack.Screen name="(app)" options={{ headerShown: false }} />
            </Stack>
          </NotificationProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}
