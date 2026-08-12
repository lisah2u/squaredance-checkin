import { json } from '@sveltejs/kit';
import { searchParties } from '$lib/server/airtable.js';

export async function GET({ url }) {
	const results = await searchParties(url.searchParams.get('q'));
	return json({ results });
}
