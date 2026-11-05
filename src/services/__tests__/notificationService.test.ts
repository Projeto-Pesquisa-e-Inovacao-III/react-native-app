import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import {
  getNotificationStorageKey,
  getSavedNotifications,
  saveNotificationLocally,
  saveNotificationsLocally,
  markNotificationAsReadLocally,
  markAllNotificationsAsReadLocally,
  clearSavedNotificationsLocally,
  migrateGuestNotifications,
  isBackendNumericId,
  normalizeNotificationType,
  mapBackendToAppNotificationItem,
  registerNotificationHandler,
  type AppNotificationItem,
  type BackendNotificacaoDTO,
} from '../notificationService';

describe('Notification Persistence Service', () => {
  const userId = '42';
  const userStorageKey = '@csf:notifications:42';
  const guestStorageKey = '@csf:notifications:guest';

  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  describe('Storage Key Conventions', () => {
    test('resolves user storage key for valid numeric or string user ID', () => {
      expect(getNotificationStorageKey('42')).toBe(userStorageKey);
      expect(getNotificationStorageKey(42)).toBe(userStorageKey);
    });

    test('resolves fallback guest storage key when user ID is missing or null', () => {
      expect(getNotificationStorageKey(null)).toBe(guestStorageKey);
      expect(getNotificationStorageKey(undefined)).toBe(guestStorageKey);
      expect(getNotificationStorageKey('')).toBe(guestStorageKey);
    });
  });

  describe('CRUD Operations', () => {
    const sampleItem: AppNotificationItem = {
      id: '101',
      title: 'Aula Confirmada',
      body: 'Carlos confirmou sua aula',
      recipient: 'aluno',
      recipientCategory: 'aluno',
      timestamp: '14:00',
      createdAt: '2026-11-02T14:00:00Z',
      read: false,
    };

    test('getSavedNotifications returns empty array when storage is empty', async () => {
      const items = await getSavedNotifications(userId);
      expect(items).toEqual([]);
    });

    test('saveNotificationLocally saves an item under the correct storage key', async () => {
      await saveNotificationLocally(sampleItem, userId);
      const items = await getSavedNotifications(userId);

      expect(items).toHaveLength(1);
      expect(items[0]).toEqual(sampleItem);
    });

    test('saveNotificationsLocally deduplicates items by ID and updates read state', async () => {
      const itemUnread: AppNotificationItem = { ...sampleItem, read: false };
      const itemRead: AppNotificationItem = { ...sampleItem, read: true, body: 'Updated body' };

      await saveNotificationsLocally([itemUnread, itemRead], userId);
      const items = await getSavedNotifications(userId);

      expect(items).toHaveLength(1);
      expect(items[0].read).toBe(true);
      expect(items[0].body).toBe('Updated body');
    });

    test('orders items descending by createdAt (newest first)', async () => {
      const older: AppNotificationItem = {
        id: '1',
        title: 'Older',
        body: 'Body 1',
        recipient: 'aluno',
        recipientCategory: 'aluno',
        timestamp: '10:00',
        createdAt: '2026-11-01T10:00:00Z',
        read: true,
      };
      const newer: AppNotificationItem = {
        id: '2',
        title: 'Newer',
        body: 'Body 2',
        recipient: 'aluno',
        recipientCategory: 'aluno',
        timestamp: '12:00',
        createdAt: '2026-11-02T12:00:00Z',
        read: false,
      };

      await saveNotificationsLocally([older, newer], userId);
      const items = await getSavedNotifications(userId);

      expect(items[0].id).toBe('2');
      expect(items[1].id).toBe('1');
    });

    test('markNotificationAsReadLocally updates read status of the target notification', async () => {
      await saveNotificationLocally(sampleItem, userId);
      await markNotificationAsReadLocally('101', userId);

      const items = await getSavedNotifications(userId);
      expect(items[0].read).toBe(true);
    });

    test('markAllNotificationsAsReadLocally updates all notifications to read: true', async () => {
      const item1: AppNotificationItem = { ...sampleItem, id: '1', read: false };
      const item2: AppNotificationItem = { ...sampleItem, id: '2', read: false };

      await saveNotificationsLocally([item1, item2], userId);
      await markAllNotificationsAsReadLocally(userId);

      const items = await getSavedNotifications(userId);
      expect(items.every((i) => i.read)).toBe(true);
    });

    test('clearSavedNotificationsLocally removes all notifications for user', async () => {
      await saveNotificationLocally(sampleItem, userId);
      await clearSavedNotificationsLocally(userId);

      const items = await getSavedNotifications(userId);
      expect(items).toEqual([]);
    });

    test('gracefully recovers from corrupted JSON in AsyncStorage', async () => {
      await AsyncStorage.setItem(userStorageKey, 'corrupted{json');
      const items = await getSavedNotifications(userId);

      expect(items).toEqual([]);
    });
  });

  describe('Guest Notification Migration [Finding 4]', () => {
    test('migrates guest notifications into authenticated user storage, deduplicates, and clears guest key', async () => {
      const guestItem: AppNotificationItem = {
        id: 'guest-1',
        title: 'Guest Notification',
        body: 'Pre-login notification',
        recipient: 'aluno',
        recipientCategory: 'aluno',
        timestamp: '11:00',
        createdAt: '2026-11-02T11:00:00Z',
        read: false,
      };
      const userItem: AppNotificationItem = {
        id: 'user-1',
        title: 'User Notification',
        body: 'Existing user notification',
        recipient: 'aluno',
        recipientCategory: 'aluno',
        timestamp: '10:00',
        createdAt: '2026-11-02T10:00:00Z',
        read: true,
      };

      await AsyncStorage.setItem(guestStorageKey, JSON.stringify([guestItem]));
      await AsyncStorage.setItem(userStorageKey, JSON.stringify([userItem]));

      await migrateGuestNotifications(userId);

      const userItems = await getSavedNotifications(userId);
      expect(userItems).toHaveLength(2);
      expect(userItems.find((n) => n.id === 'guest-1')).toBeDefined();
      expect(userItems.find((n) => n.id === 'user-1')).toBeDefined();

      // Verify guest storage key was removed
      const remainingGuest = await AsyncStorage.getItem(guestStorageKey);
      expect(remainingGuest).toBeNull();
    });

    test('does nothing when guest storage is empty or nonexistent', async () => {
      await migrateGuestNotifications(userId);
      const userItems = await getSavedNotifications(userId);
      expect(userItems).toEqual([]);
    });
  });

  describe('Backend Numeric ID Validation [Finding 1]', () => {
    test('identifies valid numeric backend entity IDs', () => {
      expect(isBackendNumericId('1')).toBe(true);
      expect(isBackendNumericId('42')).toBe(true);
      expect(isBackendNumericId('999999')).toBe(true);
      expect(isBackendNumericId(100)).toBe(true);
    });

    test('rejects synthetic, UUID, or non-numeric IDs', () => {
      expect(isBackendNumericId('expo-1730571234567')).toBe(false);
      expect(isBackendNumericId('ws-1730571234567')).toBe(false);
      expect(isBackendNumericId('e192e4ab-8a4d-4e9b-b0b2-1234567890ab')).toBe(false);
      expect(isBackendNumericId('abc')).toBe(false);
      expect(isBackendNumericId('')).toBe(false);
      expect(isBackendNumericId(null as any)).toBe(false);
      expect(isBackendNumericId(undefined as any)).toBe(false);
    });
  });

  describe('Backend DTO Mapping', () => {
    test('maps BackendNotificacaoDTO to AppNotificationItem correctly', () => {
      const dto: BackendNotificacaoDTO = {
        id: 99,
        titulo: 'Aula Criada',
        mensagem: 'Nova solicitação de aula',
        tipo: 'APPOINTMENT_SCHEDULED',
        lida: false,
        createdAt: '2026-11-02T15:30:00Z',
        dados: { recipient: 'personal' },
      };

      const mapped = mapBackendToAppNotificationItem(dto);

      expect(mapped.id).toBe('99');
      expect(mapped.title).toBe('Aula Criada');
      expect(mapped.body).toBe('Nova solicitação de aula');
      expect(mapped.recipient).toBe('personal');
      expect(mapped.recipientCategory).toBe('personal');
      expect(mapped.read).toBe(false);
      expect(mapped.data?.type).toBe('APPOINTMENT_SCHEDULED');
    });

    test('parses serialized JSON string in dadosAdicionais and extracts recipient [Finding 3]', () => {
      const dto: BackendNotificacaoDTO = {
        id: 10,
        titulo: 'Nova Solicitação',
        mensagem: 'Aula de Pilates solicitada',
        tipo: 'AGENDAMENTO_CRIADO',
        lida: false,
        createdAt: '2026-11-02T16:00:00Z',
        dadosAdicionais: JSON.stringify({ recipient: 'personal', studentName: 'Lucas' }),
      };

      const mapped = mapBackendToAppNotificationItem(dto);

      expect(mapped.id).toBe('10');
      expect(mapped.recipient).toBe('personal');
      expect(mapped.recipientCategory).toBe('personal');
      expect(mapped.data?.recipient).toBe('personal');
      expect(mapped.data?.studentName).toBe('Lucas');
      expect(mapped.data?.type).toBe('APPOINTMENT_SCHEDULED');
    });

    test('parses pre-parsed object in dadosAdicionais [Finding 3]', () => {
      const dto: BackendNotificacaoDTO = {
        id: 11,
        titulo: 'Aula Confirmada',
        mensagem: 'Sua aula foi confirmada',
        tipo: 'AGENDAMENTO_APROVADO',
        lida: true,
        createdAt: '2026-11-02T16:30:00Z',
        dadosAdicionais: { recipient: 'aluno', personalName: 'Carlos Personal' },
      };

      const mapped = mapBackendToAppNotificationItem(dto);

      expect(mapped.recipient).toBe('aluno');
      expect(mapped.recipientCategory).toBe('aluno');
      expect(mapped.data?.personalName).toBe('Carlos Personal');
      expect(mapped.data?.type).toBe('APPOINTMENT_APPROVED');
      expect(mapped.read).toBe(true);
    });

    test('normalizes Portuguese domain event constants to UI types [Finding 5]', () => {
      expect(normalizeNotificationType('AGENDAMENTO_CRIADO')).toBe('APPOINTMENT_SCHEDULED');
      expect(normalizeNotificationType('AGENDAMENTO_APROVADO')).toBe('APPOINTMENT_APPROVED');
      expect(normalizeNotificationType('AGENDAMENTO_CANCELADO')).toBe('APPOINTMENT_CANCELLED');
      expect(normalizeNotificationType('AGENDAMENTO_REAGENDADO')).toBe('APPOINTMENT_RESCHEDULED');
      expect(normalizeNotificationType('AGENDAMENTO_CONCLUIDO')).toBe('APPOINTMENT_COMPLETED');
      expect(normalizeNotificationType('AGENDAMENTO_AUSENCIA')).toBe('APPOINTMENT_ABSENCE');
      expect(normalizeNotificationType('APPOINTMENT_SCHEDULED')).toBe('APPOINTMENT_SCHEDULED');
      expect(normalizeNotificationType('UNKNOWN_EVENT')).toBe('UNKNOWN_EVENT');
      expect(normalizeNotificationType(null)).toBe('GENERAL');
    });
  });

  describe('Global Notification Handler Configuration', () => {
    test('verifies setNotificationHandler was called with system banner properties', async () => {
      registerNotificationHandler();

      expect(Notifications.setNotificationHandler).toHaveBeenCalledWith({
        handleNotification: expect.any(Function),
      });

      const calls = (Notifications.setNotificationHandler as jest.Mock).mock.calls;
      const lastCallConfig = calls[calls.length - 1][0];
      const handlerResult = await lastCallConfig.handleNotification();

      expect(handlerResult).toEqual({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      });
    });
  });
});
