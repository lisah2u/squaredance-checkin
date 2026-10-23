<script>
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';

	let { data, form } = $props();

	const MONTHS = [
		'January', 'February', 'March', 'April', 'May', 'June',
		'July', 'August', 'September', 'October', 'November', 'December'
	];

	/** "2026-11-14" → "14 November 2026" — split by hand, not via Date, so the
	 * browser's time zone can't shift the day. @param {string} isoDate */
	function longDate(isoDate) {
		const [y, m, d] = isoDate.split('-').map(Number);
		return y && m && d ? `${d} ${MONTHS[m - 1]} ${y}` : isoDate;
	}

	/** @param {string} isoDate */
	function suggestedTitle(isoDate) {
		return isoDate ? `Square Dance - ${longDate(isoDate)}` : '';
	}

	// svelte-ignore state_referenced_locally — data.today only seeds the form.
	const initialDate = data.today;
	let eventDate = $state(initialDate);
	let eventTitle = $state(suggestedTitle(initialDate));
	// Once staff type their own title, stop overwriting it when the date changes.
	let titleEdited = $state(false);
	let submitting = $state(false);

	function onDateChange() {
		if (!titleEdited) eventTitle = suggestedTitle(eventDate);
	}
</script>

<div class="flex items-center justify-between">
	<h1 class="text-xl font-semibold">Staff</h1>
	<form method="POST" action="/logout">
		<button type="submit" class="text-sm text-slate-500 hover:underline">Log out</button>
	</form>
</div>

{#if data.existingEvent}
	<div class="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-center">
		<p class="font-medium">Check-in is open today</p>
		<p class="mt-1 text-sm text-slate-600">"{data.existingEvent.eventName}" — visitors can check in at the door.</p>
	</div>
{:else}
	<div class="mt-6 rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
		<p class="font-medium">No dance today</p>
		<p class="mt-1 text-sm text-slate-600">Check-in is closed. Schedule today below to open it now.</p>
	</div>
{/if}

<h2 class="mt-8 font-semibold">Schedule a dance</h2>
<p class="mt-1 text-sm text-slate-500">
	Check-in opens by itself on the dance's date and closes at midnight — no one needs to log in that night.
</p>

<form
	method="POST"
	action="?/createEvent"
	class="mt-4 space-y-4"
	use:enhance={() => {
		submitting = true;
		return async ({ update }) => {
			submitting = false;
			// reset: false keeps the inputs; the upcoming list reloads either way.
			await update({ reset: false });
		};
	}}
>
	<label class="block">
		<span class="text-sm font-medium text-slate-700">Date</span>
		<input
			type="date"
			name="eventDate"
			bind:value={eventDate}
			onchange={onDateChange}
			min={data.today}
			required
			class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
		/>
	</label>
	<label class="block">
		<span class="text-sm font-medium text-slate-700">Event title</span>
		<input
			type="text"
			name="eventTitle"
			bind:value={eventTitle}
			oninput={() => (titleEdited = true)}
			placeholder="Square Dance - DD Month Year"
			required
			class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
		/>
	</label>

	{#if form?.error}
		<p class="text-sm text-red-600">{form.error}</p>
	{:else if form?.scheduled}
		<p class="text-sm {form.created ? 'text-green-700' : 'text-amber-700'}">
			{form.created
				? `Scheduled "${form.eventName}" for ${longDate(form.eventDate)}.`
				: `${longDate(form.eventDate)} was already scheduled as "${form.eventName}" — nothing changed.`}
		</p>
	{/if}

	<button
		type="submit"
		disabled={submitting}
		class="w-full rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
	>
		{submitting ? 'Scheduling…' : 'Schedule dance'}
	</button>
</form>

<h2 class="mt-8 font-semibold">Upcoming dances</h2>
{#if data.upcoming.length}
	<ul class="mt-2 divide-y divide-slate-200 rounded-lg border border-slate-200">
		{#each data.upcoming as event (event.id)}
			<li class="flex justify-between gap-4 px-4 py-2 text-sm">
				<span>{event.eventName}</span>
				<span class="shrink-0 text-slate-500">{event.eventDate === data.today ? 'Today' : longDate(event.eventDate)}</span>
			</li>
		{/each}
	</ul>
	<p class="mt-2 text-xs text-slate-400">Scheduled the wrong date? Delete that row in Airtable → Events.</p>
{:else}
	<p class="mt-2 text-sm text-slate-500">None scheduled yet.</p>
{/if}

<div class="mt-8 text-center">
	<a href={resolve('/')} class="text-sm text-slate-500 hover:underline">&larr; Back to start</a>
</div>
