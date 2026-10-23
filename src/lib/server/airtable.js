import Airtable from 'airtable';
import { env } from '$env/dynamic/private';
import { TABLES, PARTY_FIELDS, ADULT_FIELDS, VISIT_FIELDS, EVENT_FIELDS, CHECK_IN_METHODS } from './schema.js';

/**
 * @typedef {object} Party
 * @property {string} id
 * @property {string} searchKey
 * @property {string} leadAdultName
 * @property {string} additionalAdultNames
 * @property {number} adultsCount
 * @property {number} childrenCount
 * @property {string} city
 * @property {string} state
 * @property {string} primaryEmail
 * @property {string} additionalEmails
 * @property {boolean} disability
 * @property {boolean} armedServices
 * @property {boolean} veteran
 * @property {string|null} lastSeen
 * @property {number} totalVisits
 */

/**
 * @typedef {object} NewPartyInput
 * @property {string} leadAdultName
 * @property {number} adultsCount
 * @property {number} childrenCount
 * @property {string} city
 * @property {string} state
 * @property {string} [primaryEmail]
 * @property {string} [additionalEmails]
 * @property {string} [howDidYouHear]
 * @property {boolean} [disability]
 * @property {boolean} [armedServices]
 * @property {boolean} [veteran]
 * @property {string} [firstSeen] - YYYY-MM-DD
 */

/**
 * @typedef {object} NewVisitInput
 * @property {string} eventName
 * @property {string} visitDate
 * @property {number} adultsThisVisit
 * @property {number} childrenThisVisit
 * @property {string} [checkInMethod]
 * @property {string} [notes]
 * @property {string} [eventId]
 * @property {string[]} [attending]
 */

/**
 * @typedef {object} PublicParty
 * @property {string} id
 * @property {string} leadAdultName
 * @property {string} additionalAdultNames
 * @property {string} city
 * @property {string} state
 * @property {number} adultsCount
 * @property {number} childrenCount
 */

// Lead Adult Name of the one shared Party that /just-count visits link to,
// for visitors who'd rather not give their name. Matches the record a
// visitor made by hand at the 2026-08-15 dance, which Lisa chose to keep.
export const ANONYMOUS_PARTY_NAME = 'Anonymous';

function getBase() {
	if (!env.AIRTABLE_API_KEY) {
		throw new Error(
			'AIRTABLE_API_KEY is not set. Copy .env.example to .env and add a Personal Access Token scoped to the CMDF Square Dances base.'
		);
	}
	const baseId = env.AIRTABLE_BASE_ID || 'appHYcz1rdao0Evm6';
	return new Airtable({ apiKey: env.AIRTABLE_API_KEY }).base(baseId);
}

/**
 * @param {any} record
 * @returns {Party}
 */
function partyFromRecord(record) {
	return {
		id: record.id,
		searchKey: String(record.get(PARTY_FIELDS.searchKey) ?? ''),
		leadAdultName: String(record.get(PARTY_FIELDS.leadAdultName) ?? ''),
		additionalAdultNames: String(record.get(PARTY_FIELDS.additionalAdultNamesText) ?? ''),
		adultsCount: Number(record.get(PARTY_FIELDS.adultsCount) ?? 0),
		childrenCount: Number(record.get(PARTY_FIELDS.childrenCount) ?? 0),
		city: String(record.get(PARTY_FIELDS.city) ?? ''),
		state: String(record.get(PARTY_FIELDS.state) ?? ''),
		primaryEmail: String(record.get(PARTY_FIELDS.primaryEmail) ?? ''),
		additionalEmails: String(record.get(PARTY_FIELDS.additionalEmails) ?? ''),
		disability: Boolean(record.get(PARTY_FIELDS.disability) ?? false),
		armedServices: Boolean(record.get(PARTY_FIELDS.armedServices) ?? false),
		veteran: Boolean(record.get(PARTY_FIELDS.veteran) ?? false),
		lastSeen: record.get(PARTY_FIELDS.lastSeen) ? String(record.get(PARTY_FIELDS.lastSeen)) : null,
		totalVisits: Number(record.get(PARTY_FIELDS.totalVisits) ?? 0)
	};
}

/**
 * Search Parties by the Party Search Key (name / city / state / email all
 * live in that one formula field). Returns [] for an empty/short query so
 * callers don't accidentally dump all 189 parties into a dropdown.
 *
 * This search is reachable by anonymous door visitors (self-service
 * returning-party check-in), so results are trimmed to what's needed to
 * pick the right party and pre-fill a visit — no email, no visit history.
 * @param {string | null} query
 * @returns {Promise<PublicParty[]>}
 */
