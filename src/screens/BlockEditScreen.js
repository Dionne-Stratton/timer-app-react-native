import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function BlockEditScreen({ navigation, route }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Block Edit Screen</Text>
      <Text style={styles.subtext}>Block edit form will go here</Text>
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

