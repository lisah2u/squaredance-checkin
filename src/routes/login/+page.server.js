import { fail, redirect } from '@sveltejs/kit';
import { checkVolunteerPassword, createSessionToken, SESSION_COOKIE } from '$lib/server/auth.js';

// Only allow redirecting back to an in-app path — an unvalidated redirectTo
// query param would otherwise be an open-redirect vector.
/** @param {string | null} raw */
function safeRedirectTarget(raw) {
	if (raw && raw.startsWith('/') && !raw.startsWith('//')) return raw;
	return '/volunteer';
}

export const actions = {
	default: async ({ request, cookies, url }) => {
		const data = await request.formData();
		const password = data.get('password')?.toString() ?? '';

		if (!checkVolunteerPassword(password)) {
			return fail(401, { error: 'Incorrect password.' });
		}

		cookies.set(SESSION_COOKIE, createSessionToken(), {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: true,
			maxAge: 60 * 60 * 12
		});

		redirect(303, safeRedirectTarget(url.searchParams.get('redirectTo')));
	}
};
