/**
 * GET    /allowlist          – list all approved tracks (any authenticated user)
 * POST   /allowlist          – add a track (parents only)
 * DELETE /allowlist/:trackId – remove a track (parents only)
 */
import { Router } from 'express';
import { z } from 'zod';
import { authenticate } from '../middleware/authenticate';
import { requireParent } from '../middleware/requireParent';
import { queries } from '../db';

export const allowlistRouter = Router();

allowlistRouter.use(authenticate);

allowlistRouter.get('/', (_req, res) => {
  const tracks = queries.getAll.all();
  res.json(tracks);
});

const addSchema = z.object({
  spotifyTrackId: z.string().min(1),
  trackName: z.string().min(1),
  artistName: z.string().min(1),
  albumName: z.string().optional(),
  durationMs: z.number().int().positive().optional(),
  albumArtUrl: z.string().url().optional(),
});

allowlistRouter.post('/', requireParent, (req, res) => {
  const parsed = addSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request', details: parsed.error.flatten() });
    return;
  }

  const { spotifyTrackId, trackName, artistName, albumName, durationMs, albumArtUrl } = parsed.data;

  queries.addTrack.run(
    spotifyTrackId,
    trackName,
    artistName,
    albumName ?? null,
    durationMs ?? null,
    albumArtUrl ?? null,
    req.user!.sub,
  );

  const track = queries.findByTrackId.get(spotifyTrackId);
  res.status(201).json(track);
});

allowlistRouter.delete('/:trackId', requireParent, (req, res) => {
  const { trackId } = req.params;
  const existing = queries.findByTrackId.get(trackId);
  if (!existing) {
    res.status(404).json({ error: 'Track not in allowlist' });
    return;
  }
  queries.removeTrack.run(trackId);
  res.json({ ok: true });
});
