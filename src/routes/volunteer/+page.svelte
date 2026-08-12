<script>
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import VisitFields from '$lib/components/VisitFields.svelte';

	let { data } = $props();

	/** @type {'search' | 'confirm' | 'success'} */
	let step = $state('search');
	let query = $state('');
	/** @type {import('$lib/server/airtable.js').Party[]} */
	let results = $state([]);
	let searching = $state(false);
	/** @type {import('$lib/server/airtable.js').Party | null} */
	let selectedParty = $state(null);
	let visitAdults = $state(0);
	let visitChildren = $state(0);
	let visitNotes = $state('');
	let submitting = $state(false);
	let errorMessage = $state('');
	let successName = $state('');
	let opening = $state(false);

	/** @type {ReturnType<typeof setTimeout> | undefined} */
	let debounceTimer;

	function onQueryInput() {
		clearTimeout(debounceTimer);
		errorMessage = '';
		if (query.trim().length < 2) {
			results = [];
			return;
		}
		debounceTimer = setTimeout(async () => {
			searching = true;
			try {
				const res = await fetch(`/api/parties/search?q=${encodeURIComponent(query)}`);
				const data = await res.json();
				results = data.results ?? [];
			} finally {
				searching = false;
			}
		}, 300);
	}

	/** @param {import('$lib/server/airtable.js').Party} party */
	function selectParty(party) {
		selectedParty = party;
		visitAdults = party.adultsCount;
		visitChildren = party.childrenCount;
		visitNotes = '';
		step = 'confirm';
	}

	function backToSearch() {
		step = 'search';
		selectedParty = null;
		errorMessage = '';
	}

	function checkInAnother() {
		step = 'search';
		query = '';
		results = [];
		selectedParty = null;
		successName = '';
		errorMessage = '';
	}
</script>

<div class="flex items-center justify-between">
	<h1 class="text-xl font-semibold">Volunteer Check-In</h1>
	<form method="POST" action="/logout">
		<button type="submit" class="text-sm text-slate-500 hover:underline">Log out</button>
	</form>
</div>

{#if !data.checkInOpen}
	<div class="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
		<p class="font-medium">Check-in is locked</p>
		<p class="mt-1 text-sm text-slate-600">No dance is scheduled for today yet.</p>
		<form
			method="POST"
			action="?/openToday"
			class="mt-4"
			use:enhance={() => {
				opening = true;
				return async ({ update }) => {
					opening = false;
					await update();
				};
			}}
		>
			<button
				type="submit"
				disabled={opening}
				class="rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
			>
				{opening ? 'Opening…' : "Open check-in for today's dance"}
			</button>
		</form>
	</div>
{:else if step === 'search'}
	<p class="mt-2 text-sm text-slate-500">Search by name, city, or email.</p>

	<input
		type="text"
		bind:value={query}
		oninput={onQueryInput}
		placeholder="e.g. Smith or Charleston"
		class="mt-4 w-full rounded-md border border-slate-300 px-3 py-2"
	/>

	{#if searching}
		<p class="mt-3 text-sm text-slate-400">Searching…</p>
	{:else if query.trim().length >= 2 && results.length === 0}
		<p class="mt-3 text-sm text-slate-500">
			No matches. Send them to <a href={resolve('/new-party')} class="underline">/new-party</a> instead.
		</p>
	{/if}

	<ul class="mt-3 divide-y divide-slate-200">
		{#each results as party (party.id)}
			<li>
				<button
					type="button"
					onclick={() => selectParty(party)}
					class="w-full py-3 text-left hover:bg-slate-50"
				>
					<span class="block font-medium">{party.leadAdultName}</span>
					<span class="block text-sm text-slate-500">
						{[party.additionalAdultNames, party.city, party.state].filter(Boolean).join(' — ')}
					</span>
				</button>
			</li>
		{/each}
	</ul>
{:else if step === 'confirm' && selectedParty}
	<button type="button" onclick={backToSearch} class="mt-4 text-sm text-slate-500 hover:underline"
		>&larr; Back to search</button
	>

	<div class="mt-3 rounded-lg border border-slate-200 p-4">
		<p class="font-medium">{selectedParty.leadAdultName}</p>
		{#if selectedParty.additionalAdultNames}
			<p class="text-sm text-slate-600">Also: {selectedParty.additionalAdultNames}</p>
		{/if}
		<p class="text-sm text-slate-600">{[selectedParty.city, selectedParty.state].filter(Boolean).join(', ')}</p>
		{#if selectedParty.primaryEmail}
			<p class="text-sm text-slate-600">{selectedParty.primaryEmail}</p>
		{/if}
		<p class="mt-1 text-sm text-slate-400">Visited {selectedParty.totalVisits} time{selectedParty.totalVisits === 1 ? '' : 's'} before</p>
	</div>

	<form
		method="POST"
		action="?/checkIn"
		class="mt-4 space-y-4"
		use:enhance={() => {
			submitting = true;
			errorMessage = '';
			return async ({ result, update }) => {
				submitting = false;
				if (result.type === 'success') {
					const data = /** @type {any} */ (result.data);
					successName = data?.leadAdultName ?? selectedParty?.leadAdultName ?? '';
					step = 'success';
				} else if (result.type === 'failure') {
					const data = /** @type {any} */ (result.data);
					errorMessage = data?.error ?? 'Something went wrong.';
				} else {
					await update();
				}
			};
		}}
	>
		<input type="hidden" name="partyId" value={selectedParty.id} />
		<VisitFields bind:adults={visitAdults} bind:children={visitChildren} bind:notes={visitNotes} />

		{#if errorMessage}
			<p class="text-sm text-red-600">{errorMessage}</p>
		{/if}

		<button
			type="submit"
			disabled={submitting}
			class="w-full rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
		>
			{submitting ? 'Recording…' : 'Record visit'}
		</button>
	</form>
{:else if step === 'success'}
	<div class="mt-6 rounded-lg border border-green-200 bg-green-50 p-6 text-center">
		<p class="text-lg font-medium">Check-in complete!</p>
		<p class="mt-1 text-sm text-slate-600">{successName} is recorded for today.</p>
		<button
			type="button"
			onclick={checkInAnother}
			class="mt-4 rounded-md bg-slate-900 px-4 py-2 text-white"
		>
			Check in another party
		</button>
	</div>
{/if}
