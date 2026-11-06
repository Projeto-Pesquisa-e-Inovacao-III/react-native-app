import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Configure top-level notification handler.
 * Ensures that incoming remote Expo notifications display system banners and
 * play notification sounds even when the app is actively in the foreground.
 */
export function registerNotificationHandler(): void {
  if (Platform.OS !== 'web') {
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
          shouldShowBanner: true,
          shouldShowList: true,
        }),
      });
    } catch (error) {
      console.warn('[NotificationService] Failed to set global notification handler:', error);
    }
  }
}

// Auto-register top-level notification handler upon module evaluation
registerNotificationHandler();

export const ANDROID_NOTIFICATION_CHANNEL_ID = 'agendamentos';

export async function setupAndroidNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(ANDROID_NOTIFICATION_CHANNEL_ID, {
      name: 'Agendamentos e Aulas',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#19587A',
      // Omit `sound` to use the system default notification sound.
      // Passing a string (e.g. 'default') is treated as a custom sound file name.
      enableLights: true,
      enableVibrate: true,
      showBadge: true,
    });
  }
}

export type NotificationListener = (
  notification: Notifications.Notification
) => void;

export type NotificationResponseListener = (
  response: Notifications.NotificationResponse
) => void;

export type NotificationSubscription = {
  remove: () => void;
};

export function subscribeToNotifications(
  listener: NotificationListener
): NotificationSubscription {
  if (Platform.OS === 'web') {
    return { remove: () => {} };
  }
  return Notifications.addNotificationReceivedListener(listener);
}

export function subscribeToNotificationResponses(
  listener: NotificationResponseListener
): NotificationSubscription {
  if (Platform.OS === 'web') {
    return { remove: () => {} };
  }
  return Notifications.addNotificationResponseReceivedListener(listener);
}

export async function getLastNotificationResponseAsync(): Promise<Notifications.NotificationResponse | null> {
  if (Platform.OS === 'web') {
    return null;
  }
  try {
    return await Notifications.getLastNotificationResponseAsync();
  } catch (error) {
    console.warn('[NotificationService] Failed to get last notification response:', error);
    return null;
  }
}

export async function getPresentedNotificationsAsync(): Promise<Notifications.Notification[]> {
  if (Platform.OS === 'web') {
    return [];
  }
  try {
    return await Notifications.getPresentedNotificationsAsync();
  } catch (error) {
    console.warn('[NotificationService] Failed to get presented notifications:', error);
    return [];
  }
}

export function mapExpoNotificationToAppItem(
  notification: Notifications.Notification,
  read = false
): AppNotificationItem {
  const { identifier, content } = notification.request;
  const { title, body } = content;
  const rawContentData = (content.data || {}) as Record<string, unknown>;

  // On Android FCM, the Expo custom payload may be nested under data.body (JSON string) or data.data
  let payloadData: Record<string, unknown> = { ...rawContentData };
  if (typeof rawContentData.body === 'string') {
    try {
      const parsedBody = JSON.parse(rawContentData.body);
      if (parsedBody && typeof parsedBody === 'object') {
        payloadData = { ...payloadData, ...parsedBody };
      }
    } catch {
      // ignore non-JSON body
    }
  }

  const id = String(payloadData.id || identifier || `expo-${Date.now()}`);

  let rawExtraData: Record<string, unknown> = {};
  const extraSource = payloadData.dadosAdicionais ?? payloadData.data;
  if (typeof extraSource === 'string') {
    try {
      const parsed = JSON.parse(extraSource);
      if (parsed && typeof parsed === 'object') {
        rawExtraData = parsed as Record<string, unknown>;
      }
    } catch {
      rawExtraData = {};
    }
  } else if (extraSource && typeof extraSource === 'object') {
    rawExtraData = extraSource as Record<string, unknown>;
  }

  const recipient = ((payloadData.recipient || rawExtraData.recipient) as NotificationRecipient) || 'geral';
  let recipientCategory: 'aluno' | 'personal' | 'geral' = 'geral';
  if (recipient === 'aluno') {
    recipientCategory = 'aluno';
  } else if (recipient === 'personal') {
    recipientCategory = 'personal';
  } else {
    recipientCategory = 'geral';
  }

  const normalizedType = normalizeNotificationType((payloadData.type || rawExtraData.type) as string);
  const createdAt =
    typeof payloadData.createdAt === 'string' && payloadData.createdAt
      ? payloadData.createdAt
      : notification.date
      ? new Date(notification.date).toISOString()
      : new Date().toISOString();

  return {
    id,
    title: title || 'Notificação',
    body: body || '',
    recipient,
    recipientCategory,
    timestamp: formatNotificationTimestamp(createdAt),
    createdAt,
    read,
    data: {
      ...rawExtraData,
      ...(payloadData as AppNotificationData),
      recipient,
      type: normalizedType,
    },
  };
}

