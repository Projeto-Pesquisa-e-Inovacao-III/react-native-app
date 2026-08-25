import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigation } from "@react-navigation/native";
import BottomTabBar from '../components/BottomTabBar';
import { SafeAreaView } from "react-native-safe-area-context";

import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CopyCheck, Info, Settings, TriangleAlert } from "lucide-react-native";

import {
  getPersonalBuffer,
  getPersonalCronogram,
  updateBuffer,
  updatePersonalCronogram,
  updateWorkDay,
  verifySchedules,
} from "../constants/personal";
import { DaySchedule, PaginationInfo, SchedulesPageItem, TimeSlot } from "../types/availability";
import InfoPersonalSchedulesModal from "../components/modals/InfoPersonalSchedulesModal";
import ErrorModal from "../components/modals/ErrorModal";

type SaveStatus = "idle" | "loading" | "success" | "error";

const DAYS_OF_WEEK = ["DOMINGO", "SEGUNDA", "TERCA", "QUARTA", "QUINTA", "SEXTA", "SABADO"];
const DAYS_META: Record<string, string> = {
  DOMINGO: "Domingo",
  SEGUNDA: "Segunda-feira",
  TERCA: "Terça-feira",
  QUARTA: "Quarta-feira",
  QUINTA: "Quinta-feira",
  SEXTA: "Sexta-feira",
  SABADO: "Sábado",
};

function normalizeTime(value: string): string {
  const cleaned = value.replace(/[^0-9]/g, "");
  if (cleaned.length <= 2) return cleaned;
  return cleaned.slice(0, 2) + ":" + cleaned.slice(2, 4);
}

function isValidHHmm(value: string): boolean {
  return /^([01][0-9]|2[0-3]):([0-5][0-9])$/.test(value);
}

function formatScheduleFromApi(slots: TimeSlot[]): DaySchedule[] {
  return DAYS_OF_WEEK.map(function (day) {
    const daySlots = slots.filter(function (slot) {
      return slot.diaSemana === day;
    });

    return {
      day: day,
      enabled: daySlots.some(function (slot) {
        return slot.tipo === "DISPONIVEL" && slot.ativo;
      }),
      slots: daySlots,
    };
  });
}

type TimeRangeProps = {
  startValue: string;
  endValue: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  disabled: boolean;
};

function TimeRange(props: TimeRangeProps) {
  return (
    <View style={[styles.timeRange, props.disabled ? styles.blockDisabled : null]}>
      <View style={styles.timeInputsRow}>
        <TextInput
          value={props.startValue}
          editable={!props.disabled}
          keyboardType="number-pad"
          placeholder="08:00"
          maxLength={5}
          onChangeText={function (v) {
            props.onStartChange(normalizeTime(v));
          }}
          style={[styles.timeInput, props.disabled ? styles.timeInputDisabled : null]}
        />
        <Text style={styles.timeSep}>-</Text>
        <TextInput
          value={props.endValue}
          editable={!props.disabled}
          keyboardType="number-pad"
          placeholder="12:00"
          maxLength={5}
          onChangeText={function (v) {
            props.onEndChange(normalizeTime(v));
          }}
          style={[styles.timeInput, props.disabled ? styles.timeInputDisabled : null]}
        />
      </View>
    </View>
  );
}

const mockSlots: TimeSlot[] = DAYS_OF_WEEK.flatMap((day) => [
  { id: Math.random().toString(), horaInicio: "08:00", horaFim: "12:00", diaSemana: day, tipo: "DISPONIVEL", ativo: false },
  { id: Math.random().toString(), horaInicio: "13:00", horaFim: "18:00", diaSemana: day, tipo: "RESTRITO", ativo: false }
]);

