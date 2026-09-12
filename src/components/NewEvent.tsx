import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { getPersonalList, insertAppointment, disabledPersonalDays } from "../constants/schedule";
import { getPersonalHours } from "../constants/personal";
import { getUserAddresses, lookupCep } from "../constants/address";
import type { Schedule } from "../models/schedule";
import SuccessModal from "./modals/SuccessModal";
import ErrorModal from "./modals/ErrorModal";

export type Personal = {
  id: number;
  nome: string;
  especialidade: string;
  caminhoFoto?: string;
};

export type TimeSlot = {
  startHour: string;
  endHour: string;
};

export type SavedAddress = {
  id: number;
  label: string;
  postalCode: string;
  street: string;
  neighborhood: string;
  city: string;
  state: string;
  number: string;
  complement: string;
};

export type NewEventPayload = {
  date: string;
  startHour: string;
  endHour: string;
  type: "PRESENCIAL" | "RESIDENCIAL" | "FUNCIONAL";
  location: string;
  personal: Personal;
  address: {
    postalCode: string;
    street: string;
    city: string;
    state: string;
    number: string;
    complement: string;
    neighborhood?: string;
  };
};

type NewEventProps = {
  visible: boolean;
  initialDate?: string;
  onClose: () => void;
  onSubmit?: (payload: NewEventPayload) => void;
  availableHours?: string[];
  personals?: Personal[];
  schedules?: TimeSlot[];
  addresses?: SavedAddress[];
};

type TimePeriod = "MANHÃ" | "TARDE" | "NOITE";
type Address = NewEventPayload["address"];

const CLASS_TYPES: NewEventPayload["type"][] = [
  "PRESENCIAL",
  "RESIDENCIAL",
  "FUNCIONAL",
];

