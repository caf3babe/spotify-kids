import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { ActivityIndicator, View, Text } from 'react-native';

import { useAuthStore } from '../store/authStore';

// Screens
import { LoginScreen } from '../screens/LoginScreen';
import { KidHomeScreen } from '../screens/KidHomeScreen';
import { KidSearchScreen } from '../screens/KidSearchScreen';
import { ParentDashboardScreen } from '../screens/ParentDashboardScreen';
import { ParentAllowlistScreen } from '../screens/ParentAllowlistScreen';
import { ParentSearchScreen } from '../screens/ParentSearchScreen';
import { SpotifyConnectScreen } from '../screens/SpotifyConnectScreen';

// ── Stack param lists ─────────────────────────────────────────────────────────

export type RootStackParamList = {
  Login: undefined;
  KidTabs: undefined;
  ParentTabs: undefined;
};

export type KidTabParamList = {
  Home: undefined;
  Search: undefined;
};

export type ParentTabParamList = {
  Dashboard: undefined;
  Allowlist: undefined;
  ParentSearch: undefined;
  SpotifyConnect: undefined;
};

const Root = createNativeStackNavigator<RootStackParamList>();
const KidTab = createBottomTabNavigator<KidTabParamList>();
const ParentTab = createBottomTabNavigator<ParentTabParamList>();

// ── Tab navigators ────────────────────────────────────────────────────────────

function KidTabs() {
  return (
    <KidTab.Navigator
      screenOptions={{
        tabBarStyle: { backgroundColor: '#1DB954' },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: '#E8F5E9',
        headerStyle: { backgroundColor: '#1DB954' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold' },
      }}>
      <KidTab.Screen
        name="Home"
        component={KidHomeScreen}
        options={{ title: '🎵 My Music', tabBarLabel: 'Music' }}
      />
      <KidTab.Screen
        name="Search"
        component={KidSearchScreen}
        options={{ title: '🔍 Find Music', tabBarLabel: 'Search' }}
      />
    </KidTab.Navigator>
  );
}

function ParentTabs() {
  return (
    <ParentTab.Navigator
      screenOptions={{
        tabBarStyle: { backgroundColor: '#121212' },
        tabBarActiveTintColor: '#1DB954',
        tabBarInactiveTintColor: '#B3B3B3',
        headerStyle: { backgroundColor: '#121212' },
        headerTintColor: '#FFFFFF',
        headerTitleStyle: { fontWeight: 'bold' },
      }}>
      <ParentTab.Screen
        name="Dashboard"
        component={ParentDashboardScreen}
        options={{ title: 'Dashboard', tabBarLabel: 'Home' }}
      />
      <ParentTab.Screen
        name="Allowlist"
        component={ParentAllowlistScreen}
        options={{ title: 'Approved Music', tabBarLabel: 'Approved' }}
      />
      <ParentTab.Screen
        name="ParentSearch"
        component={ParentSearchScreen}
        options={{ title: 'Add Music', tabBarLabel: 'Add' }}
      />
      <ParentTab.Screen
        name="SpotifyConnect"
        component={SpotifyConnectScreen}
        options={{ title: 'Spotify Account', tabBarLabel: 'Spotify' }}
      />
    </ParentTab.Navigator>
  );
}

// ── Root navigator ────────────────────────────────────────────────────────────

export function AppNavigator() {
  const { isLoading, isAuthenticated, user } = useAuthStore();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#121212' }}>
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Root.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Root.Screen name="Login" component={LoginScreen} />
        ) : user?.role === 'parent' ? (
          <Root.Screen name="ParentTabs" component={ParentTabs} />
        ) : (
          <Root.Screen name="KidTabs" component={KidTabs} />
        )}
      </Root.Navigator>
    </NavigationContainer>
  );
}
