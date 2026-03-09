/**
 * Home screen for kids – shows the full approved music library.
 * Tapping a track launches it in the Spotify app via deep link.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  Linking,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { AllowlistTrack, browseAllowed, playTrack } from '../api/client';
import { usePlayerStore } from '../store/playerStore';
import { TrackItem } from '../components/TrackItem';
import { MiniPlayer } from '../components/MiniPlayer';
import { useAuthStore } from '../store/authStore';

export function KidHomeScreen() {
  const [tracks, setTracks] = useState<AllowlistTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { currentTrack, setCurrentTrack } = usePlayerStore();
  const { user, signOut } = useAuthStore();

  const loadTracks = useCallback(async () => {
    try {
      const { tracks: data } = await browseAllowed();
      setTracks(data);
    } catch (err: unknown) {
      Alert.alert('Error', (err as Error).message);
    }
  }, []);

  useEffect(() => {
    loadTracks().finally(() => setLoading(false));
  }, [loadTracks]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadTracks();
    setRefreshing(false);
  };

  const handlePlay = async (track: AllowlistTrack) => {
    try {
      setCurrentTrack(track);
      const { spotifyUri } = await playTrack(track.spotify_track_id);
      const canOpen = await Linking.canOpenURL(spotifyUri);
      if (canOpen) {
        await Linking.openURL(spotifyUri);
      } else {
        Alert.alert(
          'Spotify Required',
          'Please install the Spotify app to listen to music.',
        );
      }
    } catch (err: unknown) {
      Alert.alert('Oops!', (err as Error).message);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1DB954" />
        <Text style={styles.loadingText}>Loading your music…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hi {user?.full_name?.split(' ')[0] ?? 'there'}! 👋</Text>
        <Text style={styles.subtitle}>
          {tracks.length} song{tracks.length !== 1 ? 's' : ''} ready to play
        </Text>
      </View>

      {tracks.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🎵</Text>
          <Text style={styles.emptyTitle}>No music yet</Text>
          <Text style={styles.emptyText}>
            Ask a parent to approve some songs for you!
          </Text>
        </View>
      ) : (
        <FlatList
          data={tracks}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => (
            <TrackItem
              track={item}
              onPlay={handlePlay}
              isPlaying={currentTrack?.id === item.id}
            />
          )}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1DB954" />
          }
        />
      )}

      <MiniPlayer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#282828',
  },
  greeting: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#B3B3B3',
    fontSize: 14,
    marginTop: 4,
  },
  list: {
    paddingVertical: 8,
    paddingBottom: 140,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#B3B3B3',
    marginTop: 12,
    fontSize: 15,
  },
  emptyIcon: {
    fontSize: 64,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  emptyText: {
    color: '#B3B3B3',
    fontSize: 15,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
