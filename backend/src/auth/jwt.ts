import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import { config } from '../config';
import { db, queries } from '../db';

export interface TokenPayload {
  sub: string;      // user id
  role: 'parent' | 'child';
}

export function signAccessToken(payload: TokenPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): TokenPayload {
  return jwt.verify(token, config.jwt.secret) as TokenPayload;
}

/** Creates a refresh token, persists it, and returns the raw token string. */
export function issueRefreshToken(userId: string): string {
  const id = randomUUID();
  const expiresAt = new Date(Date.now() + parseDuration(config.jwt.refreshExpiresIn));

  queries.saveRefreshToken.run(id, userId, expiresAt.toISOString());
  return id;
}

/**
 * Validates and rotates a refresh token (single-use).
 * Returns the user ID or throws.
 */
export function rotateRefreshToken(oldToken: string): { userId: string; newRefreshToken: string } {
  const row = queries.findRefreshToken.get(oldToken);
  if (!row) throw new Error('Refresh token not found');
  if (new Date(row.expires_at) < new Date()) {
    queries.deleteRefreshToken.run(oldToken);
    throw new Error('Refresh token expired');
  }

  // Rotate – delete old, issue new
  db.transaction(() => {
    queries.deleteRefreshToken.run(oldToken);
    queries.deleteExpiredRefreshTokens.run();
  })();

  const newRefreshToken = issueRefreshToken(row.user_id);
  return { userId: row.user_id, newRefreshToken };
}

// ── helpers ──────────────────────────────────────────────────────────────────

function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid duration: ${duration}`);
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return value * multipliers[unit];
}
