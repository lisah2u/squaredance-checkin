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
 */

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
 * @param {string | null} query
 * @returns {Promise<Party[]>}
 */
export async function searchParties(query) {
	const trimmed = query?.trim();
	if (!trimmed || trimmed.length < 2) return [];

	// Airtable formulas have no case-insensitive "contains"; LOWER() both sides.
	const escaped = trimmed.toLowerCase().replace(/"/g, '\\"');
	const filterByFormula = `FIND("${escaped}", LOWER({${PARTY_FIELDS.searchKey}})) > 0`;

	const records = await getBase()(TABLES.parties)
		.select({ filterByFormula, maxRecords: 20, sort: [{ field: PARTY_FIELDS.lastSeen, direction: 'desc' }] })
		.all();

	return records.map(partyFromRecord);
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
		[PARTY_FIELDS.veteran]: !!party.veteran
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
 * @returns {Promise<string>} eventId
 */
export async function findOrCreateEvent(eventName, eventDate) {
	const existing = await getBase()(TABLES.events)
		.select({
			filterByFormula: `IS_SAME({${EVENT_FIELDS.eventDate}}, "${eventDate}", 'day')`,
			maxRecords: 1
		})
		.all();
	if (existing.length > 0) return existing[0].id;

	const record = await getBase()(TABLES.events).create({
		[EVENT_FIELDS.eventName]: eventName,
		[EVENT_FIELDS.eventDate]: eventDate
	});
	return record.id;
}

/**
 * Create a Visit record linked to a party (and, if visit.eventId is given, to an Event).
 * @param {string} partyId
 * @param {NewVisitInput} visit
 */
export async function createVisit(partyId, visit) {
	const record = await getBase()(TABLES.visits).create({
		[VISIT_FIELDS.linkedParty]: [partyId],
		[VISIT_FIELDS.eventName]: visit.eventName,
		[VISIT_FIELDS.visitDate]: visit.visitDate,
		[VISIT_FIELDS.adultsThisVisit]: visit.adultsThisVisit,
		[VISIT_FIELDS.childrenThisVisit]: visit.childrenThisVisit,
		[VISIT_FIELDS.checkInMethod]: visit.checkInMethod || CHECK_IN_METHODS.door,
		[VISIT_FIELDS.notes]: visit.notes || undefined,
		[VISIT_FIELDS.events]: visit.eventId ? [visit.eventId] : undefined
	});
	return { id: record.id, eventName: record.get(VISIT_FIELDS.eventName) };
}
