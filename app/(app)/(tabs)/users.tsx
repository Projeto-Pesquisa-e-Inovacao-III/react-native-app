import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react-native';

import { useAuth } from '../../../src/contexts/AuthContext';
import { listStudents, searchStudent } from '../../../src/constants/personal';
import { getUsers } from '../../../src/constants/admin';
import InputWithIcon from '../../../src/components/InputWithIcon';
import Select from '../../../src/components/Select';
import PaginatedList, { type PaginationInfo } from '../../../src/components/PaginatedList';
import UsersTable from '../../../src/components/UsersTable';
import type { StudentItem } from '../../../src/models/students';

type PaginatedResult = {
  content: StudentItem[];
  page: PaginationInfo;
};

export default function UsersRoute() {
  const { roles } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isMobile = width <= 1024;

  const isAdmin = !!roles?.includes('admin');
  const isPersonalOnly = !!roles?.includes('personal') && !isAdmin;

  const [page, setPage] = useState(0);
  const [filterSearch, setFilterSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterRole, setFilterRole] = useState<string>('');
  const [openSelectId, setOpenSelectId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Debounce da busca em 700ms idêntico ao web
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filterSearch);
      setPage(0);
    }, 700);

    return () => clearTimeout(timer);
  }, [filterSearch]);

  // Query de alunos para Personal
  const [students, setStudents] = useState<StudentItem[]>([]);
  const {
    data: response,
    isLoading,
    refetch: refetchStudents,
  } = useQuery<PaginatedResult>({
    queryKey: ['students', page, debouncedSearch],
    queryFn: async () => {
      const res = debouncedSearch.trim()
        ? await searchStudent(page, 10, debouncedSearch.trim())
        : await listStudents(page, 10);
      return res.data;
    },
    enabled: isPersonalOnly,
  });

  useEffect(() => {
    if (response?.content) {
      setStudents(response.content);
    }
  }, [response]);

  const pagination: PaginationInfo | null = response?.page ?? null;

  // Query de usuários para Admin
  const {
    data: responseAdmin,
    isLoading: isLoadingAdmin,
    refetch: refetchAdmin,
  } = useQuery<PaginatedResult>({
    queryKey: ['users', page, debouncedSearch, filterRole],
    queryFn: async () => {
      const res = await getUsers(
        page,
        10,
        debouncedSearch.trim(),
        undefined,
        filterRole || undefined
      );
      return res.data;
    },
    enabled: isAdmin,
  });

  const users: StudentItem[] = responseAdmin?.content ?? [];
  const paginationAdmin: PaginationInfo | null = responseAdmin?.page ?? null;

  const onRefresh = async () => {
    setRefreshing(true);
    if (isAdmin) {
      await refetchAdmin();
    } else {
      await refetchStudents();
    }
    setRefreshing(false);
  };

  const currentUsers = isAdmin ? users : students;
  const currentLoading = isAdmin ? isLoadingAdmin : isLoading;
  const currentPagination = isAdmin ? paginationAdmin : pagination;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={[
          styles.container,
          {
            paddingTop: Math.max(insets.top, 24),
            paddingBottom: Math.max(insets.bottom, 24) + 80,
          },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#093A5D']}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Usuários</Text>

          <View style={[styles.searchBar, isMobile && styles.searchBarMobile]}>
            <View style={styles.inputContainer}>
              <InputWithIcon
                type="text"
                placeholder="Buscar..."
                icon={<Search size={20} color="#9CA3AF" />}
                value={filterSearch}
                onInputChange={setFilterSearch}
                containerStyle={styles.inputWithIconStyle}
              />
            </View>

            {isAdmin && (
              <View style={styles.selectContainer}>
                <Select
                  onSelectStatusChange={(role) => {
                    setFilterRole(role);
                    setPage(0);
                  }}
                  selectStatusValue={filterRole}
                  selectPlaceholder="Filtrar por role"
                  values={[
                    { label: 'Aluno', value: 'ALUNO' },
                    { label: 'Personal', value: 'PERSONAL' },
                    { label: 'Admin', value: 'ADMIN' },
                  ]}
                  setOpenSelectId={setOpenSelectId}
                  openSelectId={openSelectId}
                  id="role"
                  showSelectAll={true}
                />
              </View>
            )}
          </View>
        </View>

        <PaginatedList
          key={page}
          page={page}
          pagination={currentPagination}
          onPageChange={(newPage) => setPage(newPage)}
        >
          <UsersTable
            input={filterSearch}
            users={currentUsers}
            isLoading={currentLoading}
          />
        </PaginatedList>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  container: {
    paddingHorizontal: 16,
  },
  header: {
    width: '100%',
    marginBottom: 8,
  },
  title: {
    fontSize: 30,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 20,
  },
  searchBar: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchBarMobile: {
    flexDirection: 'column',
    alignItems: 'stretch',
  },
  inputContainer: {
    flex: 1,
  },
  inputWithIconStyle: {
    marginBottom: 0,
  },
  selectContainer: {
    minWidth: 160,
  },
});
