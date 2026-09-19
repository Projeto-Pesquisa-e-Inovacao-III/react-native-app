import { Platform } from 'react-native';
import Constants from 'expo-constants';

type NotificationsModule = typeof import('expo-notifications');
type NotificationListener = Parameters<NotificationsModule['addNotificationReceivedListener']>[0];
type NotificationSubscription = ReturnType<NotificationsModule['addNotificationReceivedListener']>;

const isExpoGo =
  Platform.OS === 'web' ||
  Constants.appOwnership === 'expo' ||
  Constants.executionEnvironment === 'storeClient';

let notificationsModulePromise: Promise<NotificationsModule | null> | null = null;

async function getNotificationsModule(): Promise<NotificationsModule | null> {
  if (isExpoGo) {
    return null;
  }

  notificationsModulePromise ??= import('expo-notifications').then((module) => {
    module.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    return module;
  });

  return notificationsModulePromise;
}

export async function subscribeToNotifications(
  listener: NotificationListener,
): Promise<NotificationSubscription> {
  const notifications = await getNotificationsModule();
  return notifications?.addNotificationReceivedListener(listener) ?? { remove: () => {} };
}

export type NotificationRecipient = 'aluno' | 'personal' | 'ambos';

export type AppNotificationData = {
  recipient: NotificationRecipient;
  type: 'APPOINTMENT_SCHEDULED' | 'APPOINTMENT_APPROVED' | 'APPOINTMENT_CANCELLED' | 'APPOINTMENT_RESCHEDULED' | 'GENERAL';
  studentName?: string;
  personalName?: string;
  classType?: string;
  date?: string;
  time?: string;
  [key: string]: unknown;
};

export type AppNotificationItem = {
  id: string;
  title: string;
  body: string;
  recipient: NotificationRecipient;
  timestamp: string;
  read: boolean;
  data?: AppNotificationData;
};

/**
 * Push notifications desativadas (removido expo-notifications).
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) {
    return null;
  }

  try {
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('agendamentos', {
        name: 'Agendamentos e Aulas',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#19587A',
        sound: 'default',
      });
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
    console.warn('Não foi possível obter Expo Push Token:', error);
    return null;
  }
}

/**
 * Inicialização de notificações desativada.
 */
export async function registerForNotificationsAsync(): Promise<boolean> {
  return false;
}

/**
 * Disparo de notificação nativa desativado.
 */
export async function sendLocalNotification({
  title,
  body,
}: {
  title: string;
  body: string;
  data?: AppNotificationData;
  delaySeconds?: number;
}): Promise<string | null> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) {
    console.log(`[Web Notification] ${title}: ${body}`);
    return 'web-notif-' + Date.now();
  }

  try {
    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: 'default',
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
    console.warn('Erro ao disparar notificação local:', error);
    return null;
  }
}

/**
 * Aula agendada pelo aluno → notifica APENAS o Personal.
 */
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

/**
 * Personal aprovou o agendamento → notifica APENAS o Aluno.
 */
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

/**
 * Personal cancelou o agendamento → notifica APENAS o Aluno.
 */
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

/**
 * Personal reagendou a aula → notifica APENAS o Aluno.
 */
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
