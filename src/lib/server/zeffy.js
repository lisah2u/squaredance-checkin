// Adds a party's email to CMDF's Zeffy contacts — the same Zeffy public API
// call cmdf-website's netlify/functions/subscribe.js makes. Replaced the
// Mailchimp sync in Nov 2026 when the free Mailchimp audience filled up.
// Docs: https://www.zeffy.com/api/docs (PUT /api/v1/contacts = upsert by email;
// writes require the org to be Stripe-verified in Zeffy).

import { env } from '$env/dynamic/private';

/**
 * Create-or-update a contact in Zeffy by email. Only the email is sent, so an
 * existing donor's name/address in Zeffy is never overwritten. Failures are
 * logged, not thrown — a Zeffy outage or missing config shouldn't block a
 * party's check-in.
 * @param {string | undefined | null} email
 */
export async function syncToZeffy(email) {
	const trimmed = email?.trim().toLowerCase();
	if (!trimmed) return;

	const apiKey = env.ZEFFY_API_KEY;
	if (!apiKey) {
		console.log(`[zeffy] Not configured, skipping sync for ${trimmed}`);
		return;
	}

	try {
		const response = await fetch('https://api.zeffy.com/api/v1/contacts', {
			method: 'PUT',
			headers: {
				Authorization: 'Bearer ' + apiKey,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ email: trimmed })
		});

		// 201 = created, 200 = already a contact. Both are fine.
		if (response.ok) return;

		const data = await response.json().catch(() => ({}));
		console.error('[zeffy] sync failed:', response.status, data?.error?.code, data?.error?.message);
	} catch (error) {
		console.error('[zeffy] sync error:', error instanceof Error ? error.message : error);
	}
}
