# Square Dance Check-In

Check-in app for CMDF square dances, built on SvelteKit + Airtable. Self-service at the door, staff only open the night:

- **`/staff`** — staff log in (shared password) and type a title to create today's Event. This is the *only* thing this view does — it no longer searches or checks anyone in.
- **`/new-party`** — a first-time visitor fills out their own info (self-service, e.g. via a QR code at the door), creating a Party + optional additional Adults + a Visit record. **No login.**
- **`/returning-party`** — a returning visitor searches for their own party, confirms details, and records today's visit themselves. **No login** — this used to be the staff-only `/volunteer` flow; it's now anonymous self-service like `/new-party`. Search results are trimmed (name/city/state only — no email or visit history) since anyone at the door can use it.

All three routes only work once today's Event record exists in Airtable — see [Login & check-in lock](#login--check-in-lock). Every check-in links its Visit to that Event, so the Events table's rollups (Total Adults/Children/Parties) stay accurate. Each visit also records which of Workshop / Family Dance / Square Dance the party attended (`Attending`, optional, multi-select) — see `src/lib/attending.js`.

## Setup

```sh
npm install
cp .env.example .env
```

Fill in `.env`:

```
AIRTABLE_API_KEY=<a Personal Access Token scoped to the CMDF Square Dances base>
AIRTABLE_BASE_ID=appHYcz1rdao0Evm6
VOLUNTEER_PASSWORD=<a long, random shared password — told to volunteers verbally, not emailed>
SESSION_SECRET=<random hex, e.g. `openssl rand -hex 32` — use a different value in Netlify than local dev>
MAILCHIMP_API_KEY=<Mailchimp API key>
MAILCHIMP_SERVER_PREFIX=<e.g. us21 — the suffix on your Mailchimp API key, after the ->
MAILCHIMP_AUDIENCE_ID=<the CMDF newsletter audience/list ID>
```

The Mailchimp vars are optional — if unset, syncing is skipped (logged, not an error), so the app still runs without them.

The Airtable token needs `data.records:read`, `data.records:write`, and `schema.bases:read` on that base.

## Running

```sh
npm run dev          # local dev server, http://localhost:5173
npm run check        # svelte-check + type checking — must be 0 errors before committing
npm run build         # production build
npm run preview       # preview the production build locally
```

## Architecture

