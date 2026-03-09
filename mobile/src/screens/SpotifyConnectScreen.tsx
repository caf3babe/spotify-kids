/**
 * Allows a parent to connect their Spotify account via OAuth2.
 *
 * Flow:
 * 1. Backend generates a Spotify authorization URL with a state parameter
 * 2. App opens the URL in the system browser
 * 3. Spotify redirects to spotify-kids://spotify-callback?code=...&state=...
 * 4. App deep link handler captures code + state, sends to backend /spotify/callback
 * 5. Backend stores the tokens
 */
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Linking,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { connectSpotify, callbackSpotify, fetchSpotifyDevices } from '../api/client';

export function SpotifyConnectScreen() {
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [devices, setDevices] = useState<Array<{ id: string; name: string; type: string; is_active: boolean }>>([]);
  const [loadingDevices, setLoadingDevices] = useState(false);

  useEffect(() => {
    // Check connection status by trying to load devices
    checkConnectionStatus();

    // Listen for deep link callback from Spotify OAuth
    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => subscription.remove();
  }, []);

  async function checkConnectionStatus() {
    setLoadingDevices(true);
    try {
      const { devices: devs } = await fetchSpotifyDevices();
      setDevices(devs);
      setConnected(true);
    } catch {
      setConnected(false);
    } finally {
      setLoadingDevices(false);
    }
  }

  async function handleDeepLink({ url }: { url: string }) {
    // Expected: spotify-kids://spotify-callback?code=...&state=...
    if (!url.includes('spotify-callback')) return;

    const parsed = new URL(url);
    const code = parsed.searchParams.get('code');
    const state = parsed.searchParams.get('state');

    if (!code || !state) {
      Alert.alert('Error', 'Invalid callback from Spotify');
      return;
    }

    setConnecting(true);
    try {
      await callbackSpotify(code, state);
      setConnected(true);
      Alert.alert('Connected!', 'Your Spotify account is now linked. Kids can play music!');
      checkConnectionStatus();
    } catch (err: unknown) {
      Alert.alert('Connection Failed', (err as Error).message);
    } finally {
      setConnecting(false);
    }
  }

  async function handleConnect() {
    setConnecting(true);
    try {
      const { url } = await connectSpotify();
      await Linking.openURL(url);
      // handleDeepLink will fire when Spotify redirects back
    } catch (err: unknown) {
      Alert.alert('Error', (err as Error).message);
      setConnecting(false);
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
          <Text style={styles.icon}>🎧</Text>
          <Text style={styles.title}>Spotify Account</Text>
          <Text style={styles.subtitle}>
            Connect your Spotify account so kids can play approved music through Spotify.
          </Text>
        </View>

        {/* Connection status */}
        <View style={[styles.statusCard, connected ? styles.statusConnected : styles.statusDisconnected]}>
          <Text style={styles.statusIcon}>{connected ? '✅' : '⚠️'}</Text>
          <View>
            <Text style={styles.statusTitle}>
              {connected ? 'Spotify Connected' : 'Spotify Not Connected'}
            </Text>
            <Text style={styles.statusSubtitle}>
              {connected
                ? 'Kids can open approved songs in the Spotify app'
                : 'Connect your account to enable music playback'}
            </Text>
          </View>
        </View>

        {/* Connect / Reconnect button */}
        <TouchableOpacity
          style={[styles.connectBtn, connecting && styles.connectBtnDisabled]}
          onPress={handleConnect}
          disabled={connecting}>
          {connecting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.connectBtnText}>
              {connected ? '🔄 Reconnect Spotify' : '🎵 Connect Spotify'}
            </Text>
          )}
        </TouchableOpacity>

        {/* Active devices */}
        {connected && (
          <View style={styles.devicesSection}>
            <View style={styles.devicesSectionHeader}>
              <Text style={styles.devicesTitle}>Available Devices</Text>
              <TouchableOpacity onPress={checkConnectionStatus} disabled={loadingDevices}>
                <Text style={styles.refreshBtn}>{loadingDevices ? '…' : '↻ Refresh'}</Text>
              </TouchableOpacity>
            </View>

            {loadingDevices ? (
              <ActivityIndicator color="#1DB954" style={{ marginTop: 12 }} />
            ) : devices.length === 0 ? (
              <Text style={styles.noDevices}>
                No active Spotify devices found.{'\n'}Open Spotify on your phone, speaker, or TV.
              </Text>
            ) : (
              devices.map((d) => (
                <View key={d.id} style={[styles.deviceRow, d.is_active && styles.deviceActive]}>
                  <Text style={styles.deviceIcon}>
                    {d.type === 'Smartphone' ? '📱' : d.type === 'Computer' ? '💻' : d.type === 'Speaker' ? '🔊' : '📺'}
                  </Text>
                  <View>
                    <Text style={styles.deviceName}>{d.name}</Text>
                    <Text style={styles.deviceType}>
                      {d.type}{d.is_active ? ' · Active' : ''}
                    </Text>
                  </View>
                  {d.is_active && <Text style={styles.activeDot}>●</Text>}
                </View>
              ))
            )}
          </View>
        )}

        {/* Instructions */}
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>How playback works</Text>
          <Text style={styles.infoText}>
            When a kid taps a song, the app opens it directly in the Spotify app.
            Spotify handles all audio playback, so no Spotify Premium transfer to our app is needed.{'\n\n'}
            Make sure Spotify is installed on the kid's device.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  scroll: { padding: 16, paddingBottom: 40 },
  header: { alignItems: 'center', marginBottom: 28, marginTop: 8 },
  icon: { fontSize: 56, marginBottom: 12 },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  subtitle: { color: '#B3B3B3', fontSize: 14, textAlign: 'center', lineHeight: 20 },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  statusConnected: { backgroundColor: '#1A2E1A' },
  statusDisconnected: { backgroundColor: '#2E1A1A' },
  statusIcon: { fontSize: 28 },
  statusTitle: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  statusSubtitle: { color: '#B3B3B3', fontSize: 12, marginTop: 2 },
  connectBtn: {
    backgroundColor: '#1DB954',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 24,
  },
  connectBtnDisabled: { opacity: 0.6 },
  connectBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  devicesSection: { marginBottom: 24 },
  devicesSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  devicesTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  refreshBtn: { color: '#1DB954', fontSize: 14 },
  noDevices: { color: '#B3B3B3', fontSize: 13, lineHeight: 20 },
  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#282828',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  deviceActive: { backgroundColor: '#1A2E1A' },
  deviceIcon: { fontSize: 22 },
  deviceName: { color: '#FFFFFF', fontSize: 14, fontWeight: '500' },
  deviceType: { color: '#B3B3B3', fontSize: 12 },
  activeDot: { color: '#1DB954', fontSize: 10, marginLeft: 'auto' },
  infoBox: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: '#535353',
  },
  infoTitle: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  infoText: { color: '#B3B3B3', fontSize: 13, lineHeight: 20 },
});
