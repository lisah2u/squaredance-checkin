import { fail } from '@sveltejs/kit';
import { findOrCreateAnonymousParty, recordVisit, findTodaysEvent } from '$lib/server/airtable.js';
import { todaysEvent } from '$lib/utils/event.js';
import { ATTENDING_OPTIONS } from '$lib/attending.js';

const VALID_ATTENDING = new Set(Object.values(ATTENDING_OPTIONS));

export async function load() {
	const { visitDate } = todaysEvent();
	const event = await findTodaysEvent(visitDate);
	return { checkInOpen: Boolean(event) };
}

export const actions = {
	// For visitors who'd rather not give their name: records only head counts,
	// linked to the one shared Anonymous party. No Party is created and nothing
	// is sent to Mailchimp.
	count: async ({ request }) => {
		const data = await request.formData();
		const adultsThisVisit = Number(data.get('adultsThisVisit'));
		const childrenThisVisit = Number(data.get('childrenThisVisit'));
		const whereFrom = data.get('whereFrom')?.toString().trim() ?? '';
		const notes = data.get('notes')?.toString().trim() ?? '';
		const attending = data.getAll('attending').map(String).filter((v) => VALID_ATTENDING.has(v));

		if (!Number.isFinite(adultsThisVisit) || adultsThisVisit < 0) {
			return fail(400, { error: 'Adults count must be zero or more.' });
		}
		if (!Number.isFinite(childrenThisVisit) || childrenThisVisit < 0) {
			return fail(400, { error: 'Children count must be zero or more.' });
		}
		if (adultsThisVisit + childrenThisVisit < 1) {
			return fail(400, { error: 'Please count at least one person.' });
		}

		const { eventName, visitDate } = todaysEvent();
		// Re-checked here, not just in the UI — same lock as the other two flows.
		const event = await findTodaysEvent(visitDate);
		if (!event) {
			return fail(423, { error: 'Check-in is locked — no dance is scheduled today.' });
		}

		const partyId = await findOrCreateAnonymousParty();
		await recordVisit(
			partyId,
			{
				eventName,
				visitDate,
				adultsThisVisit,
				childrenThisVisit,
				notes: [whereFrom && `From: ${whereFrom}`, notes].filter(Boolean).join('\n'),
				attending,
				eventId: event.id
			},
			{ dedupe: false }
		);

		return { success: true };
	}
};
