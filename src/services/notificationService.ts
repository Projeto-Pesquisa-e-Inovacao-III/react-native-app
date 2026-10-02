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
  return null;
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
  return null;
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
