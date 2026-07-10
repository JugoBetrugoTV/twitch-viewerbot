# Azeroth Armory

A World of Warcraft website in the spirit of **Raider.io / Check-PVP / Drustvar /
Murloc.io** — character profiles, PvP and Mythic+ leaderboards, class overviews
and realm status. Everything comes from the **official Blizzard Battle.net API**;
nothing here touches the game itself.

## Pages

| Page | What it shows |
|------|---------------|
| **Characters** | Full armory: gear + item level, PvP ratings & talents, Mythic+ score, raid progress |
| **PvP Ladder** | Top 100 of the current season for 2v2 / 3v3 / RBG, per region |
| **Mythic+ Ladder** | Best keystone runs for a realm + dungeon this week |
| **Classes & Specs** | Every class and its specializations (scaffold for build guides) |
| **Realms** | Online status and population for every realm, filterable |

The **Classes** section is a scaffold in the Skill-Capped sense — the class/spec
data is live from Blizzard, but written strategy/guide content is left for you
to fill in.

## Architecture

```
web/  (React + Vite)  ──/api/*──▶  server/ (Express)
                                      │
                                      ├─ blizzard.js  OAuth token (cached) + API calls
                                      ├─ shape.js     normalizes responses
                                      └─ cache.js     TTL cache (leaderboards, realms, classes)
                                                        │
                                                        ▼
                                             Blizzard Battle.net API
```

The Client Secret stays server-side. In dev the React app runs on `:5173` and
proxies `/api` to Express on `:3000`. In production Express serves the built
frontend from `web/dist`.

## Setup

1. **Get API credentials** at <https://develop.battle.net/access/clients>
   (any redirect URI works — the client-credentials flow doesn't use it).

2. **Configure:**
   ```bash
   cp .env.example .env      # paste BNET_CLIENT_ID / BNET_CLIENT_SECRET
   ```

3. **Install** (installs both root and `web/`):
   ```bash
   npm install
   ```

### Development (hot reload)

```bash
npm run dev
```
Opens the React app on <http://localhost:5173> with the API on `:3000`.

### Production

```bash
npm run build      # builds the React app into web/dist
npm start          # Express serves API + frontend on :3000
```
Then open <http://localhost:3000>.

## API endpoints

| Endpoint | Params |
|----------|--------|
| `GET /api/character` | `region, realm, name` |
| `GET /api/leaderboard/pvp` | `region, bracket` (`2v2`\|`3v3`\|`rbg`) |
| `GET /api/mythic/dungeons` | `region` |
| `GET /api/leaderboard/mythic` | `region, realm, dungeon` (dungeon id) |
| `GET /api/classes` | `region` |
| `GET /api/realms` | `region` |

## Notes

- Some characters hide parts of their profile (privacy settings) or haven't
  played content this season — those sections show "no data" rather than failing.
- Realm names are converted to slugs automatically ("Twisting Nether" →
  `twisting-nether`).
- Solo Shuffle isn't included yet — Blizzard splits it into one leaderboard per
  class/spec, which needs a different UI. Easy to add later.
- Not affiliated with or endorsed by Blizzard Entertainment. World of Warcraft
  is a trademark of Blizzard Entertainment, Inc.
