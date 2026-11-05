import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import {
  registerForPushNotificationsAsync,
  subscribeToNotifications,
  subscribeToNotificationResponses,
  getLastNotificationResponseAsync,
  getPresentedNotificationsAsync,
  mapExpoNotificationToAppItem,
  deduplicateNotifications,
  storePushToken,
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
  formatNotificationTimestamp,
  notifyAppointmentScheduled,
  notifyAppointmentApproved,
  notifyAppointmentCancelled,
  notifyAppointmentRescheduled,
  type AppNotificationData,
  type AppNotificationItem,
  type NotificationRecipient,
  type BackendNotificacaoDTO,
} from '../services/notificationService';
import { api, BASE_URL } from '../services/api';
import { useWebSocket } from '../services/webSocketService';
import { useAuth } from './AuthContext';
import { savePushToken } from '../constants/user';

export type NotifParams = {
  studentName?: string;
  personalName?: string;
  classType?: string;
  date?: string;
  time?: string;
};

export type NotificationContextType = {
  notifications: AppNotificationItem[];
  pushToken: string | null;
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  clearAll: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  /** Aula agendada pelo aluno → notifica o Personal */
  scheduleAppointmentNotification: (params: NotifParams) => Promise<void>;
  /** Personal aprovou → notifica o Aluno */
  scheduleApprovalNotification: (params: NotifParams) => Promise<void>;
  /** Personal cancelou → notifica o Aluno */
  scheduleCancellationNotification: (params: NotifParams) => Promise<void>;
  /** Personal reagendou → notifica o Aluno */
  scheduleRescheduleNotification: (params: NotifParams) => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotificationItem[]>([]);
  const [pushToken, setPushToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { isAuthenticated, user, roles } = useAuth();
  const userId = user?.id ?? null;

  const isNotificationForCurrentUser = useCallback(
    (item: AppNotificationItem): boolean => {
      if (!isAuthenticated) return false;
      const targetEmail = item.data?.targetEmail as string | undefined;
      if (targetEmail && user?.email && targetEmail.toLowerCase() !== user.email.toLowerCase()) {
        return false;
      }
      if (!roles || roles.length === 0) return true;
      const normalizedRoles = roles.map((r) => r.toLowerCase());
      const hasAluno = normalizedRoles.includes('aluno');
      const hasPersonal = normalizedRoles.includes('personal');
      const hasAdmin = normalizedRoles.includes('admin');
      if (hasAdmin || (hasAluno && hasPersonal)) return true;

      const cat = item.recipientCategory || item.recipient;
      if (cat === 'aluno' && !hasAluno) return false;
      if (cat === 'personal' && !hasPersonal) return false;
      return true;
    },
    [isAuthenticated, roles, user?.email]
  );

  // 1. Initial Load from AsyncStorage whenever user changes or on mount
  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    if (!isAuthenticated || !userId) {
      setNotifications([]);
      setIsLoading(false);
      return () => {
        isMounted = false;
      };
    }

    const loadInitial = async () => {
      try {
        await migrateGuestNotifications(userId);
        const saved = (await getSavedNotifications(userId)).filter(isNotificationForCurrentUser);
        if (isMounted) {
          setNotifications(saved);
          setIsLoading(false);
        }
      } catch (error) {
        console.warn('[NotificationContext] Error loading initial notifications:', error);
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadInitial();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, userId, isNotificationForCurrentUser]);

  // 2. Fetch historical notifications from Backend REST API & OS tray on authentication / foreground
  const syncWithBackend = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      setNotifications([]);
      return;
    }

    try {
      await migrateGuestNotifications(userId);

      // Collect any notifications currently in the OS notification tray or tapped on cold start
      const trayItems: AppNotificationItem[] = [];
      const [presented, lastResponse] = await Promise.all([
        getPresentedNotificationsAsync(),
        getLastNotificationResponseAsync(),
      ]);

      if (Array.isArray(presented)) {
        for (const notif of presented) {
          if (notif?.request) {
            trayItems.push(mapExpoNotificationToAppItem(notif, false));
          }
        }
      }

      if (lastResponse?.notification?.request) {
        trayItems.push(mapExpoNotificationToAppItem(lastResponse.notification, false));
      }

      let remoteItems: AppNotificationItem[] = [];
      if (isAuthenticated) {
        const response = await api.get<BackendNotificacaoDTO[]>('/notificacoes');
        if (Array.isArray(response.data)) {
          remoteItems = response.data.map(mapBackendToAppNotificationItem);
        }
      }

      const currentLocal = await getSavedNotifications(userId);

      // Merge remote + OS tray + local (deduplicating by ID and content) and filter by user role
      const merged = deduplicateNotifications([...remoteItems, ...trayItems, ...currentLocal]).filter(
        isNotificationForCurrentUser
      );

      setNotifications(merged);
      await saveNotificationsLocally(merged, userId);
    } catch (error) {
      console.warn('[NotificationContext] Failed to sync notifications with backend:', error);
    }
  }, [isAuthenticated, userId, isNotificationForCurrentUser]);

  useEffect(() => {
    syncWithBackend();
  }, [isAuthenticated, syncWithBackend]);

  // 2b. Re-sync when app returns to active foreground
  const appStateRef = useRef<AppStateStatus>((AppState.currentState as AppStateStatus | null) ?? 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      const wasBackground = appStateRef.current.match(/inactive|background/);
      appStateRef.current = nextState;
      if (wasBackground && nextState === 'active') {
        syncWithBackend();
      }
    });
    return () => {
      sub.remove();
    };
  }, [syncWithBackend]);

  // 3. Live WebSocket STOMP listener
  const handleWebSocketMessage = useCallback(
    (data: unknown) => {
      if (!data || typeof data !== 'object') return;

      const payload = data as Record<string, unknown>;
      const id = String(payload.id || `ws-${Date.now()}`);
      const title = String(payload.titulo || payload.title || 'Notificação');
      const body = String(payload.mensagem || payload.message || '');
      const createdAt = String(payload.createdAt || payload.criadoEm || new Date().toISOString());

      let rawData: Record<string, unknown> = {};
      if (typeof payload.dadosAdicionais === 'string') {
        try {
          rawData = JSON.parse(payload.dadosAdicionais);
        } catch {
          rawData = {};
        }
      } else if (payload.dadosAdicionais && typeof payload.dadosAdicionais === 'object') {
        rawData = payload.dadosAdicionais as Record<string, unknown>;
      } else if (payload.dados || payload.data) {
        rawData = (payload.dados || payload.data || {}) as Record<string, unknown>;
      }

      const recipient = (rawData.recipient as NotificationRecipient) || 'geral';
      let recipientCategory: 'aluno' | 'personal' | 'geral' = 'geral';
      if (recipient === 'aluno') {
        recipientCategory = 'aluno';
      } else if (recipient === 'personal') {
        recipientCategory = 'personal';
      } else {
        recipientCategory = 'geral';
      }

      const normalizedType = normalizeNotificationType((payload.tipo || payload.type) as string);

      const newItem: AppNotificationItem = {
        id,
        title,
        body,
        recipient,
        recipientCategory,
        timestamp: formatNotificationTimestamp(createdAt),
        createdAt,
        read: false,
        data: {
          recipient,
          type: normalizedType,
          ...rawData,
        },
      };

      if (!isNotificationForCurrentUser(newItem)) return;
      setNotifications((prev) => [newItem, ...prev.filter((n) => n.id !== newItem.id)]);
      saveNotificationLocally(newItem, userId);
    },
    [userId, isNotificationForCurrentUser]
  );

  useWebSocket({
    url: BASE_URL,
    isAuthenticated,
    onMessage: handleWebSocketMessage,
  });

  // 4. Mark as read handler definition before listeners
  const markAsRead = useCallback(
    async (id: string) => {
      setNotifications((prev) =>
        prev.map((item) => (item.id === id ? { ...item, read: true } : item))
      );
      await markNotificationAsReadLocally(id, userId);

      // Only invoke backend PATCH if user is authenticated and ID is a valid numeric backend entity ID [Finding 1]
      if (isAuthenticated && isBackendNumericId(id)) {
        try {
          await api.patch(`/notificacoes/${id}/lida`);
        } catch (error) {
          console.warn(`[NotificationContext] Failed to sync read status for ${id} with server:`, error);
        }
      }
    },
    [isAuthenticated, userId]
  );

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
    await markAllNotificationsAsReadLocally(userId);

    if (isAuthenticated) {
      try {
        await api.patch('/notificacoes/todas-lidas');
      } catch (error) {
        console.warn('[NotificationContext] Failed to sync mark-all-read with server:', error);
      }
    }
  }, [isAuthenticated, userId]);

  const clearAll = useCallback(async () => {
    setNotifications([]);
    await clearSavedNotificationsLocally(userId);
  }, [userId]);

  const refreshNotifications = useCallback(async () => {
    await syncWithBackend();
  }, [syncWithBackend]);

  // 5. Remote Expo Notification Reception Listener
  useEffect(() => {
    const subscription = subscribeToNotifications((notificationEvent) => {
      const newItem = mapExpoNotificationToAppItem(notificationEvent, false);
      if (!isNotificationForCurrentUser(newItem)) return;
      setNotifications((prev) => deduplicateNotifications([newItem, ...prev]));
      saveNotificationLocally(newItem, userId);
    });

    const responseSubscription = subscribeToNotificationResponses(async (response) => {
      if (response?.notification?.request) {
        const tappedItem = mapExpoNotificationToAppItem(response.notification, true);
        if (!isNotificationForCurrentUser(tappedItem)) return;
        let resolvedId = tappedItem.id;
        setNotifications((prev) => {
          const merged = deduplicateNotifications([tappedItem, ...prev]);
          const matched = merged.find(
            (n) =>
              n.id === tappedItem.id ||
              (n.title.trim() === tappedItem.title.trim() &&
                n.body.trim() === tappedItem.body.trim())
          );
          if (matched) {
            resolvedId = matched.id;
          }
          return merged.map((n) => (n.id === resolvedId ? { ...n, read: true } : n));
        });
        await saveNotificationLocally({ ...tappedItem, id: resolvedId, read: true }, userId);
        if (resolvedId) {
          await markAsRead(resolvedId);
        }
      }
    });

    return () => {
      subscription?.remove();
      responseSubscription?.remove();
    };
  }, [userId, markAsRead, isNotificationForCurrentUser]);

  // 6. Push Token Registration
  useEffect(() => {
    let active = true;

    if (!isAuthenticated) {
      setPushToken(null);
      return;
    }

    registerForPushNotificationsAsync()
      .then(async (token) => {
        if (!token || !active) return;
        setPushToken(token);
        await savePushToken(token);
        await storePushToken(token);
      })
      .catch((err) => {
        console.warn('[NotificationContext] Push registration error:', err);
      });

    return () => {
      active = false;
    };
  }, [isAuthenticated, userId]);

  // Derived unread counter
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  // Local appointment scheduling helpers
  const scheduleAppointmentNotification = useCallback(
    async ({
      studentName = 'Aluno',
      personalName = 'Personal Trainer',
      classType = 'Presencial',
      date = '',
      time = '',
    }: NotifParams) => {
      await notifyAppointmentScheduled({ studentName, classType, date, time });

      const createdAt = new Date().toISOString();
      const now = formatNotificationTimestamp(createdAt);
      const item: AppNotificationItem = {
        id: `personal-sched-${Date.now()}`,
        title: '🏋️ Nova aula solicitada!',
        body: `O aluno ${studentName} solicitou uma aula de ${classType} para ${date} às ${time}.`,
        recipient: 'personal',
        recipientCategory: 'personal',
        timestamp: now,
        createdAt,
        read: false,
        data: { recipient: 'personal', type: 'APPOINTMENT_SCHEDULED', studentName, personalName, classType, date, time },
      };
      setNotifications((prev) => [item, ...prev]);
      await saveNotificationLocally(item, userId);
    },
    [userId]
  );

  const scheduleApprovalNotification = useCallback(
    async ({
      studentName = 'Aluno',
      personalName = 'Personal',
      classType = 'Aula',
      date = '',
      time = '',
    }: NotifParams) => {
      await notifyAppointmentApproved({ studentName, personalName, classType, date, time });

      const createdAt = new Date().toISOString();
      const now = formatNotificationTimestamp(createdAt);
      const item: AppNotificationItem = {
        id: `aluno-appr-${Date.now()}`,
        title: '✅ Aula confirmada!',
        body: `${personalName} confirmou sua aula de ${classType} para ${date} às ${time}.`,
        recipient: 'aluno',
        recipientCategory: 'aluno',
        timestamp: now,
        createdAt,
        read: false,
        data: { recipient: 'aluno', type: 'APPOINTMENT_APPROVED', studentName, personalName, classType, date, time },
      };
      setNotifications((prev) => [item, ...prev]);
      await saveNotificationLocally(item, userId);
    },
    [userId]
  );

  const scheduleCancellationNotification = useCallback(
    async ({
      studentName = 'Aluno',
      personalName = 'Personal',
      classType = 'Aula',
      date = '',
      time = '',
    }: NotifParams) => {
      await notifyAppointmentCancelled({ studentName, personalName, classType, date, time });

      const createdAt = new Date().toISOString();
      const now = formatNotificationTimestamp(createdAt);
      const item: AppNotificationItem = {
        id: `aluno-cancel-${Date.now()}`,
        title: '❌ Aula cancelada',
        body: `${personalName} cancelou sua aula de ${classType} que estava agendada para ${date} às ${time}.`,
        recipient: 'aluno',
        recipientCategory: 'aluno',
        timestamp: now,
        createdAt,
        read: false,
        data: { recipient: 'aluno', type: 'APPOINTMENT_CANCELLED', studentName, personalName, classType, date, time },
      };
      setNotifications((prev) => [item, ...prev]);
      await saveNotificationLocally(item, userId);
    },
    [userId]
  );

  const scheduleRescheduleNotification = useCallback(
    async ({
      studentName = 'Aluno',
      personalName = 'Personal',
      classType = 'Aula',
      date = '',
      time = '',
    }: NotifParams) => {
      await notifyAppointmentRescheduled({ studentName, personalName, classType, date, time });

      const createdAt = new Date().toISOString();
      const now = formatNotificationTimestamp(createdAt);
      const item: AppNotificationItem = {
        id: `aluno-resched-${Date.now()}`,
        title: '🔄 Aula reagendada',
        body: `${personalName} reagendou sua aula de ${classType} para ${date} às ${time}.`,
        recipient: 'aluno',
        recipientCategory: 'aluno',
        timestamp: now,
        createdAt,
        read: false,
        data: { recipient: 'aluno', type: 'APPOINTMENT_RESCHEDULED', studentName, personalName, classType, date, time },
      };
      setNotifications((prev) => [item, ...prev]);
      await saveNotificationLocally(item, userId);
    },
    [userId]
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        pushToken,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        clearAll,
        refreshNotifications,
        scheduleAppointmentNotification,
        scheduleApprovalNotification,
        scheduleCancellationNotification,
        scheduleRescheduleNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications deve ser utilizado dentro de um NotificationProvider');
  }
  return context;
}
