import React, { useEffect, useState } from "react";
import { FlatList, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { PaginationInfo, SchedulesPageItem } from "../../types/availability";

type Props = {
  visible: boolean;
  schedules: SchedulesPageItem[];
  pagination?: PaginationInfo | null;
  onClose: () => void;
  onConfirm: () => void;
  onPageChange?: (page: number) => Promise<void>;
};

export default function InfoPersonalSchedulesModal(props: Props) {
  const [enableButton, setEnableButton] = useState(false);

  useEffect(
    function () {
      if (!props.visible) {
        setEnableButton(false);
        return;
      }
      const timer = setTimeout(function () {
        setEnableButton(true);
      }, 1000);

      return function () {
        clearTimeout(timer);
      };
    },
    [props.visible]
  );

  const page = props.pagination ? props.pagination.number : 0;
  const totalPages = props.pagination ? props.pagination.totalPages : 1;

  return (
    <Modal visible={props.visible} animationType="fade" transparent>
      <Pressable style={styles.backdrop} onPress={props.onClose} />

      <View style={styles.wrapper}>
        <View style={styles.card}>
          <Text style={styles.title}>Deseja ainda continuar?</Text>
          <Text style={styles.subtitle}>Seus agendamentos atuais não serão cancelados.</Text>

          <FlatList
            data={props.schedules}
            keyExtractor={function (item) {
              return item.id;
            }}
            style={styles.list}
            renderItem={function ({ item }) {
              return (
                <View style={styles.item}>
                  <Text style={styles.itemName}>{item.alunoName}</Text>
                  <Text style={styles.itemDate}>{item.data}</Text>
                </View>
              );
            }}
          />

          <View style={styles.paginationRow}>
            <Pressable
              style={[styles.pageButton, page <= 0 ? styles.pageButtonDisabled : null]}
              disabled={page <= 0}
              onPress={async function () {
                if (props.onPageChange) {
                  await props.onPageChange(page - 1);
                }
              }}
            >
              <Text style={styles.pageButtonText}>Anterior</Text>
            </Pressable>

            <Text style={styles.pageText}>
              Página {page + 1} de {Math.max(1, totalPages)}
            </Text>

            <Pressable
              style={[styles.pageButton, page + 1 >= totalPages ? styles.pageButtonDisabled : null]}
              disabled={page + 1 >= totalPages}
              onPress={async function () {
                if (props.onPageChange) {
                  await props.onPageChange(page + 1);
                }
              }}
            >
              <Text style={styles.pageButtonText}>Próxima</Text>
            </Pressable>
          </View>

          <View style={styles.actions}>
            <Pressable
              style={[styles.dangerButton, !enableButton ? styles.buttonDisabled : null]}
              disabled={!enableButton}
              onPress={props.onConfirm}
            >
              <Text style={styles.actionText}>Desativar</Text>
            </Pressable>

            <Pressable style={styles.cancelButton} onPress={props.onClose}>
              <Text style={styles.actionText}>Cancelar</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  wrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  card: {
    width: "100%",
    maxWidth: 430,
    maxHeight: "80%",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
  },
  title: {
    color: "#0F172A",
    fontSize: 20,
    fontWeight: "800",
  },
  subtitle: {
    marginTop: 4,
    marginBottom: 12,
    color: "#475569",
    fontSize: 14,
  },
  list: {
    maxHeight: 240,
  },
  item: {
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
  },
  itemName: {
    fontWeight: "700",
    color: "#1E293B",
    fontSize: 14,
  },
  itemDate: {
    marginTop: 3,
    color: "#64748B",
    fontSize: 12,
  },
  paginationRow: {
    marginTop: 8,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  pageButton: {
    backgroundColor: "#0B3A5D",
    paddingHorizontal: 10,
    height: 34,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  pageButtonDisabled: {
    backgroundColor: "#94A3B8",
  },
  pageButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  pageText: {
    color: "#334155",
    fontSize: 13,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
  },
  dangerButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#B91C1C",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#0B3A5D",
    alignItems: "center",
    justifyContent: "center",
  },
  buttonDisabled: {
    backgroundColor: "#9CA3AF",
  },
  actionText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});