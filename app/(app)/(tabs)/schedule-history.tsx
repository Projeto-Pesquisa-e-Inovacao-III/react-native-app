


import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ArrowLeft, CalendarDays, RotateCcw, Search, X } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { findPersonalRequests } from '../../../src/constants/schedule';
import type { PaginatedResponse, ScheduleAfterInserted } from '../../../src/models/schedule';
import InputWithIcon from '../../../src/components/InputWithIcon';
import DateRangePickerModal, {
  type DateRange,
} from '../../../src/components/modals/DateRangePickerModal';
import RowWithHeaderTitle from '../../../src/components/RowWithHeaderTitle';
import PaginatedList from '../../../src/components/PaginatedList';

function formatAppointmentDate(date: Date | string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

function getStatus(status: string) {
  if (status === 'CONCLUIDO') return { color: '#8BBE86', label: 'Concluído' };
  if (status === 'APROVADO') return { color: '#D7AC00', label: 'marcado' };
  if (status.includes('CANCELADO')) return { color: '#C33', label: 'cancelado' };
  if (status === 'AUSENCIA_CLIENTE' || status === 'AUSENCIA_PERSONAL') {
    return { color: '#C33', label: 'Ausência registrada' };
  }
  if (
    status === 'PENDENTE_PERSONAL_APROVACAO' ||
    status === 'PENDENTE_CLIENTE_APROVACAO'
  ) {
    return { color: '#D7AC00', label: 'em análise' };
  }
  return { color: '#D7AC00', label: 'pendente' };
}

export default function ScheduleHistoryRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dateRange, setDateRange] = useState<DateRange>({ start: '', end: '' });
  const [dateModalVisible, setDateModalVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 700);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, dateRange.start, dateRange.end]);

  function goToPage(newPage: number) {
    setPage(newPage);
  }

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ['scheduleHistoryPaginated', page, debouncedSearch, dateRange.start, dateRange.end],
    queryFn: async () => {
      const response = await findPersonalRequests(
        page,
        '10',
        dateRange.start ? `${dateRange.start}T00:00:00` : undefined,
        dateRange.end ? `${dateRange.end}T23:59:59` : undefined,
        undefined,
        undefined,
        debouncedSearch || undefined,
      );
      return response.data as PaginatedResponse<ScheduleAfterInserted>;
    },
    retry: false,
  });

  useFocusEffect(
    useCallback(() => {
      void refetch();
    }, [refetch]),
  );

  const appointments = data?.content ?? [];
  const hasFilters = Boolean(search || dateRange.start || dateRange.end);
  const rows = appointments.map((appointment) => {
    const status = getStatus(appointment.status);
    const address = appointment.endereco?.cep
      ? `${appointment.endereco.cep.logradouro}, ${appointment.endereco.numero} - ${appointment.endereco.cep.bairro}`
      : 'Endereço não informado';

    return {
      id: appointment.agendamentoId,
      headerTitle: formatAppointmentDate(appointment.dataInicio),
      title: appointment.tipoAula,
      subtitle: (
        <View style={styles.subtitle}>
          <Text style={styles.statusText}>
            <Text style={{ color: status.color }}>● </Text>
            Status: {status.label}
          </Text>
          <Text style={styles.addressText}>{address}</Text>
        </View>
      ),
    };
  });

  function clearFilters() {
    setSearch('');
    setDateRange({ start: '', end: '' });
  }

  function handleDetailsClick() {
    Alert.alert('Detalhes do agendamento', 'Essa visualização será disponibilizada em breve.');
  }

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
            <Text style={styles.title}>Histórico de Agendamentos</Text>
          </View>

          <View style={styles.filters}>
            <InputWithIcon
              placeholder="Buscar..."
              value={search}
              onInputChange={setSearch}
              icon={<Search size={18} color="#9CA3AF" />}
              returnKeyType="search"
              containerStyle={styles.searchInput}
            />
            <Pressable
              accessibilityLabel="Filtrar por período"
              style={[styles.calendarButton, dateRange.start && styles.calendarButtonActive]}
              onPress={() => setDateModalVisible(true)}
            >
              <CalendarDays size={20} color={dateRange.start ? '#FFFFFF' : '#093A5D'} />
            </Pressable>
          </View>

          {hasFilters && (
            <View style={styles.filterBadgeRow}>
              {(dateRange.start || dateRange.end) && (
                <View style={styles.activeFilterChip}>
                  <Text style={styles.activeFilterChipText}>
                    {dateRange.start === dateRange.end
                      ? dateRange.start
                      : `${dateRange.start} até ${dateRange.end}`}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setDateRange({ start: '', end: '' })}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <X size={14} color="#093A5D" />
                  </TouchableOpacity>
                </View>
              )}
              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearFilters}
                activeOpacity={0.7}
              >
                <RotateCcw size={13} color="#DC2626" />
                <Text style={styles.clearButtonText}>Limpar filtros</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.container, { paddingBottom: 76 + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        {isLoading && !data ? (
          <ActivityIndicator size="large" color="#093A5D" style={styles.loader} />
        ) : (
          <PaginatedList
            page={page}
            pagination={data?.page}
            onPageChange={goToPage}
          >
            <RowWithHeaderTitle
              data={rows}
              includeDetailsButton
              buttonLabel="Ver Detalhes"
              largerText
              isLoading={isFetching}
              handleDetailsClick={handleDetailsClick}
            />
          </PaginatedList>
        )}

        {!isLoading && appointments.length === 0 && (
          <Text style={styles.emptyText}>Não há agendamentos para exibir</Text>
        )}
      </ScrollView>

      <DateRangePickerModal
        visible={dateModalVisible}
        initialRange={dateRange}
        onClose={() => setDateModalVisible(false)}
        onApply={setDateRange}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#F8F9FA',
  },
  screen: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  headerArea: {
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#E5E7EB',
    borderBottomWidth: 1,
    elevation: 2,
    paddingBottom: 14,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    zIndex: 10,
  },
  headerInner: {
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    marginBottom: 14,
  },
  backButton: {
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderRadius: 10,
    borderWidth: 1,
    height: 38,
    justifyContent: 'center',
    width: 38,
  },
  content: {
    flex: 1,
  },
  title: {
    color: '#0F172A',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 0,
  },
  filters: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  filterBadgeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  activeFilterChip: {
    alignItems: 'center',
    backgroundColor: '#E0E7FF',
    borderColor: '#C7D2FE',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  activeFilterChipText: {
    color: '#093A5D',
    fontSize: 12,
    fontWeight: '600',
  },
  searchInput: {
    flex: 1,
    marginBottom: 0,
  },
  calendarButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderRadius: 8,
    borderWidth: 1,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  calendarButtonActive: {
    backgroundColor: '#093A5D',
    borderColor: '#093A5D',
  },
  clearButton: {
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
    borderRadius: 20,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  clearButtonText: {
    color: '#DC2626',
    fontSize: 12,
    fontWeight: '600',
  },
  subtitle: {
    gap: 8,
  },
  statusText: {
    color: '#374151',
    fontSize: 15,
  },
  addressText: {
    color: '#6B7280',
    fontSize: 15,
  },
  loader: {
    marginTop: 40,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 15,
    marginTop: 32,
    textAlign: 'center',
  },
});