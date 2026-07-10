// Thin wrapper around the Blizzard Battle.net API.
// Handles the OAuth client-credentials flow (with token caching) and
// exposes the WoW Profile API endpoints we need for character lookups.

const REGIONS = {
  us: { host: 'us.api.blizzard.com', oauth: 'https://oauth.battle.net/token' },
  eu: { host: 'eu.api.blizzard.com', oauth: 'https://oauth.battle.net/token' },
  kr: { host: 'kr.api.blizzard.com', oauth: 'https://oauth.battle.net/token' },
  tw: { host: 'tw.api.blizzard.com', oauth: 'https://oauth.battle.net/token' },
};

// One cached token per region. Blizzard client-credentials tokens last ~24h.
const tokenCache = new Map(); // region -> { token, expiresAt }

export function isValidRegion(region) {
  return Object.prototype.hasOwnProperty.call(REGIONS, region);
}

export class BlizzardError extends Error {
  constructor(message, status) {
    super(message);
    this.name = 'BlizzardError';
    this.status = status;
  }
}

async function getAccessToken(region) {
  const cached = tokenCache.get(region);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }

  const clientId = process.env.BNET_CLIENT_ID;
  const clientSecret = process.env.BNET_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new BlizzardError(
      'Missing BNET_CLIENT_ID / BNET_CLIENT_SECRET. Copy .env.example to .env and fill them in.',
      500,
    );
  }

  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const res = await fetch(REGIONS[region].oauth, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new BlizzardError(`OAuth token request failed (${res.status}): ${text}`, 502);
  }

  const data = await res.json();
  tokenCache.set(region, {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  });
  return data.access_token;
}

// Perform a GET against the WoW Profile API.
// `path` is everything after the host, starting with `/profile/...`.
// A 404 is returned as `null` so callers can treat "no such data" gracefully
// (e.g. a character with no arena rating in a bracket).
async function apiGet(region, path, { namespace, locale }) {
  const token = await getAccessToken(region);
  const url = new URL(`https://${REGIONS[region].host}${path}`);
  url.searchParams.set('namespace', namespace);
  if (locale) url.searchParams.set('locale', locale);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (res.status === 404) return null;
  if (res.status === 401) {
    tokenCache.delete(region); // force refresh next call
    throw new BlizzardError('Blizzard rejected the token (401).', 502);
  }
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new BlizzardError(`Blizzard API error (${res.status}) for ${path}: ${text}`, res.status);
  }
  return res.json();
}

function profileNs(region) {
  return `profile-${region}`;
}

// Normalize a realm name into the slug Blizzard expects
// e.g. "Twisting Nether" -> "twisting-nether", "Área 52" -> "area-52".
export function realmSlug(realm) {
  return realm
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // strip accents
    .replace(/'/g, '')
    .replace(/\s+/g, '-');
}

// Fetch the full picture for a character in parallel. Missing sub-resources
// (no PvP rating, no M+ profile) resolve to null instead of throwing.
export async function getCharacter(region, realm, name, locale) {
  const slug = realmSlug(realm);
  const charName = encodeURIComponent(name.trim().toLowerCase());
  const base = `/profile/wow/character/${slug}/${charName}`;
  const opts = { namespace: profileNs(region), locale };

  // The summary is required; if it's missing the character doesn't exist.
  const summary = await apiGet(region, base, opts);
  if (!summary) {
    throw new BlizzardError('Character not found. Check region, realm and name.', 404);
  }

  const soft = (p) => apiGet(region, p, opts).catch(() => null);

  const [media, equipment, pvpSummary, twos, threes, rbg, mythic] = await Promise.all([
    soft(`${base}/character-media`),
    soft(`${base}/equipment`),
    soft(`${base}/pvp-summary`),
    soft(`${base}/pvp-bracket/2v2`),
    soft(`${base}/pvp-bracket/3v3`),
    soft(`${base}/pvp-bracket/rbg`),
    soft(`${base}/mythic-keystone-profile`),
  ]);

  return { summary, media, equipment, pvpSummary, brackets: { twos, threes, rbg }, mythic };
}
