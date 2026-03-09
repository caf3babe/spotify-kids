/**
 * Shows all approved tracks with the ability to remove them.
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { AllowlistTrack, fetchAllowlist, removeFromAllowlist } from '../api/client';
import { TrackItem } from '../components/TrackItem';

export function ParentAllowlistScreen() {
  const [tracks, setTracks] = useState<AllowlistTrack[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTracks = useCallback(async () => {
    try {
      const data = await fetchAllowlist();
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

  const handleRemove = (track: AllowlistTrack) => {
    Alert.alert(
      'Remove Song',
      `Remove "${track.track_name}" by ${track.artist_name} from the approved list?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeFromAllowlist(track.spotify_track_id);
              setTracks((prev) => prev.filter((t) => t.spotify_track_id !== track.spotify_track_id));
            } catch (err: unknown) {
              Alert.alert('Error', (err as Error).message);
            }
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1DB954" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {tracks.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyTitle}>No approved songs yet</Text>
          <Text style={styles.emptyText}>
            Use the "Add" tab to search Spotify and approve songs for your kids.
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.statsBar}>
            <Text style={styles.statsText}>
              {tracks.length} approved song{tracks.length !== 1 ? 's' : ''}
            </Text>
            <Text style={styles.statsHint}>Swipe or tap ✕ to remove</Text>
          </View>
          <FlatList
            data={tracks}
            keyExtractor={(item) => String(item.id)}
            renderItem={({ item }) => (
              <TrackItem track={item} onPlay={() => {}} onRemove={handleRemove} />
            )}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1DB954" />
            }
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  statsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#282828',
  },
  statsText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  statsHint: { color: '#6B6B6B', fontSize: 12 },
  list: { paddingVertical: 8, paddingBottom: 40 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    padding: 32,
  },
  emptyIcon: { fontSize: 56 },
  emptyTitle: { color: '#FFFFFF', fontSize: 20, fontWeight: 'bold' },
  emptyText: { color: '#B3B3B3', fontSize: 14, textAlign: 'center', lineHeight: 22 },
});
