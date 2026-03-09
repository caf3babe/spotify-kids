/**
 * Search screen for kids.
 * Searches Spotify but the backend returns ONLY approved tracks for child accounts.
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  StyleSheet,
  Alert,
  Linking,
  ActivityIndicator,
  SafeAreaView,
  TouchableOpacity,
} from 'react-native';
import { AllowlistTrack, SpotifyTrack, searchSpotify, playTrack } from '../api/client';
import { usePlayerStore } from '../store/playerStore';
import { TrackItem } from '../components/TrackItem';
import { MiniPlayer } from '../components/MiniPlayer';

// Map SpotifyTrack shape to AllowlistTrack shape for the TrackItem component
function toAllowlistTrack(t: SpotifyTrack): AllowlistTrack {
  return {
    id: 0,
    spotify_track_id: t.id,
    track_name: t.name,
    artist_name: t.artists.map((a) => a.name).join(', '),
    album_name: t.album.name,
    duration_ms: t.duration_ms,
    album_art_url: t.album.images[0]?.url ?? null,
    added_by: '',
    created_at: '',
  };
}

export function KidSearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<AllowlistTrack[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { currentTrack, setCurrentTrack } = usePlayerStore();

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const { tracks } = await searchSpotify(query.trim());
      setResults(tracks.map(toAllowlistTrack));
    } catch (err: unknown) {
      Alert.alert('Search Error', (err as Error).message);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handlePlay = async (track: AllowlistTrack) => {
    try {
      setCurrentTrack(track);
      const { spotifyUri } = await playTrack(track.spotify_track_id);
      const canOpen = await Linking.canOpenURL(spotifyUri);
      if (canOpen) {
        await Linking.openURL(spotifyUri);
      } else {
        Alert.alert('Spotify Required', 'Please install the Spotify app.');
      }
    } catch (err: unknown) {
      Alert.alert('Oops!', (err as Error).message);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.searchBar}>
        <TextInput
          style={styles.input}
          placeholder="Search for songs…"
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
        </View>
      )}

      {!loading && searched && results.length === 0 && (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🔍</Text>
          <Text style={styles.emptyTitle}>No approved songs found</Text>
          <Text style={styles.emptyText}>
            Ask a parent to approve this song!
          </Text>
        </View>
      )}

      {!loading && (
        <FlatList
          data={results}
          keyExtractor={(item) => item.spotify_track_id}
          renderItem={({ item }) => (
            <TrackItem
              track={item}
              onPlay={handlePlay}
              isPlaying={currentTrack?.spotify_track_id === item.spotify_track_id}
            />
          )}
          contentContainerStyle={styles.list}
        />
      )}

      <MiniPlayer />
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
  searchBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  list: { paddingVertical: 8, paddingBottom: 140 },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    paddingTop: 60,
  },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: 'bold' },
  emptyText: { color: '#B3B3B3', fontSize: 14, textAlign: 'center', paddingHorizontal: 32 },
});
