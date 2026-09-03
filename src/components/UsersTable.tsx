import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Eye, ChevronRight, Users } from 'lucide-react-native';
import UserAvatar from './UserAvatar';
import type { ListStudents } from '../models/students';

const normalizeString = (str?: string) => {
  return (str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

export default function UsersTable(props: {
  users: ListStudents;
  input: string;
  isLoading: boolean;
}) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  function handleViewUserData(id: number, roles?: string[]) {
    const isPersonal = roles?.some(
      (role) =>
        role.toLowerCase() === 'personal' || role.toLowerCase() === 'deletado'
    );
    const targetRoute = isPersonal
      ? '/users/view-personal-data'
      : '/users/view-user-data';

    try {
      router.push({
        pathname: targetRoute as any,
        params: { id: String(id) },
      });
    } catch {
      Alert.alert('Visualizar Dados', `ID do usuário: ${id}`);
    }
  }

  function getAge(dateOfBirthString?: string) {
    if (!dateOfBirthString) return null;

    const today = new Date();
    const birthDate = new Date(dateOfBirthString);

    if (isNaN(birthDate.getTime())) return null;

    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < birthDate.getDate())
    ) {
      age--;
    }

    return age;
  }

  const filteredUsers = (props.users ?? []).filter(
    (user) =>
      user != null &&
      normalizeString(user.nome).includes(normalizeString(props.input))
  );

  return (
    <View style={styles.usersTableContainer}>
      {props.isLoading &&
        Array.from({ length: 3 }).map((_, i) => (
          <View
            key={i}
            style={[
              styles.userCard,
              isTablet && styles.userCardTablet,
            ]}
          >
            <View style={styles.userMainRow}>
              <View style={styles.skeletonCircle} />
              <View style={styles.userInfo}>
                <View style={[styles.skeletonLine, { width: 150, height: 16 }]} />
                <View
                  style={[
                    styles.skeletonLine,
                    { width: 90, height: 12, marginTop: 8 },
                  ]}
                />
                <View
                  style={[
                    styles.skeletonLine,
                    { width: 60, height: 18, marginTop: 10, borderRadius: 6 },
                  ]}
                />
              </View>
            </View>
            <View
              style={[
                styles.buttonContainer,
                isTablet && styles.buttonContainerTablet,
              ]}
            >
              <View
                style={[
                  styles.skeletonBox,
                  isTablet ? { width: 120, height: 40 } : { width: '100%', height: 42 },
                ]}
              />
            </View>
          </View>
        ))}

      {!props.isLoading && filteredUsers.length === 0 && (
        <View style={styles.emptyContainer}>
          <Users size={36} color="#94A3B8" style={{ marginBottom: 8 }} />
          <Text style={styles.emptyTitle}>Nenhum usuário encontrado</Text>
          <Text style={styles.emptyText}>
            Não encontramos usuários correspondentes à sua busca.
          </Text>
        </View>
      )}

      {!props.isLoading &&
        filteredUsers.map((user, index) => {
          const isDeleted = user.ativo === false;
          const calculatedAge = user.idade ?? getAge(user.dataNascimento);

          return (
            <TouchableOpacity
              key={user.id ?? index}
              style={[
                styles.userCard,
                isDeleted && styles.userCardDeleted,
                isTablet && styles.userCardTablet,
              ]}
              onPress={() => !isDeleted && handleViewUserData(user.id, user.roles)}
              activeOpacity={isDeleted ? 1 : 0.88}
            >
              <View style={styles.userMainRow}>
                <UserAvatar
                  userName={user.nome}
                  foto={user.caminhoFoto ? `${user.caminhoFoto}` : undefined}
                  size={52}
                />
                <View style={styles.userInfo}>
                  <View style={styles.nameStatusRow}>
                    <Text style={styles.userName} numberOfLines={1}>
                      {user.nome}
                    </Text>
                    {isDeleted ? (
                      <View style={styles.statusBadgeInactive}>
                        <Text style={styles.statusBadgeTextInactive}>Inativo</Text>
                      </View>
                    ) : (
                      <View style={styles.statusBadgeActive}>
                        <Text style={styles.statusBadgeTextActive}>Ativo</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.userAge}>
                    Idade:{' '}
                    <Text style={styles.userAgeHighlight}>
                      {calculatedAge != null ? `${calculatedAge} anos` : '-'}
                    </Text>
                  </Text>

                  {user.roles && user.roles.length > 0 && (
                    <View style={styles.rolesContainer}>
                      {user.roles.map((role, rIndex) => (
                        <View key={rIndex} style={styles.roleBadgeContainer}>
                          <Text style={styles.roleBadge}>{role}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              <View
                style={[
                  styles.buttonContainer,
                  isTablet && styles.buttonContainerTablet,
                ]}
              >
                <TouchableOpacity
                  style={[
                    styles.viewDataBtn,
                    isDeleted && styles.viewDataBtnDisabled,
                    isTablet && styles.viewDataBtnTablet,
                  ]}
                  onPress={() => handleViewUserData(user.id, user.roles)}
                  disabled={isDeleted}
                  activeOpacity={0.8}
                >
                  <Eye
                    size={16}
                    color={isDeleted ? '#94A3B8' : '#FFFFFF'}
                  />
                  <Text
                    style={[
                      styles.viewDataBtnText,
                      isDeleted && styles.viewDataBtnTextDisabled,
                    ]}
                  >
                    Ver Dados
                  </Text>
                  <ChevronRight
                    size={16}
                    color={isDeleted ? '#94A3B8' : 'rgba(255, 255, 255, 0.75)'}
                    style={styles.chevronIcon}
                  />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
    </View>
  );
}

const styles = StyleSheet.create({
  usersTableContainer: {
    width: '100%',
  },
  userCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 14,
    marginTop: 14,
    shadowColor: '#0F172A',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  userCardTablet: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  userCardDeleted: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
    borderStyle: 'dashed',
    borderWidth: 1.5,
  },
  userMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  userInfo: {
    flex: 1,
  },
  nameStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  userName: {
    fontWeight: '700',
    fontSize: 16,
    color: '#0F172A',
    flex: 1,
  },
  statusBadgeActive: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusBadgeTextActive: {
    color: '#059669',
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadgeInactive: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statusBadgeTextInactive: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },
  userAge: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 3,
  },
  userAgeHighlight: {
    fontWeight: '600',
    color: '#334155',
  },
  rolesContainer: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 8,
  },
  roleBadgeContainer: {
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  roleBadge: {
    color: '#334155',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  buttonContainer: {
    marginTop: 12,
    width: '100%',
  },
  buttonContainerTablet: {
    marginTop: 0,
    width: 'auto',
    minWidth: 130,
    marginLeft: 16,
  },
  viewDataBtn: {
    backgroundColor: '#093A5D',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    position: 'relative',
    shadowColor: '#093A5D',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  viewDataBtnTablet: {
    paddingVertical: 9,
    paddingHorizontal: 14,
  },
  viewDataBtnDisabled: {
    backgroundColor: '#E2E8F0',
    shadowOpacity: 0,
    elevation: 0,
  },
  viewDataBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  viewDataBtnTextDisabled: {
    color: '#94A3B8',
  },
  chevronIcon: {
    position: 'absolute',
    right: 14,
  },
  emptyContainer: {
    paddingVertical: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 16,
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 4,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  skeletonCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#E2E8F0',
  },
  skeletonLine: {
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  skeletonBox: {
    borderRadius: 10,
    backgroundColor: '#E2E8F0',
  },
});
