// Same Mailchimp Marketing API v3 call cmdf-website's
// netlify/functions/subscribe.js makes. The actual "thank you" a party sees
// for signing up is a Mailchimp automation (e.g. a welcome email) triggered
// by being added to the audience here — this app doesn't send any email
// itself, matching how cmdf-website does it too.

import { env } from '$env/dynamic/private';

/**
 * Add (or update) a party's email in the CMDF Mailchimp audience. Failures
 * are logged, not thrown — a Mailchimp outage or missing config shouldn't
 * block a party's check-in.
 * @param {string | undefined | null} email
 */
export async function syncToMailchimp(email) {
	const trimmed = email?.trim().toLowerCase();
	if (!trimmed) return;

	const apiKey = env.MAILCHIMP_API_KEY;
	const server = env.MAILCHIMP_SERVER_PREFIX;
	const audienceId = env.MAILCHIMP_AUDIENCE_ID;
	if (!apiKey || !server || !audienceId) {
		console.log(`[mailchimp] Not configured, skipping sync for ${trimmed}`);
		return;
	}

	try {
		const url = `https://${server}.api.mailchimp.com/3.0/lists/${audienceId}/members`;
		const auth = Buffer.from('anystring:' + apiKey).toString('base64');
		const response = await fetch(url, {
			method: 'POST',
			headers: {
				Authorization: 'Basic ' + auth,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ email_address: trimmed, status: 'subscribed' })
		});

		if (response.ok) return;

		const data = await response.json();
		// Already subscribed — not an error for our purposes.
		if (response.status === 400 && data.title === 'Member Exists') return;

		console.error('[mailchimp] sync failed:', data.detail || data.title);
	} catch (error) {
		console.error('[mailchimp] sync error:', error instanceof Error ? error.message : error);
	}
}
