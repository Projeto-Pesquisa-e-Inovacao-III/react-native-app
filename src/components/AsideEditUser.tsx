import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { User, HeartPulse, Shield, MapPin } from 'lucide-react-native';
import { useAuth } from '../contexts/AuthContext';

type AsideEditUserProps = {
  activeTab: 'edituser' | 'anamnesis' | 'security' | 'addresses';
};

export default function AsideEditUser({ activeTab }: AsideEditUserProps) {
  const router = useRouter();
  const { roles } = useAuth();
  const isAluno = roles?.includes('aluno');

  const items = [
    {
      id: 'edituser',
      title: 'Informações Pessoais',
      icon: User,
      route: '/edit-user',
    },
    ...(isAluno
      ? [
          {
            id: 'anamnesis',
            title: 'Anamnese / Saúde',
            icon: HeartPulse,
            route: '/anamnesis',
          },
        ]
      : []),
    {
      id: 'security',
      title: 'Segurança',
      icon: Shield,
      route: '/security',
    },
    ...(isAluno
      ? [
          {
            id: 'addresses',
            title: 'Endereços',
            icon: MapPin,
            route: '/addresses',
          },
        ]
      : []),
  ];

  function handleNavigate(route: string) {
    try {
      router.replace(route as any);
    } catch {
      // Caso a rota ainda não esteja criada
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {items.map((item) => {
          const isActive = activeTab === item.id;
          const IconComponent = item.icon;

          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.tabItem, isActive ? styles.tabItemActive : styles.tabItemInactive]}
              onPress={() => !isActive && handleNavigate(item.route)}
              activeOpacity={0.75}
            >
              <IconComponent
                size={18}
                color={isActive ? '#FFFFFF' : '#475569'}
              />
              <Text
                style={[
                  styles.tabText,
                  isActive ? styles.tabTextActive : styles.tabTextInactive,
                ]}
              >
                {item.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  scrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  tabItemActive: {
    backgroundColor: '#093A5D',
  },
  tabItemInactive: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFFFFF',
  },
  tabTextInactive: {
    color: '#475569',
  },
});
