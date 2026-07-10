# WoW Armory

A World of Warcraft character lookup in the spirit of Raider.io / Check-PVP /
Murloc.io / Drustvar — search any character and see their gear, item level,
PvP ratings and Mythic+ score. Everything comes from the **official Blizzard
Battle.net API**; nothing here touches the game itself.

## Features

- Character summary: class, spec, race, faction, guild, item level, title
- Equipped gear with item levels and rarity colors
- PvP ratings: 2v2 / 3v3 arena, Rated BG, honor level, win/loss
- Mythic+ season rating and best runs
- Shareable deep-links (`?region=eu&realm=...&name=...`)
- Multi-region: EU / US / KR / TW

## Setup

1. **Get API credentials.** Create a client at
   <https://develop.battle.net/access/clients> (any redirect URI works — the
   client-credentials flow doesn't use it). You'll get a **Client ID** and
   **Client Secret**.

2. **Configure.**
   ```bash
   cp .env.example .env
   # edit .env and paste your BNET_CLIENT_ID / BNET_CLIENT_SECRET
   ```

3. **Install & run.**
   ```bash
   npm install
   npm start
   ```

4. Open <http://localhost:3000> and search for a character.

## How it works

```
Browser ──/api/character──▶ Express (src/server.js)
                               │
                               ▼
                        src/blizzard.js  ── OAuth token (cached)
                               │            + Profile API calls
                               ▼
                        src/shape.js  ── normalizes the response
```

The Client Secret stays server-side and is never sent to the browser. The
OAuth token is cached in memory and reused until it expires.

## Notes

- Some characters hide parts of their profile (Blizzard privacy settings) or
  haven't played content this season — those sections show "no data" rather
  than failing.
- Realm names are converted to slugs automatically (e.g. "Twisting Nether" →
  `twisting-nether`).
- Not affiliated with or endorsed by Blizzard Entertainment. World of Warcraft
  is a trademark of Blizzard Entertainment, Inc.
