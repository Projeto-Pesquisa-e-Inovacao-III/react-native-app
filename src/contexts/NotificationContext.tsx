import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as Notifications from 'expo-notifications';
import {
  registerForNotificationsAsync,
  notifyAppointmentScheduled,
  notifyAppointmentApproved,
  notifyAppointmentCancelled,
  notifyAppointmentRescheduled,
  type AppNotificationItem,
  type NotificationRecipient,
} from '../services/notificationService';

type NotifParams = {
  studentName?: string;
  personalName?: string;
  classType?: string;
  date?: string;
  time?: string;
};

type NotificationContextType = {
  notifications: AppNotificationItem[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearAll: () => void;
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

  useEffect(() => {
    registerForNotificationsAsync();

    const subscription = Notifications.addNotificationReceivedListener((notificationEvent) => {
      const { title, body, data } = notificationEvent.request.content;
      const recipient = (data?.recipient as NotificationRecipient) || 'ambos';

      const newItem: AppNotificationItem = {
        id: notificationEvent.request.identifier || String(Date.now()),
        title: title || 'Notificação',
        body: body || '',
        recipient,
        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        read: false,
        data: data as any,
      };

      setNotifications((prev) => [newItem, ...prev]);
    });

    return () => {
      subscription.remove();
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item))
    );
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  /** Aula agendada pelo aluno → notifica o Personal */
  const scheduleAppointmentNotification = useCallback(
    async ({
      studentName = 'Aluno',
      personalName = 'Personal Trainer',
      classType = 'Presencial',
      date = '',
      time = '',
    }: NotifParams) => {
      await notifyAppointmentScheduled({ studentName, classType, date, time });

      const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setNotifications((prev) => [
        {
          id: `personal-sched-${Date.now()}`,
          title: '🏋️ Nova aula solicitada!',
          body: `O aluno ${studentName} solicitou uma aula de ${classType} para ${date} às ${time}.`,
          recipient: 'personal',
          timestamp: now,
          read: false,
          data: { recipient: 'personal', type: 'APPOINTMENT_SCHEDULED', studentName, personalName, classType, date, time },
        },
        ...prev,
      ]);
    },
    []
  );

  /** Personal aprovou → notifica o Aluno */
  const scheduleApprovalNotification = useCallback(
    async ({
      studentName = 'Aluno',
      personalName = 'Personal',
      classType = 'Aula',
      date = '',
      time = '',
    }: NotifParams) => {
      await notifyAppointmentApproved({ studentName, personalName, classType, date, time });

      const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setNotifications((prev) => [
        {
          id: `aluno-appr-${Date.now()}`,
          title: '✅ Aula confirmada!',
          body: `${personalName} confirmou sua aula de ${classType} para ${date} às ${time}.`,
          recipient: 'aluno',
          timestamp: now,
          read: false,
          data: { recipient: 'aluno', type: 'APPOINTMENT_APPROVED', studentName, personalName, classType, date, time },
        },
        ...prev,
      ]);
    },
    []
  );

  /** Personal cancelou → notifica o Aluno */
  const scheduleCancellationNotification = useCallback(
    async ({
      studentName = 'Aluno',
      personalName = 'Personal',
      classType = 'Aula',
      date = '',
      time = '',
    }: NotifParams) => {
      await notifyAppointmentCancelled({ studentName, personalName, classType, date, time });

      const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setNotifications((prev) => [
        {
          id: `aluno-cancel-${Date.now()}`,
          title: '❌ Aula cancelada',
          body: `${personalName} cancelou sua aula de ${classType} agendada para ${date} às ${time}.`,
          recipient: 'aluno',
          timestamp: now,
          read: false,
          data: { recipient: 'aluno', type: 'APPOINTMENT_CANCELLED', studentName, personalName, classType, date, time },
        },
        ...prev,
      ]);
    },
    []
  );

  /** Personal reagendou → notifica o Aluno */
  const scheduleRescheduleNotification = useCallback(
    async ({
      studentName = 'Aluno',
      personalName = 'Personal',
      classType = 'Aula',
      date = '',
      time = '',
    }: NotifParams) => {
      await notifyAppointmentRescheduled({ studentName, personalName, classType, date, time });

      const now = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      setNotifications((prev) => [
        {
          id: `aluno-resched-${Date.now()}`,
          title: '🔄 Aula reagendada',
          body: `${personalName} reagendou sua aula de ${classType} para ${date} às ${time}.`,
          recipient: 'aluno',
          timestamp: now,
          read: false,
          data: { recipient: 'aluno', type: 'APPOINTMENT_RESCHEDULED', studentName, personalName, classType, date, time },
        },
        ...prev,
      ]);
    },
    []
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        clearAll,
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
