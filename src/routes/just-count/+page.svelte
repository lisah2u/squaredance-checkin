<script>
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import VisitFields from '$lib/components/VisitFields.svelte';

	let { data } = $props();

	let done = $state(false);
	let submitting = $state(false);
	let errorMessage = $state('');

	let visitAdults = $state(1);
	let visitChildren = $state(0);
	let visitNotes = $state('');
	/** @type {string[]} */
	let visitAttending = $state([]);
	let whereFrom = $state('');

	function countAnother() {
		visitAdults = 1;
		visitChildren = 0;
		visitNotes = '';
		visitAttending = [];
		whereFrom = '';
		errorMessage = '';
		done = false;
	}
</script>

<h1 class="text-xl font-semibold">Just Count Us</h1>

{#if !data.checkInOpen}
	<div class="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-6 text-center">
		<p class="font-medium">Check-in isn't open right now</p>
		<p class="mt-1 text-sm text-slate-600">Please see staff at the door.</p>
	</div>
{:else if !done}
	<p class="mt-2 text-sm text-slate-500">
		No name or email needed — we just count who came, so we can keep the dances going.
	</p>

	<form
		method="POST"
		action="?/count"
		class="mt-4 space-y-4"
		use:enhance={() => {
			submitting = true;
			errorMessage = '';
			return async ({ result, update }) => {
				submitting = false;
				if (result.type === 'success') {
					done = true;
				} else if (result.type === 'failure') {
					const data = /** @type {any} */ (result.data);
					errorMessage = data?.error ?? 'Something went wrong.';
				} else {
					await update();
				}
			};
		}}
	>
		<VisitFields
			bind:adults={visitAdults}
			bind:children={visitChildren}
			bind:notes={visitNotes}
			bind:attending={visitAttending}
		/>
		<label class="block">
			<span class="text-sm font-medium text-slate-700">Where are you from? (optional)</span>
			<input
				type="text"
				name="whereFrom"
				bind:value={whereFrom}
				placeholder="Town or ZIP"
				class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
			/>
		</label>

		{#if errorMessage}
			<p class="text-sm text-red-600">{errorMessage}</p>
		{/if}

		<button
			type="submit"
			disabled={submitting}
			class="w-full rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
		>
			{submitting ? 'Recording…' : 'Count us in'}
		</button>
	</form>
{:else}
	<div class="mt-6 rounded-lg border border-green-200 bg-green-50 p-6 text-center">
		<p class="text-lg font-medium">You're counted!</p>
		<p class="mt-1 text-sm text-slate-600">Thanks for coming. Enjoy the dance!</p>
		<button type="button" onclick={countAnother} class="mt-4 rounded-md bg-slate-900 px-4 py-2 text-white">
			Count another party
		</button>
	</div>
	<div class="mt-4 text-center">
		<a href={resolve('/')} class="text-sm text-slate-500 hover:underline">&larr; Back to start</a>
	</div>
{/if}
