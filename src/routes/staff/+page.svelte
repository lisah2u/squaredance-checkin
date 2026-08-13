<script>
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';

	let { data, form } = $props();

	let eventTitle = $state('');
	let submitting = $state(false);

	const createdEventName = $derived(form?.eventName ?? data.existingEvent?.eventName ?? '');
	const eventIsOpen = $derived(Boolean(form?.created || data.existingEvent));
</script>

<div class="flex items-center justify-between">
	<h1 class="text-xl font-semibold">Staff</h1>
	<form method="POST" action="/logout">
		<button type="submit" class="text-sm text-slate-500 hover:underline">Log out</button>
	</form>
</div>

{#if eventIsOpen}
	<div class="mt-6 rounded-lg border border-green-200 bg-green-50 p-6 text-center">
		<p class="font-medium">Today's event is open</p>
		<p class="mt-1 text-sm text-slate-600">"{createdEventName}" — visitors can now check in at the door.</p>
	</div>
	<div class="mt-4 text-center">
		<a href={resolve('/')} class="text-sm text-slate-500 hover:underline">&larr; Back to start</a>
	</div>
{:else}
	<p class="mt-2 text-sm text-slate-500">Create today's event to open check-in for visitors.</p>

	<form
		method="POST"
		action="?/createEvent"
		class="mt-4 space-y-4"
		use:enhance={() => {
			submitting = true;
			return async ({ update }) => {
				submitting = false;
				await update();
			};
		}}
	>
		<label class="block">
			<span class="text-sm font-medium text-slate-700">Event title</span>
			<input
				type="text"
				name="eventTitle"
				bind:value={eventTitle}
				placeholder="Square Dance - DD Month Year"
				required
				class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
			/>
		</label>

		{#if form?.error}
			<p class="text-sm text-red-600">{form.error}</p>
		{/if}

		<button
			type="submit"
			disabled={submitting}
			class="w-full rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
		>
			{submitting ? 'Creating…' : 'Create event'}
		</button>
	</form>
{/if}
