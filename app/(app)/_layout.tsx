import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack, Redirect } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AppLayout() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#F26430" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#f8f9fa' }}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      </Stack>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0F1E2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
