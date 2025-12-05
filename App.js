import React, { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import { useColorScheme } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import AppNavigator from "./src/navigation/AppNavigator";
import useStore from "./src/store";
import { getThemeColors } from "./src/theme";

export default function App() {
  const initialize = useStore((state) => state.initialize);
  const themeMode = useStore((state) => state.settings?.themeMode || "system");
  const systemColorScheme = useColorScheme();

  useEffect(() => {
    // Initialize store - load data from storage
    initialize();
  }, [initialize]);

  // Determine status bar style based on theme
  const colors = getThemeColors(themeMode, systemColorScheme);
  const isDark =
    colors.background === "#121212" || colors.background === "#1e1e1e";

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppNavigator />
        <StatusBar style={isDark ? "light" : "dark"} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
