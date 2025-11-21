import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import BlockLibraryScreen from '../screens/BlockLibraryScreen';
import SessionBuilderScreen from '../screens/SessionBuilderScreen';
import SessionPreviewScreen from '../screens/SessionPreviewScreen';
import RunSessionScreen from '../screens/RunSessionScreen';
import SettingsScreen from '../screens/SettingsScreen';
import BlockEditScreen from '../screens/BlockEditScreen';

const Stack = createNativeStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
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
          name="Home"
          component={HomeScreen}
          options={{ title: 'Sessions' }}
        />
        <Stack.Screen
          name="BlockLibrary"
          component={BlockLibraryScreen}
          options={{ title: 'Activity Library' }}
        />
        <Stack.Screen
          name="BlockEdit"
          component={BlockEditScreen}
          options={{ title: 'Edit Activity' }}
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
          }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: 'Settings' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

