const form = document.getElementById('search');
const statusEl = document.getElementById('status');
const resultEl = document.getElementById('result');

const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]),
  );

// Keep the last search in the URL so profiles are shareable / reloadable.
function syncUrl(region, realm, name) {
  const p = new URLSearchParams({ region, realm, name });
  history.replaceState(null, '', `?${p}`);
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  const region = document.getElementById('region').value;
  const realm = document.getElementById('realm').value.trim();
  const name = document.getElementById('name').value.trim();
  if (realm && name) lookup(region, realm, name);
});

async function lookup(region, realm, name) {
  syncUrl(region, realm, name);
  statusEl.className = 'status';
  statusEl.textContent = `Loading ${name} — ${realm} (${region.toUpperCase()})…`;
  resultEl.classList.add('hidden');

  try {
    const params = new URLSearchParams({ region, realm, name });
    const res = await fetch(`/api/character?${params}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
    render(data);
    statusEl.textContent = '';
  } catch (err) {
    statusEl.className = 'status error';
    statusEl.textContent = err.message;
  }
}

function render(c) {
  resultEl.innerHTML = [
    headCard(c),
    `<div class="grid">${gearCard(c)}${sideColumn(c)}</div>`,
  ].join('');
  resultEl.classList.remove('hidden');
}

function headCard(c) {
  const ilvl = c.itemLevel.equipped ?? c.itemLevel.average ?? '—';
  const avatar = c.avatar
    ? `<img src="${esc(c.avatar)}" alt="${esc(c.name)}" />`
    : '';
  const title = c.title ? `<div class="title">${esc(c.title)}</div>` : '';
  return `
  <div class="card char-head">
    ${avatar}
    <div class="who">
      <h2>${esc(c.name)}</h2>
      <div class="sub">
        Level ${esc(c.level)} ${esc(c.race)} ${esc(c.spec || '')} ${esc(c.class)}
      </div>
      <div class="sub faction-${esc(c.faction)}">
        ${esc(c.faction)}${c.guild ? ' · &lt;' + esc(c.guild) + '&gt;' : ''} · ${esc(c.realm)} (${esc(c.region.toUpperCase())})
      </div>
      ${title}
    </div>
    <div class="ilvl">
      <div class="big">${esc(ilvl)}</div>
      <div class="lbl">Item Level</div>
    </div>
  </div>`;
}

function gearCard(c) {
  if (!c.gear.length) {
    return `<div class="card gear"><h3 class="section">Equipment</h3><p class="sub">No equipment data.</p></div>`;
  }
  const rows = c.gear
    .map(
      (g) => `
      <li>
        <span>
          <span class="slot">${esc(g.slot.replace(/_/g, ' ').toLowerCase())}</span><br />
          <span class="q-${esc(g.quality)}">${esc(g.name)}</span>
        </span>
        <span class="ilvl-tag">${g.itemLevel ?? ''}</span>
      </li>`,
    )
    .join('');
  return `<div class="card gear"><h3 class="section">Equipment</h3><ul>${rows}</ul></div>`;
}

function sideColumn(c) {
  return `<div>${pvpCard(c)}${mythicCard(c)}</div>`;
}

function pvpCard(c) {
  const b = c.pvp.brackets;
  const row = (label, data) => {
    if (!data) return `<div class="stat-row"><span class="k">${label}</span><span class="v">—</span></div>`;
    const wl = data.played
      ? `<span class="wl">${data.won}W / ${data.lost}L</span>`
      : '';
    return `<div class="stat-row"><span class="k">${label}</span>
      <span class="v"><span class="rating">${data.rating}</span>${wl}</span></div>`;
  };
  const honor = c.pvp.honorLevel != null
    ? `<div class="stat-row"><span class="k">Honor Level</span><span class="v">${c.pvp.honorLevel}</span></div>`
    : '';
  return `
  <div class="card">
    <h3 class="section">PvP Ratings</h3>
    ${row('2v2 Arena', b['2v2'])}
    ${row('3v3 Arena', b['3v3'])}
    ${row('Rated BG', b.rbg)}
    ${honor}
  </div>`;
}

function mythicCard(c) {
  const m = c.mythicPlus;
  if (!m) {
    return `<div class="card"><h3 class="section">Mythic+</h3><p class="sub">No Mythic+ data this season.</p></div>`;
  }
  const score = m.rating != null
    ? `<div class="stat-row"><span class="k">Season Rating</span><span class="v big-score">${m.rating}</span></div>`
    : '';
  const runs = m.bestRuns.length
    ? `<ul class="runs-list">${m.bestRuns
        .map(
          (r) => `<li>
            <span>${esc(r.dungeon)}</span>
            <span class="key ${r.timed ? 'timed' : 'untimed'}">+${r.level}${r.timed ? ' ✓' : ''}</span>
          </li>`,
        )
        .join('')}</ul>`
    : '';
  return `<div class="card runs"><h3 class="section">Mythic+</h3>${score}${runs}</div>`;
}

// Deep-link support: ?region=eu&realm=...&name=... auto-runs the search.
(function initFromUrl() {
  const p = new URLSearchParams(location.search);
  const region = p.get('region');
  const realm = p.get('realm');
  const name = p.get('name');
  if (region) document.getElementById('region').value = region;
  if (realm) document.getElementById('realm').value = realm;
  if (name) document.getElementById('name').value = name;
  if (region && realm && name) lookup(region, realm, name);
})();
