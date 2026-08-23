import { StyleSheet, Text, View } from 'react-native';

export default function NotImplementedScreen(){
    return (
      <View style={styles.placeholderContainer}>
        <Text style={styles.placeholderTitle}>Em breve</Text>
        <Text style={styles.placeholderText}>Esta aba ainda nao foi implementada.</Text>
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