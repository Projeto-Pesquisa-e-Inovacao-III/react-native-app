import React from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CalendarX,
  Dumbbell,
  FileText,
  Mail,
  Phone,
  Plus,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getById } from '../../../../src/constants/user';
import { getAnamnesisById } from '../../../../src/constants/anamnesis';
import { getAppointmentResumes } from '../../../../src/constants/schedule';
import { useAuth } from '../../../../src/contexts/AuthContext';
import UserAvatar from '../../../../src/components/UserAvatar';
import OverviewCardPackageStatus from '../../../../src/components/OverviewCardPackageStatus';
import PaginatedList, { type PaginationInfo } from '../../../../src/components/PaginatedList';

type UserPhone = {
  numeroCompleto?: string;
  ddd?: string;
  numero?: string;
};

type UserData = {
  id: number;
  nome: string;
  email?: string;
  dataNascimento?: string;
  caminhoFoto?: string;
  roles?: string[];
  telefones?: UserPhone[];
  produtoContratado?: {
    dataExpiracao?: string;
    produtoExibicao?: {
      titulo?: string;
    };
  };
};

type AnamnesisData = {
  altura?: number;
  peso?: number;
  objectivoPrincipal?: string;
  rotina?: string | null;
  condicoes?: { situacao: string; tipo?: string }[];
  nivelDeAtividade?: string;
  observacaoSaude?: string | null;
};

type AppointmentResume = {
  id?: number;
  resumo?: string;
  grupoMuscular?: string[];
  agendamento?: { data?: string };
};

type ResumeResponse = {
  content?: AppointmentResume[];
  page?: PaginationInfo;
};

