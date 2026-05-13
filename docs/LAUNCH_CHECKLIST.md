# Launch checklist — #2Hands2Meals2Lives

A founder-friendly, sequential checklist. Run it top to bottom. Each step
takes 1–10 minutes. Don't skip ahead.

Every check has an **owner column** because some require dashboard access
this codebase can't perform.

> "Pass" means the bold sentence is literally true on your screen.
> If anything is unclear, pause and ask before continuing.

---

## A. Infrastructure prerequisites (owner: Vipin / hosting team)

| # | Check | How to verify | Pass criterion |
|---|---|---|---|
| A1 | DNS `cms.2hands2meals2lives1movement.org` exists | From any computer: `dig cms.2hands2meals2lives1movement.org +short` | Returns an IP or CNAME, not empty |
| A2 | DNS `2hands2meals2lives1movement.org` points at Vercel | `dig 2hands2meals2lives1movement.org +short` | Returns Vercel's IPs (76.x.x.x / 76.76.21.x) |
| A3 | TLS cert valid on CMS | Open `https://cms.2hands2meals2lives1movement.org/admin` in a browser | No browser warning; padlock shown |
| A4 | TLS cert valid on frontend | Open `https://2hands2meals2lives1movement.org/` in a browser | Same |
| A5 | Railway service is running | Railway dashboard → service → status | Status = "Active" / running |
| A6 | Vercel deployment is live | Vercel dashboard → project → deployments | Latest deploy = "Ready" / Production |
| A7 | Neon Postgres branch is healthy | Neon console → project → branch | Status = "Idle" or "Active", no error |
| A8 | Cloudflare R2 bucket exists | Cloudflare dashboard → R2 → bucket list | Bucket present + at least one access key |

---

## B. Required environment variables (owner: Vipin)

Compare what's in Railway vs the list below. **Anything missing fails this step.**

### Railway → CMS service → Variables

```
HOST=0.0.0.0
PORT=                                  (auto-injected by Railway)
APP_KEYS=                              (4 random base64 strings, comma-separated)
API_TOKEN_SALT=                        (random)
ADMIN_JWT_SECRET=                      (random)
TRANSFER_TOKEN_SALT=                   (random)
JWT_SECRET=                            (random)
ENCRYPTION_KEY=                        (random)
URL=https://cms.2hands2meals2lives1movement.org
STRAPI_ADMIN_BACKEND_URL=https://cms.2hands2meals2lives1movement.org

DATABASE_CLIENT=postgres
DATABASE_URL=postgres://...?sslmode=require   (Neon connection string)
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=false

CLOUDFLARE_R2_ACCESS_KEY_ID=
CLOUDFLARE_R2_SECRET_ACCESS_KEY=
CLOUDFLARE_R2_BUCKET=
CLOUDFLARE_R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com
CLOUDFLARE_R2_PUBLIC_URL=https://media.2hands2meals2lives1movement.org
```

Generate any missing `APP_KEYS` / secrets with `openssl rand -base64 32`.

### Vercel → frontend project → Variables

The static `index.html` currently reads no env vars at build time. Nothing
to set unless you want to override the CMS URL (see `<meta name="strapi-url">`
in `index.html`).

---

## C. Live verification (owner: Vipin, ~2 min)

Run from any machine with internet access:

```
cd 2meals2lives-cms
./scripts/verify-prod.sh
```

**Pass criterion:** the script exits 0 with `All checks passed.`

If it fails, fix the specific failure before going further. The script
covers DNS, /\_health, public API permissions, CORS, robots.txt, and
the absence of the hardcoded password.

---

## D. Strapi first-time setup (owner: anyone with admin access)

| # | Check | How |
|---|---|---|
| D1 | Admin user created | Visit `https://cms.2hands2meals2lives1movement.org/admin`, complete the initial admin signup if shown |
| D2 | Public role permissions are present | Settings → Users & Permissions → Public role |
| D3 | `community-post` allows: find, findOne, create | Check 3 boxes if missing |
| D4 | `subscriber` allows: create only | One box |
| D5 | `journal-post` allows: find, findOne | Two boxes |
| D6 | `story` allows: find, findOne | Two boxes |

(The bootstrap script grants these automatically on first boot — but verify
the boxes are actually checked. Strapi admin shows them under the Public role.)

---

## E. Submission flow test (owner: any human)

