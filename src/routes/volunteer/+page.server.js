import { fail } from '@sveltejs/kit';
import { getPartyDetails, createVisit } from '$lib/server/airtable.js';
import { todaysEvent } from '$lib/utils/event.js';

export const actions = {
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
		const party = await getPartyDetails(partyId);

		await createVisit(partyId, {
			eventName,
			visitDate,
			adultsThisVisit,
			childrenThisVisit,
			notes
		});

		return { success: true, leadAdultName: party.leadAdultName };
	}
};
