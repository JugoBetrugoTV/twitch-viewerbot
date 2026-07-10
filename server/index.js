import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getCharacter,
  getPvpLeaderboard,
  getMythicLeaderboard,
  getMythicDungeons,
  getClasses,
  getRealms,
  realmSlug,
  isValidRegion,
  BlizzardError,
} from './blizzard.js';
import { shapeCharacter } from './shape.js';
import { cached, TTL } from './cache.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const DEFAULT_REGION = (process.env.DEFAULT_REGION || 'eu').toLowerCase();
const LOCALE = process.env.LOCALE || 'en_US';
const PORT = process.env.PORT || 3000;

const PVP_BRACKETS = new Set(['2v2', '3v3', 'rbg']);

function region(req) {
  return String(req.query.region || DEFAULT_REGION).toLowerCase();
}

// Wrap an async route so thrown BlizzardErrors become clean JSON responses.
function route(handler) {
  return async (req, res) => {
    try {
      await handler(req, res);
    } catch (err) {
      const status = err instanceof BlizzardError ? err.status : 500;
      if (status >= 500) console.error(err);
      res.status(status).json({ error: err.message });
    }
  };
}

function requireRegion(req, res) {
  if (!isValidRegion(region(req))) {
    res.status(400).json({ error: 'Invalid region. Use us, eu, kr or tw.' });
    return false;
  }
  return true;
}

// ---- Character ------------------------------------------------------------
app.get(
  '/api/character',
  route(async (req, res) => {
    if (!requireRegion(req, res)) return;
    const realm = String(req.query.realm || '').trim();
    const name = String(req.query.name || '').trim();
    if (!realm || !name) {
      return res.status(400).json({ error: 'Both realm and name are required.' });
    }
    const key = `char:${region(req)}:${realmSlug(realm)}:${name.toLowerCase()}`;
    const data = await cached(key, TTL.short, async () => {
      const raw = await getCharacter(region(req), realm, name, LOCALE);
      return shapeCharacter(raw, region(req));
    });
    res.json(data);
  }),
);

// ---- PvP leaderboard ------------------------------------------------------
app.get(
  '/api/leaderboard/pvp',
  route(async (req, res) => {
    if (!requireRegion(req, res)) return;
    const bracket = String(req.query.bracket || '2v2').toLowerCase();
    if (!PVP_BRACKETS.has(bracket)) {
      return res.status(400).json({ error: 'bracket must be 2v2, 3v3 or rbg.' });
    }
    const key = `pvp:${region(req)}:${bracket}`;
    const data = await cached(key, TTL.short, () =>
      getPvpLeaderboard(region(req), bracket, LOCALE, 100),
    );
    res.json(data);
  }),
);

// ---- Mythic+ dungeons + leaderboard --------------------------------------
app.get(
  '/api/mythic/dungeons',
  route(async (req, res) => {
    if (!requireRegion(req, res)) return;
    const key = `dungeons:${region(req)}`;
    const data = await cached(key, TTL.long, () => getMythicDungeons(region(req), LOCALE));
    res.json(data);
  }),
);

app.get(
  '/api/leaderboard/mythic',
  route(async (req, res) => {
    if (!requireRegion(req, res)) return;
    const realm = String(req.query.realm || '').trim();
    const dungeonId = Number(req.query.dungeon);
    if (!realm) return res.status(400).json({ error: 'realm is required.' });
    if (!dungeonId) return res.status(400).json({ error: 'dungeon (id) is required.' });
    const key = `mplus:${region(req)}:${realmSlug(realm)}:${dungeonId}`;
    const data = await cached(key, TTL.short, () =>
      getMythicLeaderboard(region(req), realmSlug(realm), dungeonId, LOCALE, 100),
    );
    res.json(data);
  }),
);

// ---- Classes & specs ------------------------------------------------------
app.get(
  '/api/classes',
  route(async (req, res) => {
    if (!requireRegion(req, res)) return;
    const key = `classes:${region(req)}`;
    const data = await cached(key, TTL.long, () => getClasses(region(req), LOCALE));
    res.json(data);
  }),
);

// ---- Realm status ---------------------------------------------------------
app.get(
  '/api/realms',
  route(async (req, res) => {
    if (!requireRegion(req, res)) return;
    const key = `realms:${region(req)}`;
    const data = await cached(key, TTL.medium, () => getRealms(region(req), LOCALE));
    res.json(data);
  }),
);

app.get('/api/health', (_req, res) => res.json({ ok: true }));

// ---- Serve the built React app in production ------------------------------
const clientDist = path.join(__dirname, '..', 'web', 'dist');
app.use(express.static(clientDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) res.status(404).send('Frontend not built. Run: npm run build');
  });
});

app.listen(PORT, () => {
  console.log(`WoW site API on http://localhost:${PORT}  (region: ${DEFAULT_REGION})`);
});
