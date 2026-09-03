import React, { useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  DEFAULT_PERSONAL,
  MOCK_ADDRESSES,
  MOCK_PERSONALS,
  MOCK_SCHEDULES,
  type MockAddress,
  type MockPersonal,
  type MockSchedule,
} from "../mocks/newEventMock";

export type NewEventPayload = {
  date: string;
  startHour: string;
  endHour: string;
  type: "PRESENCIAL" | "RESIDENCIAL" | "FUNCIONAL";
  location: string;
  personal: MockPersonal;
  address: {
    postalCode: string;
    street: string;
    city: string;
    state: string;
    number: string;
    complement: string;
  };
};

type NewEventProps = {
  visible: boolean;
  initialDate?: string;
  onClose: () => void;
  onSubmit?: (payload: NewEventPayload) => void;
  availableHours?: string[];
  personals?: MockPersonal[];
  schedules?: MockSchedule[];
  addresses?: MockAddress[];
};

type TimePeriod = "MANHÃ" | "TARDE" | "NOITE";
type Address = NewEventPayload["address"];

const CLASS_TYPES: NewEventPayload["type"][] = [
  "PRESENCIAL",
  "RESIDENCIAL",
  "FUNCIONAL",
];

function formatDate(date: string) {
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

export default function NewEvent({
  visible,
  initialDate = "",
  onClose,
  onSubmit,
  personals = MOCK_PERSONALS,
  schedules = MOCK_SCHEDULES,
  addresses = MOCK_ADDRESSES,
}: NewEventProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [date] = useState(initialDate);
  const [selectedPersonalId, setSelectedPersonalId] = useState(DEFAULT_PERSONAL.id);
  const [period, setPeriod] = useState<TimePeriod>("MANHÃ");
  const [startHour, setStartHour] = useState("");
  const [type, setType] = useState<NewEventPayload["type"]>("PRESENCIAL");
  const [address, setAddress] = useState<Address>({
    postalCode: "",
    street: "",
    city: "",
    state: "",
    number: "",
    complement: "",
  });
  const [error, setError] = useState("");
  const [selectedAddressId, setSelectedAddressId] = useState<number>();

  const selectedPersonal = personals.find(
    (personal) => personal.id === selectedPersonalId
  ) ?? personals[0] ?? DEFAULT_PERSONAL;
  const availablePeriods = useMemo(
    () => Array.from(new Set(schedules.map((schedule) => getPeriod(schedule.startHour)))),
    [schedules]
  );
  const periodSchedules = schedules.filter(
    (schedule) => getPeriod(schedule.startHour) === period
  );

  function selectAddress(savedAddress: MockAddress) {
    setSelectedAddressId(savedAddress.id);
    setAddress({
      postalCode: savedAddress.postalCode,
      street: savedAddress.street,
      city: savedAddress.city,
      state: savedAddress.state,
      number: savedAddress.number,
      complement: savedAddress.complement,
    });
  }

  function updateAddress(field: keyof Address, value: string) {
    setSelectedAddressId(undefined);
    setAddress((previous) => ({ ...previous, [field]: value }));
  }

  function goToAddress() {
    if (!date || !startHour) {
      setError("Selecione uma data e um horário.");
      return;
    }

    setError("");
    setStep(2);
  }

  function submit() {
    if (
      !address.postalCode ||
      !address.street ||
      !address.number ||
      !address.city ||
      !address.state
    ) {
      setError("Preencha os dados obrigatórios do endereço.");
      return;
    }

    const selectedSchedule = schedules.find(
      (schedule) => schedule.startHour === startHour
    );

    setError("");
    onSubmit?.({
      date,
      startHour,
      endHour: selectedSchedule?.endHour ?? startHour,
      type,
      location: type,
      personal: selectedPersonal,
      address,
    });
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
            <Text style={styles.sectionTitle}>Personal Trainer</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.personalRow}
            >
              {personals.map((personal) => {
                const isSelected = selectedPersonal.id === personal.id;
                return (
                  <Pressable
                    key={personal.id}
                    style={[styles.personalCard, isSelected && styles.selectedCard]}
                    onPress={() => setSelectedPersonalId(personal.id)}
                  >
                    <View style={styles.avatar}>
                      <Text style={styles.avatarText}>{personal.nome.slice(0, 1)}</Text>
                    </View>
                    <Text style={[styles.personalName, isSelected && styles.selectedText]}>
                      {personal.nome}
                    </Text>
                    <Text style={[styles.personalDetail, isSelected && styles.selectedText]}>
                      {personal.especialidade}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            <Text style={styles.sectionTitle}>Data</Text>
            <View style={styles.readonlyDate}>
              <Text style={styles.readonlyDateText}>
                {date ? formatDate(date) : "Data não selecionada"}
              </Text>
            </View>

            <Text style={styles.sectionTitle}>Tipo de aula</Text>
            <View style={styles.options}>
              {CLASS_TYPES.map((classType) => (
                <Pressable
                  key={classType}
                  style={[styles.option, type === classType && styles.optionSelected]}
                  onPress={() => setType(classType)}
                >
                  <Text style={[styles.optionText, type === classType && styles.optionTextSelected]}>
                    {classType}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionTitle}>Horários disponíveis</Text>
            <View style={styles.options}>
              {availablePeriods.map((availablePeriod) => (
                <Pressable
                  key={availablePeriod}
                  style={[styles.option, period === availablePeriod && styles.optionSelected]}
                  onPress={() => {
                    setPeriod(availablePeriod);
                    setStartHour("");
                  }}
                >
                  <Text style={[styles.optionText, period === availablePeriod && styles.optionTextSelected]}>
                    {availablePeriod}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.hours}>
              {periodSchedules.map((schedule) => (
                <Pressable
                  key={schedule.startHour}
                  style={[styles.hourButton, startHour === schedule.startHour && styles.optionSelected]}
                  onPress={() => setStartHour(schedule.startHour)}
                >
                  <Text style={[styles.optionText, startHour === schedule.startHour && styles.optionTextSelected]}>
                    {schedule.startHour + " - " + schedule.endHour}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable style={styles.submit} onPress={goToAddress}>
              <Text style={styles.submitText}>Avançar</Text>
            </Pressable>
          </>
        ) : (
          <>
            <View style={styles.summary}>
              <Text style={styles.summaryTitle}>Resumo do agendamento</Text>
              <Text style={styles.summaryText}>Personal: {selectedPersonal.nome}</Text>
              <Text style={styles.summaryText}>Data: {formatDate(date)}</Text>
              <Text style={styles.summaryText}>Horário: {startHour}</Text>
              <Text style={styles.summaryText}>Tipo de aula: {type}</Text>
            </View>

            <Text style={styles.sectionTitle}>Endereço</Text>
            <Text style={styles.addressSectionTitle}>Endereços salvos</Text>
            <View style={styles.savedAddresses}>
              {addresses.map((savedAddress) => {
                const isSelected = selectedAddressId === savedAddress.id;
                return (
                  <Pressable
                    key={savedAddress.id}
                    style={[styles.savedAddress, isSelected && styles.optionSelected]}
                    onPress={() => selectAddress(savedAddress)}
                  >
                    <Text style={[styles.savedAddressLabel, isSelected && styles.optionTextSelected]}>
                      {savedAddress.label}
                    </Text>
                    <Text style={[styles.savedAddressText, isSelected && styles.optionTextSelected]}>
                      {savedAddress.street + ", " + savedAddress.number}
                    </Text>
                    <Text style={[styles.savedAddressText, isSelected && styles.optionTextSelected]}>
                      {savedAddress.city + " - " + savedAddress.state}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.addressDivider} />
            <Text style={styles.addressSectionTitle}>Endereço do local</Text>
            <Text style={styles.savedAddressText}>Ou informe outro endereço</Text>

            <TextInput
              style={styles.input}
              value={address.postalCode}
              onChangeText={(value: string) => updateAddress("postalCode", value)}
              placeholder="CEP *"
              keyboardType="numeric"
            />
            <TextInput
              style={styles.input}
              value={address.street}
              onChangeText={(value: string) => updateAddress("street", value)}
              placeholder="Logradouro *"
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
                onPress={() => {
                  setError("");
                  setStep(1);
                }}
              >
                <Text style={styles.backText}>Voltar</Text>
              </Pressable>
              <Pressable style={styles.submit} onPress={submit}>
                <Text style={styles.submitText}>Confirmar agendamento</Text>
              </Pressable>
            </View>
          </>
        )}

        {error ? <Text style={styles.error}>{error}</Text> : null}
      </ScrollView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 0,
    backgroundColor: "#f4f8fb",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
  },
  title: {
    fontSize: 24,
    fontWeight: "800",
    color: "#173a52",
  },
  stepIndicator: {
    color: "#678193",
    marginTop: 3,
  },
  close: {
    color: "#0f567f",
    fontWeight: "700",
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
    paddingVertical: 2,
  },
  personalCard: {
    width: 150,
    padding: 12,
    borderWidth: 1,
    borderColor: "#c8d9e5",
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  selectedCard: {
    backgroundColor: "#0f567f",
    borderColor: "#0f567f",
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#d6e9f5",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0f567f",
  },
  personalName: {
    fontWeight: "800",
    color: "#173a52",
  },
  personalDetail: {
    marginTop: 3,
    fontSize: 12,
    color: "#587386",
  },
  selectedText: {
    color: "#fff",
  },
  input: {
    minHeight: 46,
    flex: 1,
    borderWidth: 1,
    borderColor: "#c8d9e5",
    borderRadius: 10,
    backgroundColor: "#fff",
    paddingHorizontal: 12,
    marginBottom: 10,
    color: "#173a52",
  },
  readonlyDate: {
    minHeight: 46,
    borderWidth: 1,
    borderColor: "#c8d9e5",
    borderRadius: 10,
    backgroundColor: "#e9eff3",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  readonlyDateText: {
    color: "#456176",
    fontWeight: "700",
  },
  inputRow: {
    flexDirection: "row",
    gap: 10,
  },
  halfInput: {
    minWidth: 0,
  },
  stateInput: {
    flex: 0.35,
    minWidth: 0,
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
    paddingHorizontal: 12,
    backgroundColor: "#fff",
  },
  optionSelected: {
    backgroundColor: "#0f567f",
    borderColor: "#0f567f",
  },
  optionText: {
    color: "#264d64",
    fontWeight: "600",
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
    marginBottom: 4,
  },
  summary: {
    padding: 14,
    borderRadius: 12,
    backgroundColor: "#e8f3fa",
    borderWidth: 1,
    borderColor: "#c8e0ee",
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
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 12,
  },
  backButton: {
    padding: 14,
  },
  backText: {
    color: "#0f567f",
    fontWeight: "700",
  },
  error: {
    color: "#b3393a",
    marginTop: 12,
    fontWeight: "600",
  },
  submit: {
    flex: 1,
    marginTop: 22,
    backgroundColor: "#0f567f",
    borderRadius: 10,
    padding: 14,
    alignItems: "center",
  },
  submitText: {
    color: "#fff",
    fontWeight: "800",
  },
});
