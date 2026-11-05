import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { NotificationProvider, useNotifications } from '../NotificationContext';
import * as notificationService from '../../services/notificationService';
import { api } from '../../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('../../services/api');
jest.mock('../AuthContext', () => ({
  useAuth: () => ({
    isAuthenticated: true,
    user: { id: 42, email: 'aluno@test.com' },
  }),
}));
jest.mock('../../services/webSocketService', () => ({
  useWebSocket: jest.fn(),
}));

describe('NotificationContext Integration', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  test('loads saved notifications from AsyncStorage upon mount', async () => {
    const existing = [
      {
        id: '1',
        title: 'Saved 1',
        body: 'Body 1',
        recipient: 'aluno' as const,
        recipientCategory: 'aluno' as const,
        timestamp: '10:00',
        createdAt: '2026-11-02T10:00:00Z',
        read: false,
      },
    ];
    await AsyncStorage.setItem('@csf:notifications:42', JSON.stringify(existing));

    (api.get as jest.Mock).mockResolvedValueOnce({ data: [] });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NotificationProvider>{children}</NotificationProvider>
    );

    const { result } = await renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].title).toBe('Saved 1');
      expect(result.current.unreadCount).toBe(1);
    });
  });

  test('fetches historical notifications from GET /api/notificacoes, merges with storage', async () => {
    const remoteData = [
      {
        id: 100,
        titulo: 'Pre-login notification',
        mensagem: 'You had a class approved while offline',
        tipo: 'APPOINTMENT_APPROVED',
        lida: false,
        createdAt: '2026-11-02T08:00:00Z',
        dados: { recipient: 'aluno' },
      },
    ];
    (api.get as jest.Mock).mockResolvedValueOnce({ data: remoteData });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NotificationProvider>{children}</NotificationProvider>
    );

    const { result } = await renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].id).toBe('100');
      expect(result.current.notifications[0].title).toBe('Pre-login notification');
    });

    // Check it persisted to AsyncStorage
    const saved = await notificationService.getSavedNotifications(42);
    expect(saved).toHaveLength(1);
    expect(saved[0].id).toBe('100');
  });

  test('markAsRead updates state, AsyncStorage, and calls backend endpoint', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: [
        {
          id: 55,
          titulo: 'Unread',
          mensagem: 'Test',
          lida: false,
          createdAt: '2026-11-02T12:00:00Z',
        },
      ],
    });
    (api.patch as jest.Mock).mockResolvedValueOnce({ status: 200 });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NotificationProvider>{children}</NotificationProvider>
    );

    const { result } = await renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => {
      expect(result.current.unreadCount).toBe(1);
    });

    await act(async () => {
      await result.current.markAsRead('55');
    });

    expect(result.current.unreadCount).toBe(0);
    expect(result.current.notifications[0].read).toBe(true);
    expect(api.patch).toHaveBeenCalledWith('/notificacoes/55/lida');

    const stored = await notificationService.getSavedNotifications(42);
    expect(stored[0].read).toBe(true);
  });

  test('markAsRead with non-numeric synthetic ID updates local state and storage without calling backend PATCH [Finding 1]', async () => {
    const syntheticItem = {
      id: 'expo-1730571234567',
      title: 'Local Alert',
      body: 'Foreground push without backend ID',
      recipient: 'aluno' as const,
      recipientCategory: 'aluno' as const,
      timestamp: '12:00',
      createdAt: '2026-11-02T12:00:00Z',
      read: false,
    };
    await AsyncStorage.setItem('@csf:notifications:42', JSON.stringify([syntheticItem]));
    (api.get as jest.Mock).mockResolvedValueOnce({ data: [] });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NotificationProvider>{children}</NotificationProvider>
    );

    const { result } = await renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(1);
    });

    await act(async () => {
      await result.current.markAsRead('expo-1730571234567');
    });

    expect(result.current.notifications[0].read).toBe(true);
    // Verified: api.patch is guarded against non-numeric IDs
    expect(api.patch).not.toHaveBeenCalled();

    const stored = await notificationService.getSavedNotifications(42);
    expect(stored[0].read).toBe(true);
  });

  test('migrates guest notifications into authenticated user storage on mount/login [Finding 4]', async () => {
    const guestItem = {
      id: 'guest-offline-1',
      title: 'Received Offline',
      body: 'Class scheduled before login',
      recipient: 'aluno' as const,
      recipientCategory: 'aluno' as const,
      timestamp: '09:00',
      createdAt: '2026-11-02T09:00:00Z',
      read: false,
    };
    await AsyncStorage.setItem('@csf:notifications:guest', JSON.stringify([guestItem]));
    (api.get as jest.Mock).mockResolvedValueOnce({ data: [] });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NotificationProvider>{children}</NotificationProvider>
    );

    const { result } = await renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(1);
      expect(result.current.notifications[0].id).toBe('guest-offline-1');
    });

    // Check migrated to user storage
    const userStorage = await notificationService.getSavedNotifications(42);
    expect(userStorage).toHaveLength(1);
    expect(userStorage[0].id).toBe('guest-offline-1');

    // Check guest storage was cleared
    const guestStorage = await AsyncStorage.getItem('@csf:notifications:guest');
    expect(guestStorage).toBeNull();
  });

  test('clearAll clears notifications state and local AsyncStorage', async () => {
    (api.get as jest.Mock).mockResolvedValueOnce({
      data: [{ id: 1, titulo: 'To clear', mensagem: 'msg', lida: false }],
    });

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <NotificationProvider>{children}</NotificationProvider>
    );

    const { result } = await renderHook(() => useNotifications(), { wrapper });

    await waitFor(() => {
      expect(result.current.notifications).toHaveLength(1);
    });

    await act(async () => {
      await result.current.clearAll();
    });

    expect(result.current.notifications).toHaveLength(0);
    expect(result.current.unreadCount).toBe(0);

    const stored = await notificationService.getSavedNotifications(42);
    expect(stored).toHaveLength(0);
  });
});
