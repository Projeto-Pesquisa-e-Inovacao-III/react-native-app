import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  MapPin,
  Mic,
  CheckCircle2,
  X,
  Pencil,
  Check,
  Info,
} from 'lucide-react-native';
import { GoogleMapEmbed } from '../../src/components/GoogleMapEmbed';
import FocusAwareStatusBar from '../../src/components/FocusAwareStatusBar';

// ─── Paleta de cores alinhada com o projeto ──────────────────────────────────
const C = {
  bgDark: '#0F1E2E',
  bgCard: '#FFFFFF',
  bgPage: '#F1F5F9',
  primary: '#0A3D62',
  primaryMid: '#1565A0',
  green: '#16A34A',
  greenLight: '#DCFCE7',
  greenText: '#15803D',
  blue: '#0EA5E9',
  blueLight: '#E0F2FE',
  blueText: '#0284C7',
  red: '#EF4444',
  redLight: '#FEF2F2',
  redText: '#DC2626',
  amber: '#D97706',
  amberLight: '#FFFBEB',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#94A3B8',
  border: '#E2E8F0',
  borderLight: '#F1F5F9',
  avatarBg: '#1565A0',
};

// ─── Dados mockados representando o resultado da IA ──────────────────────────
const MOCK_APPOINTMENT = {
  type: 'PRESENCIAL',
  recognized: true,
  gym: 'Academia Fit Evolution',
  date: 'Qua, 16/09/2026',
  timeStart: '15:00',
  timeEnd: '16:00',
  trainer: {
    initials: 'FB',
    name: 'Fabio Henrique',
    role: 'PERSONAL TRAINER',
    available: true,
  },
  address: 'Rua Carvalho, 294 - Jardim Paulista',
};

// ─── Sub-componente: Badge ────────────────────────────────────────────────────
type BadgeProps = {
  label: string;
  color: string;
  bg: string;
  icon?: React.ReactNode;
};
function Badge({ label, color, bg, icon }: BadgeProps) {
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      {icon}
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

// ─── Sub-componente: Linha de info ────────────────────────────────────────────
type InfoRowProps = { icon: React.ReactNode; text: string };
function InfoRow({ icon, text }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      {icon}
      <Text style={styles.infoRowText}>{text}</Text>
    </View>
  );
}

