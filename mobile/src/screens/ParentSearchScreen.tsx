/**
 * Parent search screen – searches full Spotify catalog.
 * Shows ✅ badge on already-approved tracks.
 * Parents can approve/unapprove directly from here.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Alert,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  SafeAreaView,
} from 'react-native';
import {
  SpotifyTrack,
  searchSpotify,
  addToAllowlist,
  removeFromAllowlist,
} from '../api/client';

interface TrackRowProps {
  track: SpotifyTrack;
  approved: boolean;
  onToggle: (track: SpotifyTrack, approved: boolean) => void;
  loading: boolean;
}

function TrackRow({ track, approved, onToggle, loading }: TrackRowProps) {
  const artistNames = track.artists.map((a) => a.name).join(', ');
  const artUrl = track.album.images[track.album.images.length - 1]?.url;
  const durationStr = `${Math.floor(track.duration_ms / 60000)}:${String(
    Math.floor((track.duration_ms % 60000) / 1000),
  ).padStart(2, '0')}`;

  return (
    <View style={[styles.row, approved && styles.rowApproved]}>
      {artUrl ? (
        <Image source={{ uri: artUrl }} style={styles.art} />
      ) : (
        <View style={[styles.art, styles.artPlaceholder]}>
          <Text>🎵</Text>
        </View>
      )}
      <View style={styles.info}>
        <Text style={styles.trackName} numberOfLines={1}>
          {track.name}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {artistNames}
        </Text>
        <Text style={styles.meta}>
          {track.album.name} · {durationStr}
          {track.explicit ? ' · 🔞' : ''}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.approveBtn, approved ? styles.approveBtnActive : styles.approveBtnInactive]}
        onPress={() => onToggle(track, approved)}
        disabled={loading}>
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <Text style={styles.approveBtnText}>{approved ? '✓ Approved' : '+ Approve'}</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

export function ParentSearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [loadingTrackId, setLoadingTrackId] = useState<string | null>(null);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const { tracks } = await searchSpotify(query.trim(), 30);
      setResults(tracks);
    } catch (err: unknown) {
      Alert.alert('Search Error', (err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const toggleApproval = async (track: SpotifyTrack, currentlyApproved: boolean) => {
    setLoadingTrackId(track.id);
    try {
      if (currentlyApproved) {
        await removeFromAllowlist(track.id);
        setResults((prev) =>
          prev.map((t) => (t.id === track.id ? { ...t, is_approved: false } : t)),
        );
      } else {
        if (track.explicit) {
          await new Promise<void>((resolve, reject) => {
            Alert.alert(
              'Explicit Content',
              `"${track.name}" is marked as explicit. Approve anyway?`,
              [
                { text: 'Cancel', style: 'cancel', onPress: () => reject(new Error('Cancelled')) },
                { text: 'Approve', onPress: () => resolve() },
              ],
            );
          });
        }

        await addToAllowlist({
          spotifyTrackId: track.id,
          trackName: track.name,
          artistName: track.artists.map((a) => a.name).join(', '),
          albumName: track.album.name,
          durationMs: track.duration_ms,
          albumArtUrl: track.album.images[0]?.url,
        });
        setResults((prev) =>
          prev.map((t) => (t.id === track.id ? { ...t, is_approved: true } : t)),
        );
      }
    } catch (err: unknown) {
      const msg = (err as Error).message;
      if (msg !== 'Cancelled') Alert.alert('Error', msg);
    } finally {
      setLoadingTrackId(null);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Search Spotify…"
          placeholderTextColor="#6B6B6B"
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity style={styles.searchBtn} onPress={handleSearch}>
          <Text style={styles.searchBtnText}>Search</Text>
        </TouchableOpacity>
      </View>

      {loading && (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#1DB954" />
          <Text style={styles.loadingText}>Searching Spotify…</Text>
        </View>
      )}

      {!loading && searched && results.length === 0 && (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>No results</Text>
        </View>
      )}

      {!loading && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TrackRow
              track={item}
              approved={!!item.is_approved}
              onToggle={toggleApproval}
              loading={loadingTrackId === item.id}
            />
          )}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121212' },
  searchBar: {
    flexDirection: 'row',
    padding: 12,
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#282828',
  },
  input: {
    flex: 1,
    backgroundColor: '#282828',
    color: '#FFFFFF',
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
  },
  searchBtn: {
    backgroundColor: '#1DB954',
    borderRadius: 8,
    paddingHorizontal: 16,
    justifyContent: 'center',
  },
  searchBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 14 },
  list: { paddingVertical: 8, paddingBottom: 40 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  rowApproved: { backgroundColor: '#1A2E1A' },
  art: { width: 48, height: 48, borderRadius: 4, marginRight: 12 },
  artPlaceholder: { backgroundColor: '#282828', justifyContent: 'center', alignItems: 'center' },
  info: { flex: 1, marginRight: 8 },
  trackName: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', marginBottom: 2 },
  artist: { color: '#B3B3B3', fontSize: 12, marginBottom: 2 },
  meta: { color: '#6B6B6B', fontSize: 11 },
  approveBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    minWidth: 90,
    alignItems: 'center',
  },
  approveBtnActive: { backgroundColor: '#1DB954' },
  approveBtnInactive: { backgroundColor: '#333333', borderWidth: 1, borderColor: '#535353' },
  approveBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingTop: 60,
  },
  loadingText: { color: '#B3B3B3', fontSize: 14 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
});