E1. Open `https://2hands2meals2lives1movement.org/` in a normal browser tab.
E2. Click **Share a Moment** in the nav.
E3. Upload a JPEG smaller than 8 MB. Fill name, location. Submit.
E4. Confirm the success modal appears within 5 seconds.
E5. Open `https://cms.2hands2meals2lives1movement.org/admin` → Content Manager → Community
    Post → confirm your submission is listed with `is_approved = false`.
E6. Toggle `is_approved` to true, hit Save.
E7. Go back to the website. Hard-reload the page. Scroll to the gallery.
    Your photo should appear in the grid within ~60 seconds.

**Pass criterion:** every step works as described.

---

## F. Moderation flow test

F1. In Strapi admin, edit any unapproved post → set `is_approved = true`.
F2. Reload public site → photo appears.
F3. Set `is_approved = false` → reload → photo disappears.

---

## G. Subscriber flow test

G1. Open the home page → Join section.
G2. Submit an email.
G3. Confirm the success message appears.
G4. In Strapi admin → Subscriber list → confirm the email is there.
G5. Submit the same email again → should also succeed (idempotent) but
    not create a duplicate row.

---

## H. Mobile QA (owner: any human with a phone)

| # | Check | Pass |
|---|---|---|
| H1 | iOS Safari: home page loads | yes / no |
| H2 | Android Chrome: home page loads | yes / no |
| H3 | Hamburger menu opens, closes, doesn't break body scroll | yes |
| H4 | Share-a-moment modal: photo picker opens, image preview shows | yes |
| H5 | Join form: submit works, success shows | yes |
| H6 | No console errors visible via remote debugger | none critical |

---

## I. Rollback plan

If anything goes wrong, follow these steps in order. Each step takes < 5 min.

### I1. CMS broke

Symptom: `https://cms.2hands2meals2lives1movement.org/_health` returns 500/timeouts.

1. Railway dashboard → CMS service → Deployments tab.
2. Find the previous green deployment → click **Redeploy**.
3. Wait for healthcheck → green.
4. Run `./scripts/verify-prod.sh` to confirm.

### I2. Frontend broke (visual regression / JS error spike)

Symptom: pages render wrong, or `window.__2m2lFailures` (DevTools console)
shows a flood of errors.

1. Vercel dashboard → frontend project → Deployments tab.
2. Find the previous green deployment → click **Promote to Production**.
3. Hard-reload the live URL.

### I3. Database problems (Neon)

Symptom: every CMS request returns 500 referencing a DB error.

1. Neon console → branch → Point-in-time restore.
2. Pick a timestamp before the issue → create a new branch from it.
3. Update Railway `DATABASE_URL` to the new branch's connection string.
4. Restart the Railway service.

Always restore to a **new branch** first. Don't overwrite the existing one
until you've confirmed the restored data is what you wanted.

### I4. R2 outage / uploads failing

1. Railway → CMS env vars → **unset** the five `CLOUDFLARE_R2_*` variables.
2. Restart the service. Strapi falls back to local-disk uploads.
3. New uploads will work but won't survive the *next* restart — this is a
   bridge to keep the site live while Cloudflare is investigated.
4. Re-set the env vars when R2 is back.

### I5. Spam wave

Symptom: hundreds of unapproved community-posts appearing per hour.

1. Strapi admin → Community Post → bulk-delete the spam.
2. SSH into Railway service if needed, or use the Strapi admin console.
3. Optionally tighten rate limit: edit
   `config/middlewares.js` → reduce `max` from 5 to 2 for community-posts,
   redeploy.
4. Block offending IPs at Cloudflare (or in Strapi via a new middleware) if
   one source dominates.

### I6. Disable a broken integration safely

- **Sentry**: blank out `<meta name="sentry-dsn" content="">` in
  `index.html` and redeploy.
- **R2**: see I4.
- **Subscriber flow**: revert the relevant commit on the frontend; users
  fall back to the localStorage path.
- **Community submissions**: same — revert. Form continues to "succeed" but
  posts go into the local browser only.

---

## J. Go / no-go

Tick every box from A–H before flipping the launch switch.

- [ ] All A.* infrastructure prerequisites
- [ ] All B.* env vars set
- [ ] C — verify-prod.sh exits 0
- [ ] All D.* admin permissions
- [ ] E end-to-end submission round trip
- [ ] F moderation
- [ ] G subscribers
- [ ] H mobile QA on at least 1 iOS + 1 Android device
- [ ] Rollback plan I read and understood by at least 2 people

If any single item is "no", **do not launch**.
