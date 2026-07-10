import { useEffect, useMemo, useState } from 'react';
import { api, REGIONS } from '../api.js';

const pretty = (s) => (s ? s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()) : '—');

export default function Realms() {
  const [region, setRegion] = useState('eu');
  const [realms, setRealms] = useState([]);
  const [status, setStatus] = useState('loading');
  const [q, setQ] = useState('');

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    setRealms([]);
    api('realms', { region })
      .then((d) => { if (alive) { setRealms(d); setStatus(''); } })
      .catch((e) => { if (alive) setStatus(e.message); });
    return () => { alive = false; };
  }, [region]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return needle ? realms.filter((r) => r.name.toLowerCase().includes(needle)) : realms;
  }, [realms, q]);

  return (
    <>
      <h1 className="page">Realm Status</h1>
      <p className="lead">Online status and population for every realm in the region.</p>

      <div className="controls">
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          {REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        <input placeholder="Filter realms…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {status === 'loading' && <div className="status">Loading realms…</div>}
      {status && status !== 'loading' && <div className="status error">{status}</div>}

      {!status && (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr><th>Realm</th><th>Status</th><th>Type</th><th>Population</th></tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const up = r.status === 'UP';
                return (
                  <tr key={r.slug}>
                    <td>{r.name}</td>
                    <td><span className={`dot ${up ? 'up' : 'down'}`} />{up ? 'Online' : pretty(r.status)}</td>
                    <td className="muted">{pretty(r.type)}</td>
                    <td className="muted">{pretty(r.population)}</td>
                  </tr>
                );
              })}
              {!filtered.length && <tr><td colSpan="4" className="muted">No realms match.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
