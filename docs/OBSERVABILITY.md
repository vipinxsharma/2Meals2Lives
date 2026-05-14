# Production observability — frontend

The static `index.html` ships with three layered observability paths. All three
are **opt-in by host configuration**: nothing auto-loads any analytics script,
nothing sends data outside the page unless you explicitly wire a destination.

## What's always on

- **`window.__2m2lFailures`** — a ring buffer of the last 50 uncaught errors,
  unhandled promise rejections, and `__2m2lTrack` events. Open DevTools console
  on any device and run `console.table(window.__2m2lFailures)` to see what
  happened since page load.
- **`window.__2m2lTrack(event, props)`** — generic in-page event emitter that
  records to the buffer and (if Sentry is configured) sends a Sentry message.
- **`window.__2m2lTrackSignupSuccess(props)`** — fires when a signup succeeds
  (HTTP 200/201 from `/api/subscribers`). Fans out to gtag + plausible + Sentry
  if those globals exist. Never receives the email.
- **`window.__2m2lCaptureSignupError(err, ctx)`** — wraps the signup error path.
  Sentry-first if loaded, otherwise `console.warn` only on non-production hosts.
  Never receives the email.

## What's optional

### Sentry (browser JS errors)

Sentry is lazy-loaded only if you add a meta tag in `<head>`:

```html
<meta name="sentry-dsn" content="https://...@sentry.io/...">
<meta name="sentry-env" content="production">   <!-- optional, defaults to "production" -->
```

Setup:

1. Sentry → Create project → "Browser JavaScript".
2. Copy the DSN.
3. Edit `index.html`: set `<meta name="sentry-dsn" content="...">` (the line near
   the top of `<head>`).
4. Deploy.
5. Verify: visit production, open DevTools console, run `window.Sentry`. Should
   be an object after a moment. Trigger an error to confirm it lands in the
   Sentry dashboard.

When Sentry is loaded:
- Successful signups add a `signup` breadcrumb (no message, just context).
- Failed signups (5xx or network) call `Sentry.captureException()` with a coarse
  context map (`{ status, code }`). No email.
- Any uncaught error or unhandled rejection on the page is captured automatically
  by Sentry's global handlers.

### Google Analytics (signup conversion event)

The frontend does not load `gtag.js`. If you want it, add the standard GA4
snippet to `<head>` somewhere before the main `<script>` block:

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

That's it. As soon as `window.gtag` is a function, every successful signup will
fire `gtag('event', 'signup_success', { status: 201 })`. No PII is forwarded.

### Plausible (signup conversion event)

The frontend does not load Plausible either. If you want it, add the standard
snippet to `<head>`:

```html
<script defer data-domain="2hands2meals2lives1movement.org"
  src="https://plausible.io/js/script.tagged-events.js"></script>
```

As soon as `window.plausible` is a function, every successful signup fires
`plausible('Signup Success', { props: { status: 201 } })`.

## PII / email handling rules

The signup analytics hooks have **three** layers of email-leak protection. Audit
checklist before you ship any change to the success/error paths:

1. **The hook itself never receives the email.** The call sites in
   `handleJoin()` pass `{ status: r.status }` or `{ code: 'network' }` — never
   `email`. Verify with `grep -nE "TrackSignupSuccess|CaptureSignupError" index.html`.
2. **`safeAnalyticsProps()` strips anything email-shaped.** Any prop whose key
   matches `/email|address|user|name|phone|token|password/i`, or whose string
   value contains `@`, is dropped before it reaches gtag/plausible/Sentry.
3. **The localStorage backstop is the only place an email is stored on the
   client**, and it's gated to the same origin as the page, never sent to a
   third party. It exists only to avoid losing a signup when the CMS is
   unreachable.

If you add a new event:
- Pass only `{ ok, status, code }`-shaped data.
- Run a manual smoke: open DevTools, submit a signup, run
  `JSON.stringify(window.__2m2lFailures.slice(-3))` and confirm no `@`
  characters appear.

## CMS-side observability

For Strapi structured logs, the daily subscriber sanity-check script, and
Railway alerting, see `2meals2lives-cms/docs/MONITORING.md`.