- `src/lib/server/schema.js` — table/field name constants. **Field names, not IDs** — mirrors the live Airtable schema exactly. If a field gets renamed in Airtable, re-check with `list_tables_for_base` before assuming this file is still accurate; it has drifted from the original plan doc before (see field-name deviations noted in the plan's Build Progress Log).
- `src/lib/attending.js` — the Workshop / Family Dance / Square Dance options for the `Attending` checkboxes. Lives outside `$lib/server` (unlike the rest of the schema constants) so `VisitFields.svelte` can import it from the client.
- `src/lib/server/airtable.js` — the only place that talks to Airtable. `searchParties` (returns trimmed `PublicParty` results — no email/visit history, since it's now hit anonymously), `getPartyDetails`, `createParty`, `createAdults`, `recordVisit`, `findTodaysEvent` (read-only lookup, gates all three flows), `findOrCreateEvent` (creates today's Event — only called from `/staff`'s authenticated `createEvent` action). `recordVisit` updates that party's existing Visit for today instead of creating a second one if it finds one (`findTodaysVisitForParty`) — covers a party checking in twice the same day, e.g. via `/new-party` and later found again via `/returning-party`.
- `src/lib/server/auth.js` — shared-password check and signed session-cookie helpers for the `/staff` login.
- `src/hooks.server.js` — gates `/staff` behind a valid session cookie; everything else (`/new-party`, `/returning-party`, `/api/parties/search`) is public.
- `src/lib/server/mailchimp.js` — `syncToMailchimp(email)`, called from both `/new-party` and `/returning-party` after a successful check-in. Adds the party's email to the CMDF Mailchimp audience via the same Marketing API v3 call `~/code/cmdf-website`'s `netlify/functions/subscribe.js` makes. Any "thank you" a party sees for signing up is a Mailchimp automation triggered by that add, not an email this app sends itself — cmdf-website doesn't send transactional email either, so there was no such pattern to copy. Failures are logged, not thrown, so a Mailchimp outage never blocks a check-in.
- `src/routes/staff/`, `src/routes/new-party/`, `src/routes/returning-party/` — one SvelteKit form action per flow (`+page.server.js`), UI in `+page.svelte`. All use `$app/forms`'s `use:enhance` for progressive enhancement.
- `src/routes/login/`, `src/routes/logout/` — the shared-password login form and a logout endpoint that clears the session cookie.
- `src/lib/components/VisitFields.svelte` — the adults/children/attending/notes inputs shared by `/new-party` and `/returning-party`.

## Login & check-in lock

Two independent gates:

1. **Login** — a single shared password (`VOLUNTEER_PASSWORD`) gates `/staff` at the request level, in `src/hooks.server.js`. Session is a signed, httpOnly cookie (`src/lib/server/auth.js`), valid 12 hours. No per-staff accounts — pick a long, random password and treat it like the Airtable token. `/new-party`, `/returning-party`, and `/api/parties/search` are not behind login (see below). Login attempts are rate-limited (5 failures per IP per 5 minutes, in-memory in `auth.js`) — a speed bump against brute-forcing the shared password, not a hard guarantee, since it resets on a cold serverless start and isn't shared across concurrent function instances.
2. **Check-in lock** — `/new-party`'s `submit` action and `/returning-party`'s `checkIn` action only succeed if today's Event record already exists in Airtable (checked server-side, not just hidden in the UI — see `findTodaysEvent` in `src/lib/server/airtable.js`). Dances aren't on a fixed schedule, so there's no calendar rule to compute this from, and **nothing creates today's Event except logged-in staff**:
   - **Unlock**: staff log in at `/staff` and type a title to create today's event (the `createEvent` action — the only code path that calls `findOrCreateEvent`). A dance day's Event can also be added by hand in Airtable ahead of time, which has the same effect.
   - **Lock**: nothing to do — tomorrow the date no longer matches, so both self-service routes are closed again automatically.

This closes a real gap from an earlier version: `/new-party` used to auto-create today's Event on submit, which meant anyone who found the anonymous URL could silently open check-in for the day just by self-registering — even with no staff present and no dance actually happening. Now the self-service routes can only ever *read* whether an Event exists; only the authenticated `createEvent` action can create one.

The lock (and every "today" the app writes to Airtable) is computed in `America/New_York`, not the server's own clock (`src/lib/utils/event.js`) — Netlify Functions run in UTC, which would otherwise roll "today" over to the next date at 8pm Eastern, mid-dance for a typical 7–10pm night, and silently re-lock check-in on anyone submitting after that point.

## Security & data handling

- `.env` (Airtable token, volunteer password, session secret) is git-ignored. Never commit it. `.env.example` is the template.
- `*.csv` is git-ignored — the historical registration CSV in this repo contains real attendee PII (name, email, ethnicity, gender, disability/veteran status) and is already imported into Airtable; the app doesn't need it.
- Email is **required** on `/new-party` — it's used to add the party to the CMDF mailing list (via Mailchimp sync, see above) and isn't shared with anyone else. The form says so.
- All Airtable writes happen server-side (`src/lib/server/`); the API token is never exposed to the browser.
- `/staff` requires login. `/new-party` and `/returning-party` don't, but are still locked to dance days — see above. `/api/parties/search` is public (it backs `/returning-party`) but only ever returns name/city/state/party-size — `searchParties` in `src/lib/server/airtable.js` strips email and visit history before the response leaves the server, so anonymous door traffic can't harvest PII through it.
- **Content-Security-Policy** — set per-request by SvelteKit (`csp` in `vite.config.js`), with auto-generated nonces for its own inline scripts. `default-src 'self'`; no external scripts, fonts, or CDNs are loaded anywhere in the app.
- **Other security headers** — `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security`, `Permissions-Policy`, set Netlify-side in `netlify.toml` (CSP is deliberately not duplicated there, since it needs the per-response nonce).
- **`/login` is rate-limited** — see above.
- **Airtable formula injection** — `searchParties` builds an Airtable `filterByFormula` string from the user's search query. The query is escaped (backslashes first, then quotes — that order matters, since escaping quotes first would let a raw `\"` in the input combine with the added `\` into `\\"`, which closes the string literal early and lets attacker-supplied formula syntax run, e.g. an always-true clause that dumps every party instead of just matches).
- `npm audit` — 0 vulnerabilities. `cookie` (a transitive dep of `@sveltejs/kit`) is pinned to `^0.7.2` via `overrides` in `package.json`, ahead of what `@sveltejs/kit@2.70.2` itself specifies, to pick up a fix for [GHSA-pxg6-pf52-xh8x](https://github.com/advisories/GHSA-pxg6-pf52-xh8x) (out-of-bounds characters in cookie name/path/domain) — re-check whether this override is still needed next time `@sveltejs/kit` is upgraded.

## Status

Self-service check-in (new-party, returning-party, staff event creation, Events auto-linking, Attending tracking, check-in lock) is built and tested against live data, plus a first security pass (headers, CSP, dependency audit, login rate-limiting, formula-injection fix, timezone fix). Also built: a "Back to start" link on every screen that ends a workflow (new-party success, returning-party success, staff event-open confirmation), same-day duplicate-visit handling (`recordVisit` updates today's existing Visit instead of creating a second one), and Mailchimp sync on check-in (`src/lib/server/mailchimp.js`). Not yet done:

- Deploy to Netlify and attach a subdomain (e.g. `checkin.cacaponmusicanddance.org`) off CMDF's existing Netlify-hosted domain, `cacaponmusicanddance.org`.
- Set `VOLUNTEER_PASSWORD`, `SESSION_SECRET` (a fresh value, not the local-dev one), and the `MAILCHIMP_*` vars in Netlify's site environment variables.
- Set up (or confirm) a Mailchimp "welcome new subscriber" automation on the target audience — the sync adds the email, but the automation is what actually sends the thank-you.
- QR code for `/new-party` and `/returning-party` (deferred to an external generator, not an in-app dependency).
- Error handling / edge-case polish (retry on network failure, duplicate-submission guarding).
- Login rate limiting is in-memory only — fine for a shared low-value password on a small staff app, but wouldn't hold up against a distributed attempt. A durable store (e.g. Airtable or a small KV) would be the next step up if that ever seems warranted.

Full design doc and session-by-session build log: `~/code/dev-vault/dev-vault/00_Inbox/in-progress/Square Dance Check-in with mailchimp integration.md`.
