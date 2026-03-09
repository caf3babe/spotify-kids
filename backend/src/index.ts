import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import { authRouter } from './routes/auth';
import { allowlistRouter } from './routes/allowlist';
import { spotifyRouter } from './routes/spotify';

const app = express();

// ── Security middleware ───────────────────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: config.nodeEnv === 'production' ? false : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);

// ── Rate limiting ─────────────────────────────────────────────────────────────
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/auth', authRouter);
app.use('/allowlist', allowlistRouter);
app.use('/spotify', spotifyRouter);

app.get('/health', (_req, res) => res.json({ ok: true }));

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// ── Error handler ─────────────────────────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[unhandled]', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(config.port, () => {
  console.log(`spotify-kids backend running on port ${config.port} [${config.nodeEnv}]`);
  if (config.parentAppleIds.size === 0) {
    console.warn(
      '[WARNING] PARENT_APPLE_IDS is not set. Sign in as a parent, grab the sub from the logs, then set the env var.',
    );
  }
});

export default app;
