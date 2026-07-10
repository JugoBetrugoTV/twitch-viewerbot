import { useEffect, useState } from 'react';
import { api, REGIONS } from '../api.js';

export default function Classes() {
  const [region, setRegion] = useState('eu');
  const [classes, setClasses] = useState([]);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let alive = true;
    setStatus('loading');
    api('classes', { region })
      .then((d) => { if (alive) { setClasses(d); setStatus(''); } })
      .catch((e) => { if (alive) setStatus(e.message); });
    return () => { alive = false; };
  }, [region]);

  return (
    <>
      <h1 className="page">Classes &amp; Specializations</h1>
      <p className="lead">
        Every playable class and its specs. A starting point for build guides —
        drop your own strategy content into each card.
      </p>

      <div className="controls">
        <select value={region} onChange={(e) => setRegion(e.target.value)}>
          {REGIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {status === 'loading' && <div className="status">Loading classes…</div>}
      {status && status !== 'loading' && <div className="status error">{status}</div>}

      {!status && (
        <div className="class-grid">
          {classes.map((c) => (
            <div key={c.id} className="card class-card">
              <h4>{c.name}</h4>
              {c.specs.length
                ? c.specs.map((s) => <span key={s.id} className="spec-tag">{s.name}</span>)
                : <span className="muted">No specs listed.</span>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
