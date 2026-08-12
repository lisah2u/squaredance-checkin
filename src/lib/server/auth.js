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

// In-memory per-IP login throttle. Deliberately simple: it slows down a
// single attacker hammering one warm serverless instance, but resets on
// cold start and isn't shared across instances — it's a speed bump for a
// shared password, not a substitute for the password being long and random.
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 5;

/** @type {Map<string, { count: number, windowStart: number }>} */
const loginAttempts = new Map();

/** @param {string} ip */
export function isLoginRateLimited(ip) {
	const entry = loginAttempts.get(ip);
	if (!entry) return false;
	if (Date.now() - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
		loginAttempts.delete(ip);
		return false;
	}
	return entry.count >= RATE_LIMIT_MAX_ATTEMPTS;
}

/** @param {string} ip */
export function recordFailedLogin(ip) {
	const entry = loginAttempts.get(ip);
	if (!entry || Date.now() - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
		loginAttempts.set(ip, { count: 1, windowStart: Date.now() });
		return;
	}
	entry.count += 1;
}

/** @param {string} ip */
export function clearLoginAttempts(ip) {
	loginAttempts.delete(ip);
}
