import React from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, Briefcase, Calendar, Mail, Phone } from 'lucide-react-native';
import { useQuery } from '@tanstack/react-query';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getPersonalById } from '../constants/personal';
import UserAvatar from './UserAvatar';

type PersonalData = {
  nome?: string;
  email?: string;
  cref?: string;
  dataNascimento?: string;
  caminhoFoto?: string;
  ativo?: boolean;
  telefones?: { numeroCompleto?: string; ddd?: string; numero?: string }[];
};

function getAge(date?: string) {
  if (!date) return null;
  const birthDate = new Date(date);
  if (Number.isNaN(birthDate.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age -= 1;
  return age;
}

function getPhone(phone?: PersonalData['telefones'] extends (infer T)[] | undefined ? T : never) {
  if (!phone) return '-';
  return phone.numeroCompleto || (phone.ddd && phone.numero ? `(${phone.ddd}) ${phone.numero}` : '-');
}

export default function PersonalDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const personalId = Array.isArray(id) ? id[0] : id;
  const personalQuery = useQuery<PersonalData>({
    queryKey: ['personalData', personalId],
    queryFn: async () => (await getPersonalById(personalId!)).data as PersonalData,
    enabled: !!personalId,
  });
  const personal = personalQuery.data;

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={{ paddingTop: Math.max(insets.top, 18), paddingBottom: Math.max(insets.bottom, 32) + 60 }}
        refreshControl={<RefreshControl refreshing={personalQuery.isFetching} onRefresh={() => personalQuery.refetch()} colors={['#093A5D']} />}
      >
        <View style={styles.container}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(app)/(tabs)/users')} activeOpacity={0.7}>
            <ArrowLeft size={17} color="#475569" />
            <Text style={styles.backText}>Voltar</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Dados & Anamnese</Text>

          {personalQuery.isLoading ? <ActivityIndicator size="large" color="#093A5D" style={styles.loader} /> : personalQuery.isError ? <View style={styles.errorCard}><Text style={styles.errorText}>Não foi possível carregar os dados deste personal.</Text></View> : (
            <View style={styles.profileCard}>
              <View style={styles.cover} />
              <View style={styles.profileContent}>
                <UserAvatar userName={personal?.nome} foto={personal?.caminhoFoto} size={88} />
                <Text style={styles.name}>{personal?.nome ?? 'Personal'}</Text>
                <View style={[styles.statusBadge, personal?.ativo === false && styles.inactiveBadge]}><Text style={[styles.statusText, personal?.ativo === false && styles.inactiveText]}>{personal?.ativo === false ? 'Inativo' : 'Ativo'}</Text></View>
                <View style={styles.fields}>
                  <Field icon={<Calendar size={16} color="#64748B" />} label="IDADE" value={personal?.dataNascimento ? `${getAge(personal.dataNascimento)} anos` : 'Não informado'} />
                  <Field icon={<Mail size={16} color="#64748B" />} label="EMAIL" value={personal?.email ?? '-'} />
                  <Field icon={<Phone size={16} color="#64748B" />} label="TELEFONE" value={getPhone(personal?.telefones?.[0])} />
                  <Field icon={<Briefcase size={16} color="#64748B" />} label="CREF" value={personal?.cref ?? '-'} />
                </View>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function Field({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return <View style={styles.field}><View style={styles.labelRow}>{icon}<Text style={styles.label}>{label}</Text></View><Text style={styles.value}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#F3F4F6' },
  container: { gap: 14, paddingHorizontal: 16 },
  backButton: { alignItems: 'center', alignSelf: 'flex-start', flexDirection: 'row', gap: 6 },
  backText: { color: '#475569', fontSize: 14 },
  pageTitle: { color: '#111827', fontSize: 24, fontWeight: '600' },
  loader: { marginTop: 40 },
  profileCard: { backgroundColor: '#FFFFFF', borderColor: '#E5E7EB', borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  cover: { backgroundColor: '#093A5D', height: 48 },
  profileContent: { alignItems: 'center', marginTop: -44, padding: 18 },
  name: { color: '#111827', fontSize: 22, fontWeight: '600', marginTop: 10, textAlign: 'center' },
  statusBadge: { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0', borderRadius: 999, borderWidth: 1, marginTop: 8, paddingHorizontal: 12, paddingVertical: 4 },
  statusText: { color: '#059669', fontSize: 12, fontWeight: '700' },
  inactiveBadge: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' },
  inactiveText: { color: '#DC2626' },
  fields: { borderTopColor: '#E5E7EB', borderTopWidth: 1, gap: 12, marginTop: 14, paddingTop: 14, width: '100%' },
  field: { gap: 2 },
  labelRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  label: { color: '#9CA3AF', fontSize: 10, fontWeight: '600', letterSpacing: 0.7 },
  value: { color: '#111827', fontSize: 16, fontWeight: '600' },
  errorCard: { backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderRadius: 12, borderWidth: 1, padding: 16 },
  errorText: { color: '#991B1B', fontSize: 14 },
});
