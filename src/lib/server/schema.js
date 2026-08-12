// Table and field names mirror the live Airtable schema exactly (fetched via
// list_tables_for_base against appHYcz1rdao0Evm6). Field names, not IDs, are
// used so the Airtable REST payloads stay human-readable — re-check schema
// before editing if a field gets renamed in the base.

export const TABLES = {
	parties: 'Parties',
	adults: 'Adults',
	visits: 'Visits',
	events: 'Events'
};

export const PARTY_FIELDS = {
	searchKey: 'Party Search Key',
	leadAdultName: 'Lead Adult Name',
	adultsCount: 'Adults Count',
	childrenCount: 'Children Count',
	city: 'City',
	state: 'State',
	primaryEmail: 'Primary Email',
	additionalEmails: 'Additional Emails',
	howDidYouHear: 'How Did You Hear About Us',
	disability: 'Disability in Party',
	armedServices: 'Armed Services / Reserves / National Guard in Party',
	veteran: 'Veteran in Party',
	firstSeen: 'First Seen',
	lastSeen: 'Last Seen',
	linkedAdults: 'Linked Adults',
	additionalAdultNamesText: 'Additional Adult Names Text',
	visits: 'Visits',
	totalVisits: 'Total Visits'
};

export const ADULT_FIELDS = {
	fullName: 'Adult Full Name',
	email: 'Adult Email',
	linkedParty: 'Linked Party'
};

export const VISIT_FIELDS = {
	eventName: 'Event Name',
	visitDate: 'Visit Date',
	linkedParty: 'Linked Party',
	adultsThisVisit: 'Adults This Visit',
	childrenThisVisit: 'Children This Visit',
	checkInMethod: 'Check-in Method',
	notes: 'Notes'
};

// Valid options for VISIT_FIELDS.checkInMethod (Airtable single select).
export const CHECK_IN_METHODS = {
	door: 'Door',
	imported: 'Imported',
	correction: 'Correction',
	onlineRSVP: 'Online RSVP'
};
