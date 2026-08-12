import { fail } from '@sveltejs/kit';
import { getPartyDetails, createVisit, findTodaysEvent, findOrCreateEvent } from '$lib/server/airtable.js';
import { todaysEvent } from '$lib/utils/event.js';

export async function load() {
	const { visitDate } = todaysEvent();
	const event = await findTodaysEvent(visitDate);
	return { checkInOpen: Boolean(event) };
}

export const actions = {
	// Only reachable while logged in (hooks.server.js gates all of /volunteer) —
	// this is the one place today's Event record gets created, so check-in
	// opening is always a deliberate, authenticated action.
	openToday: async () => {
		const { eventName, visitDate } = todaysEvent();
		await findOrCreateEvent(eventName, visitDate);
		return { opened: true };
	},

	checkIn: async ({ request }) => {
		const data = await request.formData();
		const partyId = data.get('partyId')?.toString() ?? '';
		const adultsThisVisit = Number(data.get('adultsThisVisit'));
		const childrenThisVisit = Number(data.get('childrenThisVisit'));
		const notes = data.get('notes')?.toString() ?? '';

		if (!partyId) return fail(400, { error: 'No party selected.' });
		if (!Number.isFinite(adultsThisVisit) || adultsThisVisit < 0) {
			return fail(400, { error: 'Adults count must be zero or more.' });
		}
		if (!Number.isFinite(childrenThisVisit) || childrenThisVisit < 0) {
			return fail(400, { error: 'Children count must be zero or more.' });
		}

		const { eventName, visitDate } = todaysEvent();
		const [party, event] = await Promise.all([getPartyDetails(partyId), findTodaysEvent(visitDate)]);

		// Re-checked here, not just in the UI: the Event row is what unlocks
		// check-in, so a request racing past a stale page load must not slip through.
		if (!event) {
			return fail(423, { error: 'Check-in is locked — no dance is scheduled today in Airtable.' });
		}

		await createVisit(partyId, {
			eventName,
			visitDate,
			adultsThisVisit,
			childrenThisVisit,
			notes,
			eventId: event.id
		});

		return { success: true, leadAdultName: party.leadAdultName };
	}
};
