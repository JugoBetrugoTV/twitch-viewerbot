import { useState } from 'react';
import { Link } from 'react-router-dom';
import { guides, categories } from '../guides.js';

export default function Guides() {
  const [cat, setCat] = useState('All');
  const shown = cat === 'All' ? guides : guides.filter((g) => g.category === cat);

  return (
    <>
      <h1 className="page">Guides &amp; Articles</h1>
      <p className="lead">
        Strategy articles and tier lists — written content to go alongside the
        live data. (Skill-Capped style.)
      </p>

      <div className="controls">
        <select value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="All">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {shown.length === 0 ? (
        <div className="status">No guides yet. Add Markdown files in <code>web/src/content/guides/</code>.</div>
      ) : (
        <div className="tiles">
          {shown.map((g) => (
            <Link key={g.slug} to={`/guides/${g.slug}`} className="tile">
              <span className="spec-tag">{g.category}</span>
              <h3 style={{ marginTop: 8 }}>{g.title}</h3>
              <p>{g.excerpt}</p>
              {g.updated && <p className="muted" style={{ marginTop: 8, fontSize: 12 }}>Updated {g.updated}</p>}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
