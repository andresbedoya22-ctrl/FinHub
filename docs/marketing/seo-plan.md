# SEO Plan (F02) — Minimal Technical SEO

## Routes
- /landing (public marketing)
- /privacy
- /terms
- /login /register (auth)

## Metadata
- Title + description por locale (EN/ES/PL/RO)
- OpenGraph minimal (title/desc/image)
- Twitter card basic

## Technical
- src/app/robots.ts (allow index for /landing; disallow /app and /api)
- src/app/sitemap.ts (include /landing, /privacy, /terms)
- Canonical: /landing

## OG Asset
- public/marketing/og.svg (simple branded OG)
