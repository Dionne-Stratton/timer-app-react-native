import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function BlockLibraryScreen({ navigation }) {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Block Library Screen</Text>
      <Text style={styles.subtext}>Activity blocks list will go here</Text>
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

