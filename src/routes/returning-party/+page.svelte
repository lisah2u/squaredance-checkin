<script>
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import VisitFields from '$lib/components/VisitFields.svelte';

	let { data } = $props();

	/** @type {'search' | 'confirm' | 'success'} */
	let step = $state('search');
	let query = $state('');
	/** @type {import('$lib/server/airtable.js').PublicParty[]} */
	let results = $state([]);
	let searching = $state(false);
	/** @type {import('$lib/server/airtable.js').PublicParty | null} */
	let selectedParty = $state(null);
	let visitAdults = $state(0);
	let visitChildren = $state(0);
	let visitNotes = $state('');
	/** @type {string[]} */
	let visitAttending = $state([]);
	let submitting = $state(false);
	let errorMessage = $state('');
	let successName = $state('');
	let visitUpdated = $state(false);

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

	/** @param {import('$lib/server/airtable.js').PublicParty} party */
	function selectParty(party) {
		selectedParty = party;
		visitAdults = party.adultsCount;
		visitChildren = party.childrenCount;
		visitNotes = '';
		visitAttending = [];
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

<h1 class="text-xl font-semibold">Returning Party</h1>

{#if !data.checkInOpen}
	<div class="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
		<p class="font-medium">Check-in isn't open right now</p>
		<p class="mt-1 text-sm text-slate-600">Please see staff at the door.</p>
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
			No matches. First time here? Head to <a href={resolve('/new-party')} class="underline">New Party</a> instead.
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
					visitUpdated = Boolean(data?.updated);
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
		<VisitFields
			bind:adults={visitAdults}
			bind:children={visitChildren}
			bind:notes={visitNotes}
			bind:attending={visitAttending}
		/>

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
		<p class="text-lg font-medium">{visitUpdated ? "Visit updated!" : 'Check-in complete!'}</p>
		<p class="mt-1 text-sm text-slate-600">
			{successName}
			{visitUpdated ? 'was already checked in today — updated with today\'s latest details.' : 'is recorded for today.'}
		</p>
		<button
			type="button"
			onclick={checkInAnother}
			class="mt-4 rounded-md bg-slate-900 px-4 py-2 text-white"
		>
			Check in another party
		</button>
	</div>
	<div class="mt-4 text-center">
		<a href={resolve('/')} class="text-sm text-slate-500 hover:underline">&larr; Back to start</a>
	</div>
{/if}
