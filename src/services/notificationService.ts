import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// Configura o comportamento de exibição quando a notificação chega com o app aberto (foreground)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

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
 * Inicializa permissões e canais de notificação no Android e iOS.
 */
export async function registerForNotificationsAsync(): Promise<boolean> {
  if (Platform.OS === 'web') {
    return true;
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

    return finalStatus === 'granted';
  } catch (error) {
    console.warn('Erro ao registrar permissões de notificação:', error);
    return false;
  }
}

/**
 * Dispara uma notificação local no dispositivo.
 */
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
