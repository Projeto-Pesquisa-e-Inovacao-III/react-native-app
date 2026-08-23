import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeftIcon } from '../../src/components/icons/AuthIcons';
import NotImplemented from '../../src/components/NotImplemented';

export default function RegisterRoute() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        activeOpacity={0.7}
      >
        <ArrowLeftIcon size={20} color="#FFFFFF" />
        <Text style={styles.backButtonText}>Voltar para o Login</Text>
      </TouchableOpacity>
      <NotImplemented
        title="Criar Conta"
        message="O formulário de cadastro de novos alunos e personais estará disponível em breve."
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F1E2E',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    zIndex: 10,
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 8,
  },
});
