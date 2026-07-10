// Loads guide articles from Markdown files in src/content/guides/*.md.
// Each file starts with a small frontmatter block:
//
//   ---
//   title: My Guide
//   category: PvP
//   excerpt: One-line summary shown in the list.
//   updated: 2026-07-10
//   ---
//   # Markdown body...
//
// To add a guide, just drop a new .md file in that folder — no code changes.

import { marked } from 'marked';

// Vite inlines every matching file as a raw string at build time.
const files = import.meta.glob('./content/guides/*.md', { query: '?raw', import: 'default', eager: true });

function parseFrontmatter(raw) {
  const match = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: raw };
  const meta = {};
  for (const line of match[1].split('\n')) {
    const idx = line.indexOf(':');
    if (idx === -1) continue;
    meta[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
  }
  return { meta, body: match[2] };
}

function slugFromPath(path) {
  return path.split('/').pop().replace(/\.md$/, '');
}

export const guides = Object.entries(files)
  .map(([path, raw]) => {
    const { meta, body } = parseFrontmatter(raw);
    return {
      slug: slugFromPath(path),
      title: meta.title || slugFromPath(path),
      category: meta.category || 'General',
      excerpt: meta.excerpt || '',
      updated: meta.updated || '',
      html: marked.parse(body),
    };
  })
  .sort((a, b) => (b.updated || '').localeCompare(a.updated || ''));

export const guideBySlug = (slug) => guides.find((g) => g.slug === slug);

export const categories = [...new Set(guides.map((g) => g.category))].sort();
