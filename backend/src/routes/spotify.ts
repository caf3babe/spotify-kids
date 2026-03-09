/**
 * Spotify proxy routes – all responses filtered through the allowlist for children.
 *
 * GET  /spotify/connect         – build Spotify OAuth2 URL (parents only)
 * POST /spotify/callback        – exchange auth code for tokens (parents only)
 * GET  /spotify/search          – search Spotify; kids see only allowed tracks
 * GET  /spotify/allowlist-only  – browse only approved tracks (all users)
 * POST /spotify/play            – play a track (allowed only)
 * GET  /spotify/devices         – list available Spotify devices (parents only)
 */
import { Router } from 'express';
import { randomUUID } from 'crypto';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { requireParent } from '../middleware/requireParent';
import { queries } from '../db';
import {
  buildAuthorizationUrl,
  exchangeCode,
  searchTracks,
  getAvailableDevices,
  getTrack,
} from '../spotify/client';
import { config } from '../config';

export const spotifyRouter = Router();

spotifyRouter.use(authenticate);

// ── OAuth2 connect (parents only) ────────────────────────────────────────────

const pendingStates = new Map<string, string>(); // state → userId, cleared on callback

spotifyRouter.get('/connect', requireParent, (req, res) => {
  const state = randomUUID();
  pendingStates.set(state, req.user!.sub);
  setTimeout(() => pendingStates.delete(state), 10 * 60 * 1000); // expire after 10 min

  const url = buildAuthorizationUrl(state);
  res.json({ url });
});

const callbackSchema = z.object({
  code: z.string(),
  state: z.string(),
});

spotifyRouter.post('/callback', requireParent, async (req, res) => {
  const parsed = callbackSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Missing code or state' });
    return;
  }

  const { code, state } = parsed.data;
  const userId = pendingStates.get(state);
  if (!userId || userId !== req.user!.sub) {
    res.status(400).json({ error: 'Invalid or expired state' });
    return;
  }
  pendingStates.delete(state);

  try {
    const tokens = await exchangeCode(code, config.spotify.redirectUri);
    queries.upsertSpotifyToken.run(
      userId,
      tokens.accessToken,
      tokens.refreshToken,
      tokens.expiresAt.toISOString(),
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[spotify/callback]', err);
    res.status(500).json({ error: 'Failed to connect Spotify account' });
  }
});

// ── Search ────────────────────────────────────────────────────────────────────

spotifyRouter.get('/search', async (req, res) => {
  const query = req.query.q as string;
  const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
  const offset = parseInt(req.query.offset as string) || 0;

  if (!query?.trim()) {
    res.status(400).json({ error: 'q is required' });
    return;
  }

  try {
    const result = await searchTracks(query, null, limit, offset);
    const isParent = req.user!.role === 'parent';

    if (isParent) {
      // Parents see all results + a flag indicating if it's already approved
      const allowedIds = new Set(queries.getAll.all().map((t) => t.spotify_track_id));
      const tracks = result.tracks.items.map((t) => ({
        ...t,
        is_approved: allowedIds.has(t.id),
      }));
      res.json({ tracks, total: result.tracks.total, offset, limit });
    } else {
      // Children see only approved tracks
      const allowedIds = new Set(queries.getAll.all().map((t) => t.spotify_track_id));
      const tracks = result.tracks.items.filter((t) => allowedIds.has(t.id));
      res.json({ tracks, total: tracks.length, offset, limit });
    }
  } catch (err) {
    console.error('[spotify/search]', err);
    res.status(502).json({ error: 'Spotify search failed. Make sure a parent has connected their Spotify account.' });
  }
});

// ── Browse allowlist ──────────────────────────────────────────────────────────

spotifyRouter.get('/browse', (_req, res) => {
  const tracks = queries.getAll.all();
  res.json({ tracks });
});

// ── Play ──────────────────────────────────────────────────────────────────────

const playSchema = z.object({
  trackId: z.string().min(1),
  deviceId: z.string().optional(),
});

spotifyRouter.post('/play', async (req, res) => {
  const parsed = playSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'trackId is required' });
    return;
  }

  const { trackId, deviceId } = parsed.data;

  // Enforce allowlist for all users (parents can play anything they've approved)
  const allowed = queries.findByTrackId.get(trackId);
  if (!allowed) {
    res.status(403).json({ error: 'This track has not been approved by a parent.' });
    return;
  }

  // Return the Spotify deep-link URI; the mobile app opens it in Spotify
  const spotifyUri = `spotify:track:${trackId}`;
  res.json({
    spotifyUri,
    deepLink: `https://open.spotify.com/track/${trackId}`,
    track: allowed,
  });
});

// ── Devices (parents only) ────────────────────────────────────────────────────

spotifyRouter.get('/devices', requireParent, async (req, res) => {
  try {
    const devices = await getAvailableDevices(req.user!.sub);
    res.json({ devices });
  } catch (err) {
    console.error('[spotify/devices]', err);
    res.status(502).json({ error: 'Could not fetch Spotify devices' });
  }
});

// ── Track info (used when adding to allowlist) ────────────────────────────────

spotifyRouter.get('/track/:id', requireParent, async (req, res) => {
  try {
    const track = await getTrack(req.params.id, req.user!.sub);
    const existing = queries.findByTrackId.get(track.id);
    res.json({ ...track, is_approved: !!existing });
  } catch (err) {
    console.error('[spotify/track]', err);
    res.status(502).json({ error: 'Failed to fetch track info' });
  }
});
