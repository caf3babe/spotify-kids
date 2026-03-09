import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { useAuthStore } from '../store/authStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logout } from '../api/client';

export function ParentDashboardScreen() {
  const { user, signOut } = useAuthStore();

  async function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          try {
            const refreshToken = await AsyncStorage.getItem('@spotifykids/refreshToken');
            if (refreshToken) await logout(refreshToken);
          } catch {
            // Ignore logout errors
          } finally {
            await signOut();
          }
        },
      },
    ]);
  }

  const features = [
    {
      icon: '✅',
      title: 'Approve Music',
      description: 'Search Spotify and add songs to the approved list',
      tab: 'Add',
    },
    {
      icon: '📋',
      title: 'Approved Library',
      description: 'View and remove approved tracks',
      tab: 'Approved',
    },
    {
      icon: '🎧',
      title: 'Spotify Account',
      description: 'Connect your Spotify account to enable playback',
      tab: 'Spotify',
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Parent Dashboard</Text>
          <Text style={styles.subtitle}>
            Welcome, {user?.full_name ?? user?.email ?? 'Parent'} 👋
          </Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleBadgeText}>Parent Account</Text>
          </View>
        </View>

        {/* Feature cards */}
        <Text style={styles.sectionTitle}>What would you like to do?</Text>
        {features.map((feature) => (
          <View key={feature.tab} style={styles.card}>
            <Text style={styles.cardIcon}>{feature.icon}</Text>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{feature.title}</Text>
              <Text style={styles.cardDescription}>{feature.description}</Text>
            </View>
            <Text style={styles.cardArrow}>→</Text>
          </View>
        ))}

        {/* How it works */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>How parental controls work</Text>
          <Text style={styles.infoText}>
            1. Connect your Spotify account (Spotify tab){'\n'}
            2. Search for songs you want to allow (Add tab){'\n'}
            3. Tap "Approve" to add them to the library{'\n'}
            4. Kids can only play approved songs{'\n'}
            5. Remove songs anytime from the Approved tab
          </Text>
        </View>

        {/* Sign out */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  scroll: { padding: 16, paddingBottom: 40 },
  header: { marginBottom: 28 },
  title: { color: '#FFFFFF', fontSize: 28, fontWeight: 'bold', marginBottom: 4 },
  subtitle: { color: '#B3B3B3', fontSize: 15, marginBottom: 12 },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1DB954',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#282828',
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  cardIcon: { fontSize: 28, marginRight: 14 },
  cardContent: { flex: 1 },
  cardTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', marginBottom: 2 },
  cardDescription: { color: '#B3B3B3', fontSize: 13 },
  cardArrow: { color: '#1DB954', fontSize: 20 },
  infoBox: {
    backgroundColor: '#1A2E1A',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 24,
    borderLeftWidth: 3,
    borderLeftColor: '#1DB954',
  },
  infoTitle: { color: '#1DB954', fontSize: 15, fontWeight: '600', marginBottom: 8 },
  infoText: { color: '#B3B3B3', fontSize: 13, lineHeight: 22 },
  signOutBtn: {
    borderWidth: 1,
    borderColor: '#535353',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  signOutText: { color: '#B3B3B3', fontSize: 15 },
});
