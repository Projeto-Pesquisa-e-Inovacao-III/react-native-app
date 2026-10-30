import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  title?: string;
  message?: string;
};

export default function NotImplemented({
  title = 'Em breve',
  message = 'Esta tela ainda não foi implementada.',
}: Props) {
  return (
    <View style={styles.placeholderContainer}>
      <Text style={styles.placeholderTitle}>{title}</Text>
      <Text style={styles.placeholderText}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholderContainer: {
    flex: 1,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#192633',
  },
  placeholderText: {
    marginTop: 8,
    fontSize: 16,
    color: '#475569',
    textAlign: 'center',
  },
});
