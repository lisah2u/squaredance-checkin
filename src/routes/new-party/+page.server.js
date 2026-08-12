import { fail } from '@sveltejs/kit';
import { createParty, createAdults, createVisit } from '$lib/server/airtable.js';
import { sendCheckInConfirmation } from '$lib/server/email.js';
import { todaysEvent } from '$lib/utils/event.js';

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

		if (!leadAdultName) return fail(400, { error: 'Lead adult name is required.' });
		if (!city || !state) return fail(400, { error: 'City and state are required.' });
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

		const party = await createParty({
			leadAdultName,
			adultsCount,
			childrenCount,
			city,
			state,
			primaryEmail: str('primaryEmail'),
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

		const { eventName, visitDate } = todaysEvent();
		await createVisit(party.id, {
			eventName,
			visitDate,
			adultsThisVisit,
			childrenThisVisit,
			notes: str('notes')
		});

		if (party.primaryEmail) {
			await sendCheckInConfirmation({ to: party.primaryEmail, leadAdultName: party.leadAdultName });
		}

		return { success: true, leadAdultName: party.leadAdultName };
	}
};
