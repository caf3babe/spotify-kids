/**
 * POST /auth/apple   – verify Apple identity token, return JWT pair
 * POST /auth/refresh – rotate refresh token, return new JWT pair
 * POST /auth/logout  – invalidate refresh token
 */
import { Router } from 'express';
import { z } from 'zod';
import { verifyAppleToken } from '../auth/apple';
import { signAccessToken, issueRefreshToken, rotateRefreshToken } from '../auth/jwt';
import { queries } from '../db';
import { config } from '../config';
import { authenticate } from '../middleware/authenticate';

export const authRouter = Router();

const appleSchema = z.object({
  identityToken: z.string(),
  // Apple only provides these on first sign-in; omit on subsequent ones
  fullName: z
    .object({ givenName: z.string().nullable(), familyName: z.string().nullable() })
    .optional(),
});

authRouter.post('/apple', async (req, res) => {
  const parsed = appleSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request body', details: parsed.error.flatten() });
    return;
  }

  try {
    const applePayload = await verifyAppleToken(parsed.data.identityToken);

    const appleUserId = applePayload.sub;
    const role = config.parentAppleIds.has(appleUserId) ? 'parent' : 'child';

    const fullName = parsed.data.fullName
      ? [parsed.data.fullName.givenName, parsed.data.fullName.familyName]
          .filter(Boolean)
          .join(' ') || null
      : null;

    queries.upsertUser.run(appleUserId, applePayload.email ?? null, fullName, role);

    // Log the Apple user ID so parents can copy it for PARENT_APPLE_IDS env var
    if (config.nodeEnv === 'development') {
      console.log(`[auth] Apple sign-in: sub=${appleUserId} role=${role} email=${applePayload.email}`);
    }

    const accessToken = signAccessToken({ sub: appleUserId, role });
    const refreshToken = issueRefreshToken(appleUserId);

    const user = queries.findUser.get(appleUserId);
    res.json({ accessToken, refreshToken, user });
  } catch (err) {
    console.error('[auth/apple]', err);
    res.status(401).json({ error: 'Apple token verification failed' });
  }
});

authRouter.post('/refresh', (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (!refreshToken) {
    res.status(400).json({ error: 'refreshToken is required' });
    return;
  }

  try {
    const { userId, newRefreshToken } = rotateRefreshToken(refreshToken);
    const user = queries.findUser.get(userId);
    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const accessToken = signAccessToken({ sub: userId, role: user.role });
    res.json({ accessToken, refreshToken: newRefreshToken, user });
  } catch (err) {
    res.status(401).json({ error: (err as Error).message });
  }
});

authRouter.post('/logout', authenticate, (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string };
  if (refreshToken) queries.deleteRefreshToken.run(refreshToken);
  res.json({ ok: true });
});

authRouter.get('/me', authenticate, (req, res) => {
  const user = queries.findUser.get(req.user!.sub);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json(user);
});
