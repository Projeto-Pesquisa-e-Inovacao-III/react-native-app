import React from 'react';
import { render, fireEvent, screen } from '@testing-library/react-native';
import NotificationCenterModal from '../NotificationCenterModal';
import { useNotifications } from '../../../contexts/NotificationContext';
import type { AppNotificationItem } from '../../../services/notificationService';

jest.mock('../../../contexts/NotificationContext');

describe('NotificationCenterModal Component', () => {
  const mockMarkAsRead = jest.fn();
  const mockMarkAllAsRead = jest.fn();
  const mockClearAll = jest.fn();
  const mockOnClose = jest.fn();

  const sampleNotifications: AppNotificationItem[] = [
    {
      id: '1',
      title: 'Aula Confirmada',
      body: 'Carlos confirmou sua aula de Musculação',
      recipient: 'aluno',
      recipientCategory: 'aluno',
      timestamp: '14:30',
      createdAt: '2026-11-02T14:30:00Z',
      read: false,
    },
    {
      id: '2',
      title: 'Nova Solicitação',
      body: 'João Silva solicitou uma aula',
      recipient: 'personal',
      recipientCategory: 'personal',
      timestamp: '15:00',
      createdAt: '2026-11-02T15:00:00Z',
      read: true,
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders notification items with title, body, timestamp, and recipient badge', async () => {
    (useNotifications as jest.Mock).mockReturnValue({
      notifications: sampleNotifications,
      unreadCount: 1,
      markAsRead: mockMarkAsRead,
      markAllAsRead: mockMarkAllAsRead,
      clearAll: mockClearAll,
    });

    await render(<NotificationCenterModal visible={true} onClose={mockOnClose} />);

    expect(screen.getByText('Central de Notificações')).toBeOnTheScreen();
    expect(screen.getByText('Aula Confirmada')).toBeOnTheScreen();
    expect(screen.getByText('Carlos confirmou sua aula de Musculação')).toBeOnTheScreen();
    expect(screen.getByText('Para Aluno')).toBeOnTheScreen();
    expect(screen.getByText('14:30')).toBeOnTheScreen();

    expect(screen.getByText('Nova Solicitação')).toBeOnTheScreen();
    expect(screen.getByText('Para Personal')).toBeOnTheScreen();
  });

  test('renders unread badge counter in header when unreadCount > 0', async () => {
    (useNotifications as jest.Mock).mockReturnValue({
      notifications: sampleNotifications,
      unreadCount: 1,
      markAsRead: mockMarkAsRead,
      markAllAsRead: mockMarkAllAsRead,
      clearAll: mockClearAll,
    });

    await render(<NotificationCenterModal visible={true} onClose={mockOnClose} />);

    expect(screen.getByText('1')).toBeOnTheScreen();
  });

  test('tapping on a notification card calls markAsRead with item ID', async () => {
    (useNotifications as jest.Mock).mockReturnValue({
      notifications: sampleNotifications,
      unreadCount: 1,
      markAsRead: mockMarkAsRead,
      markAllAsRead: mockMarkAllAsRead,
      clearAll: mockClearAll,
    });

    await render(<NotificationCenterModal visible={true} onClose={mockOnClose} />);

    fireEvent.press(screen.getByText('Aula Confirmada'));
    expect(mockMarkAsRead).toHaveBeenCalledWith('1');
  });

  test('tapping mark all as read icon calls markAllAsRead', async () => {
    (useNotifications as jest.Mock).mockReturnValue({
      notifications: sampleNotifications,
      unreadCount: 1,
      markAsRead: mockMarkAsRead,
      markAllAsRead: mockMarkAllAsRead,
      clearAll: mockClearAll,
    });

    await render(<NotificationCenterModal visible={true} onClose={mockOnClose} />);

    fireEvent.press(screen.getByLabelText('Marcar todas como lidas'));
    expect(mockMarkAllAsRead).toHaveBeenCalledTimes(1);
  });

  test('tapping clear history icon calls clearAll', async () => {
    (useNotifications as jest.Mock).mockReturnValue({
      notifications: sampleNotifications,
      unreadCount: 1,
      markAsRead: mockMarkAsRead,
      markAllAsRead: mockMarkAllAsRead,
      clearAll: mockClearAll,
    });

    await render(<NotificationCenterModal visible={true} onClose={mockOnClose} />);

    fireEvent.press(screen.getByLabelText('Limpar histórico'));
    expect(mockClearAll).toHaveBeenCalledTimes(1);
  });

  test('displays empty state when notifications list is empty', async () => {
    (useNotifications as jest.Mock).mockReturnValue({
      notifications: [],
      unreadCount: 0,
      markAsRead: mockMarkAsRead,
      markAllAsRead: mockMarkAllAsRead,
      clearAll: mockClearAll,
    });

    await render(<NotificationCenterModal visible={true} onClose={mockOnClose} />);

    expect(screen.getByText('Nenhuma notificação')).toBeOnTheScreen();
    expect(
      screen.getByText('Suas atualizações sobre agendamentos e aulas aparecerão aqui.')
    ).toBeOnTheScreen();
  });
});
