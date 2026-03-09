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

export const config = {
  port: parseInt(optional('PORT', '3000'), 10),
  nodeEnv: optional('NODE_ENV', 'development'),

  jwt: {
    secret: required('JWT_SECRET'),
    expiresIn: optional('JWT_EXPIRES_IN', '15m'),
    refreshExpiresIn: optional('REFRESH_TOKEN_EXPIRES_IN', '30d'),
  },

  apple: {
    clientId: required('APPLE_CLIENT_ID'),
    teamId: required('APPLE_TEAM_ID'),
    keyId: required('APPLE_KEY_ID'),
    privateKey: required('APPLE_PRIVATE_KEY').replace(/\\n/g, '\n'),
  },

  // Comma-separated Apple user IDs of the two parents
  parentAppleIds: new Set(
    optional('PARENT_APPLE_IDS', '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  ),

  spotify: {
    clientId: required('SPOTIFY_CLIENT_ID'),
    clientSecret: required('SPOTIFY_CLIENT_SECRET'),
    redirectUri: required('SPOTIFY_REDIRECT_URI'),
  },

  dbPath: path.resolve(optional('DB_PATH', './data/spotify-kids.db')),
} as const;
