import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCharacter, isValidRegion, BlizzardError } from './blizzard.js';
import { shapeCharacter } from './shape.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const DEFAULT_REGION = (process.env.DEFAULT_REGION || 'eu').toLowerCase();
const LOCALE = process.env.LOCALE || 'en_US';
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, '..', 'public')));

// GET /api/character?region=eu&realm=Twisting%20Nether&name=Foo
app.get('/api/character', async (req, res) => {
  const region = String(req.query.region || DEFAULT_REGION).toLowerCase();
  const realm = String(req.query.realm || '').trim();
  const name = String(req.query.name || '').trim();

  if (!isValidRegion(region)) {
    return res.status(400).json({ error: 'Invalid region. Use us, eu, kr or tw.' });
  }
  if (!realm || !name) {
    return res.status(400).json({ error: 'Both realm and name are required.' });
  }

  try {
    const raw = await getCharacter(region, realm, name, LOCALE);
    res.json(shapeCharacter(raw, region));
  } catch (err) {
    const status = err instanceof BlizzardError ? err.status : 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: err.message });
  }
});

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`WoW Armory running at http://localhost:${PORT}  (default region: ${DEFAULT_REGION})`);
});
