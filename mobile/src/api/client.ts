/**
 * Typed API client for the spotify-kids backend.
 * Automatically attaches the access token and handles 401 refresh.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

// Change this to your server's address (LAN IP for device testing)
const BASE_URL = __DEV__ ? 'http://10.0.2.2:3000' : 'https://your-production-server.example.com';

const STORAGE_KEYS = {
  accessToken: '@spotifykids/accessToken',
  refreshToken: '@spotifykids/refreshToken',
  user: '@spotifykids/user',
};

export interface User {
  id: string;
  email: string | null;
  full_name: string | null;
  role: 'parent' | 'child';
  created_at: string;
}

export interface AllowlistTrack {
  id: number;
  spotify_track_id: string;
  track_name: string;
  artist_name: string;
  album_name: string | null;
  duration_ms: number | null;
  album_art_url: string | null;
  added_by: string;
  created_at: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
  artists: Array<{ id: string; name: string }>;
  album: {
    id: string;
    name: string;
    images: Array<{ url: string; width: number; height: number }>;
  };
  explicit: boolean;
  preview_url: string | null;
  is_approved?: boolean;
}

// ── Token management ──────────────────────────────────────────────────────────

export async function saveTokens(accessToken: string, refreshToken: string, user: User) {
  await AsyncStorage.multiSet([
    [STORAGE_KEYS.accessToken, accessToken],
    [STORAGE_KEYS.refreshToken, refreshToken],
    [STORAGE_KEYS.user, JSON.stringify(user)],
  ]);
}

export async function getStoredUser(): Promise<User | null> {
  const raw = await AsyncStorage.getItem(STORAGE_KEYS.user);
  return raw ? (JSON.parse(raw) as User) : null;
}

export async function clearTokens() {
  await AsyncStorage.multiRemove([
    STORAGE_KEYS.accessToken,
    STORAGE_KEYS.refreshToken,
    STORAGE_KEYS.user,
  ]);
}

async function getAccessToken(): Promise<string | null> {
  return AsyncStorage.getItem(STORAGE_KEYS.accessToken);
}

async function attemptTokenRefresh(): Promise<string | null> {
  const refreshToken = await AsyncStorage.getItem(STORAGE_KEYS.refreshToken);
  if (!refreshToken) return null;

  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    await clearTokens();
    return null;
  }

  const data = (await res.json()) as { accessToken: string; refreshToken: string; user: User };
  await saveTokens(data.accessToken, data.refreshToken, data.user);
  return data.accessToken;
}

// ── Core fetch wrapper ────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const token = await getAccessToken();

  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // Handle 401 with a single refresh attempt
  if (response.status === 401 && retry) {
    const newToken = await attemptTokenRefresh();
    if (newToken) return apiFetch<T>(path, options, false);
    throw new Error('SESSION_EXPIRED');
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error((body as { error?: string }).error ?? `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

// ── Auth endpoints ────────────────────────────────────────────────────────────

export async function signInWithApple(
  identityToken: string,
  fullName?: { givenName?: string | null; familyName?: string | null } | null,
): Promise<{ accessToken: string; refreshToken: string; user: User }> {
  const body: Record<string, unknown> = { identityToken };
  if (fullName) body.fullName = fullName;

  const res = await fetch(`${BASE_URL}/auth/apple`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Sign in failed' }));
    throw new Error((err as { error?: string }).error ?? 'Sign in failed');
  }

  return res.json() as Promise<{ accessToken: string; refreshToken: string; user: User }>;
}

export async function logout(refreshToken: string) {
  await apiFetch('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ refreshToken }),
  });
}

// ── Allowlist endpoints ───────────────────────────────────────────────────────

export function fetchAllowlist(): Promise<AllowlistTrack[]> {
  return apiFetch<AllowlistTrack[]>('/allowlist');
}

export function addToAllowlist(track: {
  spotifyTrackId: string;
  trackName: string;
  artistName: string;
  albumName?: string;
  durationMs?: number;
  albumArtUrl?: string;
}): Promise<AllowlistTrack> {
  return apiFetch<AllowlistTrack>('/allowlist', {
    method: 'POST',
    body: JSON.stringify(track),
  });
}

export function removeFromAllowlist(trackId: string): Promise<{ ok: boolean }> {
  return apiFetch<{ ok: boolean }>(`/allowlist/${trackId}`, { method: 'DELETE' });
}

// ── Spotify endpoints ─────────────────────────────────────────────────────────

export function searchSpotify(
  q: string,
  limit = 20,
  offset = 0,
): Promise<{ tracks: SpotifyTrack[]; total: number }> {
  return apiFetch(`/spotify/search?q=${encodeURIComponent(q)}&limit=${limit}&offset=${offset}`);
}

export function browseAllowed(): Promise<{ tracks: AllowlistTrack[] }> {
  return apiFetch('/spotify/browse');
}

export function playTrack(
  trackId: string,
  deviceId?: string,
): Promise<{ spotifyUri: string; deepLink: string }> {
  return apiFetch('/spotify/play', {
    method: 'POST',
    body: JSON.stringify({ trackId, deviceId }),
  });
}

export function connectSpotify(): Promise<{ url: string }> {
  return apiFetch('/spotify/connect');
}

export function callbackSpotify(code: string, state: string): Promise<{ ok: boolean }> {
  return apiFetch('/spotify/callback', {
    method: 'POST',
    body: JSON.stringify({ code, state }),
  });
}

export function fetchSpotifyDevices(): Promise<{
  devices: Array<{ id: string; name: string; type: string; is_active: boolean }>;
}> {
  return apiFetch('/spotify/devices');
}
