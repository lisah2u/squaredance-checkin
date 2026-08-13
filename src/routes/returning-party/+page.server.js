import { fail } from '@sveltejs/kit';
import { getPartyDetails, createVisit, findTodaysEvent } from '$lib/server/airtable.js';
import { todaysEvent } from '$lib/utils/event.js';
import { ATTENDING_OPTIONS } from '$lib/attending.js';

const VALID_ATTENDING = new Set(Object.values(ATTENDING_OPTIONS));

export async function load() {
	const { visitDate } = todaysEvent();
	const event = await findTodaysEvent(visitDate);
	return { checkInOpen: Boolean(event) };
}

export const actions = {
	checkIn: async ({ request }) => {
		const data = await request.formData();
		const partyId = data.get('partyId')?.toString() ?? '';
		const adultsThisVisit = Number(data.get('adultsThisVisit'));
		const childrenThisVisit = Number(data.get('childrenThisVisit'));
		const notes = data.get('notes')?.toString() ?? '';
		const attending = data.getAll('attending').map(String).filter((v) => VALID_ATTENDING.has(v));

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
			return fail(423, { error: 'Check-in is locked — please see staff at the door.' });
		}

		await createVisit(partyId, {
			eventName,
			visitDate,
			adultsThisVisit,
			childrenThisVisit,
			notes,
			attending,
			eventId: event.id
		});

		return { success: true, leadAdultName: party.leadAdultName };
	}
};
