import { Link } from 'react-router-dom';

const tiles = [
  { to: '/character', ico: '🛡️', title: 'Character Profiles', desc: 'Gear, item level, talents, PvP & Mythic+ — the full armory.' },
  { to: '/pvp', ico: '⚔️', title: 'PvP Ladder', desc: 'Season leaderboards for 2v2, 3v3 and Rated Battlegrounds.' },
  { to: '/mythic', ico: '🗝️', title: 'Mythic+ Ladder', desc: 'Best keystone runs per realm and dungeon this week.' },
  { to: '/classes', ico: '📖', title: 'Classes & Specs', desc: 'Every class and specialization at a glance.' },
  { to: '/realms', ico: '🌐', title: 'Realm Status', desc: 'Live online status and population for every realm.' },
  { to: '/guides', ico: '📝', title: 'Guides & Articles', desc: 'Strategy articles and tier lists — Skill-Capped style.' },
];

export default function Home() {
  return (
    <>
      <div className="hero">
        <h1>Azeroth Armory</h1>
        <p>
          Character profiles, PvP and Mythic+ leaderboards, class overviews and
          realm status — all powered by the official Blizzard API.
        </p>
      </div>
      <div className="tiles">
        {tiles.map((t) => (
          <Link key={t.to} to={t.to} className="tile">
            <div className="ico">{t.ico}</div>
            <h3>{t.title}</h3>
            <p>{t.desc}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
