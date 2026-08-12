import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';

export const SESSION_COOKIE = 'volunteer_session';

// A dance night plus buffer, so a volunteer's session outlives one evening's check-in.
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;

function getSessionSecret() {
	if (!env.SESSION_SECRET) {
		throw new Error(
			'SESSION_SECRET is not set. Generate one with `openssl rand -hex 32` and add it to .env / Netlify env vars.'
		);
	}
	return env.SESSION_SECRET;
}

/** @param {string} payload */
function sign(payload) {
	return createHmac('sha256', getSessionSecret()).update(payload).digest('base64url');
}

// Compares digests (not the raw strings) so differing input lengths don't
// leak timing information either.
/**
 * @param {string} a
 * @param {string} b
 */
function safeEqual(a, b) {
	const ah = createHash('sha256').update(a).digest();
	const bh = createHash('sha256').update(b).digest();
	return timingSafeEqual(ah, bh);
}

/** @param {string} password */
export function checkVolunteerPassword(password) {
	if (!env.VOLUNTEER_PASSWORD) {
		throw new Error('VOLUNTEER_PASSWORD is not set. Add it to .env / Netlify env vars.');
	}
	return safeEqual(password, env.VOLUNTEER_PASSWORD);
}

/** @returns {string} */
export function createSessionToken() {
	const expiresAt = String(Date.now() + SESSION_TTL_MS);
	return `${expiresAt}.${sign(expiresAt)}`;
}

/** @param {string | undefined} token */
export function isSessionValid(token) {
	if (!token) return false;
	const [expiresAt, signature] = token.split('.');
	if (!expiresAt || !signature) return false;
	if (!safeEqual(sign(expiresAt), signature)) return false;
	return Number.isFinite(Number(expiresAt)) && Date.now() < Number(expiresAt);
}
