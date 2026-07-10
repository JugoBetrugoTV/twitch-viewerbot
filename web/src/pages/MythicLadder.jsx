import { useEffect, useState } from 'react';
import { api, REGIONS } from '../api.js';

function fmtDuration(ms) {
  if (!ms && ms !== 0) return '—';
  const totalSec = Math.round(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export default function MythicLadder() {
  const [region, setRegion] = useState('eu');
  const [realm, setRealm] = useState('');
  const [dungeons, setDungeons] = useState([]);
  const [dungeon, setDungeon] = useState('');
  const [board, setBoard] = useState(null);
  const [status, setStatus] = useState('');

  // Load the dungeon list whenever region changes.
  useEffect(() => {
    api('mythic/dungeons', { region })
      .then((d) => {
        setDungeons(d);
        setDungeon((cur) => (d.some((x) => String(x.id) === cur) ? cur : String(d[0]?.id || '')));
      })
      .catch(() => setDungeons([]));
  }, [region]);

  function submit(e) {
    e.preventDefault();
    if (!realm.trim() || !dungeon) return;
    setStatus('loading');
    setBoard(null);
    api('leaderboard/mythic', { region, realm: realm.trim(), dungeon })
      .then((d) => { setBoard(d); setStatus(''); })
      .catch((err) => setStatus(err.message));
  }

  return (
    <>
      <h1 className="page">Mythic+ Ladder</h1>
      <p className="lead">Best keystone runs for a realm and dungeon this week.</p>

      <form className="controls" onSubmit={submit}>
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          {REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <input placeholder="Realm (e.g. Tarren Mill)" value={realm} onChange={(e) => setRealm(e.target.value)} />
        <select value={dungeon} onChange={(e) => setDungeon(e.target.value)}>
          {dungeons.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
        <button type="submit">Show</button>
      </form>

      {status === 'loading' && <div className="status">Loading runs…</div>}
      {status && status !== 'loading' && <div className="status error">{status}</div>}

      {board && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr><th className="rank">#</th><th className="num">Key</th><th className="num">Time</th><th>Group</th></tr>
            </thead>
            <tbody>
              {board.groups.map((g, i) => (
                <tr key={i}>
                  <td className="rank">{g.ranking ?? i + 1}</td>
                  <td className="num rating">+{g.keystone_level}</td>
                  <td className="num">{fmtDuration(g.duration)}</td>
                  <td className="muted">
                    {(g.members || []).map((m) => m.profile?.name).filter(Boolean).join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