export default function SetAvailabilityScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();

  const cronogramQuery = useQuery({
    queryKey: ["personalCronogram"],
    queryFn: getPersonalCronogram,
    select: function (res: any) {
      return res.data;
    },
  });

  const bufferQuery = useQuery({
    queryKey: ["personalBuffer"],
    queryFn: getPersonalBuffer,
    select: function (res: any) {
      return res.data.bufferMinutos;
    },
  });

  // _______alterar isso após fazer conexão com o backend, para pegar os horários do personal.

  const [schedule, setSchedule] = useState<DaySchedule[]>(
    formatScheduleFromApi(mockSlots)
  );
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [hasUnsaved, setHasUnsaved] = useState(false);
  const [pendingBuffer, setPendingBuffer] = useState<string | null>(null);
  const [globalManha, setGlobalManha] = useState({ start: "08:00", end: "12:00" });
  const [globalTarde, setGlobalTarde] = useState({ start: "13:00", end: "18:00" });

  const dirtySlotIds = useRef<Set<string>>(new Set());
  const dirtyDays = useRef<Set<string>>(new Set());
  const feedbackTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [errorVisible, setErrorVisible] = useState(false);
  const [errorTitle, setErrorTitle] = useState("");
  const [errorContent, setErrorContent] = useState("");

  const [confirmVisible, setConfirmVisible] = useState(false);
  const [schedulesToInfo, setSchedulesToInfo] = useState<SchedulesPageItem[]>([]);
  const [schedulesPagination, setSchedulesPagination] = useState<PaginationInfo | null>(null);
  const [schedulesToInfoDay, setSchedulesToInfoDay] = useState<string | null>(null);
  const [dayIndexToToggle, setDayIndexToToggle] = useState<number | null>(null);

  useEffect(
    function () {
      if (!cronogramQuery.data) return;
      setSchedule(formatScheduleFromApi(cronogramQuery.data));
    },
    [cronogramQuery.data]
  );

  useEffect(function () {
    return function () {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  function showSuccess() {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setSaveStatus("success");
    setHasUnsaved(false);
    feedbackTimeoutRef.current = setTimeout(function () {
      setSaveStatus("idle");
    }, 3000);
  }

  function showError() {
    if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    setSaveStatus("error");
    feedbackTimeoutRef.current = setTimeout(function () {
      setSaveStatus("idle");
    }, 3000);
  }

  async function verifyIfHasSchedules(day: string, page: number, size: number) {
    const res: any = await verifySchedules(day, page, size);
    return { content: res.data.content, pagination: res.data.page as PaginationInfo };
  }

  async function fetchSchedulesPage(page: number) {
    if (!schedulesToInfoDay) return;
    const response = await verifyIfHasSchedules(schedulesToInfoDay, page, 3);
    setSchedulesToInfo(response.content);
    setSchedulesPagination(response.pagination);
  }

  async function toggleDay(dayIndex: number) {
    const currentEnabled = schedule[dayIndex].slots.some(function (s) {
      return s.tipo === "DISPONIVEL" && s.ativo;
    });


    /* ______retirar o comentário abaixo após fazer conexão com o backend.

    if (currentEnabled) {
      const day = schedule[dayIndex].day;
      const response = await verifyIfHasSchedules(day, 0, 3);

      if (response.content && response.content.length > 0) {
        setDayIndexToToggle(dayIndex);
        setSchedulesToInfoDay(day);
        setSchedulesToInfo(response.content);
        setSchedulesPagination(response.pagination);
        setConfirmVisible(true);
        return;
      }
    }
      */

    confirmToggleDay(dayIndex);
  }

  function confirmToggleDay(dayIndex: number) {
    const day = schedule[dayIndex].day;

    if (dirtyDays.current.has(day)) {
      dirtyDays.current.delete(day);
    } else {
      dirtyDays.current.add(day);
    }

    setHasUnsaved(dirtyDays.current.size > 0 || dirtySlotIds.current.size > 0 || pendingBuffer !== null);

    setSchedule(function (prev) {
      const next = [...prev];
      const currentEnabled = next[dayIndex].slots.some(function (s) {
        return s.tipo === "DISPONIVEL" && s.ativo;
      });

      next[dayIndex] = {
        ...next[dayIndex],
        enabled: !currentEnabled,
        slots: next[dayIndex].slots.map(function (s) {
          if (s.tipo === "DISPONIVEL") {
            return { ...s, ativo: !currentEnabled };
          }
          return s;
        }),
      };

      return next;
    });
  }

  function updateLocalSlot(
    dayIndex: number,
    slotIndex: number,
    field: "horaInicio" | "horaFim",
    value: string
  ) {
    setHasUnsaved(true);

    setSchedule(function (prev) {
      const next = [...prev];
      const slot = next[dayIndex].slots[slotIndex];
      if (slot.id) dirtySlotIds.current.add(String(slot.id));

      next[dayIndex] = {
        ...next[dayIndex],
        slots: next[dayIndex].slots.map(function (s, i) {
          if (i === slotIndex) {
            return { ...s, [field]: value };
          }
          return s;
        }),
      };

      return next;
    });
  }

  function applyToAll() {
    setHasUnsaved(true);

    setSchedule(function (prev) {
      return prev.map(function (daySchedule) {
        if (!daySchedule.enabled) return daySchedule;

        const workIndex = daySchedule.slots.findIndex(function (s) {
          return s.tipo === "DISPONIVEL";
        });

        const breakIndex = daySchedule.slots.findIndex(function (s) {
          return s.tipo === "RESTRITO";
        });

        if (workIndex === -1 || breakIndex === -1) return daySchedule;

        return {
          ...daySchedule,
          slots: daySchedule.slots.map(function (slot, i) {
            if (i === workIndex) {
              if (slot.id) dirtySlotIds.current.add(String(slot.id));
              return { ...slot, horaInicio: globalManha.start, horaFim: globalTarde.end };
            }
            if (i === breakIndex) {
              if (slot.id) dirtySlotIds.current.add(String(slot.id));
              return { ...slot, horaInicio: globalManha.end, horaFim: globalTarde.start };
            }
            return slot;
          }),
        };
      });
    });
  }

  function handleUpdateBuffer(value: string) {
    setPendingBuffer(value);
    setHasUnsaved(true);
  }

  function handleCancel() {
    setHasUnsaved(false);
    setSaveStatus("idle");
    dirtySlotIds.current.clear();
    dirtyDays.current.clear();
    setPendingBuffer(null);

    if (cronogramQuery.data) {
      setSchedule(formatScheduleFromApi(cronogramQuery.data));
    }
  }

  async function handleSave() {
    if (dirtySlotIds.current.size === 0 && dirtyDays.current.size === 0 && pendingBuffer === null) return;

    const hasInvalidTime = schedule.some(function (daySchedule) {
      return daySchedule.slots.some(function (slot) {
        return !isValidHHmm(slot.horaInicio) || !isValidHHmm(slot.horaFim);
      });
    });

    if (hasInvalidTime) {
      setErrorTitle("Horário inválido");
      setErrorContent("Preencha os horários no formato HH:mm.");
      setErrorVisible(true);
      return;
    }

    setSaveStatus("loading");

    try {
      const promises: Promise<any>[] = [];

      schedule.forEach(function (daySchedule) {
        daySchedule.slots.forEach(function (slot) {
          if (!slot.id) return;
          if (!dirtySlotIds.current.has(String(slot.id))) return;

          promises.push(
            updatePersonalCronogram(
              {
                diaSemana: slot.diaSemana,
                horaInicio: slot.horaInicio,
                horaFim: slot.horaFim,
                tipo: slot.tipo,
              },
              slot.id
            )
          );
        });
      });

      dirtyDays.current.forEach(function (day) {
        promises.push(updateWorkDay(day));
      });

      if (pendingBuffer !== null) {
        promises.push(
          updateBuffer(pendingBuffer).then(function () {
            queryClient.invalidateQueries({ queryKey: ["personalBuffer"] });
          })
        );
      }

      await Promise.all(promises);

      dirtySlotIds.current.clear();
      dirtyDays.current.clear();
      setPendingBuffer(null);
      showSuccess();
    } catch (error: any) {
      const message =
        error && error.response && error.response.data && error.response.data.Exception
          ? error.response.data.Exception
          : "Ocorreu um erro ao salvar as alterações.";

      setErrorTitle("Erro ao salvar");
      setErrorContent(message);
      setErrorVisible(true);
      handleCancel();
      showError();
    }
  }

  const statusLabel = useMemo(function () {
    if (saveStatus === "loading") return "Salvando...";
    if (saveStatus === "success") return "Alterações salvas!";
    if (saveStatus === "error") return "Erro ao salvar";
    return "";
  }, [saveStatus]);

  /*
  if (cronogramQuery.isLoading || bufferQuery.isLoading) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color="#0B3A5D" />
        <Text style={styles.loaderText}>Carregando disponibilidade...</Text>
      </View>
    );
  }
  */

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: "#F8FAFC" }}>
      <ScrollView style={styles.page} contentContainerStyle={styles.pageContent}>
        <Text style={styles.title}>Definir horário de disponibilidade</Text>

        <View style={styles.bufferBar}>
          <View style={styles.bufferBarContent}>
            <View style={styles.bufferHead}>
              <Settings size={15} color="#64748B" />
              <Text style={styles.controlLabel}>Intervalo pós agendamentos</Text>
            </View>
            <View style={styles.pickerWrap}>
              <Picker
                selectedValue={pendingBuffer !== null ? pendingBuffer : bufferQuery.data || "0"}
                onValueChange={function (value) {
                  handleUpdateBuffer(String(value));
                }}
              >
                <Picker.Item label="15 min" value="15" />
                <Picker.Item label="20 min" value="20" />
                <Picker.Item label="30 min" value="30" />
                <Picker.Item label="45 min" value="45" />
                <Picker.Item label="1 hora" value="60" />
              </Picker>
            </View>
          </View>

          <View style={styles.infoRow}>
            <Info size={14} color="#94A3B8" />
            <Text style={styles.infoText}>15 min reservados antes do intervalo de entrada</Text>
          </View>
        </View>

        <View style={styles.globalPanel}>
          <Text style={styles.globalPanelTitle}>Padrão para todos os dias</Text>

          <Text style={styles.globalRangeTitle}>Horário inicial</Text>
          <View style={styles.timeInputsRow}>
            <TextInput
              value={globalManha.start}
              onChangeText={function (v) {
                setGlobalManha(function (prev) {
                  return { ...prev, start: normalizeTime(v) };
                });
              }}
              style={styles.timeInput}
              keyboardType="number-pad"
              maxLength={5}
            />
            <Text style={styles.timeSep}>-</Text>
            <TextInput
              value={globalManha.end}
              onChangeText={function (v) {
                setGlobalManha(function (prev) {
                  return { ...prev, end: normalizeTime(v) };
                });
              }}
              style={styles.timeInput}
              keyboardType="number-pad"
              maxLength={5}
            />
          </View>

          <Text style={styles.globalRangeTitle}>Horário final</Text>
          <View style={styles.timeInputsRow}>
            <TextInput
              value={globalTarde.start}
              onChangeText={function (v) {
                setGlobalTarde(function (prev) {
                  return { ...prev, start: normalizeTime(v) };
                });
              }}
              style={styles.timeInput}
              keyboardType="number-pad"
              maxLength={5}
            />
            <Text style={styles.timeSep}>-</Text>
            <TextInput
              value={globalTarde.end}
              onChangeText={function (v) {
                setGlobalTarde(function (prev) {
                  return { ...prev, end: normalizeTime(v) };
                });
              }}
              style={styles.timeInput}
              keyboardType="number-pad"
              maxLength={5}
            />
          </View>

          <Pressable style={styles.applyAllButton} onPress={applyToAll}>
            <CopyCheck size={15} color="#0B3A5D" />
            <Text style={styles.applyAllButtonText}>Aplicar a todos</Text>
          </Pressable>
        </View>

        <View style={styles.dayListHeader}>
          <Text style={styles.dayListHeaderText}>Habilitado</Text>
          <Text style={styles.dayListHeaderText}>Dia</Text>
          <Text style={styles.dayListHeaderText}>Horários</Text>
        </View>

        {schedule.map(function (daySchedule, dayIndex) {
          const workIndex = daySchedule.slots.findIndex(function (s) {
            return s.tipo === "DISPONIVEL";
          });

          const breakIndex = daySchedule.slots.findIndex(function (s) {
            return s.tipo === "RESTRITO";
          });

          const workSlot = daySchedule.slots[workIndex];
          const breakSlot = daySchedule.slots[breakIndex];
          const disabled = workSlot ? !workSlot.ativo : true;

          return (
            <View key={daySchedule.day} style={[styles.dayRow, disabled ? styles.dayRowDisabled : null]}>
              <View style={styles.dayHead}>
                <Switch
                  value={!disabled}
                  onValueChange={async function () {
                    await toggleDay(dayIndex);
                  }}
                />
                <Text style={[styles.dayName, disabled ? styles.dayNameDisabled : null]}>
                  {DAYS_META[daySchedule.day]}
                </Text>
              </View>

              {workSlot && breakSlot ? (
                <View style={styles.dayTimes}>
                  <TimeRange
                    startValue={workSlot.horaInicio}
                    endValue={breakSlot.horaInicio}
                    disabled={disabled}
                    onStartChange={function (v) {
                      updateLocalSlot(dayIndex, workIndex, "horaInicio", v);
                    }}
                    onEndChange={function (v) {
                      updateLocalSlot(dayIndex, breakIndex, "horaInicio", v);
                    }}
                  />

                  <View style={styles.periodDivider} />

                  <TimeRange
                    startValue={breakSlot.horaFim}
                    endValue={workSlot.horaFim}
                    disabled={disabled}
                    onStartChange={function (v) {
                      updateLocalSlot(dayIndex, breakIndex, "horaFim", v);
                    }}
                    onEndChange={function (v) {
                      updateLocalSlot(dayIndex, workIndex, "horaFim", v);
                    }}
                  />
                </View>
              ) : (
                <Text style={styles.noSlots}>Sem horários cadastrados</Text>
              )}
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, hasUnsaved && saveStatus === "idle" ? styles.footerDirty : null]}>
        {hasUnsaved && saveStatus === "idle" ? (
          <View style={styles.unsavedHint}>
            <TriangleAlert size={14} color="#92400E" />
            <Text style={styles.unsavedHintText}>Alterações feitas! Não esqueça de salvar</Text>
          </View>
        ) : null}

        {saveStatus !== "idle" ? <Text style={styles.statusText}>{statusLabel}</Text> : null}

        <View style={styles.footerButtons}>
          <Pressable style={styles.cancelButton} onPress={handleCancel}>
            <Text style={styles.cancelButtonText}>Cancelar</Text>
          </Pressable>
          <Pressable
            style={[styles.saveButton, saveStatus === "loading" ? styles.saveButtonLoading : null]}
            onPress={handleSave}
            disabled={saveStatus === "loading"}
          >
            <Text style={styles.saveButtonText}>Salvar Alterações</Text>
          </Pressable>
        </View>
      </View>

      <InfoPersonalSchedulesModal
        visible={confirmVisible}
        schedules={schedulesToInfo}
        pagination={schedulesPagination}
        onPageChange={fetchSchedulesPage}
        onClose={function () {
          setConfirmVisible(false);
          setSchedulesToInfo([]);
          setSchedulesPagination(null);
          setSchedulesToInfoDay(null);
          setDayIndexToToggle(null);
        }}
        onConfirm={function () {
          if (dayIndexToToggle !== null) confirmToggleDay(dayIndexToToggle);
          setConfirmVisible(false);
          setSchedulesToInfo([]);
          setSchedulesPagination(null);
          setSchedulesToInfoDay(null);
          setDayIndexToToggle(null);
        }}
      />

      <ErrorModal
        visible={errorVisible}
        title={errorTitle}
        content={errorContent}
        onClose={function () {
          setErrorVisible(false);
        }}
      />

      <BottomTabBar
        activeTab="more"
        onTabPress={(tab) => {
          if (tab === "requests") navigation.navigate("Requests");
          if (tab === "more") navigation.navigate("MoreOptions");
          if (tab === "schedule") navigation.navigate("Schedule");
          if (tab === "home") navigation.navigate("Home");
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  pageContent: {
    padding: 16,
    paddingBottom: 160,
  },
  title: {
    fontWeight: "700",
    fontSize: 30,
    color: "#333",
    marginBottom: 16,
  },
  bufferBar: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  bufferBarContent: {
    gap: 10,
  },
  bufferHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  controlLabel: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "500",
  },
  pickerWrap: {
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoText: {
    fontSize: 12,
    color: "#94a3b8",
  },
  globalPanel: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  globalPanelTitle: {
    fontSize: 14,
    fontWeight: "700",
    backgroundColor: "#0B3A5D",
    color: "#fff",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  globalRangeTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: "#3f4349",
    textTransform: "uppercase",
  },
  applyAllButton: {
    marginTop: 6,
    borderWidth: 1.5,
    borderColor: "#0B3A5D",
    borderRadius: 8,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  applyAllButtonText: {
    color: "#0B3A5D",
    fontSize: 13,
    fontWeight: "600",
  },
  dayListHeader: {
    backgroundColor: "#0B3A5D",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  dayListHeaderText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  dayRow: {
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 12,
    marginBottom: 8,
  },
  dayRowDisabled: {
    backgroundColor: "#f8fafc",
  },
  dayHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  dayName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0f172a",
  },
  dayNameDisabled: {
    color: "#94a3b8",
  },
  dayTimes: {
    gap: 8,
  },
  timeRange: {
    width: "100%",
  },
  timeInputsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timeInput: {
    flex: 1,
    height: 36,
    borderWidth: 1.5,
    borderColor: "#e2e8f0",
    borderRadius: 8,
    textAlign: "center",
    fontSize: 13,
    color: "#1a202c",
    backgroundColor: "#fff",
  },
  timeInputDisabled: {
    backgroundColor: "#f8fafc",
    color: "#94a3b8",
  },
  timeSep: {
    color: "#334155",
    fontWeight: "700",
  },
  blockDisabled: {
    opacity: 0.75,
  },
  periodDivider: {
    height: 1,
    backgroundColor: "#e2e8f0",
  },
  noSlots: {
    color: "#64748B",
    fontSize: 13,
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 60,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 16,
  },
  footerDirty: {
    backgroundColor: "#FFFBEB",
  },
  unsavedHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  unsavedHintText: {
    color: "#92400E",
    fontSize: 13,
    fontWeight: "600",
  },
  statusText: {
    color: "#0F172A",
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 8,
  },
  footerButtons: {
    flexDirection: "row",
    gap: 8,
  },
  cancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#f1f5f9",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButtonText: {
    color: "#0f172a",
    fontSize: 15,
    fontWeight: "700",
  },
  saveButton: {
    flex: 1.4,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#0B3A5D",
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonLoading: {
    backgroundColor: "#94A3B8",
  },
  saveButtonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  loaderWrap: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loaderText: {
    color: "#334155",
    fontSize: 14,
    fontWeight: "600",
  },
});