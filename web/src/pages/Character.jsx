import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api, REGIONS } from '../api.js';

const DIFF_ORDER = ['MYTHIC', 'HEROIC', 'NORMAL'];
const DIFF_SHORT = { MYTHIC: 'M', HEROIC: 'H', NORMAL: 'N' };

export default function Character() {
  const [params, setParams] = useSearchParams();
  const [region, setRegion] = useState(params.get('region') || 'eu');
  const [realm, setRealm] = useState(params.get('realm') || '');
  const [name, setName] = useState(params.get('name') || '');
  const [data, setData] = useState(null);
  const [status, setStatus] = useState('');

  async function lookup(r, rl, n) {
    setStatus('loading');
    setData(null);
    try {
      const c = await api('character', { region: r, realm: rl, name: n });
      setData(c);
      setStatus('');
    } catch (e) {
      setStatus(e.message);
    }
  }

  // Run automatically when the URL already carries a full query (deep-link).
  useEffect(() => {
    const r = params.get('region');
    const rl = params.get('realm');
    const n = params.get('name');
    if (r && rl && n) lookup(r, rl, n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function submit(e) {
    e.preventDefault();
    if (!realm.trim() || !name.trim()) return;
    setParams({ region, realm: realm.trim(), name: name.trim() });
    lookup(region, realm.trim(), name.trim());
  }

  return (
    <>
      <h1 className="page">Character Profiles</h1>
      <p className="lead">Search any character to see their full armory.</p>

      <form className="controls" onSubmit={submit}>
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          {REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <input placeholder="Realm (e.g. Twisting Nether)" value={realm} onChange={(e) => setRealm(e.target.value)} />
        <input placeholder="Character name" value={name} onChange={(e) => setName(e.target.value)} />
        <button type="submit">Search</button>
      </form>

      {status === 'loading' && <div className="status">Loading…</div>}
      {status && status !== 'loading' && <div className="status error">{status}</div>}
      {data && <Profile c={data} />}
    </>
  );
}

function Profile({ c }) {
  const ilvl = c.itemLevel.equipped ?? c.itemLevel.average ?? '—';
  return (
    <>
      <div className="card char-head">
        {c.avatar && <img src={c.avatar} alt={c.name} />}
        <div className="who">
          <h2>{c.name}</h2>
          <div className="sub">Level {c.level} {c.race} {c.spec} {c.class}</div>
          <div className={`sub faction-${c.faction}`}>
            {c.faction}{c.guild ? ` · <${c.guild}>` : ''} · {c.realm} ({c.region.toUpperCase()})
          </div>
          {c.title && <div className="title">{c.title}</div>}
        </div>
        <div className="ilvl">
          <div className="big">{ilvl}</div>
          <div className="lbl">Item Level</div>
        </div>
      </div>

      <div className="grid2">
        <Gear gear={c.gear} />
        <div>
          <Pvp pvp={c.pvp} />
          <Mythic m={c.mythicPlus} />
          <Raids raids={c.raids} />
        </div>
      </div>
    </>
  );
}

function Gear({ gear }) {
  return (
    <div className="card">
      <h3 className="section">Equipment</h3>
      {gear.length ? (
        <ul className="list">
          {gear.map((g) => (
            <li key={g.slot}>
              <span>
                <span className="slot">{g.slot.replace(/_/g, ' ').toLowerCase()}</span><br />
                <span className={`q-${g.quality}`}>{g.name}</span>
              </span>
              <span className="ilvl-tag">{g.itemLevel ?? ''}</span>
            </li>
          ))}
        </ul>
      ) : <p className="muted">No equipment data.</p>}
    </div>
  );
}

function Pvp({ pvp }) {
  const row = (label, b) => (
    <li>
      <span>{label}</span>
      <span>
        {b ? <><span className="rating">{b.rating}</span>{b.played ? <span className="muted"> · {b.won}W/{b.lost}L</span> : null}</> : <span className="muted">—</span>}
      </span>
    </li>
  );
  return (
    <div className="card">
      <h3 className="section">PvP</h3>
      <ul className="list">
        {row('2v2 Arena', pvp.brackets['2v2'])}
        {row('3v3 Arena', pvp.brackets['3v3'])}
        {row('Rated BG', pvp.brackets.rbg)}
        {pvp.honorLevel != null && <li><span>Honor Level</span><span>{pvp.honorLevel}</span></li>}
      </ul>
      {pvp.talents?.length > 0 && (
        <div style={{ marginTop: 10 }}>
          {pvp.talents.map((t) => <span key={t} className="chip">{t}</span>)}
        </div>
      )}
    </div>
  );
}

function Mythic({ m }) {
  return (
    <div className="card">
      <h3 className="section">Mythic+</h3>
      {!m ? <p className="muted">No Mythic+ data this season.</p> : (
        <>
          {m.rating != null && (
            <div className="list"><div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
              <span>Season Rating</span><span className="big-score">{m.rating}</span>
            </div></div>
          )}
          {m.bestRuns.length > 0 && (
            <ul className="list">
              {m.bestRuns.map((r, i) => (
                <li key={i}>
                  <span>{r.dungeon}</span>
                  <span className={r.timed ? 'timed' : 'untimed'}>+{r.level}{r.timed ? ' ✓' : ''}</span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

function Raids({ raids }) {
  if (!raids?.length) return null;
  return (
    <div className="card">
      <h3 className="section">Raid Progress</h3>
      <ul className="list">
        {raids.map((r) => (
          <li key={r.name}>
            <span>{r.name}</span>
            <span className="muted">
              {DIFF_ORDER.filter((d) => r.modes[d]).map((d) => (
                <span key={d} style={{ marginLeft: 8 }}>
                  {DIFF_SHORT[d]} {r.modes[d].killed}/{r.modes[d].total}
                </span>
              ))}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
