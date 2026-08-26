import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { useQuery } from "@tanstack/react-query";
import { PackageCard } from "../../../src/components/PackageCard";
import AddPackagePlan from "../../../src/components/modals/AddPackagePlan";
import TimerModal from "../../../src/components/modals/TimerModal";
import SuccessModal from "../../../src/components/modals/SuccessModal";
import ErrorModal from "../../../src/components/modals/ErrorModal";
import PagBankModal from "../../../src/components/modals/PagBankModal";
import type { ProductExhibition } from "../../../src/models/products";
import {
  getProductsExhibitions,
  buyProductExhibition,
  desactivateProductExhibition,
} from "../../../src/constants/products";

type ModalType =
  | "add"
  | "addAdditional"
  | "edit"
  | "editAdditional"
  | "delete"
  | "success"
  | "error"
  | "loadingPagBank"
  | null;

export default function PlansScreen() {
  const [activeTab, setActiveTab] = useState<"pacotes" | "adicionais">("pacotes");
  const [refreshing, setRefreshing] = useState(false);

  // Estados dos Modais
  const [openModal, setOpenModal] = useState<ModalType>(null);
  const [modalInfos, setModalInfos] = useState<{ title: string; content: string }>({
    title: "",
    content: "",
  });
  const [selectedPackageId, setSelectedPackageId] = useState<number | null>(null);

  // Listas de produtos gerenciadas por estado para permitir inserção/edição/deleção em tempo real
  const [productsExhibitions, setProductsExhibitions] = useState<ProductExhibition[]>([]);
  const [productsExhibitionsAdicional, setProductsExhibitionsAdicional] = useState<ProductExhibition[]>([]);

  const { data: productsData, isLoading, refetch } = useQuery({
    queryKey: ["productsExhibitions"],
    queryFn: () => getProductsExhibitions(),
    select: (response: any) => ({
      pacotes: (response.data || []).filter((p: ProductExhibition) => p.tipoProduto === "PACOTE"),
      adicionais: (response.data || []).filter((p: ProductExhibition) => p.tipoProduto === "ADICIONAL"),
    }),
  });

  useEffect(() => {
    if (productsData) {
      setProductsExhibitions(productsData.pacotes);
      setProductsExhibitionsAdicional(productsData.adicionais);
    }
  }, [productsData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const activePackages = productsExhibitions.filter((p) => p.status === "ATIVO");
  const activeAdicionais = productsExhibitionsAdicional.filter((p) => p.status === "ATIVO");
  const currentList = activeTab === "pacotes" ? activePackages : activeAdicionais;

  // ─── AÇÕES E FLUXOS FUNCIONAIS ─────────────────────────────────────────────

  async function handleBuy(id: number) {
    setOpenModal("loadingPagBank");
    try {
      await buyProductExhibition(id);
      setModalInfos({
        title: "Compra Concluída",
        content: "Seu pacote foi adquirido com sucesso!",
      });
      setOpenModal("success");
      refetch();
    } catch {
      setModalInfos({
        title: "Erro na Compra",
        content: "Não foi possível concluir a compra do pacote. Tente novamente.",
      });
      setOpenModal("error");
    }
  }

  function handleOpenEdit(id: number, isAdicional: boolean = false) {
    setSelectedPackageId(id);
    setOpenModal(isAdicional ? "editAdditional" : "edit");
  }

  function handleOpenDelete(id: number) {
    setSelectedPackageId(id);
    setOpenModal("delete");
  }

  async function handleDeleteConfirm() {
    if (selectedPackageId !== null) {
      try {
        await desactivateProductExhibition(selectedPackageId);
        setProductsExhibitions((prev) => prev.filter((p) => p.id !== selectedPackageId));
        setProductsExhibitionsAdicional((prev) => prev.filter((p) => p.id !== selectedPackageId));
        setSelectedPackageId(null);
        setModalInfos({
          title: "Exclusão Concluída",
          content: "O pacote foi desativado com sucesso.",
        });
        setOpenModal("success");
        refetch();
      } catch {
        setModalInfos({
          title: "Erro ao excluir",
          content: "Não foi possível desativar o pacote.",
        });
        setOpenModal("error");
      }
    }
  }

  function handleCloseModal() {
    setOpenModal(null);
    setSelectedPackageId(null);
  }

  const selectedPackageData = [...productsExhibitions, ...productsExhibitionsAdicional].find(
    (p) => p.id === selectedPackageId
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Cabeçalho */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTop}>
          <Text style={styles.screenTitle}>Pacotes e Adicionais</Text>
          <TouchableOpacity
            style={styles.addBtnHeader}
            onPress={() => setOpenModal(activeTab === "pacotes" ? "add" : "addAdditional")}
            activeOpacity={0.8}
          >
            <Text style={styles.addBtnHeaderText}>+ Adicionar</Text>
          </TouchableOpacity>
        </View>

        {/* Abas */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "pacotes" && styles.tabButtonActive]}
            onPress={() => setActiveTab("pacotes")}
          >
            <Text style={[styles.tabText, activeTab === "pacotes" && styles.tabTextActive]}>Pacotes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabButton, activeTab === "adicionais" && styles.tabButtonActive]}
            onPress={() => setActiveTab("adicionais")}
          >
            <Text style={[styles.tabText, activeTab === "adicionais" && styles.tabTextActive]}>Adicionais</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lista de Cards */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#093A5D"]} />}
      >
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#093A5D" />
          </View>
        ) : currentList.length > 0 ? (
          <View style={styles.cardsContainer}>
            {currentList.map((pkg) => (
              <PackageCard
                key={pkg.id}
                titulo={pkg.titulo}
                subtitulo={pkg.subtitulo}
                preco={pkg.preco}
                duracaoMes={pkg.duracaoMes}
                tipoAula={pkg.tipoAula}
                quantidadeAula={pkg.quantidadeAula}
                descricao={pkg.beneficios?.map((b) => b.valor) || []}
                onClick={() => handleBuy(pkg.id!)}
                setHandleEdit={() => handleOpenEdit(pkg.id!, activeTab === "adicionais")}
                setHandleDelete={() => handleOpenDelete(pkg.id!)}
                isAdmin={true}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Nenhum {activeTab === "pacotes" ? "pacote" : "adicional"} ativo no momento.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ─── INTEGRAÇÃO DOS MODAIS ───────────────────────────────────────────── */}

      {/* 1. Modal Adicionar / Editar Pacote Principal */}
      {(openModal === "add" || openModal === "edit") && (
        <AddPackagePlan
          typePackage="PACOTE"
          title={openModal === "edit" ? "Editar Pacote" : "Criar Novo Pacote"}
          isEdit={openModal === "edit"}
          packageValues={selectedPackageData}
          onClose={handleCloseModal}
          packageCreated={setProductsExhibitions}
          callSuccessModal={() => {
            setModalInfos({
              title: openModal === "edit" ? "Edição Concluída" : "Pacote Criado",
              content: openModal === "edit" ? "O pacote foi editado com sucesso." : "O pacote foi adicionado com sucesso.",
            });
            setOpenModal("success");
          }}
        />
      )}

      {/* 2. Modal Adicionar / Editar Adicional */}
      {(openModal === "addAdditional" || openModal === "editAdditional") && (
        <AddPackagePlan
          typePackage="ADICIONAL"
          title={openModal === "editAdditional" ? "Editar Adicional" : "Adicionar Pacote Adicional"}
          isEdit={openModal === "editAdditional"}
          packageValues={selectedPackageData}
          onClose={handleCloseModal}
          packageCreated={setProductsExhibitionsAdicional}
          callSuccessModal={() => {
            setModalInfos({
              title: openModal === "editAdditional" ? "Edição Concluída" : "Adicional Criado",
              content: openModal === "editAdditional" ? "O adicional foi editado com sucesso." : "O adicional foi criado com sucesso.",
            });
            setOpenModal("success");
          }}
        />
      )}

      {/* 3. Modal de Confirmação de Exclusão */}
      {openModal === "delete" && (
        <TimerModal
          title="Confirmar Exclusão"
          content="Tem certeza de que deseja excluir este pacote?"
          buttonTitle="Excluir Pacote"
          closeThen={handleCloseModal}
          callSuccessModal={handleDeleteConfirm}
        />
      )}

      {/* 4. Modal de Sucesso */}
      <SuccessModal
        visible={openModal === "success"}
        title={modalInfos.title}
        content={modalInfos.content}
        onClose={handleCloseModal}
      />

      {/* 5. Modal de Erro */}
      {openModal === "error" && (
        <ErrorModal
          title={modalInfos.title}
          content={modalInfos.content}
          closeThen={handleCloseModal}
        />
      )}

      {/* 6. Modal de Carregamento / PagBank */}
      {openModal === "loadingPagBank" && <PagBankModal />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "ios" ? 8 : 16,
    paddingBottom: 12,
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  addBtnHeader: {
    backgroundColor: "#093A5D",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnHeaderText: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "600",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  tabButtonActive: {
    backgroundColor: "#ffffff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4b5563",
  },
  tabTextActive: {
    color: "#111827",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  loadingContainer: {
    marginTop: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  cardsContainer: {
    gap: 16,
  },
  emptyContainer: {
    marginTop: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
  },
});