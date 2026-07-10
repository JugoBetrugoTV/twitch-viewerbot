import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, REGIONS } from '../api.js';

const BRACKETS = [
  { value: '2v2', label: '2v2 Arena' },
  { value: '3v3', label: '3v3 Arena' },
  { value: 'rbg', label: 'Rated BG' },
];

export default function PvPLadder() {
  const [region, setRegion] = useState('eu');
  const [bracket, setBracket] = useState('3v3');
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    setRows([]);
    api('leaderboard/pvp', { region, bracket })
      .then((d) => { if (alive) { setRows(d.entries); setStatus(''); } })
      .catch((e) => { if (alive) setStatus(e.message); });
    return () => { alive = false; };
  }, [region, bracket]);

  return (
    <>
      <h1 className="page">PvP Ladder</h1>
      <p className="lead">Top 100 of the current arena / RBG season.</p>

      <div className="controls">
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          {REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <select value={bracket} onChange={(e) => setBracket(e.target.value)}>
          {BRACKETS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
        </select>
      </div>

      {status === 'loading' && <div className="status">Loading ladder…</div>}
      {status && status !== 'loading' && <div className="status error">{status}</div>}

      {!status && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr><th className="rank">#</th><th>Player</th><th>Realm</th><th className="num">Rating</th><th className="num">Won</th><th className="num">Lost</th></tr>
            </thead>
            <tbody>
              {rows.map((e) => {
                const realm = e.character?.realm?.slug || '';
                const nm = e.character?.name || '';
                const stats = e.season_match_statistics || {};
                return (
                  <tr key={e.rank}>
                    <td className="rank">{e.rank}</td>
                    <td>
                      {realm && nm
                        ? <Link to={`/character?region=${region}&realm=${realm}&name=${nm}`}>{nm}</Link>
                        : nm}
                    </td>
                    <td className="muted">{realm}</td>
                    <td className="num rating">{e.rating}</td>
                    <td className="num">{stats.won ?? '—'}</td>
                    <td className="num">{stats.lost ?? '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
