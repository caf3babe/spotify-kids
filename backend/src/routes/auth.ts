/**
 * POST /auth/login   – static username/password login, return JWT pair
 * POST /auth/refresh – rotate refresh token, return new JWT pair
 * POST /auth/logout  – invalidate refresh token
 * GET  /auth/me      – return current user
 */
import { Router } from 'express';
import { z } from 'zod';
import { signAccessToken, issueRefreshToken, rotateRefreshToken } from '../auth/jwt';
import { queries } from '../db';
import { config } from '../config';
import { authenticate } from '../middleware/authenticate';

export const authRouter = Router();

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

authRouter.post('/login', (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'username and password are required' });
    return;
  }

  const { username, password } = parsed.data;

  const staticUser = config.staticUsers.find(
    (u) => u.username === username && u.password === password,
  );

  if (!staticUser) {
    res.status(401).json({ error: 'Invalid username or password' });
    return;
  }

  // Upsert user record (id = username)
  queries.upsertUser.run(username, null, username, staticUser.role);

  const accessToken = signAccessToken({ sub: username, role: staticUser.role });
  const refreshToken = issueRefreshToken(username);

  const user = queries.findUser.get(username);
  res.json({ accessToken, refreshToken, user });
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
