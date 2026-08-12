import { redirect, json } from '@sveltejs/kit';
import { SESSION_COOKIE, isSessionValid } from '$lib/server/auth.js';

const PROTECTED_PAGE_PREFIXES = ['/volunteer'];
const PROTECTED_API_PREFIXES = ['/api/parties/search'];

/**
 * @param {string[]} prefixes
 * @param {string} pathname
 */
function matches(prefixes, pathname) {
	return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export async function handle({ event, resolve }) {
	const { pathname } = event.url;
	const isProtectedApi = matches(PROTECTED_API_PREFIXES, pathname);
	const isProtectedPage = matches(PROTECTED_PAGE_PREFIXES, pathname);

	if (isProtectedApi || isProtectedPage) {
		const authed = isSessionValid(event.cookies.get(SESSION_COOKIE));
		if (!authed) {
			if (isProtectedApi) {
				return json({ error: 'Unauthorized' }, { status: 401 });
			}
			const redirectTo = encodeURIComponent(pathname + event.url.search);
			redirect(303, `/login?redirectTo=${redirectTo}`);
		}
	}

	return resolve(event);
}
