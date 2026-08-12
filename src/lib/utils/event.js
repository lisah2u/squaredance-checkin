// CMDF dances happen in West Virginia; the server (Netlify Functions) runs
// in UTC. Computing "today" from the server's own clock instead of this zone
// would roll over to the next calendar date at 8pm Eastern — mid-dance for a
// typical 7-10pm night — silently re-locking check-in while the dance is
// still going. Intl.DateTimeFormat handles the EST/EDT switch automatically.
const CLUB_TIME_ZONE = 'America/New_York';

// Matches the naming convention already used in the live base
// (see Build Progress Log 2026-08-11): "Square Dance MM/DD/YYYY".
export function todaysEvent(date = new Date()) {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: CLUB_TIME_ZONE,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit'
	}).formatToParts(date);
	const get = (/** @type {string} */ type) => parts.find((p) => p.type === type)?.value ?? '';
	const yyyy = get('year');
	const mm = get('month');
	const dd = get('day');
	return {
		visitDate: `${yyyy}-${mm}-${dd}`,
		eventName: `Square Dance ${mm}/${dd}/${yyyy}`
	};
}
