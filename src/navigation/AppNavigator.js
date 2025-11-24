import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColorScheme } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../theme";

// Screens
import HomeScreen from "../screens/HomeScreen";
import SessionsScreen from "../screens/SessionsScreen";
import BlockLibraryScreen from "../screens/BlockLibraryScreen";
import SessionBuilderScreen from "../screens/SessionBuilderScreen";
import SessionPreviewScreen from "../screens/SessionPreviewScreen";
import RunSessionScreen from "../screens/RunSessionScreen";
import SettingsScreen from "../screens/SettingsScreen";
import BlockEditScreen from "../screens/BlockEditScreen";
import GoProScreen from "../screens/GoProScreen";

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Stack navigator for Sessions tab
function SessionsStack() {
  const colors = useTheme();

  return (
    <Stack.Navigator
      initialRouteName="SessionsList"
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.textLight,
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Stack.Screen
        name="SessionsList"
        component={SessionsScreen}
        options={{ title: "Sessions", headerShown: false }}
      />
      <Stack.Screen
        name="SessionBuilder"
        component={SessionBuilderScreen}
        options={{ title: "Session Builder" }}
      />
      <Stack.Screen
        name="SessionPreview"
        component={SessionPreviewScreen}
        options={{ title: "Session Preview" }}
      />
      <Stack.Screen
        name="RunSession"
        component={RunSessionScreen}
        options={{
          title: "Running Session",
          headerBackVisible: false,
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

// Stack navigator for Library tab
function LibraryStack() {
  const colors = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.textLight,
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Stack.Screen
        name="LibraryList"
        component={BlockLibraryScreen}
        options={{ title: "Activity Library", headerShown: false }}
      />
      <Stack.Screen
        name="BlockEdit"
        component={BlockEditScreen}
        options={({ route }) => ({
          title: route.params?.blockId ? "Edit Activity" : "Add Activity",
          headerStatusBarHeight: 10,
        })}
      />
    </Stack.Navigator>
  );
}

// Stack navigator for Settings tab
function SettingsStack() {
  const colors = useTheme();

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.primary,
        },
        headerTintColor: colors.textLight,
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Stack.Screen
        name="SettingsList"
        component={SettingsScreen}
        options={{ title: "Settings", headerShown: false }}
      />
      <Stack.Screen
        name="GoPro"
        component={GoProScreen}
        options={{ title: "Timer Pro" }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const insets = useSafeAreaInsets();
  const colors = useTheme();

  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;

            if (route.name === "Home") {
              iconName = focused ? "home" : "home-outline";
            } else if (route.name === "Sessions") {
              iconName = focused ? "list" : "list-outline";
            } else if (route.name === "Library") {
              iconName = focused ? "library" : "library-outline";
            } else if (route.name === "Settings") {
              iconName = focused ? "settings" : "settings-outline";
            }

            return <Ionicons name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colors.tabBarBackground,
            borderTopWidth: 1,
            borderTopColor: colors.borderLight,
            paddingBottom: Math.max(insets.bottom, 5),
            paddingTop: 5,
            height: 60 + Math.max(insets.bottom, 0),
          },
        })}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{ title: "Home" }}
        />
        <Tab.Screen
          name="Sessions"
          component={SessionsStack}
          options={{ title: "Sessions" }}
        />
        <Tab.Screen
          name="Library"
          component={LibraryStack}
          options={{ title: "Library" }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsStack}
          options={{ title: "Settings" }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
