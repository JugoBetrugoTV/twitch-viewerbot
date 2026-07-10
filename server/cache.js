// Tiny in-memory TTL cache. Game-data (classes, realms, dungeons) barely
// changes, so caching it keeps us well under Blizzard's rate limits and makes
// the site feel instant.

const store = new Map(); // key -> { value, expiresAt }

export function cached(key, ttlMs, producer) {
  const hit = store.get(key);
  if (hit && hit.expiresAt > Date.now()) {
    return hit.value; // may be a pending promise — dedupes concurrent misses
  }
  const value = Promise.resolve()
    .then(producer)
    .catch((err) => {
      store.delete(key); // don't cache failures
      throw err;
    });
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
  return value;
}

export const TTL = {
  short: 60_000, // 1 min  — leaderboards, realm status
  medium: 15 * 60_000, // 15 min — season/period indexes
  long: 24 * 60 * 60_000, // 24 h  — classes, specs, dungeons, realm lists
};
