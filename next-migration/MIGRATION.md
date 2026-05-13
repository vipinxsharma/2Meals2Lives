# Next.js migration roadmap

## Where we are today

- **Production site**: a single static `index.html` at the repo root, served by
  Vercel. Auto-detect picks up the static site; the `vercel.json` at the root
  pins headers but no build command.
- **This folder (`next-migration/`)**: a clean Next.js 14 App Router scaffold
  with TypeScript and a Strapi client. **Not deployed anywhere yet.** The
  existing Vercel project never sees it because it's nested in a subdirectory
  and has its own `package.json`.

## How to deploy this (when ready)

Create a **second** Vercel project (don't touch the existing one). Settings:

| Field           | Value                                          |
|-----------------|------------------------------------------------|
| Repository      | `vipinxsharma/2Meals2Lives`                    |
| Root Directory  | `next-migration`                               |
| Framework       | Next.js (auto-detected from package.json)      |
| Build Command   | `npm run build` (auto)                         |
| Output          | `.next` (auto)                                 |
| Install Command | `npm install` (auto)                           |
| Node            | 20.x                                           |

Env vars on the new project:

| Variable                 | Value                              |
|--------------------------|------------------------------------|
| `NEXT_PUBLIC_STRAPI_URL` | `https://cms.2meals2lives.org`     |
| `NEXT_PUBLIC_SITE_URL`   | `https://2meals2lives.org`         |
| `RESEND_API_KEY`         | (only when wiring welcome email)   |

Initially, attach the new project to a preview domain like
`next.2meals2lives.org`. Only point the apex `2meals2lives.org` at it
**after** the full migration is verified.

## Section-by-section migration plan

Each step is a small PR that's reversible. Each one ships to the preview
domain first, then merges to `main` only after a smoke test passes.

### Stage 0 — bootstrap (this commit)
- ✅ Scaffold + Strapi client + skeleton page.
- ✅ Example `/api/subscribers` proxy route (not yet wired).
- 🚫 No production traffic.

### Stage 1 — copy the hero
- Port `<head>` (meta, Open Graph, fonts).
- Port the gold-on-ink theme tokens to a CSS module or Tailwind (pick one,
  don't mix).
- Port the hero section pixel-for-pixel from `index.html` (lines 1467–1525
  in current revision).
- **Risk**: visual regression. Mitigation: side-by-side comparison on a
  staging branch.

### Stage 2 — copy the story page
- Port The Why / The Heart / How it Works panels.
- Move story rendering to a server component reading Strapi `/api/stories`.
- **Risk**: hardcoded SEO content in current HTML gets lost. Mitigation:
  seed those exact stories into Strapi as `is_published=true` first.

### Stage 3 — wire the gallery + submit modal
- Server component renders approved community posts from Strapi.
- Client component handles the submit form using the existing multipart POST.
- Optional: switch the form to use the Next.js `/api/community-posts` proxy
  route, removing the cross-origin dependency for browsers.
- **Risk**: image resize logic in `index.html` is non-trivial. Re-use it
  via a single `resizeImage(file)` helper.

### Stage 4 — wire the journal
- Server component renders journal posts from Strapi.
- Modal reader uses a client component for keyboard / focus handling.

### Stage 5 — cut over
- Point apex `2meals2lives.org` at the new Vercel project.
- Keep the old static deployment live on `legacy.2meals2lives.org` for at
  least two weeks as an instant rollback target.

## Hard non-goals (for this migration)

- No new design.
- No new content.
- No CSS-in-JS framework adoption — copy the existing CSS verbatim, then
  refactor in a separate PR after parity is achieved.
- No SSR streaming, RSC patterns, or `use client` purity arguments until
  parity ships.

## Rollback approach

At any stage:

- The legacy static site at the repo root is untouched and continues to
  build on its own Vercel project.
- Re-pointing DNS back to the legacy project is one Vercel UI click.
- This subdirectory can be deleted without affecting production.
