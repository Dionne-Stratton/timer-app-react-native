import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SessionBuilderScreen({ navigation, route }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Session Builder Screen</Text>
      <Text style={styles.subtext}>Session builder UI will go here</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  text: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtext: {
    fontSize: 14,
    color: '#666',
  },
});

