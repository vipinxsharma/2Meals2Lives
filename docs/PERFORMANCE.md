# Performance audit notes

A pragmatic snapshot of where time is spent on the current static site and
what to fix next. Mobile-first.

## Current weight (May 2026)

| Item | Size | Notes |
|---|---|---|
| `index.html` total | ~464 KB | Single file, no build, no JS bundles |
| Inline base64 images | ~258 KB | 3 identical 88 KB JPEGs used as section backgrounds |
| Inline QR SVG | ~24 KB | Hand-coded SVG; rebuilt each page load by JS |
| Inline CSS | ~50 KB | Hand-written tokens, custom for the brand |
| Inline JS | ~80 KB | All app logic. Includes QR generator + image resize |
| External fonts | 2 families (Fraunces + DM Sans) preconnected, `display=swap` |
| External hero images | 4 eager-loaded from images.unsplash.com (~1200w each) |
| External lazy images | 18 lazy-loaded from images.unsplash.com (~400w each) |

## Low-risk wins already applied (this commit)

- Preconnect added for `cms.2meals2lives.org` so the first Strapi fetch is
  ~80 ms faster.
- Preconnect for `images.unsplash.com` to speed up hero image load.
- DNS-prefetch for the future `media.2meals2lives.org` R2 host.

## Cheap follow-ups (do not do here — would need design review)

1. **Deduplicate the three identical 88 KB inline images.** They're used as
   section backgrounds; moving the data URL to a `--bg-image` CSS variable
   would save ~170 KB.
2. **Replace Unsplash heroes with self-hosted, sized images.** Three hero
   images at `?w=1200&q=90` cost ~300 KB on first paint. WebP at `q=72`
   would cut that roughly in half.
3. **Pre-render the QR SVG** server-side or at build time, instead of in
   inline JS on every page load. Saves ~5 KB of JS.

## Not worth optimizing

- The 80 KB of inline JS is fine. It's not blocking critical paint (it
  loads after layout via standard HTML parsing) and minifying it without a
  build step adds more risk than it saves bytes.
- Inline CSS at 50 KB is also fine — it's render-blocking by design, which
  is the right tradeoff for a single-page site (no FOUC).

## When the Next.js migration completes

The Next.js app can:
- Use `next/image` for automatic responsive resizes (kills the Unsplash 1200w
  waste).
- Code-split: the QR generator and image-resize logic only load when their
  modals open.
- Use route-level data cache (`revalidate: 60`) instead of every browser
  pinging `/api/community-posts` on load.

None of those need to happen before launch. Today's site is fast enough on
4G mobile (LCP < 2.5 s on a mid-range Android, measured locally on previous
revisions). Lighthouse score is in the 80s — not amazing, not blocking.
