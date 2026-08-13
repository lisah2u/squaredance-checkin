// Shared between client (VisitFields checkboxes) and server (schema.js,
// validation) — must not live under $lib/server since Svelte components
// can't import server-only modules.
export const ATTENDING_OPTIONS = {
	workshop: 'Workshop',
	familyDance: 'Family Dance',
	squareDance: 'Square Dance'
};