// ─── Tela Principal ───────────────────────────────────────────────────────────
export default function ConfirmScheduleScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const apt = MOCK_APPOINTMENT;

  // Fecha apenas a tela atual (volta ao modal anterior, ex: ai-voice)
  const safeDismiss = useCallback(() => {
    if (router.canDismiss()) {
      router.dismiss();
    }
  }, [router]);

  // Fecha todos os modais empilhados (volta às tabs)
  const safeDismissAll = useCallback(() => {
    if (router.canDismiss()) {
      router.dismissAll();
    } else {
      router.replace('/(app)/(tabs)');
    }
  }, [router]);

  // Animação de entrada do card
  const cardSlide = useRef(new Animated.Value(40)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const headerSlide = useRef(new Animated.Value(-20)).current;
  const headerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 380,
        useNativeDriver: true,
      }),
      Animated.spring(headerSlide, {
        toValue: 0,
        damping: 18,
        stiffness: 160,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 1,
        duration: 420,
        delay: 120,
        useNativeDriver: true,
      }),
      Animated.spring(cardSlide, {
        toValue: 0,
        damping: 16,
        stiffness: 130,
        delay: 120,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <View style={[styles.root, { paddingBottom: insets.bottom }]}>
      <FocusAwareStatusBar style="light" />

      {/* ── Header dark ───────────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.header,
          { paddingTop: Math.max(insets.top, 16) },
          { opacity: headerOpacity, transform: [{ translateY: headerSlide }] },
        ]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => safeDismiss()}
          activeOpacity={0.75}
          accessibilityLabel="Voltar"
          accessibilityRole="button"
        >
          <ArrowLeft color="#FFFFFF" size={22} strokeWidth={2.2} />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Confirme o agendamento</Text>
          <Text style={styles.headerSubtitle}>
            A IA interpretou sua fala com sucesso. Revise os detalhes abaixo
            antes de confirmar o envio ao personal.
          </Text>
        </View>

        {/* Indicador de IA ativo */}
        <View style={styles.aiDot} accessibilityLabel="IA ativa" />
      </Animated.View>

      {/* ── Conteúdo scrollável ───────────────────────────────────────────── */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={{ opacity: cardOpacity, transform: [{ translateY: cardSlide }] }}
        >
          {/* ── Card principal ─────────────────────────────────────────────── */}
          <View style={styles.card}>

            {/* Linha: tipo + reconhecido */}
            <View style={styles.cardTopRow}>
              <Badge
                label={apt.type}
                color={C.blueText}
                bg={C.blueLight}
              />
              {apt.recognized && (
                <Badge
                  label="✓ Reconhecido"
                  color={C.greenText}
                  bg={C.greenLight}
                  icon={
                    <CheckCircle2
                      size={12}
                      color={C.greenText}
                      style={{ marginRight: 4 }}
                    />
                  }
                />
              )}
            </View>

            {/* Academia */}
            <Text style={styles.gymName}>{apt.gym}</Text>

            {/* Data e horário */}
            <InfoRow
              icon={<View style={styles.calIconWrap}><Text style={styles.calIcon}>📅</Text></View>}
              text={`${apt.date}  •  ${apt.timeStart} - ${apt.timeEnd}`}
            />

            <View style={styles.divider} />

            {/* Trainer */}
            <View style={styles.trainerRow}>
              {/* Avatar */}
              <View style={styles.trainerAvatar}>
                <Text style={styles.trainerInitials}>{apt.trainer.initials}</Text>
              </View>

              <View style={styles.trainerInfo}>
                <Text style={styles.trainerRole}>{apt.trainer.role}</Text>
                <Text style={styles.trainerName}>{apt.trainer.name}</Text>
              </View>

              {apt.trainer.available && (
                <Badge
                  label="Grade livre"
                  color={C.greenText}
                  bg={C.greenLight}
                />
              )}
            </View>

            <View style={styles.divider} />

            {/* Endereço */}
            <View style={styles.addressRow}>
              <View style={styles.addressLeft}>
                <MapPin size={15} color={C.textMuted} strokeWidth={2} />
                <View style={{ flex: 1, marginLeft: 6 }}>
                  <Text style={styles.addressLabel}>Endereço da Unidade</Text>
                  <Text style={styles.addressText}>{apt.address}</Text>
                </View>
              </View>
              <TouchableOpacity
                activeOpacity={0.7}
                accessibilityLabel="Trocar endereço"
                accessibilityRole="button"
              >
                <Text style={styles.trocarBtn}>Trocar</Text>
              </TouchableOpacity>
            </View>

            {/* Mapa */}
            <GoogleMapEmbed endereco={apt.address} height={148} style={styles.map} />


            {/* Aviso de confirmação */}
            <View style={styles.warningRow}>
              <Info size={14} color={C.amber} strokeWidth={2} />
              <Text style={styles.warningText}>
                A confirmação definitiva depende do aceite do profissional na agenda.
              </Text>
            </View>
          </View>

          {/* ── Ação: Editar ─────────────────────────────────────────────────── */}
          <TouchableOpacity
            style={styles.editBtn}
            activeOpacity={0.75}
            accessibilityLabel="Editar agendamento"
            accessibilityRole="button"
            onPress={() => safeDismiss()}
          >
            <Pencil size={16} color={C.textSecondary} strokeWidth={2} />
            <Text style={styles.editBtnText}>Editar agendamento</Text>
          </TouchableOpacity>

          {/* ── Ação: Confirmar ──────────────────────────────────────────────── */}
          <TouchableOpacity
            style={styles.confirmBtn}
            activeOpacity={0.85}
            accessibilityLabel="Confirmar agendamento"
            accessibilityRole="button"
            onPress={() => {
              // TODO: integrar com serviço de agendamento
              safeDismissAll();
            }}
          >
            <Check size={20} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.confirmBtnText}>Confirmar Agendamento</Text>
          </TouchableOpacity>

          {/* ── Linha de ações secundárias ───────────────────────────────────── */}
          <View style={styles.secondaryRow}>
            <TouchableOpacity
              style={styles.speakAgainBtn}
              activeOpacity={0.75}
              accessibilityLabel="Falar de novo"
              accessibilityRole="button"
              onPress={() => safeDismiss()}
            >
              <Mic size={16} color={C.primary} strokeWidth={2} />
              <Text style={styles.speakAgainText}>Falar de novo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelBtn}
              activeOpacity={0.75}
              accessibilityLabel="Cancelar agendamento"
              accessibilityRole="button"
              onPress={() => safeDismissAll()}
            >
              <X size={16} color={C.redText} strokeWidth={2.5} />
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ─── Estilos ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: C.bgPage,
  },

  // Header
  header: {
    backgroundColor: C.bgDark,
    paddingHorizontal: 20,
    paddingBottom: 20,
    flexDirection: 'column',
    gap: 4,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    alignSelf: 'flex-start',
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.4,
    marginBottom: 8,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13,
    lineHeight: 19,
  },
  aiDot: {
    position: 'absolute',
    top: 0,
    right: 20,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
    shadowColor: '#22C55E',
    shadowOpacity: 0.8,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
    marginTop: 8,
  },

  // Scroll
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 12,
  },

  // Card principal
  card: {
    backgroundColor: C.bgCard,
    borderRadius: 18,
    padding: 18,
    shadowColor: '#000',
    shadowOpacity: 0.07,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
    marginBottom: 4,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },

  // Badge
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },

  // Academia
  gymName: {
    fontSize: 18,
    fontWeight: '800',
    color: C.textPrimary,
    letterSpacing: -0.3,
    marginBottom: 10,
  },

  // InfoRow
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  infoRowText: {
    fontSize: 13,
    color: C.textSecondary,
    fontWeight: '500',
  },
  calIconWrap: {
    width: 20,
    alignItems: 'center',
  },
  calIcon: {
    fontSize: 14,
  },

  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 14,
  },

  // Trainer
  trainerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  trainerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.avatarBg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainerInitials: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  trainerInfo: {
    flex: 1,
  },
  trainerRole: {
    fontSize: 10,
    fontWeight: '700',
    color: C.textMuted,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  trainerName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.textPrimary,
  },

  // Endereço
  addressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  addressLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  addressLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: C.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  addressText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.textPrimary,
    lineHeight: 18,
  },
  trocarBtn: {
    fontSize: 13,
    fontWeight: '700',
    color: C.blue,
    marginTop: 14,
  },

  // Mapa
  map: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 10,
  },

  // Distância
  distanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 8,
    justifyContent: 'flex-end',
  },
  distanceText: {
    fontSize: 12,
    color: C.textMuted,
    fontWeight: '500',
  },

  // Aviso
  warningRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 14,
    backgroundColor: C.amberLight,
    borderRadius: 10,
    padding: 10,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: C.amber,
    lineHeight: 17,
    fontWeight: '500',
  },

  // Botão Editar
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.bgCard,
    borderRadius: 50,
    paddingVertical: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    marginTop: 8,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  editBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.textSecondary,
  },

  // Botão Confirmar
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: C.green,
    borderRadius: 50,
    paddingVertical: 16,
    marginTop: 10,
    shadowColor: C.green,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // Row secundário
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  speakAgainBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.bgCard,
  },
  speakAgainText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.primary,
  },
  cancelBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    borderRadius: 50,
    borderWidth: 1.5,
    borderColor: '#FECACA',
    backgroundColor: C.redLight,
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.redText,
  },
});