export type NotificationRecipient = 'aluno' | 'personal' | 'ambos' | 'geral';

/**
 * Domain notification types supporting both Portuguese backend event constants
 * and English UI action identifiers.
 */
export type NotificationType =
  | 'APPOINTMENT_SCHEDULED'
  | 'APPOINTMENT_APPROVED'
  | 'APPOINTMENT_CANCELLED'
  | 'APPOINTMENT_RESCHEDULED'
  | 'APPOINTMENT_COMPLETED'
  | 'APPOINTMENT_ABSENCE'
  | 'GENERAL'
  | 'AGENDAMENTO_CRIADO'
  | 'AGENDAMENTO_APROVADO'
  | 'AGENDAMENTO_CANCELADO'
  | 'AGENDAMENTO_REAGENDADO'
  | 'AGENDAMENTO_CONCLUIDO'
  | 'AGENDAMENTO_AUSENCIA';

/**
 * Bidirectional normalization map ensuring backend Portuguese event names
 * seamlessly map to UI action types.
 */
export const NOTIFICATION_TYPE_MAP: Record<string, NotificationType> = {
  AGENDAMENTO_CRIADO: 'APPOINTMENT_SCHEDULED',
  AGENDAMENTO_APROVADO: 'APPOINTMENT_APPROVED',
  AGENDAMENTO_CANCELADO: 'APPOINTMENT_CANCELLED',
  AGENDAMENTO_REAGENDADO: 'APPOINTMENT_RESCHEDULED',
  AGENDAMENTO_CONCLUIDO: 'APPOINTMENT_COMPLETED',
  AGENDAMENTO_AUSENCIA: 'APPOINTMENT_ABSENCE',
  APPOINTMENT_SCHEDULED: 'APPOINTMENT_SCHEDULED',
  APPOINTMENT_APPROVED: 'APPOINTMENT_APPROVED',
  APPOINTMENT_CANCELLED: 'APPOINTMENT_CANCELLED',
  APPOINTMENT_RESCHEDULED: 'APPOINTMENT_RESCHEDULED',
  APPOINTMENT_COMPLETED: 'APPOINTMENT_COMPLETED',
  APPOINTMENT_ABSENCE: 'APPOINTMENT_ABSENCE',
  GENERAL: 'GENERAL',
};

export function normalizeNotificationType(rawType?: string | null): NotificationType {
  if (!rawType) return 'GENERAL';
  const upper = String(rawType).trim().toUpperCase();
  return NOTIFICATION_TYPE_MAP[upper] || (upper as NotificationType);
}

export interface AppNotificationData {
  recipient?: NotificationRecipient;
  type?: NotificationType;
  studentName?: string;
  personalName?: string;
  classType?: string;
  date?: string;
  time?: string;
  [key: string]: unknown;
}

export interface AppNotificationItem {
  id: string; // Backend numeric ID as string or UUID/timestamp for local events
  title: string;
  body: string;
  recipient: NotificationRecipient;
  recipientCategory?: 'aluno' | 'personal' | 'geral';
  timestamp: string; // Formatted time for UI display
  createdAt: string; // ISO-8601 string for accurate sorting
  read: boolean;
  data?: AppNotificationData;
}

