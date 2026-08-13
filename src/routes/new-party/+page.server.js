import { fail } from '@sveltejs/kit';
import { createParty, createAdults, createVisit, findTodaysEvent } from '$lib/server/airtable.js';
import { sendCheckInConfirmation } from '$lib/server/email.js';
import { todaysEvent } from '$lib/utils/event.js';
import { ATTENDING_OPTIONS } from '$lib/attending.js';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ATTENDING = new Set(Object.values(ATTENDING_OPTIONS));

export async function load() {
	const { visitDate } = todaysEvent();
	const event = await findTodaysEvent(visitDate);
	return { checkInOpen: Boolean(event) };
}

export const actions = {
	submit: async ({ request }) => {
		const data = await request.formData();
		/** @param {string} key */
		const str = (key) => data.get(key)?.toString().trim() ?? '';
		/** @param {string} key */
		const num = (key) => Number(data.get(key));

		const leadAdultName = str('leadAdultName');
		const city = str('city');
		const state = str('state');
		const adultsCount = num('adultsCount');
		const childrenCount = num('childrenCount');
		const adultsThisVisit = num('adultsThisVisit');
		const childrenThisVisit = num('childrenThisVisit');
		const primaryEmail = str('primaryEmail');
		const attending = data.getAll('attending').map(String).filter((v) => VALID_ATTENDING.has(v));

		if (!leadAdultName) return fail(400, { error: 'Lead adult name is required.' });
		if (!city || !state) return fail(400, { error: 'City and state are required.' });
		if (!EMAIL_PATTERN.test(primaryEmail)) return fail(400, { error: 'A valid email is required.' });
		if (!Number.isFinite(adultsCount) || adultsCount < 1) {
			return fail(400, { error: 'At least one adult is required.' });
		}
		if (!Number.isFinite(childrenCount) || childrenCount < 0) {
			return fail(400, { error: 'Children count must be zero or more.' });
		}
		if (!Number.isFinite(adultsThisVisit) || adultsThisVisit < 0) {
			return fail(400, { error: 'Adults today must be zero or more.' });
		}
		if (!Number.isFinite(childrenThisVisit) || childrenThisVisit < 0) {
			return fail(400, { error: 'Children today must be zero or more.' });
		}

		const { eventName, visitDate } = todaysEvent();
		// Re-checked here, not just in the UI: check-in only opens once
		// staff have logged in and created today's Event — see /staff.
		const event = await findTodaysEvent(visitDate);
		if (!event) {
			return fail(423, { error: 'Check-in is locked — no dance is scheduled today.' });
		}

		const party = await createParty({
			leadAdultName,
			adultsCount,
			childrenCount,
			city,
			state,
			primaryEmail,
			additionalEmails: str('additionalEmails'),
			howDidYouHear: str('howDidYouHear'),
			disability: data.get('disability') === 'on',
			armedServices: data.get('armedServices') === 'on',
			veteran: data.get('veteran') === 'on'
		});

		const additionalAdults = [1, 2, 3]
			.map((n) => ({ name: str(`adult${n}Name`), email: str(`adult${n}Email`) }))
			.filter((a) => a.name);
		await createAdults(party.id, additionalAdults);

		await createVisit(party.id, {
			eventName,
			visitDate,
			adultsThisVisit,
			childrenThisVisit,
			notes: str('notes'),
			attending,
			eventId: event.id
		});

		await sendCheckInConfirmation({ to: party.primaryEmail, leadAdultName: party.leadAdultName });

		return { success: true, leadAdultName: party.leadAdultName };
	}
};
