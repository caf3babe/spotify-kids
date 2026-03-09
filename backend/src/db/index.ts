import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from '../config';

// Ensure data directory exists
const dbDir = path.dirname(config.dbPath);
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

export const db = new Database(config.dbPath);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    email       TEXT,
    full_name   TEXT,
    role        TEXT NOT NULL DEFAULT 'child',
    created_at  TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS allowlist (
    id               INTEGER PRIMARY KEY AUTOINCREMENT,
    spotify_track_id TEXT UNIQUE NOT NULL,
    track_name       TEXT NOT NULL,
    artist_name      TEXT NOT NULL,
    album_name       TEXT,
    duration_ms      INTEGER,
    album_art_url    TEXT,
    added_by         TEXT NOT NULL,
    created_at       TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (added_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS spotify_tokens (
    user_id       TEXT PRIMARY KEY,
    access_token  TEXT NOT NULL,
    refresh_token TEXT NOT NULL,
    expires_at    TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// ── Typed query helpers ──────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string | null;
  full_name: string | null;
  role: 'parent' | 'child';
  created_at: string;
}

export interface AllowlistEntry {
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

export interface SpotifyToken {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

export const queries = {
  // Users
  upsertUser: db.prepare<[string, string | null, string | null, string]>(`
    INSERT INTO users (id, email, full_name, role)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      email     = excluded.email,
      full_name = excluded.full_name
  `),
  findUser: db.prepare<[string], User>('SELECT * FROM users WHERE id = ?'),

  // Allowlist
  getAll: db.prepare<[], AllowlistEntry>('SELECT * FROM allowlist ORDER BY track_name'),
  findByTrackId: db.prepare<[string], AllowlistEntry>(
    'SELECT * FROM allowlist WHERE spotify_track_id = ?',
  ),
  addTrack: db.prepare<
    [string, string, string, string | null, number | null, string | null, string]
  >(`
    INSERT OR IGNORE INTO allowlist
      (spotify_track_id, track_name, artist_name, album_name, duration_ms, album_art_url, added_by)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `),
  removeTrack: db.prepare<[string]>('DELETE FROM allowlist WHERE spotify_track_id = ?'),

  // Spotify tokens
  upsertSpotifyToken: db.prepare<[string, string, string, string]>(`
    INSERT INTO spotify_tokens (user_id, access_token, refresh_token, expires_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      access_token  = excluded.access_token,
      refresh_token = excluded.refresh_token,
      expires_at    = excluded.expires_at
  `),
  getSpotifyToken: db.prepare<[string], SpotifyToken>(
    'SELECT * FROM spotify_tokens WHERE user_id = ?',
  ),
  // Get any parent's spotify token (kids don't have their own)
  getAnyParentSpotifyToken: db.prepare<[], SpotifyToken>(`
    SELECT st.* FROM spotify_tokens st
    JOIN users u ON u.id = st.user_id
    WHERE u.role = 'parent'
    LIMIT 1
  `),

  // Refresh tokens
  saveRefreshToken: db.prepare<[string, string, string]>(`
    INSERT INTO refresh_tokens (id, user_id, expires_at) VALUES (?, ?, ?)
  `),
  findRefreshToken: db.prepare<[string], { id: string; user_id: string; expires_at: string }>(
    'SELECT * FROM refresh_tokens WHERE id = ?',
  ),
  deleteRefreshToken: db.prepare<[string]>('DELETE FROM refresh_tokens WHERE id = ?'),
  deleteExpiredRefreshTokens: db.prepare(
    "DELETE FROM refresh_tokens WHERE expires_at < datetime('now')",
  ),
};
