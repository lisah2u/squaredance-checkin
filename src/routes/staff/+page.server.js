import { fail } from '@sveltejs/kit';
import { findTodaysEvent, findOrCreateEvent, listUpcomingEvents } from '$lib/server/airtable.js';
import { todaysEvent } from '$lib/utils/event.js';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** @param {string} isoDate - YYYY-MM-DD */
function isRealDate(isoDate) {
	const parsed = new Date(`${isoDate}T00:00:00Z`);
	return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === isoDate;
}

export async function load() {
	const { visitDate } = todaysEvent();
	const [event, upcoming] = await Promise.all([findTodaysEvent(visitDate), listUpcomingEvents(visitDate)]);
	return { existingEvent: event, upcoming, today: visitDate };
}

export const actions = {
	// Only reachable while logged in (hooks.server.js gates all of /staff) —
	// this is the one place an Event record gets created, so opening check-in
	// is always a deliberate, authenticated action. Scheduling ahead of time is
	// the normal case: check-in then opens on the dance's date by itself, so
	// door staff never need the password. If an Event already exists for that
	// date, findOrCreateEvent returns it (no duplicate, original title kept).
	createEvent: async ({ request }) => {
		const data = await request.formData();
		const eventTitle = data.get('eventTitle')?.toString().trim() ?? '';
		const eventDate = data.get('eventDate')?.toString().trim() ?? '';
		const { visitDate: today } = todaysEvent();

		if (!eventTitle) return fail(400, { error: 'Please enter an event title.' });
		// The date is interpolated into an Airtable formula, so its shape is
		// checked strictly. Date.parse alone accepts 2026-02-30 (rolling it to
		// March 2), so round-trip it to reject impossible dates.
		if (!ISO_DATE.test(eventDate) || !isRealDate(eventDate)) {
			return fail(400, { error: 'Please pick a valid date.' });
		}
		// ISO dates compare correctly as strings.
		if (eventDate < today) return fail(400, { error: "That date has already passed." });

		const event = await findOrCreateEvent(eventTitle, eventDate);
		return { scheduled: true, created: event.created, eventName: event.eventName, eventDate };
	}
};
