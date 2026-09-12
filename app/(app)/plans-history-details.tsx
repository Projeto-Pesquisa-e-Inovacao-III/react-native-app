import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  User,
  ShoppingBag,
  CreditCard,
  Tag,
  AlertCircle,
  RotateCcw,
} from 'lucide-react-native';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { BoughtPlanDetails, type BoughtPlanDetailsResponse } from '../../src/constants/products';
import { cpfMask, cellphoneMask } from '../../src/utils/mascara';
import BottomTabBar, { type TabName } from '../../src/components/BottomTabBar';
import { useAuth } from '../../src/contexts/AuthContext';

export default function PlansHistoryDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { roles } = useAuth();
  const { width } = useWindowDimensions();
  const isWide = width >= 700;

  const planId = Number(Array.isArray(id) ? id[0] : id);

  const {
    data,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery<BoughtPlanDetailsResponse>({
    queryKey: ['planDetails', planId],
    queryFn: async () => {
      const res = await BoughtPlanDetails(planId);
      return res.data;
    },
    enabled: !Number.isNaN(planId) && planId > 0,
    retry: 1,
  });

  const onRefresh = useCallback(async () => {
    await refetch();
  }, [refetch]);

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

  function formatFormattedDate(dateStr?: string) {
    if (!dateStr) return '--';
    try {
      const cleanIso = dateStr.includes('T') ? dateStr : `${dateStr}T00:00:00`;
      return format(parseISO(cleanIso), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateStr;
    }
  }

  function formatCurrency(val?: number | string) {
    if (val == null) return 'R$ --';
    const num = typeof val === 'string' ? parseFloat(val) : val;
    if (Number.isNaN(num)) return `R$ ${val}`;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  }

  return (
    <View style={styles.screen}>
      <View style={[styles.headerArea, { paddingTop: Math.max(insets.top, 16) }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Detalhes da compra</Text>
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
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#093A5D" />
            <Text style={styles.loadingText}>Carregando detalhes do pedido...</Text>
          </View>
        ) : isError || !data ? (
          <View style={styles.errorContainer}>
            <View style={styles.errorIcon}>
              <AlertCircle size={40} color="#DC2626" />
            </View>
            <Text style={styles.errorTitle}>Não foi possível carregar os detalhes</Text>
            <Text style={styles.errorSubtitle}>
              Ocorreu um erro ao obter as informações deste plano contratado. Verifique sua conexão e tente novamente.
            </Text>
            <View style={styles.errorActions}>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => refetch()}
                activeOpacity={0.7}
              >
                <RotateCcw size={16} color="#FFFFFF" />
                <Text style={styles.retryButtonText}>Tentar novamente</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.errorBackButton}
                onPress={() => router.back()}
                activeOpacity={0.7}
              >
                <Text style={styles.errorBackButtonText}>Voltar ao histórico</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.cardsWrapper}>
            <View style={[styles.topGrid, isWide && styles.topGridWide]}>
              {/* Card 1: Dados do comprador */}
              <View style={[styles.card, isWide && styles.cardHalf]}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderIcon}>
                    <User size={18} color="#FFFFFF" />
                  </View>
                  <Text style={styles.cardTitle}>Dados do comprador</Text>
                </View>

                <View style={styles.infoList}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>NOME</Text>
                    <Text style={styles.infoValue}>{data.nomeComprador || 'Não informado'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>EMAIL</Text>
                    <Text style={styles.infoValue}>{data.emailComprador || 'Não informado'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>TELEFONE</Text>
                    <Text style={styles.infoValue}>
                      {data.telefone ? cellphoneMask(data.telefone) : 'Não informado'}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>CPF</Text>
                    <Text style={styles.infoValue}>
                      {data.cpf ? cpfMask(data.cpf) : 'Não informado'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Card 2: Detalhes do pedido */}
              <View style={[styles.card, isWide && styles.cardHalf]}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderIcon}>
                    <ShoppingBag size={18} color="#FFFFFF" />
                  </View>
                  <Text style={styles.cardTitle}>Detalhes do pedido</Text>
                </View>

                <View style={styles.infoList}>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>PRODUTO</Text>
                    <Text style={styles.infoValue}>{data.produtoComprado || 'Plano'}</Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>VALOR</Text>
                    <Text style={[styles.infoValue, styles.valueHighlight]}>
                      {formatCurrency(data.valorCompra)}
                    </Text>
                  </View>
                  <View style={styles.infoRow}>
                    <Text style={styles.infoLabel}>DATA DA COMPRA</Text>
                    <Text style={styles.infoValue}>{formatFormattedDate(data.dataCompra)}</Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Card 3: Resumo do pagamento */}
            <View style={[styles.card, styles.summaryCard]}>
              <View style={styles.summaryHeader}>
                <View style={styles.summaryHeaderLeft}>
                  <View style={styles.cardHeaderIcon}>
                    <CreditCard size={18} color="#FFFFFF" />
                  </View>
                  <Text style={styles.summaryProductName} numberOfLines={1}>
                    {data.produtoComprado || 'Plano'}
                  </Text>
                </View>
                <View style={styles.summaryBadge}>
                  <Tag size={12} color="#FFFFFF" />
                  <Text style={styles.summaryBadgeText}>Resumo do pagamento</Text>
                </View>
              </View>

              <View style={styles.summaryRows}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryRowLabel}>Subtotal</Text>
                  <Text style={styles.summaryRowValue}>{formatCurrency(data.valorCompra)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryRowLabel}>Desconto</Text>
                  <Text style={styles.summaryRowValue}>R$ 0,00</Text>
                </View>

                <View style={styles.summaryDivider} />

                <View style={styles.summaryTotal}>
                  <Text style={styles.summaryTotalLabel}>Total</Text>
                  <Text style={styles.summaryTotalValue}>{formatCurrency(data.valorCompra)}</Text>
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

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
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
    zIndex: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
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
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    color: '#6B7280',
    fontWeight: '500',
  },
  errorContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    marginTop: 20,
  },
  errorIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  errorActions: {
    width: '100%',
    gap: 10,
  },
  retryButton: {
    backgroundColor: '#093A5D',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  errorBackButton: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorBackButtonText: {
    color: '#4B5563',
    fontSize: 15,
    fontWeight: '600',
  },
  cardsWrapper: {
    gap: 16,
    maxWidth: 900,
    width: '100%',
    alignSelf: 'center',
  },
  topGrid: {
    gap: 16,
  },
  topGridWide: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  cardHalf: {
    flex: 1,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    marginBottom: 14,
  },
  cardHeaderIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#093A5D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
  },
  infoList: {
    gap: 14,
  },
  infoRow: {
    gap: 3,
  },
  infoLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#9CA3AF',
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  valueHighlight: {
    color: '#093A5D',
    fontWeight: '700',
    fontSize: 16,
  },
  summaryCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#093A5D',
  },
  summaryHeader: {
    flexDirection: 'column',
    gap: 10,
    marginBottom: 16,
  },
  summaryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  summaryProductName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    flex: 1,
  },
  summaryBadge: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#093A5D',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  summaryBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  summaryRows: {
    gap: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryRowLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  summaryRowValue: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
  },
  summaryDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  summaryTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 2,
  },
  summaryTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  summaryTotalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0C6291',
  },
});
