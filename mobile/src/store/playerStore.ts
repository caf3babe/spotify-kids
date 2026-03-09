import { create } from 'zustand';
import { AllowlistTrack } from '../api/client';

interface PlayerState {
  currentTrack: AllowlistTrack | null;
  isPlaying: boolean;
  queue: AllowlistTrack[];

  setCurrentTrack: (track: AllowlistTrack) => void;
  setIsPlaying: (playing: boolean) => void;
  setQueue: (tracks: AllowlistTrack[]) => void;
  clearPlayer: () => void;
}

export const usePlayerStore = create<PlayerState>((set) => ({
  currentTrack: null,
  isPlaying: false,
  queue: [],

  setCurrentTrack: (track) => set({ currentTrack: track, isPlaying: true }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setQueue: (queue) => set({ queue }),
  clearPlayer: () => set({ currentTrack: null, isPlaying: false, queue: [] }),
}));