export interface BackendNotificacaoDTO {
  id: number | string;
  titulo?: string;
  title?: string;
  mensagem?: string;
  body?: string;
  tipo?: string;
  type?: string;
  lida?: boolean;
  read?: boolean;
  createdAt?: string;
  criadoEm?: string;
  dadosAdicionais?: string | Record<string, unknown> | null;
  dados?: Record<string, unknown>;
  data?: Record<string, unknown>;
}

export function formatNotificationTimestamp(dateString?: string): string {
  try {
    const date = dateString ? new Date(dateString) : new Date();
    if (isNaN(date.getTime())) {
      return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    const today = new Date();
    const isToday =
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear();

    if (isToday) {
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    }
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month} ${hours}:${minutes}`;
  } catch {
    return '';
  }
}

/**
 * Converts a BackendNotificacaoDTO into an AppNotificationItem.
 * Robustly parses dadosAdicionais (handling JSON string or direct object),
 * extracts recipient and metadata, assigns recipientCategory, and normalizes notification type.
 */
export function mapBackendToAppNotificationItem(dto: BackendNotificacaoDTO): AppNotificationItem {
  const title = dto.titulo || dto.title || 'Notificação';
  const body = dto.mensagem || dto.body || '';
  const isRead = Boolean(dto.lida ?? dto.read ?? false);
  const rawDate = dto.createdAt || dto.criadoEm || new Date().toISOString();

  let rawData: Record<string, unknown> = {};
  if (typeof dto.dadosAdicionais === 'string') {
    try {
      rawData = JSON.parse(dto.dadosAdicionais);
    } catch {
      rawData = {};
    }
  } else if (dto.dadosAdicionais && typeof dto.dadosAdicionais === 'object') {
    rawData = dto.dadosAdicionais as Record<string, unknown>;
  } else if (dto.dados || dto.data) {
    rawData = (dto.dados || dto.data || {}) as Record<string, unknown>;
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

  const normalizedType = normalizeNotificationType(dto.tipo || dto.type);

  return {
    id: String(dto.id),
    title,
    body,
    recipient,
    recipientCategory,
    timestamp: formatNotificationTimestamp(rawDate),
    createdAt: rawDate,
    read: isRead,
    data: {
      recipient,
      type: normalizedType,
      ...rawData,
    },
  };
}

const PUSH_TOKEN_STORAGE_KEY = 'expo_push_token';

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    if (Platform.OS === 'android') {
      await setupAndroidNotificationChannel();
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ??
      Constants?.easConfig?.projectId;

    const pushTokenData = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    return pushTokenData.data;
  } catch (error) {
    console.warn('[NotificationService] Não foi possível obter Expo Push Token:', error);
    return null;
  }
}

export async function getStoredPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(PUSH_TOKEN_STORAGE_KEY);
}

export async function storePushToken(token: string): Promise<void> {
  await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, token);
}

export async function dismissAllNotificationsAsync(): Promise<void> {
  if (Platform.OS === 'web') {
    return;
  }
  try {
    await Notifications.dismissAllNotificationsAsync?.();
  } catch (error) {
    console.warn('[NotificationService] Failed to dismiss tray notifications:', error);
  }
}

export async function clearStoredPushToken(): Promise<void> {
  await AsyncStorage.removeItem(PUSH_TOKEN_STORAGE_KEY);
}

export async function registerForNotificationsAsync(): Promise<boolean> {
  return false;
}

export function getNotificationStorageKey(userId?: string | number | null): string {
  if (userId !== undefined && userId !== null && String(userId).trim() !== '') {
    return `@csf:notifications:${String(userId).trim()}`;
  }
  return '@csf:notifications:guest';
}

export async function getSavedNotifications(
  userId?: string | number | null
): Promise<AppNotificationItem[]> {
  const key = getNotificationStorageKey(userId);
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      console.warn(`[NotificationService] Unexpected data structure in ${key}, resetting.`);
      await AsyncStorage.setItem(key, JSON.stringify([]));
      return [];
    }
    return parsed.sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  } catch (error) {
    console.warn(`[NotificationService] Error reading notifications from ${key}:`, error);
    return [];
  }
}

export function deduplicateNotifications(items: AppNotificationItem[]): AppNotificationItem[] {
  const map = new Map<string, AppNotificationItem>();

  for (const item of items) {
    if (!item || !item.id) continue;

    // 1. Check exact ID match first
    let matchKey = map.has(item.id) ? item.id : null;

    // 2. If one item has a backend numeric ID and another has a synthetic OS tray ID
    // for the same event (matching title + body within 2 minutes), merge them into the backend ID
    if (!matchKey) {
      const itemTime = new Date(item.createdAt || 0).getTime();
      for (const [key, existing] of map.entries()) {
        const sameContent =
          existing.title.trim() === item.title.trim() &&
          existing.body.trim() === item.body.trim();
        if (!sameContent) continue;

        const existingIsNumeric = isBackendNumericId(existing.id);
        const itemIsNumeric = isBackendNumericId(item.id);
        if (existingIsNumeric !== itemIsNumeric) {
          const existingTime = new Date(existing.createdAt || 0).getTime();
          if (Math.abs(itemTime - existingTime) <= 120_000) {
            matchKey = key;
            break;
          }
        }
      }
    }

    if (!matchKey) {
      map.set(item.id, item);
    } else {
      const existing = map.get(matchKey)!;
      const preferItemId = isBackendNumericId(item.id) && !isBackendNumericId(existing.id);
      const preferredId = preferItemId ? item.id : existing.id;
      const preferredRecipient =
        existing.recipient !== 'geral' ? existing.recipient : item.recipient;
      const preferredCategory =
        existing.recipientCategory && existing.recipientCategory !== 'geral'
          ? existing.recipientCategory
          : item.recipientCategory || 'geral';

      const mergedItem: AppNotificationItem = {
        ...existing,
        ...item,
        id: preferredId,
        recipient: preferredRecipient,
        recipientCategory: preferredCategory,
        read: existing.read || item.read,
        data: {
          ...item.data,
          ...existing.data,
          recipient: preferredRecipient,
        },
      };

      if (preferredId !== matchKey) {
        map.delete(matchKey);
      }
      map.set(preferredId, mergedItem);
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
  );
}

export async function saveNotificationsLocally(
  items: AppNotificationItem[],
  userId?: string | number | null
): Promise<void> {
  const key = getNotificationStorageKey(userId);
  try {
    const deduplicated = deduplicateNotifications(items);
    await AsyncStorage.setItem(key, JSON.stringify(deduplicated));
  } catch (error) {
    console.warn(`[NotificationService] Error saving notifications to ${key}:`, error);
  }
}

export async function saveNotificationLocally(
  item: AppNotificationItem,
  userId?: string | number | null
): Promise<void> {
  const existing = await getSavedNotifications(userId);
  await saveNotificationsLocally([item, ...existing], userId);
}

export async function markNotificationAsReadLocally(
  id: string,
  userId?: string | number | null
): Promise<void> {
  const existing = await getSavedNotifications(userId);
  const updated = existing.map((item) =>
    item.id === id ? { ...item, read: true } : item
  );
  await saveNotificationsLocally(updated, userId);
}

export async function markAllNotificationsAsReadLocally(
  userId?: string | number | null
): Promise<void> {
  const existing = await getSavedNotifications(userId);
  const updated = existing.map((item) => ({ ...item, read: true }));
  await saveNotificationsLocally(updated, userId);
}

export async function clearSavedNotificationsLocally(
  userId?: string | number | null
): Promise<void> {
  const key = getNotificationStorageKey(userId);
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.warn(`[NotificationService] Error clearing notifications from ${key}:`, error);
  }
}

export async function migrateGuestNotifications(
  userId?: string | number | null
): Promise<void> {
  if (userId === undefined || userId === null || String(userId).trim() === '') {
    return;
  }
  const guestKey = '@csf:notifications:guest';
  try {
    const rawGuest = await AsyncStorage.getItem(guestKey);
    if (!rawGuest) {
      return;
    }
    const guestItems: AppNotificationItem[] = JSON.parse(rawGuest);
    if (!Array.isArray(guestItems) || guestItems.length === 0) {
      await AsyncStorage.removeItem(guestKey);
      return;
    }

    const userItems = await getSavedNotifications(userId);
    await saveNotificationsLocally([...guestItems, ...userItems], userId);
    await AsyncStorage.removeItem(guestKey);
  } catch (error) {
    console.warn('[NotificationService] Error migrating guest notifications:', error);
  }
}

export function isBackendNumericId(id: string | number): boolean {
  if (id === undefined || id === null) return false;
  const str = String(id).trim();
  return /^\d+$/.test(str) && Number(str) > 0;
}

export async function sendLocalNotification({
  title,
  body,
  data,
  delaySeconds = 0,
}: {
  title: string;
  body: string;
  data?: AppNotificationData;
  delaySeconds?: number;
}): Promise<string | null> {
  if (Platform.OS === 'web') {
    console.log(`[Web Notification] ${title}: ${body}`);
    return 'web-notif-' + Date.now();
  }

  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: true, // `true` = system default sound; strings are custom sound file names
        data: data || {},
      },
      trigger:
        delaySeconds > 0
          ? {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: delaySeconds,
            }
          : null,
    });

    return identifier;
  } catch (error) {
    console.warn('[NotificationService] Erro ao disparar notificação local:', error);
    return null;
  }
}

export async function notifyAppointmentScheduled({
  studentName = 'Aluno',
  classType = 'Presencial',
  date = '',
  time = '',
}: {
  studentName?: string;
  classType?: string;
  date?: string;
  time?: string;
}): Promise<string | null> {
  return sendLocalNotification({
    title: '🏋️ Nova aula solicitada!',
    body: `O aluno ${studentName} solicitou uma aula de ${classType} para ${date} às ${time}.`,
    data: {
      recipient: 'personal',
      type: 'APPOINTMENT_SCHEDULED',
      studentName,
      classType,
      date,
      time,
    },
  });
}

export async function notifyAppointmentApproved({
  studentName = 'Aluno',
  personalName = 'Personal',
  classType = 'Aula',
  date = '',
  time = '',
}: {
  studentName?: string;
  personalName?: string;
  classType?: string;
  date?: string;
  time?: string;
}): Promise<string | null> {
  return sendLocalNotification({
    title: '✅ Aula confirmada!',
    body: `${personalName} confirmou sua aula de ${classType} para ${date} às ${time}.`,
    data: {
      recipient: 'aluno',
      type: 'APPOINTMENT_APPROVED',
      studentName,
      personalName,
      classType,
      date,
      time,
    },
  });
}

export async function notifyAppointmentCancelled({
  studentName = 'Aluno',
  personalName = 'Personal',
  classType = 'Aula',
  date = '',
  time = '',
}: {
  studentName?: string;
  personalName?: string;
  classType?: string;
  date?: string;
  time?: string;
}): Promise<string | null> {
  return sendLocalNotification({
    title: '❌ Aula cancelada',
    body: `${personalName} cancelou sua aula de ${classType} que estava agendada para ${date} às ${time}.`,
    data: {
      recipient: 'aluno',
      type: 'APPOINTMENT_CANCELLED',
      studentName,
      personalName,
      classType,
      date,
      time,
    },
  });
}

export async function notifyAppointmentRescheduled({
  studentName = 'Aluno',
  personalName = 'Personal',
  classType = 'Aula',
  date = '',
  time = '',
}: {
  studentName?: string;
  personalName?: string;
  classType?: string;
  date?: string;
  time?: string;
}): Promise<string | null> {
  return sendLocalNotification({
    title: '🔄 Aula reagendada',
    body: `${personalName} reagendou sua aula de ${classType} para ${date} às ${time}.`,
    data: {
      recipient: 'aluno',
      type: 'APPOINTMENT_RESCHEDULED',
      studentName,
      personalName,
      classType,
      date,
      time,
    },
  });
}
