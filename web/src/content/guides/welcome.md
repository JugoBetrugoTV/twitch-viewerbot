---
title: Welcome — How to add your own guides
category: General
excerpt: This section is a scaffold. Here's how to fill it with your own content.
updated: 2026-07-10
---

# Adding guides

This Guides section works like a mini blog / knowledge base in the spirit of
**Skill-Capped articles**. The class and PvP *data* on the rest of the site is
live from Blizzard, but written strategy content lives here — and it's yours to
write.

## How it works

Every article is a single Markdown file in `web/src/content/guides/`. To add
one, create a new `.md` file with a frontmatter header:

```
---
title: Your Title
category: PvP
excerpt: One line shown in the article list.
updated: 2026-07-10
---

# Your heading

Write **Markdown** here — lists, links, tables, images, code…
```

Save it, rebuild, and it appears automatically in the list and gets its own
page. No code changes needed.

## Ideas for categories

- **PvP** — comp tier lists, arena strategy, gearing
- **Mythic+** — dungeon routes, affix tips, key pushing
- **Class guides** — per-spec rotations, talent builds
- **News** — patch notes, season starts

> This is placeholder text — replace it with your own guides.