function getAge(dateOfBirth?: string) {
  if (!dateOfBirth) return null;
  const birthDate = new Date(dateOfBirth);
  if (Number.isNaN(birthDate.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return age;
}

function formatPhone(phone?: UserPhone) {
  if (!phone) return '-';
  if (phone.numeroCompleto) return phone.numeroCompleto;
  if (phone.ddd && phone.numero) return `(${phone.ddd}) ${phone.numero}`;
  return '-';
}

function formatDate(date?: string) {
  if (!date) return '--';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '--';
  return new Intl.DateTimeFormat('pt-BR').format(parsed);
}

function activityLabel(level?: string) {
  const labels: Record<string, string> = {
    SEDENTARIO: 'Sedentário',
    LEVE: 'Leve',
    MODERADO: 'Moderado',
    INTENSO: 'Intenso',
    ATIVO: 'Ativo',
    MUITO_ATIVO: 'Muito ativo',
  };
  return labels[level ?? ''] ?? level ?? 'Não informado';
}

function Metric({ label, value, unit, text }: { label: string; value?: string | number; unit?: string; text?: boolean }) {
  return (
    <View style={styles.metricCard}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={[styles.metricValue, text && styles.metricValueText]} numberOfLines={2}>
        {value ?? 'N/A'}{unit ? ` ${unit}` : ''}
      </Text>
    </View>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <View style={styles.sectionTitleRow}>
      <View style={styles.sectionIcon}>{icon}</View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

export default function ViewUserDataScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { roles: viewerRoles } = useAuth();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;
  const canSeeResumes = !!viewerRoles?.some((role) => role === 'admin' || role === 'personal');
  const userId = Array.isArray(id) ? id[0] : id;

  const userQuery = useQuery<UserData>({
    queryKey: ['userData', userId],
    queryFn: async () => (await getById(userId!)).data as UserData,
    enabled: !!userId,
  });

  const anamnesisQuery = useQuery<AnamnesisData>({
    queryKey: ['anamnesisData', userId],
    queryFn: async () => (await getAnamnesisById(userId!)).data as AnamnesisData,
    enabled: !!userId,
  });

  const [resumePage, setResumePage] = React.useState(0);
  const resumesQuery = useQuery<ResumeResponse>({
    queryKey: ['appointmentResumes', userId, resumePage],
    queryFn: async () => (await getAppointmentResumes(Number(userId), resumePage, 3)).data as ResumeResponse,
    enabled: !!userId && canSeeResumes,
  });

  const user = userQuery.data;
  const anamnesis = anamnesisQuery.data;
  const age = getAge(user?.dataNascimento);
  const isLoading = userQuery.isLoading;
  const isAnamnesisLoading = anamnesisQuery.isLoading;
  const resumes = resumesQuery.data?.content ?? [];
  const plan = user?.produtoContratado?.dataExpiracao
    ? {
        nome: user.produtoContratado.produtoExibicao?.titulo ?? 'Plano ativo',
        dataExpiracao: user.produtoContratado.dataExpiracao,
      }
    : null;

  function renderProfile() {
    return (
      <View style={styles.profileCard}>
        <View style={styles.profileCover} />
        <View style={styles.profileContent}>
          <UserAvatar userName={user?.nome} foto={user?.caminhoFoto} size={88} />
          {isLoading ? (
            <ActivityIndicator color="#093A5D" style={styles.profileLoader} />
          ) : (
            <Text style={styles.userName}>{user?.nome ?? 'Usuário'}</Text>
          )}

          <View style={styles.profileFields}>
            <ProfileField icon={<Calendar size={16} color="#64748B" />} label="IDADE" value={age == null ? 'Não informado' : `${age} anos`} />
            <ProfileField icon={<Mail size={16} color="#64748B" />} label="EMAIL" value={user?.email ?? '-'} />
            <ProfileField icon={<Phone size={16} color="#64748B" />} label="TELEFONE" value={formatPhone(user?.telefones?.[0])} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingTop: Math.max(insets.top, 18), paddingBottom: Math.max(insets.bottom, 32) + 60 }}
        refreshControl={<RefreshControl refreshing={userQuery.isFetching || anamnesisQuery.isFetching} onRefresh={() => { userQuery.refetch(); anamnesisQuery.refetch(); }} colors={['#093A5D']} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.container}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(app)/(tabs)/users')} activeOpacity={0.7}>
            <ArrowLeft size={17} color="#475569" />
            <Text style={styles.backText}>Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Dados & Anamnese</Text>

          {!userId ? (
            <View style={styles.errorCard}><Text style={styles.errorText}>Usuário não informado.</Text></View>
          ) : userQuery.isError ? (
            <View style={styles.errorCard}><Text style={styles.errorText}>Não foi possível carregar os dados deste usuário.</Text></View>
          ) : (
            <View style={[styles.mainGrid, isWide && styles.mainGridWide]}>
              <View style={[styles.leftColumn, isWide && styles.leftColumnWide]}>
                {renderProfile()}
                {userQuery.isLoading ? <View style={styles.planLoading}><ActivityIndicator color="#093A5D" /></View> : <OverviewCardPackageStatus actualPlan={plan} />}
              </View>

              <View style={styles.rightColumn}>
                <View style={[styles.metricsRow, isWide && styles.metricsRowWide]}>
                  <Metric label="ALTURA ATUAL" value={isAnamnesisLoading ? '...' : anamnesis?.altura?.toFixed(0)} unit="cm" />
                  <Metric label="PESO CORPORAL" value={isAnamnesisLoading ? '...' : anamnesis?.peso} unit="kg" />
                  <Metric label="OBJETIVO PRINCIPAL" value={isAnamnesisLoading ? '...' : anamnesis?.objectivoPrincipal} text />
                </View>

                <View style={[styles.detailsRow, isWide && styles.detailsRowWide]}>
                  <View style={[styles.infoCard, isWide && styles.infoCardWide]}>
                    <SectionTitle icon={<PlusIcon />} title="Condições de Saúde" />
                    {isAnamnesisLoading ? <ActivityIndicator color="#093A5D" /> : anamnesis?.condicoes?.length ? anamnesis.condicoes.map((condition, index) => (
                      <View key={`${condition.situacao}-${index}`} style={styles.conditionItem}>
                        <View style={styles.conditionHeader}><View style={styles.redDot} /><Text style={styles.fieldLabel}>{index === 0 ? 'MEDICAÇÃO' : 'HISTÓRICO'}</Text></View>
                        <Text style={styles.conditionValue}>{condition.situacao}</Text>
                      </View>
                    )) : <Text style={styles.noData}>Nenhuma condição relatada</Text>}
                    {anamnesis?.observacaoSaude ? <View style={styles.observationBlock}><View style={styles.conditionHeader}><AlertTriangle size={13} color="#1C6AAB" /><Text style={styles.observationLabel}>LESÕES ARTICULARES</Text></View><Text style={styles.observationText}>&quot;{anamnesis.observacaoSaude}&quot;</Text></View> : null}
                  </View>

                  <View style={[styles.infoCard, isWide && styles.infoCardWide]}>
                    <SectionTitle icon={<Dumbbell size={15} color="#64748B" />} title="Atividade Física" />
                    <View style={styles.activityLevelRow}><Text style={styles.fieldLabel}>NÍVEL ATUAL</Text><Text style={styles.activityBadge}>• {activityLabel(anamnesis?.nivelDeAtividade).toUpperCase()}</Text></View>
                    <View style={styles.routineBlock}><View style={styles.conditionHeader}><View style={styles.routineDot} /><Text style={styles.fieldLabel}>ROTINA DIÁRIA</Text></View><Text style={styles.routineText}>{anamnesis?.rotina ?? 'Não informado'}</Text></View>
                  </View>
                </View>

                {canSeeResumes ? <View style={styles.infoCard}><SectionTitle icon={<FileText size={15} color="#64748B" />} title="Resumos anteriores" />{resumesQuery.isLoading ? <ActivityIndicator color="#093A5D" /> : resumes.length ? <PaginatedList page={resumePage} pagination={resumesQuery.data?.page} onPageChange={setResumePage} alwaysShowPagination>{resumes.map((resume, index) => <ResumeCard key={resume.id ?? index} resume={resume} />)}</PaginatedList> : <View style={styles.emptyResume}><CalendarX size={24} color="#94A3B8" /><Text style={styles.noData}>Nenhum agendamento anterior encontrado.</Text></View>}</View> : null}
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function ProfileField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <View style={styles.profileField}><View style={styles.fieldLabelRow}>{icon}<Text style={styles.fieldLabel}>{label}</Text></View><Text style={styles.fieldValue} numberOfLines={2}>{value}</Text></View>;
}

function ResumeCard({ resume }: { resume: AppointmentResume }) {
  const muscles = resume.grupoMuscular ?? [];
  return <View style={styles.resumeCard}><View style={styles.resumeHeader}><View style={styles.resumeTitleRow}><View style={styles.resumeDot} /><Text style={styles.resumeDate}>{formatDate(resume.agendamento?.data)}</Text></View>{muscles.length ? <Text style={styles.resumeBadge}>{muscles.map((muscle) => muscle.charAt(0) + muscle.slice(1).toLowerCase()).join(', ')}</Text> : null}</View><Text style={styles.resumeText}>{resume.resumo || 'Sem observações'}</Text></View>;
}

function PlusIcon() {
  return <Plus size={13} color="#64748B" />;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F3F4F6' },
  container: { paddingHorizontal: 16, gap: 14 },
  backButton: { alignItems: 'center', flexDirection: 'row', gap: 6, alignSelf: 'flex-start' },
  backText: { color: '#475569', fontSize: 14 },
  pageTitle: { color: '#111827', fontSize: 24, fontWeight: '600' },
  mainGrid: { gap: 14 },
  mainGridWide: { flexDirection: 'row', alignItems: 'flex-start' },
  leftColumn: { gap: 14 },
  leftColumnWide: { width: 320 },
  rightColumn: { flex: 1, gap: 14, minWidth: 0 },
  profileCard: { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  profileCover: { backgroundColor: '#093A5D', height: 48 },
  profileContent: { alignItems: 'center', marginTop: -44, padding: 18 },
  profileLoader: { marginVertical: 10 },
  userName: { color: '#111827', fontSize: 22, fontWeight: '600', marginTop: 10, textAlign: 'center' },
  profileFields: { borderTopColor: '#E5E7EB', borderTopWidth: 1, gap: 12, marginTop: 14, paddingTop: 14, width: '100%' },
  profileField: { gap: 2 },
  fieldLabelRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  fieldLabel: { color: '#9CA3AF', fontSize: 10, fontWeight: '600', letterSpacing: 0.7 },
  fieldValue: { color: '#111827', fontSize: 16, fontWeight: '600' },
  planLoading: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, minHeight: 150, justifyContent: 'center' },
  metricsRow: { gap: 10 },
  metricsRowWide: { flexDirection: 'row' },
  metricCard: { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderRadius: 12, borderWidth: 1, flex: 1, minHeight: 86, padding: 14 },
  metricLabel: { color: '#9CA3AF', fontSize: 10, fontWeight: '600', letterSpacing: 0.7, marginBottom: 8 },
  metricValue: { color: '#111827', fontSize: 28, fontWeight: '700' },
  metricValueText: { fontSize: 16, lineHeight: 20 },
  detailsRow: { gap: 14 },
  detailsRowWide: { flexDirection: 'row' },
  infoCard: { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderRadius: 12, borderWidth: 1, gap: 10, minWidth: 0, padding: 16 },
  infoCardWide: { flex: 1 },
  sectionTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  sectionIcon: { alignItems: 'center', borderColor: '#D1D5DB', borderRadius: 10, borderWidth: 1, height: 20, justifyContent: 'center', width: 20 },
  sectionTitle: { color: '#111827', flexShrink: 1, fontSize: 19, fontWeight: '600' },
  conditionItem: { borderColor: '#E5E7EB', borderRadius: 8, borderWidth: 1, gap: 3, paddingHorizontal: 12, paddingVertical: 8 },
  conditionHeader: { alignItems: 'center', flexDirection: 'row', gap: 5 },
  redDot: { backgroundColor: '#EF4444', borderRadius: 3, height: 6, width: 6 },
  conditionValue: { color: '#111827', fontSize: 12 },
  noData: { color: '#9CA3AF', fontSize: 12 },
  observationBlock: { backgroundColor: '#E8F2F8', borderLeftColor: '#1C6AAB', borderLeftWidth: 2, borderRadius: 8, gap: 3, paddingHorizontal: 12, paddingVertical: 8 },
  observationLabel: { color: '#1C6AAB', fontSize: 10, fontWeight: '600', letterSpacing: 0.6 },
  observationText: { color: '#111827', fontSize: 12, fontStyle: 'italic', lineHeight: 18 },
  activityLevelRow: { alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 8, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 9, gap: 8 },
  activityBadge: { backgroundColor: '#FEF3C7', borderRadius: 8, color: '#92400E', fontSize: 11, fontWeight: '600', paddingHorizontal: 9, paddingVertical: 3 },
  routineBlock: { gap: 5 },
  routineDot: { backgroundColor: '#EF4444', borderRadius: 3, height: 6, width: 6 },
  routineText: { backgroundColor: '#F9FAFB', borderRadius: 8, color: '#111827', flexShrink: 1, fontSize: 12, lineHeight: 19, paddingHorizontal: 12, paddingVertical: 9, width: '100%' },
  resumeCard: { borderColor: '#E5E7EB', borderRadius: 8, borderWidth: 1, gap: 8, padding: 12 },
  resumeHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  resumeTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 7 },
  resumeDot: { backgroundColor: '#1C6AAB', borderRadius: 5, height: 10, width: 10 },
  resumeDate: { color: '#111827', fontSize: 13, fontWeight: '600' },
  resumeBadge: { backgroundColor: '#E8F2F8', borderRadius: 8, color: '#1C6AAB', flexShrink: 1, fontSize: 11, paddingHorizontal: 8, paddingVertical: 3, textAlign: 'right' },
  resumeText: { color: '#475569', fontSize: 13, lineHeight: 19 },
  emptyResume: { alignItems: 'center', backgroundColor: '#FAFAFA', borderColor: '#E0E0E0', borderRadius: 8, borderStyle: 'dashed', borderWidth: 1, gap: 10, padding: 28 },
  errorCard: { backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderRadius: 12, borderWidth: 1, padding: 16 },
  errorText: { color: '#991B1B', fontSize: 14 },
});
