/**
 * Apple Sign In (OIDC) token verification.
 *
 * Apple identity tokens are standard JWTs signed with RS256.
 * We fetch Apple's public keys from their JWKS endpoint and verify locally.
 */
import jwt from 'jsonwebtoken';
import jwksClient from 'jwks-rsa';
import { config } from '../config';

const appleJwksClient = jwksClient({
  jwksUri: 'https://appleid.apple.com/auth/keys',
  cache: true,
  cacheMaxAge: 3600000, // 1 hour
});

export interface AppleTokenPayload {
  iss: string;      // https://appleid.apple.com
  aud: string;      // your client_id
  exp: number;
  iat: number;
  sub: string;      // Apple user ID (stable per user per app)
  email?: string;
  email_verified?: boolean;
  is_private_email?: boolean;
  auth_time: number;
  nonce_supported: boolean;
}

function getSigningKey(kid: string): Promise<string> {
  return new Promise((resolve, reject) => {
    appleJwksClient.getSigningKey(kid, (err, key) => {
      if (err || !key) return reject(err ?? new Error('Key not found'));
      resolve(key.getPublicKey());
    });
  });
}

export async function verifyAppleToken(identityToken: string): Promise<AppleTokenPayload> {
  // Decode header to get kid without verifying yet
  const decoded = jwt.decode(identityToken, { complete: true });
  if (!decoded || typeof decoded === 'string' || !decoded.header.kid) {
    throw new Error('Invalid Apple identity token format');
  }

  const signingKey = await getSigningKey(decoded.header.kid);

  const payload = jwt.verify(identityToken, signingKey, {
    algorithms: ['RS256'],
    issuer: 'https://appleid.apple.com',
    audience: config.apple.clientId,
  }) as AppleTokenPayload;

  return payload;
}