export async function searchParties(query) {
	const trimmed = query?.trim();
	if (!trimmed || trimmed.length < 2) return [];

	// Airtable formulas have no case-insensitive "contains"; LOWER() both sides.
	// Backslashes must be escaped before quotes — a raw `\"` in the query would
	// otherwise combine with the quote-escaping below into `\\"`, which closes
	// the string literal early and lets the rest of the input run as formula
	// syntax (e.g. an always-true clause that dumps every party, not just matches).
	const escaped = trimmed.toLowerCase().replace(/\\/g, '\\\\').replace(/"/g, '\\"');
	// The shared Anonymous party (see findOrCreateAnonymousParty) is left out —
	// it's not anyone's party to pick, and checking in as it would skip /just-count.
	const filterByFormula = `AND(FIND("${escaped}", LOWER({${PARTY_FIELDS.searchKey}})) > 0, LOWER({${PARTY_FIELDS.leadAdultName}}) != "${ANONYMOUS_PARTY_NAME.toLowerCase()}")`;

	const records = await getBase()(TABLES.parties)
		.select({ filterByFormula, maxRecords: 20, sort: [{ field: PARTY_FIELDS.lastSeen, direction: 'desc' }] })
		.all();

	return records.map(partyFromRecord).map((party) => ({
		id: party.id,
		leadAdultName: party.leadAdultName,
		additionalAdultNames: party.additionalAdultNames,
		city: party.city,
		state: party.state,
		adultsCount: party.adultsCount,
		childrenCount: party.childrenCount
	}));
}

/**
 * @param {string} partyId
 * @returns {Promise<Party>}
 */
export async function getPartyDetails(partyId) {
	const record = await getBase()(TABLES.parties).find(partyId);
	return partyFromRecord(record);
}

/**
 * Create a new Party record.
 * @param {NewPartyInput} party
 * @returns {Promise<Party>}
 */
export async function createParty(party) {
	const record = await getBase()(TABLES.parties).create({
		[PARTY_FIELDS.leadAdultName]: party.leadAdultName,
		[PARTY_FIELDS.adultsCount]: party.adultsCount,
		[PARTY_FIELDS.childrenCount]: party.childrenCount,
		[PARTY_FIELDS.city]: party.city,
		[PARTY_FIELDS.state]: party.state,
		[PARTY_FIELDS.primaryEmail]: party.primaryEmail || undefined,
		[PARTY_FIELDS.additionalEmails]: party.additionalEmails || undefined,
		[PARTY_FIELDS.howDidYouHear]: party.howDidYouHear || undefined,
		[PARTY_FIELDS.disability]: !!party.disability,
		[PARTY_FIELDS.armedServices]: !!party.armedServices,
		[PARTY_FIELDS.veteran]: !!party.veteran,
		[PARTY_FIELDS.firstSeen]: party.firstSeen || undefined
	});
	return partyFromRecord(record);
}

/**
 * Create linked Adults records for a party. Skips any adult with a blank name.
 * @param {string} partyId
 * @param {{name: string, email?: string}[]} adults
 */
export async function createAdults(partyId, adults) {
	const toCreate = (adults || [])
		.filter((a) => a?.name?.trim())
		.map((a) => ({
			fields: {
				[ADULT_FIELDS.fullName]: a.name.trim(),
				[ADULT_FIELDS.email]: a.email?.trim() || undefined,
				[ADULT_FIELDS.linkedParty]: [partyId]
			}
		}));
	if (toCreate.length === 0) return [];

	const records = await getBase()(TABLES.adults).create(toCreate);
	return records.map((r) => ({ id: r.id, name: r.get(ADULT_FIELDS.fullName) }));
}

/**
 * Find the Event for a given date, or create one if it doesn't exist yet.
 * Lets Visits link to a real Events record (not just a free-text Event Name)
 * so the Events table's rollups (Total Adults/Children/Parties) work.
 * @param {string} eventName
 * @param {string} eventDate - YYYY-MM-DD
 * @returns {Promise<{id: string, eventName: string, created: boolean}>} - an
 *   existing Event keeps its original name; `eventName` is that one
 */
export async function findOrCreateEvent(eventName, eventDate) {
	const existing = await getBase()(TABLES.events)
		.select({
			filterByFormula: `IS_SAME({${EVENT_FIELDS.eventDate}}, "${eventDate}", 'day')`,
			maxRecords: 1
		})
		.all();
	if (existing.length > 0) {
		return {
			id: existing[0].id,
			eventName: String(existing[0].get(EVENT_FIELDS.eventName) ?? ''),
			created: false
		};
	}

	const record = await getBase()(TABLES.events).create({
		[EVENT_FIELDS.eventName]: eventName,
		[EVENT_FIELDS.eventDate]: eventDate
	});
	return { id: record.id, eventName, created: true };
}

/**
 * Events on or after a date, soonest first — the dances already scheduled,
 * shown on /staff so whoever schedules one can see what's set.
 * @param {string} fromDate - YYYY-MM-DD
 * @returns {Promise<{id: string, eventName: string, eventDate: string}[]>}
 */
export async function listUpcomingEvents(fromDate) {
	const records = await getBase()(TABLES.events)
		.select({
			filterByFormula: `NOT(IS_BEFORE({${EVENT_FIELDS.eventDate}}, "${fromDate}"))`,
			sort: [{ field: EVENT_FIELDS.eventDate, direction: 'asc' }],
			maxRecords: 20
		})
		.all();
	return records.map((r) => ({
		id: r.id,
		eventName: String(r.get(EVENT_FIELDS.eventName) ?? ''),
		eventDate: String(r.get(EVENT_FIELDS.eventDate) ?? '')
	}));
}

/**
 * Look up (but do not create) the Event for a given date. Used to gate
 * check-in on a dance actually being scheduled — see src/lib/server/auth.js
 * and the /staff route for the login/lock design. Staff can schedule an
 * Event ahead of time; check-in opens on its date with no one logging in.
 * @param {string} eventDate - YYYY-MM-DD
 * @returns {Promise<{id: string, eventName: string} | null>}
 */
export async function findTodaysEvent(eventDate) {
	const existing = await getBase()(TABLES.events)
		.select({
			filterByFormula: `IS_SAME({${EVENT_FIELDS.eventDate}}, "${eventDate}", 'day')`,
			maxRecords: 1
		})
		.all();
	if (existing.length === 0) return null;
	return { id: existing[0].id, eventName: String(existing[0].get(EVENT_FIELDS.eventName) ?? '') };
}

/**
 * Find the shared Anonymous party, creating it if it doesn't exist yet.
 * @returns {Promise<string>} partyId
 */
export async function findOrCreateAnonymousParty() {
	const existing = await getBase()(TABLES.parties)
		.select({
			filterByFormula: `LOWER({${PARTY_FIELDS.leadAdultName}}) = "${ANONYMOUS_PARTY_NAME.toLowerCase()}"`,
			maxRecords: 1
		})
		.all();
	if (existing.length > 0) return existing[0].id;

	const record = await getBase()(TABLES.parties).create({
		[PARTY_FIELDS.leadAdultName]: ANONYMOUS_PARTY_NAME,
		[PARTY_FIELDS.adultsCount]: 0,
		[PARTY_FIELDS.childrenCount]: 0
	});
	return record.id;
}

/**
 * Find an existing Visit for this party on the given date, if any. Used so a
 * party checking in twice the same day (e.g. via /new-party, then found and
 * checked in again via /returning-party) updates that Visit instead of
 * creating a second row for the same night.
 * @param {string} partyId
 * @param {string} visitDate - YYYY-MM-DD
 * @returns {Promise<{id: string} | null>}
 */
async function findTodaysVisitForParty(partyId, visitDate) {
	// Filter by date in Airtable, then match the party in code. A formula can't
	// match on the link itself: inside a formula, {Linked Party} evaluates to the
	// linked Parties' primary field (Party Search Key text), not their record
	// IDs — so FIND(partyId, ARRAYJOIN({Linked Party})) never matched, and every
	// repeat check-in created a duplicate Visit (seen live at the 2026-08-15 dance).
	// The REST API's record JSON does return link fields as record IDs.
	// One night's visits is a few dozen rows, so fetching them all is cheap.
	const records = await getBase()(TABLES.visits)
		.select({
			filterByFormula: `IS_SAME({${VISIT_FIELDS.visitDate}}, "${visitDate}", 'day')`,
			fields: [VISIT_FIELDS.linkedParty]
		})
		.all();
	const match = records.find((r) => {
		const linked = /** @type {string[] | undefined} */ (r.get(VISIT_FIELDS.linkedParty));
		return linked?.includes(partyId);
	});
	return match ? { id: match.id } : null;
}

/**
 * Record a party's visit for the day: creates a Visit, or updates the one
 * that already exists for this party today (see findTodaysVisitForParty)
 * rather than creating a duplicate.
 * @param {string} partyId
 * @param {NewVisitInput} visit
 * @param {{ dedupe?: boolean }} [options] - pass `dedupe: false` for the
 *   shared Anonymous party, where each visit that night is a different family
 */
export async function recordVisit(partyId, visit, { dedupe = true } = {}) {
	const fields = {
		[VISIT_FIELDS.linkedParty]: [partyId],
		[VISIT_FIELDS.eventName]: visit.eventName,
		[VISIT_FIELDS.visitDate]: visit.visitDate,
		[VISIT_FIELDS.adultsThisVisit]: visit.adultsThisVisit,
		[VISIT_FIELDS.childrenThisVisit]: visit.childrenThisVisit,
		[VISIT_FIELDS.checkInMethod]: visit.checkInMethod || CHECK_IN_METHODS.door,
		[VISIT_FIELDS.notes]: visit.notes || undefined,
		[VISIT_FIELDS.events]: visit.eventId ? [visit.eventId] : undefined,
		[VISIT_FIELDS.attending]: visit.attending?.length ? visit.attending : undefined
	};

	const existing = dedupe ? await findTodaysVisitForParty(partyId, visit.visitDate) : null;
	const record = existing
		? await getBase()(TABLES.visits).update(existing.id, fields)
		: await getBase()(TABLES.visits).create(fields);

	// First Seen / Last Seen are plain date fields (set once by the historical
	// import), not rollups, so nothing keeps them current unless we write them.
	// Search results sort on Last Seen. First Seen is set by createParty.
	await getBase()(TABLES.parties).update(partyId, { [PARTY_FIELDS.lastSeen]: visit.visitDate });

	return { id: record.id, eventName: record.get(VISIT_FIELDS.eventName), updated: Boolean(existing) };
}
