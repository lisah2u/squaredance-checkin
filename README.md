# Square Dance Check-In

Check-in app for CMDF square dances, built on SvelteKit + Airtable. Two routes:

- **`/volunteer`** — a volunteer searches for a returning party, confirms details, records today's visit. Requires login (shared password).
- **`/new-party`** — a first-time visitor fills out their own info (self-service, e.g. via a QR code at the door), creating a Party + optional additional Adults + a Visit record. **No login** — this is intentional so newcomers can self-register without volunteer help.

Both routes only work once today's Event record exists in Airtable — see [Login & check-in lock](#login--check-in-lock). Every check-in links its Visit to that Event, so the Events table's rollups (Total Adults/Children/Parties) stay accurate.

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
```

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
- `src/lib/server/airtable.js` — the only place that talks to Airtable. `searchParties`, `getPartyDetails`, `createParty`, `createAdults`, `createVisit`, `findTodaysEvent` (read-only lookup, gates both check-in flows), `findOrCreateEvent` (creates today's Event — only called from `/volunteer`'s authenticated `openToday` action).
- `src/lib/server/auth.js` — shared-password check and signed session-cookie helpers for the `/volunteer` login.
- `src/hooks.server.js` — gates `/volunteer` and `/api/parties/search` behind a valid session cookie; everything else (including `/new-party`) is public.
- `src/lib/server/email.js` — check-in confirmation email. Currently a **stub** (logs to console, doesn't send) pending a SendGrid key.
- `src/routes/volunteer/`, `src/routes/new-party/` — one SvelteKit form action per flow (`+page.server.js`), UI in `+page.svelte`. Both use `$app/forms`'s `use:enhance` for progressive enhancement.
- `src/routes/login/`, `src/routes/logout/` — the shared-password login form and a logout endpoint that clears the session cookie.
- `src/lib/components/VisitFields.svelte` — the adults/children/notes inputs shared by both flows.

## Login & check-in lock

Two independent gates:

1. **Login** — a single shared password (`VOLUNTEER_PASSWORD`) gates `/volunteer` and the `/api/parties/search` endpoint at the request level, in `src/hooks.server.js`. Session is a signed, httpOnly cookie (`src/lib/server/auth.js`), valid 12 hours. No per-volunteer accounts — pick a long, random password and treat it like the Airtable token. `/new-party` is not behind login (see below). Login attempts are rate-limited (5 failures per IP per 5 minutes, in-memory in `auth.js`) — a speed bump against brute-forcing the shared password, not a hard guarantee, since it resets on a cold serverless start and isn't shared across concurrent function instances.
2. **Check-in lock** — *both* `/volunteer`'s `checkIn` action and `/new-party`'s `submit` action only succeed if today's Event record already exists in Airtable (checked server-side, not just hidden in the UI — see `findTodaysEvent` in `src/lib/server/airtable.js`). Dances aren't on a fixed schedule, so there's no calendar rule to compute this from, and **nothing creates today's Event except a logged-in volunteer**:
   - **Unlock**: a volunteer logs in at `/volunteer` and clicks "Open check-in for today's dance" (the `openToday` action — the only code path that calls `findOrCreateEvent`). A dance day's Event can also be added by hand in Airtable ahead of time, which has the same effect.
   - **Lock**: nothing to do — tomorrow the date no longer matches, so both routes are closed again automatically.

This closes a real gap from an earlier version: `/new-party` used to auto-create today's Event on submit, which meant anyone who found the anonymous URL could silently open check-in for the day just by self-registering — even with no volunteer present and no dance actually happening. Now `/new-party` can only ever *read* whether an Event exists; only the authenticated `openToday` action can create one.

The lock (and every "today" the app writes to Airtable) is computed in `America/New_York`, not the server's own clock (`src/lib/utils/event.js`) — Netlify Functions run in UTC, which would otherwise roll "today" over to the next date at 8pm Eastern, mid-dance for a typical 7–10pm night, and silently re-lock check-in on anyone submitting after that point.

## Security & data handling

- `.env` (Airtable token, volunteer password, session secret) is git-ignored. Never commit it. `.env.example` is the template.
- `*.csv` is git-ignored — the historical registration CSV in this repo contains real attendee PII (name, email, ethnicity, gender, disability/veteran status) and is already imported into Airtable; the app doesn't need it.
- Email is **required** on `/new-party` — it's used to add the party to the CMDF mailing list and isn't shared with anyone else. The form says so.
- All Airtable writes happen server-side (`src/lib/server/`); the API token is never exposed to the browser.
- `/volunteer` and `/api/parties/search` (which returns party names, cities, emails) require login. `/new-party` doesn't require login, but is still locked to dance days — see above.
- **Content-Security-Policy** — set per-request by SvelteKit (`csp` in `vite.config.js`), with auto-generated nonces for its own inline scripts. `default-src 'self'`; no external scripts, fonts, or CDNs are loaded anywhere in the app.
- **Other security headers** — `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security`, `Permissions-Policy`, set Netlify-side in `netlify.toml` (CSP is deliberately not duplicated there, since it needs the per-response nonce).
- **`/login` is rate-limited** — see above.
- **Airtable formula injection** — `searchParties` builds an Airtable `filterByFormula` string from the user's search query. The query is escaped (backslashes first, then quotes — that order matters, since escaping quotes first would let a raw `\"` in the input combine with the added `\` into `\\"`, which closes the string literal early and lets attacker-supplied formula syntax run, e.g. an always-true clause that dumps every party instead of just matches).
- `npm audit` — 0 vulnerabilities. `cookie` (a transitive dep of `@sveltejs/kit`) is pinned to `^0.7.2` via `overrides` in `package.json`, ahead of what `@sveltejs/kit@2.70.2` itself specifies, to pick up a fix for [GHSA-pxg6-pf52-xh8x](https://github.com/advisories/GHSA-pxg6-pf52-xh8x) (out-of-bounds characters in cookie name/path/domain) — re-check whether this override is still needed next time `@sveltejs/kit` is upgraded.

## Status

MVP flows (search, confirm, record visit, new-party self-service, Events auto-linking, volunteer login + check-in lock on both routes) are built and tested against live data, plus a first security pass (headers, CSP, dependency audit, login rate-limiting, formula-injection fix, timezone fix). Not yet done:

- Deploy to Netlify and attach a subdomain (e.g. `checkin.cacaponmusicanddance.org`) off CMDF's existing Netlify-hosted domain, `cacaponmusicanddance.org`.
- Set `VOLUNTEER_PASSWORD` and `SESSION_SECRET` (a fresh value, not the local-dev one) in Netlify's site environment variables.
- QR code for `/new-party` (deferred to an external generator, not an in-app dependency).
- Real email sending (swap the stub in `src/lib/server/email.js` for SendGrid once there's a key).
- Error handling / edge-case polish (retry on network failure, duplicate-submission guarding).
- Login rate limiting is in-memory only — fine for a shared low-value password on a small volunteer app, but wouldn't hold up against a distributed attempt. A durable store (e.g. Airtable or a small KV) would be the next step up if that ever seems warranted.

Full design doc and session-by-session build log: `~/code/dev-vault/dev-vault/00_Inbox/in-progress/Square Dance Check-in with mailchimp integration.md`.
