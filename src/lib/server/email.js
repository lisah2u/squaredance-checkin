// Stubbed per decision on 2026-08-12: no real email provider wired in yet.
// Swap the body of sendCheckInConfirmation() for a SendGrid call once an API
// key exists — call signature is meant to stay stable.

/**
 * @param {{ to: string, leadAdultName: string }} params
 */
export async function sendCheckInConfirmation({ to, leadAdultName }) {
	console.log(`[email:stub] Would send check-in confirmation to ${to} (${leadAdultName})`);
	return { sent: false, stubbed: true };
}
