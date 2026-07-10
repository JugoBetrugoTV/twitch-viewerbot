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

  const [media, equipment, specs, pvpSummary, twos, threes, rbg, mythic, raids] =
    await Promise.all([
      soft(`${base}/character-media`),
      soft(`${base}/equipment`),
      soft(`${base}/specializations`),
      soft(`${base}/pvp-summary`),
      soft(`${base}/pvp-bracket/2v2`),
      soft(`${base}/pvp-bracket/3v3`),
      soft(`${base}/pvp-bracket/rbg`),
      soft(`${base}/mythic-keystone-profile`),
      soft(`${base}/encounters/raids`),
    ]);

  return {
    summary,
    media,
    equipment,
    specs,
    pvpSummary,
    brackets: { twos, threes, rbg },
    mythic,
    raids,
  };
}

// ---------------------------------------------------------------------------
// Game Data API (static/dynamic namespaces): leaderboards, classes, realms.
// ---------------------------------------------------------------------------

function staticNs(region) {
  return `static-${region}`;
}
function dynamicNs(region) {
  return `dynamic-${region}`;
}

// Follow an absolute `href` returned by the Game Data API (these carry their
// own namespace/locale query string; we just attach the bearer token).
async function getByHref(href) {
  const region = Object.keys(REGIONS).find((r) => href.includes(`${r}.api.blizzard.com`));
  if (!region) throw new BlizzardError(`Cannot infer region from href: ${href}`, 500);
  const token = await getAccessToken(region);
  const res = await fetch(href, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 404) return null;
  if (!res.ok) throw new BlizzardError(`Blizzard API error (${res.status}) for ${href}`, res.status);
  return res.json();
}

// Current PvP season id for a region.
async function currentPvpSeasonId(region, locale) {
  const idx = await apiGet(region, '/data/wow/pvp-season/index', {
    namespace: dynamicNs(region),
    locale,
  });
  return idx?.current_season?.id ?? null;
}

// PvP leaderboard for a bracket: '2v2' | '3v3' | 'rbg'.
export async function getPvpLeaderboard(region, bracket, locale, limit = 100) {
  const seasonId = await currentPvpSeasonId(region, locale);
  if (seasonId == null) throw new BlizzardError('No active PvP season for this region.', 404);
  const data = await apiGet(
    region,
    `/data/wow/pvp-season/${seasonId}/pvp-leaderboard/${bracket}`,
    { namespace: dynamicNs(region), locale },
  );
  if (!data) throw new BlizzardError('Leaderboard not available.', 404);
  return { seasonId, bracket, entries: (data.entries || []).slice(0, limit) };
}

// The connected-realm id backing a realm slug (needed for M+ leaderboards).
async function connectedRealmId(region, slug, locale) {
  const realm = await apiGet(region, `/data/wow/realm/${slug}`, {
    namespace: dynamicNs(region),
    locale,
  });
  const href = realm?.connected_realm?.href;
  if (!href) return null;
  const m = href.match(/connected-realm\/(\d+)/);
  return m ? Number(m[1]) : null;
}

// Index of Mythic+ dungeons for the current expansion.
export async function getMythicDungeons(region, locale) {
  const idx = await apiGet(region, '/data/wow/mythic-keystone/dungeon/index', {
    namespace: dynamicNs(region),
    locale,
  });
  return (idx?.dungeons || []).map((d) => ({ id: d.id, name: d.name }));
}

// Current Mythic+ period (affix week) id.
async function currentMythicPeriodId(region, locale) {
  const idx = await apiGet(region, '/data/wow/mythic-keystone/period/index', {
    namespace: dynamicNs(region),
    locale,
  });
  return idx?.current_period?.id ?? null;
}

// M+ leaderboard for a realm + dungeon in the current period.
export async function getMythicLeaderboard(region, realmSlugValue, dungeonId, locale, limit = 100) {
  const [crId, periodId] = await Promise.all([
    connectedRealmId(region, realmSlugValue, locale),
    currentMythicPeriodId(region, locale),
  ]);
  if (crId == null) throw new BlizzardError('Unknown realm.', 404);
  if (periodId == null) throw new BlizzardError('No active Mythic+ period.', 404);

  const data = await apiGet(
    region,
    `/data/wow/connected-realm/${crId}/mythic-leaderboard/${dungeonId}/period/${periodId}`,
    { namespace: dynamicNs(region), locale },
  );
  if (!data) throw new BlizzardError('No leaderboard for that realm/dungeon.', 404);
  return {
    periodId,
    dungeon: data.map?.name || data.name || null,
    keystoneUpgrades: data.keystone_upgrades || [],
    groups: (data.leading_groups || []).slice(0, limit),
  };
}

// Playable classes with their specializations (heavily cached upstream).
export async function getClasses(region, locale) {
  const idx = await apiGet(region, '/data/wow/playable-class/index', {
    namespace: staticNs(region),
    locale,
  });
  const classes = idx?.classes || [];
  const detailed = await Promise.all(
    classes.map(async (c) => {
      const full = await getByHref(withNs(c.key.href)).catch(() => null);
      return {
        id: c.id,
        name: c.name,
        specs: (full?.specializations || []).map((s) => ({ id: s.id, name: s.name })),
      };
    }),
  );
  return detailed.sort((a, b) => a.name.localeCompare(b.name));
}

// Ensure an href produced without a namespace still resolves. Class index
// `key.href` already includes ?namespace=..., so this is a no-op guard.
function withNs(href) {
  return href;
}

// All realms for a region with online status and population, grouped by
// connected realm. Cached upstream — this fans out to every connected realm.
export async function getRealms(region, locale) {
  const idx = await apiGet(region, '/data/wow/connected-realm/index', {
    namespace: dynamicNs(region),
    locale,
  });
  const hrefs = (idx?.connected_realms || []).map((c) => c.href);

  const results = [];
  const concurrency = 10;
  for (let i = 0; i < hrefs.length; i += concurrency) {
    const batch = hrefs.slice(i, i + concurrency);
    const chunk = await Promise.all(batch.map((h) => getByHref(h).catch(() => null)));
    for (const cr of chunk) {
      if (!cr) continue;
      for (const realm of cr.realms || []) {
        results.push({
          name: realm.name,
          slug: realm.slug,
          category: realm.category,
          type: realm.type?.name,
          locale: realm.locale,
          timezone: realm.timezone,
          status: cr.status?.type || 'UNKNOWN',
          population: cr.population?.type || 'UNKNOWN',
        });
      }
    }
  }
  return results.sort((a, b) => a.name.localeCompare(b.name));
}
