import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

// Screens
import HomeScreen from '../screens/HomeScreen';
import SessionsScreen from '../screens/SessionsScreen';
import BlockLibraryScreen from '../screens/BlockLibraryScreen';
import SessionBuilderScreen from '../screens/SessionBuilderScreen';
import SessionPreviewScreen from '../screens/SessionPreviewScreen';
import RunSessionScreen from '../screens/RunSessionScreen';
import SettingsScreen from '../screens/SettingsScreen';
import BlockEditScreen from '../screens/BlockEditScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Stack navigator for Sessions tab
function SessionsStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#6200ee',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="SessionsList"
        component={SessionsScreen}
        options={{ title: 'Sessions', headerShown: false }}
      />
      <Stack.Screen
        name="SessionBuilder"
        component={SessionBuilderScreen}
        options={{ title: 'Session Builder' }}
      />
      <Stack.Screen
        name="SessionPreview"
        component={SessionPreviewScreen}
        options={{ title: 'Session Preview' }}
      />
      <Stack.Screen
        name="RunSession"
        component={RunSessionScreen}
        options={{
          title: 'Running Session',
          headerBackVisible: false,
          headerShown: false,
        }}
      />
    </Stack.Navigator>
  );
}

// Stack navigator for Library tab
function LibraryStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: '#6200ee',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
      }}
    >
      <Stack.Screen
        name="LibraryList"
        component={BlockLibraryScreen}
        options={{ title: 'Activity Library', headerShown: false }}
      />
      <Stack.Screen
        name="BlockEdit"
        component={BlockEditScreen}
        options={{ title: 'Edit Activity' }}
      />
    </Stack.Navigator>
  );
}

export default function AppNavigator() {
  const insets = useSafeAreaInsets();
  
  return (
    <NavigationContainer>
      <Tab.Navigator
          screenOptions={({ route }) => ({
            tabBarIcon: ({ focused, color, size }) => {
              let iconName;

              if (route.name === 'Home') {
                iconName = focused ? 'home' : 'home-outline';
              } else if (route.name === 'Sessions') {
                iconName = focused ? 'list' : 'list-outline';
              } else if (route.name === 'Library') {
                iconName = focused ? 'library' : 'library-outline';
              } else if (route.name === 'Settings') {
                iconName = focused ? 'settings' : 'settings-outline';
              }

              return <Ionicons name={iconName} size={size} color={color} />;
            },
            tabBarActiveTintColor: '#6200ee',
            tabBarInactiveTintColor: '#666',
            headerShown: false,
            tabBarStyle: {
              backgroundColor: '#fff',
              borderTopWidth: 1,
              borderTopColor: '#e0e0e0',
              paddingBottom: Math.max(insets.bottom, 5),
              paddingTop: 5,
              height: 60 + Math.max(insets.bottom, 0),
            },
          })}
        >
          <Tab.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'Home' }}
          />
          <Tab.Screen
            name="Sessions"
            component={SessionsStack}
            options={{ title: 'Sessions' }}
          />
          <Tab.Screen
            name="Library"
            component={LibraryStack}
            options={{ title: 'Library' }}
          />
          <Tab.Screen
            name="Settings"
            component={SettingsScreen}
            options={{ title: 'Settings' }}
          />
        </Tab.Navigator>
      </NavigationContainer>
  );
}
