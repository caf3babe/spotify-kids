import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { usePlayerStore } from '../store/playerStore';
import { playTrack } from '../api/client';

export function MiniPlayer() {
  const { currentTrack, isPlaying, setIsPlaying, clearPlayer } = usePlayerStore();

  if (!currentTrack) return null;

  async function handlePlay() {
    if (!currentTrack) return;
    try {
      const { spotifyUri } = await playTrack(currentTrack.spotify_track_id);
      // Open Spotify app with the track
      const canOpen = await Linking.canOpenURL(spotifyUri);
      if (canOpen) {
        await Linking.openURL(spotifyUri);
        setIsPlaying(true);
      } else {
        Alert.alert('Spotify not found', 'Please install the Spotify app to play music.');
      }
    } catch (err: unknown) {
      Alert.alert('Playback Error', (err as Error).message);
    }
  }

  return (
    <View style={styles.container}>
      {currentTrack.album_art_url ? (
        <Image source={{ uri: currentTrack.album_art_url }} style={styles.art} />
      ) : (
        <View style={[styles.art, styles.artPlaceholder]}>
          <Text style={{ fontSize: 18 }}>🎵</Text>
        </View>
      )}

      <View style={styles.info}>
        <Text style={styles.trackName} numberOfLines={1}>
          {currentTrack.track_name}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {currentTrack.artist_name}
        </Text>
      </View>

      <TouchableOpacity onPress={handlePlay} style={styles.playBtn}>
        <Text style={styles.playBtnText}>{isPlaying ? '⏸' : '▶'}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={clearPlayer} style={styles.closeBtn}>
        <Text style={styles.closeBtnText}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 80,
    left: 12,
    right: 12,
    backgroundColor: '#282828',
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  art: {
    width: 44,
    height: 44,
    borderRadius: 4,
    marginRight: 10,
  },
  artPlaceholder: {
    backgroundColor: '#3E3E3E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  info: {
    flex: 1,
  },
  trackName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  artist: {
    color: '#B3B3B3',
    fontSize: 12,
  },
  playBtn: {
    padding: 8,
  },
  playBtnText: {
    fontSize: 22,
    color: '#1DB954',
  },
  closeBtn: {
    padding: 8,
  },
  closeBtnText: {
    color: '#B3B3B3',
    fontSize: 16,
  },
});
