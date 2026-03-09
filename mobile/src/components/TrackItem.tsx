import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { AllowlistTrack } from '../api/client';

interface Props {
  track: AllowlistTrack;
  onPlay: (track: AllowlistTrack) => void;
  onRemove?: (track: AllowlistTrack) => void;
  isPlaying?: boolean;
}

export function TrackItem({ track, onPlay, onRemove, isPlaying }: Props) {
  const durationStr = track.duration_ms
    ? `${Math.floor(track.duration_ms / 60000)}:${String(Math.floor((track.duration_ms % 60000) / 1000)).padStart(2, '0')}`
    : '';

  return (
    <View style={[styles.container, isPlaying && styles.playing]}>
      {track.album_art_url ? (
        <Image source={{ uri: track.album_art_url }} style={styles.art} />
      ) : (
        <View style={[styles.art, styles.artPlaceholder]}>
          <Text style={styles.artPlaceholderText}>🎵</Text>
        </View>
      )}

      <TouchableOpacity style={styles.info} onPress={() => onPlay(track)} activeOpacity={0.7}>
        <Text style={[styles.trackName, isPlaying && styles.playingText]} numberOfLines={1}>
          {isPlaying ? '▶ ' : ''}{track.track_name}
        </Text>
        <Text style={styles.artist} numberOfLines={1}>
          {track.artist_name}
          {track.album_name ? ` · ${track.album_name}` : ''}
        </Text>
        {durationStr ? <Text style={styles.duration}>{durationStr}</Text> : null}
      </TouchableOpacity>

      {onRemove && (
        <TouchableOpacity
          onPress={() => onRemove(track)}
          style={styles.removeBtn}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <Text style={styles.removeBtnText}>✕</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 4,
  },
  playing: {
    backgroundColor: '#1A3A2A',
  },
  art: {
    width: 52,
    height: 52,
    borderRadius: 4,
    marginRight: 12,
  },
  artPlaceholder: {
    backgroundColor: '#282828',
    justifyContent: 'center',
    alignItems: 'center',
  },
  artPlaceholderText: {
    fontSize: 22,
  },
  info: {
    flex: 1,
  },
  trackName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  playingText: {
    color: '#1DB954',
  },
  artist: {
    color: '#B3B3B3',
    fontSize: 13,
    marginBottom: 2,
  },
  duration: {
    color: '#6B6B6B',
    fontSize: 11,
  },
  removeBtn: {
    padding: 8,
    marginLeft: 8,
  },
  removeBtnText: {
    color: '#B3B3B3',
    fontSize: 16,
  },
});
