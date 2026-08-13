import { fail } from '@sveltejs/kit';
import { findTodaysEvent, findOrCreateEvent } from '$lib/server/airtable.js';
import { todaysEvent } from '$lib/utils/event.js';

export async function load() {
	const { visitDate } = todaysEvent();
	const event = await findTodaysEvent(visitDate);
	return { existingEvent: event };
}

export const actions = {
	// Only reachable while logged in (hooks.server.js gates all of /staff) —
	// this is the one place today's Event record gets created, so opening
	// check-in is always a deliberate, authenticated action. If today's Event
	// already exists, findOrCreateEvent just returns it (no duplicate, and the
	// title staff typed this time is discarded in favor of the original).
	createEvent: async ({ request }) => {
		const data = await request.formData();
		const eventTitle = data.get('eventTitle')?.toString().trim() ?? '';

		if (!eventTitle) return fail(400, { error: 'Please enter an event title.' });

		const { visitDate } = todaysEvent();
		await findOrCreateEvent(eventTitle, visitDate);

		const event = await findTodaysEvent(visitDate);
		return { created: true, eventName: event?.eventName ?? eventTitle };
	}
};
