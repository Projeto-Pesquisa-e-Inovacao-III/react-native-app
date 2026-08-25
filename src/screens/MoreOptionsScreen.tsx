import React from "react";
import BottomTabBar from '../components/BottomTabBar';
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import {
  Banknote,
  Boxes,
  Calendar,
  ChevronRight,
  Clock,
  History,
  IdCard,
  LogOut,
  User,
} from "lucide-react-native";
// import { findUserData } from "../constants/user";
import { UserRole } from "../types/availability";

type OptionItemProps = {
  icon: React.ReactNode;
  title: string;
  onPress: () => void;
  danger?: boolean;
};

function OptionItem(props: OptionItemProps) {
  return (
    <Pressable style={styles.optionItem} onPress={props.onPress}>
      <View style={styles.optionContent}>
        <View style={styles.optionIcon}>{props.icon}</View>
        <Text style={[styles.optionTitle, props.danger ? styles.optionTitleDanger : null]}>{props.title}</Text>
      </View>
      {!props.danger ? <ChevronRight color="#9CA3AF" size={20} /> : null}
    </Pressable>
  );
}

export default function MoreOptionsScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();

  const roles = ((route.params && route.params.roles) ? route.params.roles : ["aluno"]) as UserRole[];

  const userName = useQuery({
    queryKey: ["user"],
    queryFn: function () {
      //return findUserData();
    },
    select: function (response: any) {
      return response.data.nome;
    },
    retry: false,
  });

  const roleLabel = roles.includes("admin")
    ? "Administrador"
    : roles.includes("personal")
    ? "Personal Trainer"
    : "Aluno";

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.avatarFake}>
            <Text style={styles.avatarLetter}>{(userName.data || "U").charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={styles.userName}>{userName.data || "Usuário"}</Text>
          <Text style={styles.userRole}>{roleLabel}</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Minha Conta</Text>
            <View style={styles.card}>
              <OptionItem
                icon={<IdCard color="#4F46E5" size={22} />}
                title="Suas informações"
                onPress={function () {
                  navigation.navigate("EditUser");
                }}
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ações e Configurações</Text>
            <View style={styles.card}>
              {roles.includes("aluno") ? (
                <>
                  <OptionItem
                    icon={<History color="#4F46E5" size={22} />}
                    title="Ajustar Disponibilidade"
                    onPress={function () {
                      navigation.navigate("SetAvailabilityScreen");
                    }}
                  />
                </>
              ) : null}

              {roles.includes("personal") && !roles.includes("admin") ? (
                <OptionItem
                  icon={<Clock color="#4F46E5" size={22} />}
                  title="Ajustar disponibilidade"
                  onPress={function () {
                    navigation.navigate("SetAvailabilityScreen");
                  }}
                />
              ) : null}

              {roles.includes("personal") && roles.includes("admin") ? (
                <>
                  <OptionItem
                    icon={<Calendar color="#4F46E5" size={22} />}
                    title="Agenda"
                    onPress={function () {
                      navigation.navigate("Schedule");
                    }}
                  />
                  <OptionItem
                    icon={<Boxes color="#4F46E5" size={22} />}
                    title="Pacotes"
                    onPress={function () {
                      navigation.navigate("Packages");
                    }}
                  />
                  <OptionItem
                    icon={<Clock color="#4F46E5" size={22} />}
                    title="Ajustar disponibilidade"
                    onPress={function () {
                      navigation.navigate("SetAvailabilityScreen");
                    }}
                  />
                  <OptionItem
                    icon={<User color="#4F46E5" size={22} />}
                    title="Criar personal"
                    onPress={function () {
                      navigation.navigate("CreatePersonal");
                    }}
                  />
                </>
              ) : null}

              {roles.includes("admin") && !roles.includes("personal") ? (
                <OptionItem
                  icon={<Boxes color="#4F46E5" size={22} />}
                  title="Pacotes"
                  onPress={function () {
                    navigation.navigate("Packages");
                  }}
                />
              ) : null}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.card}>
              <OptionItem
                icon={<LogOut color="#EF4444" size={22} />}
                title="Sair"
                danger
                onPress={function () {
                  navigation.navigate("Logout");
                }}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <BottomTabBar
        activeTab="more"
        onTabPress={(tab) => {
          if (tab === "requests") navigation.navigate("Requests");
          if (tab === "more") navigation.navigate("MoreOptions");
          if (tab === "schedule") navigation.navigate("Schedule");
          if (tab === "home") navigation.navigate("Home");
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  contentContainer: {
    paddingBottom: 100,
  },
  header: {
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 20,
    alignItems: "center",
    backgroundColor: "#093a5d",
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 24,
  },
  avatarFake: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "#94A3B8",
    borderWidth: 3,
    borderColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: {
    color: "#FFFFFF",
    fontSize: 38,
    fontWeight: "700",
  },
  userName: {
    marginTop: 12,
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "600",
  },
  userRole: {
    color: "#C7D2FE",
    fontSize: 14,
    marginTop: 4,
  },
  content: {
    paddingHorizontal: 16,
    gap: 24,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.4,
    paddingLeft: 8,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    overflow: "hidden",
  },
  optionItem: {
    height: 58,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  optionIcon: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTitle: {
    color: "#1F2937",
    fontSize: 16,
    fontWeight: "500",
  },
  optionTitleDanger: {
    color: "#EF4444",
  },
});