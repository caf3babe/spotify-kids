import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

function optional(key: string, fallback: string): string {
  return process.env[key] ?? fallback;
}

export interface StaticUser {
  username: string;
  password: string;
  role: 'parent' | 'child';
}

/**
 * Parse STATIC_USERS env var.
 * Format: username:password:role,username2:password2:role2
 * Role must be 'parent' or 'child'.
 */
function parseStaticUsers(raw: string): StaticUser[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const [username, password, role] = entry.split(':');
      if (!username || !password || (role !== 'parent' && role !== 'child')) {
        throw new Error(
          `Invalid STATIC_USERS entry "${entry}". Expected format: username:password:parent|child`,
        );
      }
      return { username, password, role };
    });
}

export const config = {
  port: parseInt(optional('PORT', '3000'), 10),
  nodeEnv: optional('NODE_ENV', 'development'),

  jwt: {
    secret: required('JWT_SECRET'),
    expiresIn: optional('JWT_EXPIRES_IN', '15m'),
    refreshExpiresIn: optional('REFRESH_TOKEN_EXPIRES_IN', '30d'),
  },

  // Static users defined in env – no Apple Developer account needed
  staticUsers: parseStaticUsers(optional('STATIC_USERS', '')),

  spotify: {
    clientId: required('SPOTIFY_CLIENT_ID'),
    clientSecret: required('SPOTIFY_CLIENT_SECRET'),
    redirectUri: required('SPOTIFY_REDIRECT_URI'),
  },

  dbPath: path.resolve(optional('DB_PATH', './data/spotify-kids.db')),
} as const;