function getTomorrowDateString() {
  const d = new Date(Date.now() + 86400000);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(date: string) {
  if (!date) return "";
  const parsed = new Date(date + "T12:00:00");
  return Number.isNaN(parsed.getTime())
    ? date
    : parsed.toLocaleDateString("pt-BR");
}

function getPeriod(hour: string): TimePeriod {
  const value = Number(hour.split(":")[0]);
  if (value < 12) return "MANHÃ";
  if (value < 18) return "TARDE";
  return "NOITE";
}

function isDateAtLeastTomorrow(dateStr: string) {
  if (!dateStr) return false;
  const parts = dateStr.split("T")[0].split("-");
  if (parts.length !== 3) return false;
  const target = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return target.getTime() > todayStart.getTime();
}

export default function NewEvent({
  visible,
  initialDate = "",
  onClose,
  onSubmit,
  personals: propPersonals,
  schedules: propSchedules,
  addresses: propAddresses,
}: NewEventProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [date, setDate] = useState<string>(() => {
    if (initialDate && isDateAtLeastTomorrow(initialDate)) {
      return initialDate;
    }
    return getTomorrowDateString();
  });
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [errorModal, setErrorModal] = useState<{
    visible: boolean;
    title: string;
    content: string;
  }>({
    visible: false,
    title: "",
    content: "",
  });
  const [savedPayload, setSavedPayload] = useState<NewEventPayload | null>(null);

  useEffect(() => {
    if (visible) {
      if (initialDate && isDateAtLeastTomorrow(initialDate)) {
        setDate(initialDate);
      } else {
        setDate(getTomorrowDateString());
      }
      setStep(1);
      setError("");
      setSuccessModalVisible(false);
      setErrorModal({ visible: false, title: "", content: "" });
      setSavedPayload(null);
    }
  }, [visible, initialDate]);

  // Personais
  const [personalsList, setPersonalsList] = useState<Personal[]>(
    propPersonals && propPersonals.length > 0 ? propPersonals : []
  );
  const [loadingPersonals, setLoadingPersonals] = useState(false);
  const [selectedPersonalId, setSelectedPersonalId] = useState<number | undefined>(undefined);
  const [disabledWeekdays, setDisabledWeekdays] = useState<string[]>([]);

  // Tipo de aula e Horários
  const [type, setType] = useState<NewEventPayload["type"]>("PRESENCIAL");
  const [period, setPeriod] = useState<TimePeriod>("MANHÃ");
  const [startHour, setStartHour] = useState("");
  const [dynamicSchedules, setDynamicSchedules] = useState<TimeSlot[]>(
    propSchedules && propSchedules.length > 0 ? propSchedules : []
  );
  const [loadingHours, setLoadingHours] = useState(false);

  // Endereço
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>(
    propAddresses && propAddresses.length > 0 ? propAddresses : []
  );
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<number>();
  const [address, setAddress] = useState<Address>({
    postalCode: "",
    street: "",
    city: "",
    state: "",
    number: "",
    complement: "",
    neighborhood: "",
  });
  const [loadingCep, setLoadingCep] = useState(false);

  // Estado de submissão e erro
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const cepDebounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // 1. Carregar lista de personais da API
  useEffect(() => {
    let isMounted = true;
    async function fetchPersonals() {
      setLoadingPersonals(true);
      try {
        const response = await getPersonalList();
        const rawContent = response.data?.content || response.data;
        if (isMounted && Array.isArray(rawContent) && rawContent.length > 0) {
          const mapped: Personal[] = rawContent.map((p: any) => ({
            id: p.id,
            nome: p.nome || p.usuario?.nome || "Personal",
            especialidade: p.especialidade || "Personal Trainer",
            caminhoFoto: p.caminhoFoto,
          }));
          setPersonalsList(mapped);
          setSelectedPersonalId(mapped[0].id);
        }
      } catch {
        // Mantém fallback inicial
      } finally {
        if (isMounted) setLoadingPersonals(false);
      }
    }

    fetchPersonals();
    return () => {
      isMounted = false;
    };
  }, []);

  // 1b. Carregar dias desabilitados do personal selecionado
  useEffect(() => {
    let isMounted = true;
    async function fetchDisabledDays() {
      if (!selectedPersonalId) return;
      try {
        const res = await disabledPersonalDays(selectedPersonalId);
        const data = res.data;
        const list = Array.isArray(data) ? data : data?.content ?? [];
        const inactive: string[] = Array.from(
          new Set(
            list
              .filter((d: { ativo: boolean; diaSemana: string }) => !d.ativo)
              .map((d: { ativo: boolean; diaSemana: string }) => d.diaSemana.toLowerCase())
          )
        );
        if (isMounted) setDisabledWeekdays(inactive);
      } catch {
        // mantém sem restrição em caso de falha
      }
    }
    fetchDisabledDays();
    return () => { isMounted = false; };
  }, [selectedPersonalId]);

  // 2. Carregar endereços salvos da API
  useEffect(() => {
    let isMounted = true;
    async function fetchAddresses() {
      setLoadingAddresses(true);
      try {
        const response = await getUserAddresses();
        const data = response.data;
        if (isMounted && Array.isArray(data) && data.length > 0) {
          const mapped: SavedAddress[] = data.map((addr: any) => ({
            id: addr.id ?? 0,
            label: addr.tipo || "-",
            postalCode: addr.cep?.id || addr.cep?.cep || "",
            street: addr.cep?.logradouro || "",
            neighborhood: addr.cep?.bairro || "",
            city: addr.cep?.localidade || "",
            state: addr.cep?.uf || "",
            number: addr.numero || "",
            complement: addr.complemento || "",
          }));
          setSavedAddresses(mapped);
        }
      } catch {
        // Mantém fallback inicial
      } finally {
        if (isMounted) setLoadingAddresses(false);
      }
    }

    fetchAddresses();
    return () => {
      isMounted = false;
    };
  }, []);

  // 3. Carregar horários disponíveis do personal selecionado para a data e tipo
  useEffect(() => {
    let isMounted = true;
    async function fetchHours() {
      if (!selectedPersonalId || !date) return;
      setLoadingHours(true);
      setStartHour("");
      try {
        const response = await getPersonalHours(selectedPersonalId, date, type);
        const data = response.data;
        if (isMounted) {
          if (Array.isArray(data) && data.length > 0) {
            const mappedSlots: TimeSlot[] = data.map((slot: any) => ({
              startHour: slot.inicio || slot.horaInicio,
              endHour: slot.fim || slot.horaFim,
            }));
            setDynamicSchedules(mappedSlots);

            // Ajusta o período ativo se o atual não tiver slots
            const periods = Array.from(
              new Set(mappedSlots.map((s) => getPeriod(s.startHour)))
            );
            if (periods.length > 0 && !periods.includes(period)) {
              setPeriod(periods[0]);
            }
          } else {
            setDynamicSchedules([]);
          }
        }
      } catch {
        // Se a API de horários falhar, exibe mensagem de sem disponibilidade
        if (isMounted) {
          setDynamicSchedules(propSchedules || []);
        }
      } finally {
        if (isMounted) setLoadingHours(false);
      }
    }

    fetchHours();
    return () => {
      isMounted = false;
    };
  }, [selectedPersonalId, date, type, propSchedules]);

  const selectedPersonal = useMemo(() => {
    return (
      personalsList.find((p) => p.id === selectedPersonalId) ??
      personalsList[0] ??
      undefined
    );
  }, [personalsList, selectedPersonalId]);

  const availablePeriods = useMemo(
    () =>
      Array.from(
        new Set(dynamicSchedules.map((schedule) => getPeriod(schedule.startHour)))
      ),
    [dynamicSchedules]
  );

  const periodSchedules = useMemo(
    () =>
      dynamicSchedules.filter(
        (schedule) => getPeriod(schedule.startHour) === period
      ),
    [dynamicSchedules, period]
  );

  // Lista de próximos dias para seleção fácil de data
  // Mapeia índice do getDay() para o nome PT usado na API (igual ao MonthlyCalendar)
  const WEEKDAY_PT_NAMES: Record<number, string> = {
    0: 'domingo',
    1: 'segunda',
    2: 'terca',
    3: 'quarta',
    4: 'quinta',
    5: 'sexta',
    6: 'sabado',
  };

  const upcomingDays = useMemo(() => {
    const days: { fullDate: string; dayNumber: number; weekDay: string; isDisabled: boolean }[] = [];
    const base = new Date();
    // Inicia a partir de amanhã devido à regra de 24h de antecedência
    for (let i = 1; i <= 14; i++) {
      const d = new Date(base.getTime() + i * 86400000);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const weekDay = d.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
      const weekdayKey = WEEKDAY_PT_NAMES[d.getDay()];
      const isDisabled = disabledWeekdays.includes(weekdayKey);
      days.push({
        fullDate: `${year}-${month}-${day}`,
        dayNumber: d.getDate(),
        weekDay: weekDay.toUpperCase(),
        isDisabled,
      });
    }
    return days;
  }, [disabledWeekdays]);

  function selectAddress(savedAddress: SavedAddress) {
    setSelectedAddressId(savedAddress.id);
    setAddress({
      postalCode: savedAddress.postalCode,
      street: savedAddress.street,
      city: savedAddress.city,
      state: savedAddress.state,
      number: savedAddress.number,
      complement: savedAddress.complement,
      neighborhood: savedAddress.neighborhood || "",
    });
  }

  function updateAddress(field: keyof Address, value: string) {
    setSelectedAddressId(undefined);
    setAddress((previous) => ({ ...previous, [field]: value }));

    // Se o campo for CEP, faz busca automática via ViaCEP com debounce
    if (field === "postalCode") {
      const cleanDigits = value.replace(/\D/g, "");
      if (cepDebounceTimer.current) clearTimeout(cepDebounceTimer.current);

      if (cleanDigits.length === 8) {
        cepDebounceTimer.current = setTimeout(async () => {
          setLoadingCep(true);
          try {
            const data = await lookupCep(cleanDigits);
            if (data) {
              setAddress((prev) => ({
                ...prev,
                street: data.logradouro || prev.street,
                city: data.localidade || prev.city,
                state: data.uf || prev.state,
                neighborhood: data.bairro || prev.neighborhood,
              }));
            }
          } finally {
            setLoadingCep(false);
          }
        }, 400);
      }
    }
  }

  function goToAddress() {
    if (!date || !startHour) {
      const msg = "Selecione uma data e um horário disponível para avançar.";
      setError(msg);
      setErrorModal({
        visible: true,
        title: "Atenção!",
        content: msg,
      });
      return;
    }

    // Validação estrita de 24 horas de antecedência
    const parts = date.split("-").map(Number);
    const hourParts = startHour.split(":").map(Number);
    if (parts.length === 3 && hourParts.length >= 2) {
      const scheduledDateTime = new Date(
        parts[0],
        parts[1] - 1,
        parts[2],
        hourParts[0],
        hourParts[1],
        0
      );
      const now = new Date();
      const diffHours = (scheduledDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (diffHours < 24) {
        const msg = "Aulas só podem ser agendadas com pelo menos 24 horas de antecedência.";
        setError(msg);
        setErrorModal({
          visible: true,
          title: "Antecedência mínima",
          content: msg,
        });
        return;
      }
    }

    setError("");
    setStep(2);
  }

  async function submit() {
    if (
      !address.postalCode ||
      !address.street ||
      !address.number ||
      !address.city ||
      !address.state
    ) {
      const msg = "Preencha todos os dados obrigatórios do endereço (CEP, logradouro, número, cidade e estado).";
      setError(msg);
      setErrorModal({
        visible: true,
        title: "Endereço incompleto",
        content: msg,
      });
      return;
    }

    const selectedSchedule = dynamicSchedules.find(
      (schedule) => schedule.startHour === startHour
    );
    const endHour = selectedSchedule?.endHour ?? startHour;

    const cleanCep = address.postalCode.replace(/\D/g, "");
    const formattedDateHour = `${date}T${startHour.length === 5 ? startHour + ":00" : startHour}`;

    const apiPayload: Schedule = {
      data: formattedDateHour,
      descricao: `${date} - ${startHour}`,
      novoEndereco: {
        numero: address.number,
        complemento: address.complement || "",
        tipo: type,
        cep: {
          id: cleanCep,
          logradouro: address.street,
          bairro: address.neighborhood || "",
          localidade: address.city,
          uf: address.state,
        },
      },
      personalId: Number(selectedPersonal?.id ?? 0),
      tipoAulaProdutoContratado: type,
    };

    setSubmitting(true);
    setError("");

    try {
      await insertAppointment(apiPayload);

      const payload: NewEventPayload = {
        date,
        startHour,
        endHour,
        type,
        location: type,
        personal: selectedPersonal!, // selectedPersonal existe pois validamos acima
        address,
      };

      setSavedPayload(payload);
      setSuccessModalVisible(true);
    } catch (err: any) {
      const responseData = err?.response?.data;
      const apiMessage =
        responseData?.Exception ||
        responseData?.message ||
        responseData?.mensagem ||
        "Não foi possível concluir o agendamento. Verifique se você possui saldo de aulas deste tipo e tente novamente.";
      setError(apiMessage);
      setErrorModal({
        visible: true,
        title: "Não foi possível agendar",
        content: apiMessage,
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleSuccessClose() {
    setSuccessModalVisible(false);
    if (savedPayload) {
      onSubmit?.(savedPayload);
    }
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Agendar aula</Text>
            <Text style={styles.stepIndicator}>Etapa {step} de 2</Text>
          </View>
          <Pressable onPress={onClose} hitSlop={12}>
            <Text style={styles.close}>Fechar</Text>
          </Pressable>
        </View>

        {step === 1 ? (
          <>
            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Personal Trainer</Text>
              {loadingPersonals ? (
                <ActivityIndicator size="small" color="#0f567f" />
              ) : null}
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.personalRow}
            >
              {personalsList.map((personal) => {
                const isSelected = selectedPersonal?.id === personal.id;
                return (
                  <Pressable
                    key={personal.id}
                    style={[styles.personalCard, isSelected && styles.selectedCard]}
                    onPress={() => setSelectedPersonalId(personal.id)}
                  >
                    <View style={[styles.avatar, isSelected && styles.avatarSelected]}>
                      <Text
                        style={[
                          styles.avatarText,
                          isSelected && styles.avatarTextSelected,
                        ]}
                      >
                        {personal.nome.slice(0, 1)}
                      </Text>
                    </View>
                    <Text
                      style={[styles.personalName, isSelected && styles.selectedText]}
                      numberOfLines={1}
                    >
                      {personal.nome}
                    </Text>
                    <Text
                      style={[styles.personalDetail, isSelected && styles.selectedText]}
                      numberOfLines={1}
                    >
                      {personal.especialidade}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionTitle}>Data da aula</Text>
            <View style={styles.readonlyDate}>
              <Text style={styles.readonlyDateText}>
                {date ? formatDate(date) : "Selecione uma data"}
              </Text>
            </View>

            {/* Seletor rápido de dias */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.daysRow}
            >
              {upcomingDays.map((item) => {
                const isDaySelected = date === item.fullDate;
                return (
                  <Pressable
                    key={item.fullDate}
                    style={[
                      styles.dayCard,
                      isDaySelected && styles.dayCardSelected,
                      item.isDisabled && styles.dayCardDisabled,
                    ]}
                    onPress={() => !item.isDisabled && setDate(item.fullDate)}
                    disabled={item.isDisabled}
                  >
                    <Text
                      style={[
                        styles.dayWeekText,
                        isDaySelected && styles.daySelectedText,
                        item.isDisabled && styles.dayDisabledText,
                      ]}
                    >
                      {item.weekDay}
                    </Text>
                    <Text
                      style={[
                        styles.dayNumberText,
                        isDaySelected && styles.daySelectedText,
                        item.isDisabled && styles.dayDisabledText,
                      ]}
                    >
                      {item.dayNumber}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionTitle}>Tipo de aula</Text>
            <View style={styles.options}>
              {CLASS_TYPES.map((classType) => (
                <Pressable
                  key={classType}
                  style={[
                    styles.option,
                    type === classType && styles.optionSelected,
                  ]}
                  onPress={() => setType(classType)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      type === classType && styles.optionTextSelected,
                    ]}
                  >
                    {classType}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Horários disponíveis</Text>
              {loadingHours ? (
                <ActivityIndicator size="small" color="#0f567f" />
              ) : null}
            </View>

            {availablePeriods.length > 0 ? (
              <>
                <View style={styles.options}>
                  {availablePeriods.map((availablePeriod) => (
                    <Pressable
                      key={availablePeriod}
                      style={[
                        styles.option,
                        period === availablePeriod && styles.optionSelected,
                      ]}
                      onPress={() => {
                        setPeriod(availablePeriod);
                        setStartHour("");
                      }}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          period === availablePeriod && styles.optionTextSelected,
                        ]}
                      >
                        {availablePeriod}
                      </Text>
                    </Pressable>
                  ))}
                </View>

                <View style={styles.hours}>
                  {periodSchedules.map((schedule) => {
                    const isSelected = startHour === schedule.startHour;
                    return (
                      <Pressable
                        key={schedule.startHour}
                        style={[
                          styles.hourButton,
                          isSelected && styles.optionSelected,
                        ]}
                        onPress={() => setStartHour(schedule.startHour)}
                      >
                        <Text
                          style={[
                            styles.hourButtonText,
                            isSelected && styles.optionTextSelected,
                          ]}
                        >
                          {schedule.startHour + " - " + schedule.endHour}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            ) : (
              <View style={styles.emptyHoursBox}>
                <Text style={styles.emptyHoursText}>
                  {loadingHours
                    ? "Consultando horários livres do personal..."
                    : "Nenhum horário disponível para esta data e tipo de aula."}
                </Text>
              </View>
            )}

            <Pressable
              style={[styles.submit, (!date || !startHour) && styles.submitDisabled]}
              onPress={goToAddress}
              disabled={!date || !startHour}
            >
              <Text style={styles.submitText}>Avançar para endereço</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>Resumo do agendamento</Text>
              <Text style={styles.summaryText}>Personal: {selectedPersonal?.nome ?? '-'}</Text>
              <Text style={styles.summaryText}>Data: {formatDate(date)}</Text>
              <Text style={styles.summaryText}>Horário: {startHour}</Text>
              <Text style={styles.summaryText}>Tipo de aula: {type}</Text>
            </View>

            <View style={styles.sectionHeaderRow}>
              <Text style={styles.sectionTitle}>Endereço do local</Text>
              {loadingAddresses ? (
                <ActivityIndicator size="small" color="#0f567f" />
              ) : null}
            </View>

            {savedAddresses.length > 0 ? (
              <>
                <Text style={styles.addressSectionTitle}>Endereços salvos</Text>
                <View style={styles.savedAddresses}>
                  {savedAddresses.map((savedAddress) => {
                    const isSelected = selectedAddressId === savedAddress.id;
                    return (
                      <Pressable
                        key={savedAddress.id}
                        style={[
                          styles.savedAddress,
                          isSelected && styles.optionSelected,
                        ]}
                        onPress={() => selectAddress(savedAddress)}
                      >
                        <Text
                          style={[
                            styles.savedAddressLabel,
                            isSelected && styles.optionTextSelected,
                          ]}
                        >
                          {savedAddress.label}
                        </Text>
                        <Text
                          style={[
                            styles.savedAddressText,
                            isSelected && styles.optionTextSelected,
                          ]}
                        >
                          {savedAddress.street + ", " + savedAddress.number}
                        </Text>
                        <Text
                          style={[
                            styles.savedAddressText,
                            isSelected && styles.optionTextSelected,
                          ]}
                        >
                          {savedAddress.city + " - " + savedAddress.state}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
                <View style={styles.addressDivider} />
                <Text style={styles.label}>Ou informe outro endereço:</Text>
              </>
            ) : null}

            <View style={styles.cepInputContainer}>
              <TextInput
                style={styles.input}
                value={address.postalCode}
                onChangeText={(value: string) => updateAddress("postalCode", value)}
                placeholder="CEP * (somente números)"
                keyboardType="numeric"
                maxLength={9}
              />
              {loadingCep ? (
                <ActivityIndicator
                  size="small"
                  color="#0f567f"
                  style={styles.cepLoader}
                />
              ) : null}
            </View>

            <TextInput
              style={styles.input}
              value={address.street}
              onChangeText={(value: string) => updateAddress("street", value)}
              placeholder="Logradouro / Rua *"
            />

            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                value={address.number}
                onChangeText={(value: string) => updateAddress("number", value)}
                placeholder="Número *"
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, styles.halfInput]}
                value={address.complement}
                onChangeText={(value: string) => updateAddress("complement", value)}
                placeholder="Complemento"
              />
            </View>

            <View style={styles.inputRow}>
              <TextInput
                style={[styles.input, styles.halfInput]}
                value={address.city}
                onChangeText={(value: string) => updateAddress("city", value)}
                placeholder="Cidade *"
              />
              <TextInput
                style={[styles.input, styles.stateInput]}
                value={address.state}
                onChangeText={(value: string) => updateAddress("state", value)}
                placeholder="UF *"
                maxLength={2}
                autoCapitalize="characters"
              />
            </View>

            <View style={styles.actions}>
              <Pressable
                style={styles.backButton}
                disabled={submitting}
                onPress={() => {
                  setError("");
                  setStep(1);
                }}
              >
                <Text style={styles.backText}>Voltar</Text>
              </Pressable>

              <Pressable
                style={[styles.submit, submitting && styles.submitDisabled]}
                onPress={submit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={styles.submitText}>Confirmar agendamento</Text>
                )}
              </Pressable>
            </View>
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>

      {/* Modal de Sucesso */}
      <SuccessModal
        visible={successModalVisible}
        title="Agendamento solicitado!"
        content="Sua solicitação de aula foi enviada com sucesso ao personal trainer."
        useNativeModal={false}
        onClose={handleSuccessClose}
      />

      {/* Modal de Erro */}
      {errorModal.visible && (
        <ErrorModal
          visible={errorModal.visible}
          title={errorModal.title}
          content={errorModal.content}
          useNativeModal={false}
          closeThen={() => setErrorModal({ visible: false, title: "", content: "" })}
          onClose={() => setErrorModal({ visible: false, title: "", content: "" })}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
    backgroundColor: "#f4f8fb",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#173a52",
  },
  stepIndicator: {
    color: "#678193",
    marginTop: 3,
    fontSize: 13,
  },
  close: {
    color: "#0f567f",
    fontWeight: "700",
    fontSize: 15,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 18,
    marginBottom: 10,
  },
  sectionTitle: {
    marginTop: 18,
    marginBottom: 10,
    fontSize: 17,
    fontWeight: "800",
    color: "#173a52",
  },
  addressSectionTitle: {
    marginTop: 6,
    marginBottom: 10,
    fontSize: 14,
    fontWeight: "800",
    color: "#456176",
  },
  label: {
    fontSize: 13,
    color: "#587386",
    marginBottom: 8,
  },
  personalRow: {
    gap: 10,
    paddingVertical: 4,
  },
  personalCard: {
    width: 150,
    padding: 12,
    borderWidth: 1,
    borderColor: "#c8d9e5",
    borderRadius: 14,
    backgroundColor: "#fff",
  },
  selectedCard: {
    backgroundColor: "#0f567f",
    borderColor: "#0f567f",
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#d6e9f5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatarSelected: {
    backgroundColor: "#ffffff22",
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f567f",
  },
  avatarTextSelected: {
    color: "#ffffff",
  },
  personalName: {
    fontWeight: "800",
    color: "#173a52",
    fontSize: 14,
  },
  personalDetail: {
    marginTop: 3,
    fontSize: 12,
    color: "#587386",
  },
  selectedText: {
    color: "#fff",
  },
  daysRow: {
    gap: 8,
    paddingVertical: 6,
    marginBottom: 8,
  },
  dayCard: {
    width: 60,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#c8d9e5",
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  dayCardSelected: {
    backgroundColor: "#0f567f",
    borderColor: "#0f567f",
  },
  dayCardDisabled: {
    backgroundColor: "#f1f5f9",
    borderColor: "#e2e8f0",
  },
  dayDisabledText: {
    color: "#475569",
  },
  dayWeekText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#678193",
    marginBottom: 4,
  },
  dayNumberText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#173a52",
  },
  daySelectedText: {
    color: "#ffffff",
  },
  readonlyDate: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#c8d9e5",
    borderRadius: 10,
    backgroundColor: "#e9eff3",
    justifyContent: "center",
    paddingHorizontal: 12,
    marginBottom: 4,
  },
  readonlyDateText: {
    color: "#173a52",
    fontWeight: "700",
  },
  options: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  option: {
    borderWidth: 1,
    borderColor: "#c8d9e5",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: "#fff",
  },
  optionSelected: {
    backgroundColor: "#0f567f",
    borderColor: "#0f567f",
  },
  optionText: {
    color: "#264d64",
    fontWeight: "600",
    fontSize: 14,
  },
  optionTextSelected: {
    color: "#fff",
  },
  hours: {
    gap: 8,
    marginTop: 12,
  },
  hourButton: {
    borderWidth: 1,
    borderColor: "#c8d9e5",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    backgroundColor: "#fff",
  },
  hourButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#173a52",
  },
  emptyHoursBox: {
    backgroundColor: "#eef3f7",
    padding: 16,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 6,
  },
  emptyHoursText: {
    color: "#678193",
    fontSize: 13,
    textAlign: "center",
  },
  savedAddresses: {
    gap: 8,
    marginBottom: 4,
  },
  savedAddress: {
    borderWidth: 1,
    borderColor: "#c8d9e5",
    borderRadius: 10,
    backgroundColor: "#fff",
    padding: 12,
  },
  savedAddressLabel: {
    color: "#173a52",
    fontWeight: "800",
    marginBottom: 3,
  },
  savedAddressText: {
    color: "#587386",
    fontSize: 13,
  },
  addressDivider: {
    height: 1,
    backgroundColor: "#d4e1e9",
    marginTop: 18,
    marginBottom: 10,
  },
  cepInputContainer: {
    position: "relative",
    justifyContent: "center",
  },
  cepLoader: {
    position: "absolute",
    right: 14,
    top: 14,
  },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#c8d9e5",
    borderRadius: 10,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    marginBottom: 10,
    color: "#173a52",
    fontSize: 14,
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
  },
  halfInput: {
    flex: 1,
    minWidth: 0,
  },
  stateInput: {
    flex: 0.35,
    minWidth: 0,
  },
  summary: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: "#e8f3fa",
    borderWidth: 1,
    borderColor: "#c8e0ee",
    marginBottom: 10,
  },
  summaryTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#173a52",
    marginBottom: 8,
  },
  summaryText: {
    color: "#355c73",
    marginBottom: 4,
    fontSize: 14,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 16,
  },
  backButton: {
    padding: 14,
  },
  backText: {
    color: "#0f567f",
    fontWeight: "700",
    fontSize: 16,
  },
  error: {
    color: "#b3393a",
    marginTop: 14,
    fontWeight: "600",
    fontSize: 13,
    backgroundColor: "#fde8e8",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#f8b4b4",
  },
  submit: {
    flex: 1,
    backgroundColor: "#0f567f",
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  submitDisabled: {
    opacity: 0.5,
  },
  submitText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
  },
});
