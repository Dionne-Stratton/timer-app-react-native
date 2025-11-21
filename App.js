import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import AppNavigator from './src/navigation/AppNavigator';
import useStore from './src/store';

export default function App() {
  const initialize = useStore((state) => state.initialize);

  useEffect(() => {
    // Initialize store - load data from storage
    initialize();
  }, [initialize]);

  return (
    <>
      <AppNavigator />
      <StatusBar style="auto" />
    </>
  );
}
