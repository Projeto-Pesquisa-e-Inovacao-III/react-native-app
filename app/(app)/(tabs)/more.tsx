import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Banknote, Boxes, Clock, History as HistoryIcon, IdCard, LogOut, User, ChevronRight, Calendar, Bell } from 'lucide-react-native';
import { useAuth } from '../../../src/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { findUserData } from '../../../src/constants/user';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import NotificationCenterModal from '../../../src/components/modals/NotificationCenterModal';

export default function MoreRoute() {
  const router = useRouter();
  const { roles, logout } = useAuth();
  const insets = useSafeAreaInsets();
  const [isNotificationModalOpen, setIsNotificationModalOpen] = React.useState(false);

  const { data: userName } = useQuery({
    queryKey: ['user'],
    queryFn: () => findUserData(),
    select: (response) => {
      return response.data.nome;
    },
    retry: false,
  });

  const OptionItem = ({ icon, title, onClick, danger, isLast }: { icon: React.ReactNode, title: string, onClick: () => void, danger?: boolean, isLast?: boolean }) => (
    <TouchableOpacity 
      style={[
        styles.optionItem, 
        isLast && styles.optionItemLast
      ]} 
      onPress={onClick}
      activeOpacity={0.7}
    >
      <View style={styles.optionContent}>
        <View style={styles.optionIconContainer}>
          {icon}
        </View>
        <Text style={[styles.optionTitle, danger && styles.dangerOptionTitle]}>{title}</Text>
      </View>
      {!danger && <ChevronRight color="#9CA3AF" size={20} />}
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 40) }]}>
        <View style={styles.profileInfo}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {userName ? userName.charAt(0).toUpperCase() : 'U'}
            </Text>
          </View>
          <View style={styles.userDetails}>
            <Text style={styles.userName}>{userName || "Usuário"}</Text>
            <Text style={styles.userRole}>
              {roles?.includes("admin") ? "Administrador" : roles?.includes("personal") ? "Personal Trainer" : "Aluno"}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Minha Conta</Text>
          <View style={styles.card}>
            <OptionItem 
              icon={<IdCard size={22} color="#192633" />} 
              title='Suas informações' 
              onClick={() => router.push("/edit-user")} 
              isLast={false}
            />
            <OptionItem 
              icon={<Bell size={22} color="#192633" />} 
              title='Notificações' 
              onClick={() => setIsNotificationModalOpen(true)} 
              isLast={true}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Ações e Configurações</Text>
          <View style={styles.card}>
            {roles?.includes("aluno") && (
              <>
                <OptionItem icon={<Banknote size={22} color="#192633" />} title='Histórico de compras' onClick={() => router.push("/plans-history")} />
                <OptionItem icon={<HistoryIcon size={22} color="#192633" />} title='Histórico de agendamentos' onClick={() => router.push("/schedule-history")} isLast={true} />
              </>
            )}

            {/* personal não admin */}
            {roles?.includes("personal") && !roles?.includes("admin") && (
              <>
                <OptionItem icon={<Clock size={22} color="#192633" />} title='Ajustar disponibilidade' onClick={() => router.push("/set-availability")} isLast={true} />
              </>
            )}

            {/* personal e admin */}
            {roles?.includes("personal") && roles?.includes("admin") && (
              <>
                <OptionItem icon={<Calendar size={22} color="#192633" />} title='Agenda' onClick={() => router.push("/schedule")} />
                <OptionItem icon={<Boxes size={22} color="#192633" />} title='Pacotes' onClick={() => router.push("/packages")} />
                <OptionItem icon={<Clock size={22} color="#192633" />} title='Ajustar disponibilidade' onClick={() => router.push("/set-availability")} />
                <OptionItem icon={<User size={22} color="#192633" />} title='Criar personal' onClick={() => router.push("/create-personal")} isLast={true} />
              </>
            )}

            {/* apenas admin */}
            {roles?.includes("admin") && !roles?.includes("personal") && (
              <>
                <OptionItem icon={<Boxes size={22} color="#192633" />} title='Pacotes' onClick={() => router.push("/packages")} isLast={true} />
              </>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.card}>
            <OptionItem 
              icon={<LogOut size={22} color="#EF4444" />} 
              title='Sair' 
              onClick={() => logout()} 
              danger={true} 
              isLast={true}
            />
          </View>
        </View>
      </View>

      <NotificationCenterModal
        visible={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: 'center',
    backgroundColor: '#192633', // var(--indigo) from web
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
    marginBottom: 24,
  },
  profileInfo: {
    alignItems: 'center',
    marginTop: 10,
  },
  avatar: {
    width: 144,
    height: 144,
    borderRadius: 72,
    backgroundColor: '#ccc',
    borderWidth: 4,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 5,
  },
  avatarText: {
    fontSize: 48,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  userDetails: {
    alignItems: 'center',
    marginTop: 12,
  },
  userName: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 26,
  },
  userRole: {
    color: '#E0E7FF', // var(--carol-light) equivalent
    fontSize: 14,
    fontWeight: '400',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  content: {
    paddingHorizontal: 16,
    gap: 24,
  },
  section: {
    gap: 8,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    paddingLeft: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  optionItem: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionItemLast: {
    borderBottomWidth: 0,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionIconContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  dangerOptionTitle: {
    color: '#EF4444',
  }
});
