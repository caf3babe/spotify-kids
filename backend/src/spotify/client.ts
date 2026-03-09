/**
 * Thin Spotify Web API client.
 * Handles token refresh automatically and stores tokens per user in the DB.
 */
import { queries } from '../db';
import { config } from '../config';

const SPOTIFY_API = 'https://api.spotify.com/v1';
const SPOTIFY_ACCOUNTS = 'https://accounts.spotify.com';

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
}

export interface SpotifySearchResult {
  tracks: {
    items: SpotifyTrack[];
    total: number;
    offset: number;
    limit: number;
  };
}

// ── OAuth2 helpers ────────────────────────────────────────────────────────────

/** Exchanges an authorization code for access + refresh tokens. */
export async function exchangeCode(
  code: string,
  redirectUri: string,
): Promise<{ accessToken: string; refreshToken: string; expiresAt: Date }> {
  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
    client_id: config.spotify.clientId,
    client_secret: config.spotify.clientSecret,
  });

  const res = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Spotify token exchange failed: ${body}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

/** Refreshes an access token using a stored refresh token. */
async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresAt: Date }> {
  const params = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: config.spotify.clientId,
    client_secret: config.spotify.clientSecret,
  });

  const res = await fetch(`${SPOTIFY_ACCOUNTS}/api/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });

  if (!res.ok) throw new Error('Failed to refresh Spotify token');

  const data = (await res.json()) as { access_token: string; expires_in: number };
  return {
    accessToken: data.access_token,
    expiresAt: new Date(Date.now() + data.expires_in * 1000),
  };
}

/**
 * Gets a valid access token for the given user (or any parent if userId is null).
 * Refreshes automatically when needed.
 */
async function getValidToken(userId: string | null): Promise<string> {
  const row = userId
    ? queries.getSpotifyToken.get(userId)
    : queries.getAnyParentSpotifyToken.get();

  if (!row) throw new Error('No Spotify account connected. A parent must connect Spotify first.');

  // If token expires within 60 seconds, refresh it
  if (new Date(row.expires_at).getTime() - Date.now() < 60_000) {
    const refreshed = await refreshAccessToken(row.refresh_token);
    queries.upsertSpotifyToken.run(
      row.user_id,
      refreshed.accessToken,
      row.refresh_token,
      refreshed.expiresAt.toISOString(),
    );
    return refreshed.accessToken;
  }

  return row.access_token;
}

// ── API calls ─────────────────────────────────────────────────────────────────

async function spotifyGet<T>(path: string, userId: string | null = null): Promise<T> {
  const token = await getValidToken(userId);
  const res = await fetch(`${SPOTIFY_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Spotify API error ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

async function spotifyPut(path: string, body: unknown, userId: string | null = null): Promise<void> {
  const token = await getValidToken(userId);
  const res = await fetch(`${SPOTIFY_API}${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok && res.status !== 204) {
    const text = await res.text();
    throw new Error(`Spotify API error ${res.status}: ${text}`);
  }
}

export async function searchTracks(
  query: string,
  userId: string | null = null,
  limit = 20,
  offset = 0,
): Promise<SpotifySearchResult> {
  const params = new URLSearchParams({ q: query, type: 'track', limit: String(limit), offset: String(offset) });
  return spotifyGet<SpotifySearchResult>(`/search?${params}`, userId);
}

export async function getTrack(trackId: string, userId: string | null = null): Promise<SpotifyTrack> {
  return spotifyGet<SpotifyTrack>(`/tracks/${trackId}`, userId);
}

/** Starts playback on the user's active Spotify device. */
export async function playTrack(
  spotifyUri: string,
  parentUserId: string,
  deviceId?: string,
): Promise<void> {
  const path = deviceId ? `/me/player/play?device_id=${deviceId}` : '/me/player/play';
  await spotifyPut(path, { uris: [spotifyUri] }, parentUserId);
}

export async function getAvailableDevices(
  parentUserId: string,
): Promise<Array<{ id: string; name: string; type: string; is_active: boolean }>> {
  const data = await spotifyGet<{ devices: Array<{ id: string; name: string; type: string; is_active: boolean }> }>(
    '/me/player/devices',
    parentUserId,
  );
  return data.devices;
}

/** Build the Spotify authorization URL that the parent opens to connect their account. */
export function buildAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: config.spotify.clientId,
    response_type: 'code',
    redirect_uri: config.spotify.redirectUri,
    scope: 'streaming user-read-playback-state user-modify-playback-state user-read-currently-playing',
    state,
  });
  return `${SPOTIFY_ACCOUNTS}/authorize?${params}`;
}
