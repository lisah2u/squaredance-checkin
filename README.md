# Square Dance Check-In

Check-in app for CMDF square dances, built on SvelteKit + Airtable. Two routes, no login:

- **`/volunteer`** — a volunteer searches for a returning party, confirms details, records today's visit.
- **`/new-party`** — a first-time visitor fills out their own info (self-service, e.g. via a QR code at the door), creating a Party + optional additional Adults + a Visit record.

Every check-in also finds-or-creates today's Event record and links the Visit to it, so the Events table's rollups (Total Adults/Children/Parties) stay accurate without any manual step.

## Setup

```sh
npm install
cp .env.example .env
```

Fill in `.env`:

```
AIRTABLE_API_KEY=<a Personal Access Token scoped to the CMDF Square Dances base>
AIRTABLE_BASE_ID=appHYcz1rdao0Evm6
```

The token needs `data.records:read`, `data.records:write`, and `schema.bases:read` on that base.

## Running

```sh
npm run dev          # local dev server, http://localhost:5173
npm run check        # svelte-check + type checking — must be 0 errors before committing
npm run build         # production build
npm run preview       # preview the production build locally
```

## Architecture

- `src/lib/server/schema.js` — table/field name constants. **Field names, not IDs** — mirrors the live Airtable schema exactly. If a field gets renamed in Airtable, re-check with `list_tables_for_base` before assuming this file is still accurate; it has drifted from the original plan doc before (see field-name deviations noted in the plan's Build Progress Log).
- `src/lib/server/airtable.js` — the only place that talks to Airtable. `searchParties`, `getPartyDetails`, `createParty`, `createAdults`, `createVisit`, `findOrCreateEvent`.
- `src/lib/server/email.js` — check-in confirmation email. Currently a **stub** (logs to console, doesn't send) pending a SendGrid key.
- `src/routes/volunteer/`, `src/routes/new-party/` — one SvelteKit form action per flow (`+page.server.js`), UI in `+page.svelte`. Both use `$app/forms`'s `use:enhance` for progressive enhancement.
- `src/lib/components/VisitFields.svelte` — the adults/children/notes inputs shared by both flows.

## Security & data handling

- `.env` (real Airtable token) is git-ignored. Never commit it. `.env.example` is the template.
- `*.csv` is git-ignored — the historical registration CSV in this repo contains real attendee PII (name, email, ethnicity, gender, disability/veteran status) and is already imported into Airtable; the app doesn't need it.
- Email is **required** on `/new-party` — it's used to add the party to the CMDF mailing list and isn't shared with anyone else. The form says so.
- All Airtable writes happen server-side (`src/lib/server/`); the API token is never exposed to the browser.

## Status

MVP flows (search, confirm, record visit, new-party self-service, Events auto-linking) are built and tested against live data. Not yet done:

- Deploy to Netlify and attach a subdomain (e.g. `checkin.cacaponmusicanddance.org`) off CMDF's existing Netlify-hosted domain, `cacaponmusicanddance.org`.
- QR code for `/new-party` (deferred to an external generator, not an in-app dependency).
- Real email sending (swap the stub in `src/lib/server/email.js` for SendGrid once there's a key).
- Error handling / edge-case polish (retry on network failure, duplicate-submission guarding).

Full design doc and session-by-session build log: `~/code/dev-vault/dev-vault/00_Inbox/in-progress/Square Dance Check-in with mailchimp integration.md`.
