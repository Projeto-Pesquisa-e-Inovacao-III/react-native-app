import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Bell, CheckCheck, Trash2, X, Send, User, Award, ShieldAlert } from 'lucide-react-native';
import { useNotifications } from '../../contexts/NotificationContext';
import type { NotificationRecipient } from '../../services/notificationService';

type Props = {
  visible: boolean;
  onClose: () => void;
};

export default function NotificationCenterModal({ visible, onClose }: Props) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAll,
    scheduleAppointmentNotification,
  } = useNotifications();

  const [activeFilter, setActiveFilter] = useState<'all' | 'aluno' | 'personal'>('all');

  const filteredNotifications = notifications.filter((item) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'aluno') return item.recipient === 'aluno' || item.recipient === 'ambos';
    if (activeFilter === 'personal') return item.recipient === 'personal' || item.recipient === 'ambos';
    return true;
  });

  const handleTestNotification = async () => {
    await scheduleAppointmentNotification({
      studentName: 'Gabriel (Aluno)',
      personalName: 'Carlos Silva (Personal)',
      classType: 'Funcional',
      date: 'Hoje',
      time: '19:00',
    });
  };

  const getRecipientBadge = (recipient: NotificationRecipient) => {
    switch (recipient) {
      case 'aluno':
        return {
          label: 'Para Aluno',
          bg: '#EAFBF1',
          color: '#127B49',
          icon: <User size={12} color="#127B49" />,
        };
      case 'personal':
        return {
          label: 'Para Personal',
          bg: '#F3E8FF',
          color: '#7E22CE',
          icon: <Award size={12} color="#7E22CE" />,
        };
      default:
        return {
          label: 'Geral',
          bg: '#EEF4FF',
          color: '#1D4ED8',
          icon: <Bell size={12} color="#1D4ED8" />,
        };
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <SafeAreaView style={styles.modalOverlay}>
        <View style={styles.container}>
          {/* Cabeçalho */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Bell size={22} color="#19587A" />
              <Text style={styles.headerTitle}>Central de Notificações</Text>
              {unreadCount > 0 && (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadCount}</Text>
                </View>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Subtítulo explicativo */}
          <Text style={styles.subtitle}>
            Acompanhe em tempo real as notificações geradas para o celular do Aluno e do Personal.
          </Text>

          {/* Filtros por perfil */}
          <View style={styles.filterRow}>
            <TouchableOpacity
              style={[styles.filterChip, activeFilter === 'all' && styles.filterChipActive]}
              onPress={() => setActiveFilter('all')}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.filterChipText, activeFilter === 'all' && styles.filterChipTextActive]}
              >
                Todas ({notifications.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, activeFilter === 'aluno' && styles.filterChipActive]}
              onPress={() => setActiveFilter('aluno')}
              activeOpacity={0.8}
            >
              <Text
                style={[styles.filterChipText, activeFilter === 'aluno' && styles.filterChipTextActive]}
              >
                Aluno
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterChip, activeFilter === 'personal' && styles.filterChipActive]}
              onPress={() => setActiveFilter('personal')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.filterChipText,
                  activeFilter === 'personal' && styles.filterChipTextActive,
                ]}
              >
                Personal
              </Text>
            </TouchableOpacity>
          </View>

          {/* Botão de teste e ações em lote */}
          <View style={styles.actionToolbar}>
            <TouchableOpacity
              style={styles.testButton}
              onPress={handleTestNotification}
              activeOpacity={0.8}
            >
              <Send size={14} color="#FFFFFF" />
              <Text style={styles.testButtonText}>Testar Notificação Dupla</Text>
            </TouchableOpacity>

            <View style={styles.secondaryActions}>
              <TouchableOpacity
                style={styles.iconAction}
                onPress={markAllAsRead}
                accessibilityLabel="Marcar todas como lidas"
              >
                <CheckCheck size={18} color="#19587A" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.iconAction}
                onPress={clearAll}
                accessibilityLabel="Limpar histórico"
              >
                <Trash2 size={18} color="#EF4444" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Lista de Notificações */}
          <ScrollView
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          >
            {filteredNotifications.length === 0 ? (
              <View style={styles.emptyState}>
                <Bell size={40} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>Nenhuma notificação</Text>
                <Text style={styles.emptySubtitle}>
                  Quando uma aula for agendada, as mensagens do aluno e do personal aparecerão aqui.
                </Text>
              </View>
            ) : (
              filteredNotifications.map((item) => {
                const badge = getRecipientBadge(item.recipient);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.notificationCard, !item.read && styles.unreadCard]}
                    onPress={() => markAsRead(item.id)}
                    activeOpacity={0.9}
                  >
                    <View style={styles.cardTopRow}>
                      <View style={[styles.recipientBadge, { backgroundColor: badge.bg }]}>
                        {badge.icon}
                        <Text style={[styles.recipientText, { color: badge.color }]}>
                          {badge.label}
                        </Text>
                      </View>
                      <Text style={styles.timestamp}>{item.timestamp}</Text>
                    </View>

                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardBody}>{item.body}</Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    minHeight: '60%',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
  },
  unreadBadge: {
    backgroundColor: '#EF4444',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 4,
  },
  unreadBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  closeButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 18,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
  },
  filterChipActive: {
    backgroundColor: '#19587A',
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475467',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
  },
  actionToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#19587A',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
  },
  testButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  iconAction: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 20,
    gap: 10,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    maxWidth: 260,
  },
  notificationCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  unreadCard: {
    backgroundColor: '#F0F9FF',
    borderColor: '#BAE6FD',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  recipientBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  recipientText: {
    fontSize: 11,
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  cardBody: {
    fontSize: 13,
    color: '#475467',
    lineHeight: 18,
  },
});
