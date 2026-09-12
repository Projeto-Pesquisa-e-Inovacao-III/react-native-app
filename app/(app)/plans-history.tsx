import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Search,
  Calendar as CalendarIcon,
  ArrowLeft,
  X,
  RotateCcw,
  Inbox,
} from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { getUserPlansHistory, type UserPlanItem } from '../../src/constants/products';
import RowWithHeaderTitle, { type RowItem } from '../../src/components/RowWithHeaderTitle';
import PaginatedList, { type PaginationInfo } from '../../src/components/PaginatedList';
import InputWithIcon from '../../src/components/InputWithIcon';
import DateRangePickerModal, { type DateRange } from '../../src/components/modals/DateRangePickerModal';
import BottomTabBar, { type TabName } from '../../src/components/BottomTabBar';
import { useAuth } from '../../src/contexts/AuthContext';

export default function PlansHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { roles } = useAuth();

  const [filterSearch, setFilterSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedDateRange, setSelectedDateRange] = useState<DateRange>({ start: '', end: '' });
  const [isCalendarModalOpen, setIsCalendarModalOpen] = useState(false);
  const [page, setPage] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(filterSearch);
      setPage(0);
    }, 700);

    return () => clearTimeout(timer);
  }, [filterSearch]);

  const hasDateFilter = !!(selectedDateRange.start && selectedDateRange.end);
  const hasFilters = !!(filterSearch || hasDateFilter);

  const {
    data: response,
    isLoading,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: [
      'user-plans',
      page,
      debouncedSearch,
      selectedDateRange.start,
      selectedDateRange.end,
    ],
    queryFn: async () => {
      const res = await getUserPlansHistory(
        page,
        '10',
        hasDateFilter ? selectedDateRange.start : undefined,
        hasDateFilter ? selectedDateRange.end : undefined,
        debouncedSearch.trim() || undefined,
      );
      return res.data;
    },
  });

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

  const dataList: UserPlanItem[] = (response?.content as UserPlanItem[]) ?? [];
  const pagination: PaginationInfo | null = response?.page ?? null;

  function clearFilters() {
    setFilterSearch('');
    setSelectedDateRange({ start: '', end: '' });
    setPage(0);
  }

  function handleDateApply(range: DateRange) {
    setSelectedDateRange(range);
    setPage(0);
  }

  function handleDetailsClick(id: number) {
    router.push({
      pathname: '/plans-history-details',
      params: { id: String(id) },
    });
  }

  function handleTabPress(tab: TabName) {
    switch (tab) {
      case 'home':
        router.push('/(app)/(tabs)');
        break;
      case 'schedule':
        router.push(
          roles?.includes('personal') || roles?.includes('admin')
            ? '/(app)/(tabs)/personal-schedule'
            : '/(app)/(tabs)/schedule',
        );
        break;
      case 'requests':
        router.push('/(app)/(tabs)/requests');
        break;
      case 'plans':
        router.push('/(app)/(tabs)/plans');
        break;
      case 'users':
        router.push('/(app)/(tabs)/users');
        break;
      case 'more':
        router.push('/(app)/(tabs)/more');
        break;
    }
  }

  const rowItems: RowItem[] = useMemo(() => {
    return dataList.map((item) => {
      let formattedDate = item.dataCompra;
      try {
        const cleanIso = item.dataCompra.includes('T') ? item.dataCompra : `${item.dataCompra}T00:00:00`;
        formattedDate = format(parseISO(cleanIso), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
      } catch {
        // fallback
      }

      return {
        id: item.id,
        headerTitle: formattedDate,
        title: item.produtoExibicao?.titulo || 'Plano',
        subtitle: item.produtoExibicao?.subtitulo || 'Sem descrição adicional',
        tipoAula: item.produtoExibicao?.tipoAula,
      };
    });
  }, [dataList]);

  const activeDateLabel = useMemo(() => {
    if (!hasDateFilter) return '';
    try {
      const s = format(parseISO(`${selectedDateRange.start}T00:00:00`), 'dd/MM/yy', { locale: ptBR });
      const e = format(parseISO(`${selectedDateRange.end}T00:00:00`), 'dd/MM/yy', { locale: ptBR });
      return `${s} até ${e}`;
    } catch {
      return `${selectedDateRange.start} - ${selectedDateRange.end}`;
    }
  }, [hasDateFilter, selectedDateRange]);

  return (
    <View style={styles.screen}>
      <View style={[styles.headerArea, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.headerInner}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <ArrowLeft size={20} color="#0F172A" />
            </TouchableOpacity>
            <Text style={styles.pageTitle}>Histórico de Compras</Text>
          </View>

          <View style={styles.searchRow}>
            <View style={styles.searchInputWrapper}>
              <InputWithIcon
                placeholder="Buscar por plano..."
                value={filterSearch}
                onInputChange={setFilterSearch}
                icon={<Search size={18} color="#9CA3AF" />}
                containerStyle={styles.searchContainer}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.calendarButton,
                hasDateFilter && styles.calendarButtonActive,
              ]}
              onPress={() => setIsCalendarModalOpen(true)}
              activeOpacity={0.7}
            >
              <CalendarIcon
                size={20}
                color={hasDateFilter ? '#FFFFFF' : '#093A5D'}
              />
            </TouchableOpacity>
          </View>

          {hasFilters && (
            <View style={styles.filtersBadgeRow}>
              {hasDateFilter && (
                <View style={styles.activeFilterChip}>
                  <Text style={styles.activeFilterChipText}>{activeDateLabel}</Text>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedDateRange({ start: '', end: '' });
                      setPage(0);
                    }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={14} color="#093A5D" />
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={clearFilters}
                activeOpacity={0.7}
              >
                <RotateCcw size={13} color="#DC2626" />
                <Text style={styles.clearFiltersText}>Limpar filtros</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: Math.max(insets.bottom, 24) + 80 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={isFetching && !isLoading}
            onRefresh={onRefresh}
            colors={['#093A5D']}
            tintColor="#093A5D"
          />
        }
        showsVerticalScrollIndicator={false}
      >
        <PaginatedList
          page={page}
          pagination={pagination}
          onPageChange={setPage}
        >
          {isLoading ? (
            <RowWithHeaderTitle data={[]} isLoading={true} />
          ) : rowItems.length > 0 ? (
            <RowWithHeaderTitle
              data={rowItems}
              includeDetailsButton={true}
              buttonLabel="Ver Detalhes"
              handleDetailsClick={handleDetailsClick}
            />
          ) : (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconContainer}>
                <Inbox size={36} color="#9CA3AF" />
              </View>
              <Text style={styles.emptyTitle}>Nenhuma compra encontrada</Text>
              <Text style={styles.emptySubtitle}>
                {hasFilters
                  ? 'Tente ajustar ou limpar os filtros de busca.'
                  : 'Você ainda não possui nenhum histórico de planos contratados.'}
              </Text>
              {hasFilters && (
                <TouchableOpacity
                  style={styles.emptyClearButton}
                  onPress={clearFilters}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emptyClearButtonText}>Limpar filtros</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </PaginatedList>
      </ScrollView>

      <DateRangePickerModal
        visible={isCalendarModalOpen}
        initialRange={selectedDateRange}
        onClose={() => setIsCalendarModalOpen(false)}
        onApply={handleDateApply}
      />

      <BottomTabBar activeTab="more" onTabPress={handleTabPress} userRoles={roles} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  headerArea: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 10,
    alignItems: 'center',
  },
  headerInner: {
    maxWidth: 900,
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchInputWrapper: {
    flex: 1,
  },
  searchContainer: {
    marginBottom: 0,
  },
  calendarButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarButtonActive: {
    backgroundColor: '#093A5D',
    borderColor: '#093A5D',
  },
  filtersBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E0E7FF',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  activeFilterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#093A5D',
  },
  clearFiltersButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 20,
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  clearFiltersText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#DC2626',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },
  emptyState: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
    marginBottom: 6,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    maxWidth: 280,
  },
  emptyClearButton: {
    marginTop: 18,
    backgroundColor: '#093A5D',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  emptyClearButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
