import React from 'react';
import { Modal, View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { AlertTriangle, ChevronLeft, ChevronRight, X } from 'lucide-react-native';
import { SchedulesPageItem, PaginationInfo } from '../../models/availability';

interface InfoPersonalSchedulesModalProps {
  visible: boolean;
  schedules: SchedulesPageItem[];
  pagination: PaginationInfo | null;
  onPageChange: (page: number) => void;
  onClose: () => void;
  onConfirm: () => void;
}

export default function InfoPersonalSchedulesModal({
  visible,
  schedules,
  pagination,
  onPageChange,
  onClose,
  onConfirm,
}: InfoPersonalSchedulesModalProps) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.content}>
          {/* Cabeçalho */}
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <AlertTriangle color="#F59E0B" size={24} />
              <Text style={styles.title}>Atenção</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
              <X color="#64748B" size={20} />
            </Pressable>
          </View>

          {/* Mensagem Principal */}
          <Text style={styles.description}>
            Você possui alunos agendados para este dia. Ao desabilitar, o dia ficará oculto para novos agendamentos, mas os compromissos atuais serão mantidos.
          </Text>

          {/* Lista de Agendamentos */}
          <View style={styles.listContainer}>
            <Text style={styles.listTitle}>Agendamentos afetados:</Text>
            {schedules.map((item) => (
              <View key={item.id} style={styles.scheduleItem}>
                <View style={styles.avatar}>
                  {item.pathImage ? (
                    <Image source={{ uri: item.pathImage }} style={styles.avatarImage} />
                  ) : (
                    <Text style={styles.avatarText}>
                      {item.alunoName.charAt(0).toUpperCase()}
                    </Text>
                  )}
                </View>
                <View style={styles.scheduleInfo}>
                  <Text style={styles.alunoName} numberOfLines={1}>
                    {item.alunoName}
                  </Text>
                  <Text style={styles.scheduleDate}>{item.data}</Text>
                </View>
              </View>
            ))}
            {schedules.length === 0 && (
              <Text style={styles.emptyText}>Nenhum agendamento encontrado.</Text>
            )}
          </View>

          {/* Paginação */}
          {pagination && pagination.totalPages > 1 && (
            <View style={styles.pagination}>
              <Pressable
                style={[styles.pageButton, pagination.number === 0 && styles.pageButtonDisabled]}
                disabled={pagination.number === 0}
                onPress={() => onPageChange(pagination.number - 1)}
              >
                <ChevronLeft color={pagination.number === 0 ? "#CBD5E1" : "#475569"} size={20} />
              </Pressable>
              
              <Text style={styles.pageText}>
                {pagination.number + 1} de {pagination.totalPages}
              </Text>
              
              <Pressable
                style={[
                  styles.pageButton, 
                  pagination.number >= pagination.totalPages - 1 && styles.pageButtonDisabled
                ]}
                disabled={pagination.number >= pagination.totalPages - 1}
                onPress={() => onPageChange(pagination.number + 1)}
              >
                <ChevronRight 
                  color={pagination.number >= pagination.totalPages - 1 ? "#CBD5E1" : "#475569"} 
                  size={20} 
                />
              </Pressable>
            </View>
          )}

          {/* Botões de Ação */}
          <View style={styles.footer}>
            <Pressable style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </Pressable>
            <Pressable style={styles.confirmButton} onPress={onConfirm}>
              <Text style={styles.confirmButtonText}>Desabilitar mesmo assim</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  closeBtn: {
    padding: 4,
  },
  description: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 20,
    marginBottom: 20,
  },
  listContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  listTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  scheduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  scheduleInfo: {
    flex: 1,
  },
  alunoName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  scheduleDate: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
    textAlign: 'center',
    paddingVertical: 12,
  },
  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 20,
  },
  pageButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageButtonDisabled: {
    backgroundColor: '#F8FAFC',
  },
  pageText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  confirmButton: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: '#0B3A5D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});