<script>
	import { enhance } from '$app/forms';
	import VisitFields from '$lib/components/VisitFields.svelte';

	let step = $state('details'); // 'details' | 'adults' | 'visit' | 'success'
	let stepError = $state('');
	let submitting = $state(false);
	let submitError = $state('');
	let successName = $state('');

	let leadAdultName = $state('');
	let adultsCount = $state(1);
	let childrenCount = $state(0);
	let city = $state('');
	let stateAbbr = $state('');
	let primaryEmail = $state('');
	let additionalEmails = $state('');
	let howDidYouHear = $state('');
	let disability = $state(false);
	let armedServices = $state(false);
	let veteran = $state(false);

	let additionalAdults = $state([
		{ name: '', email: '' },
		{ name: '', email: '' },
		{ name: '', email: '' }
	]);

	let visitAdults = $state(1);
	let visitChildren = $state(0);
	let visitNotes = $state('');

	const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

	function goToAdults() {
		stepError = '';
		if (!leadAdultName.trim()) {
			stepError = 'Please enter the lead adult name.';
			return;
		}
		if (!city.trim() || !stateAbbr.trim()) {
			stepError = 'Please enter city and state.';
			return;
		}
		if (!Number.isFinite(adultsCount) || adultsCount < 1) {
			stepError = 'At least one adult is required.';
			return;
		}
		if (!Number.isFinite(childrenCount) || childrenCount < 0) {
			stepError = 'Children count must be zero or more.';
			return;
		}
		if (!primaryEmail.trim() || !EMAIL_PATTERN.test(primaryEmail.trim())) {
			stepError = 'Please enter a valid email address.';
			return;
		}
		step = 'adults';
	}

	function goToVisit() {
		stepError = '';
		visitAdults = adultsCount;
		visitChildren = childrenCount;
		step = 'visit';
	}

	/** @param {'details' | 'adults'} target */
	function backTo(target) {
		stepError = '';
		step = target;
	}
</script>

<h1 class="text-xl font-semibold">Welcome!</h1>
<p class="mt-2 text-sm text-slate-500">Tell us a bit about your party.</p>

{#if step !== 'success'}
	<form
		method="POST"
		action="?/submit"
		class="mt-4"
		use:enhance={({ formData }) => {
			submitting = true;
			submitError = '';
			formData.set('leadAdultName', leadAdultName);
			formData.set('adultsCount', String(adultsCount));
			formData.set('childrenCount', String(childrenCount));
			formData.set('city', city);
			formData.set('state', stateAbbr);
			formData.set('primaryEmail', primaryEmail);
			formData.set('additionalEmails', additionalEmails);
			formData.set('howDidYouHear', howDidYouHear);
			if (disability) formData.set('disability', 'on');
			if (armedServices) formData.set('armedServices', 'on');
			if (veteran) formData.set('veteran', 'on');
			additionalAdults.forEach((a, i) => {
				formData.set(`adult${i + 1}Name`, a.name);
				formData.set(`adult${i + 1}Email`, a.email);
			});
			formData.set('adultsThisVisit', String(visitAdults));
			formData.set('childrenThisVisit', String(visitChildren));
			formData.set('notes', visitNotes);

			return async ({ result }) => {
				submitting = false;
				if (result.type === 'success') {
					const data = /** @type {any} */ (result.data);
					successName = data?.leadAdultName ?? leadAdultName;
					step = 'success';
				} else if (result.type === 'failure') {
					const data = /** @type {any} */ (result.data);
					submitError = data?.error ?? 'Something went wrong.';
				}
			};
		}}
	>
		{#if step === 'details'}
			<div class="space-y-4">
				<label class="block">
					<span class="text-sm font-medium text-slate-700">Your name</span>
					<input
						type="text"
						bind:value={leadAdultName}
						required
						class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
					/>
				</label>

				<div class="grid grid-cols-2 gap-4">
					<label class="block">
						<span class="text-sm font-medium text-slate-700">Adults in party</span>
						<input
							type="number"
							min="1"
							bind:value={adultsCount}
							class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
						/>
					</label>
					<label class="block">
						<span class="text-sm font-medium text-slate-700">Children in party</span>
						<input
							type="number"
							min="0"
							bind:value={childrenCount}
							class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
						/>
					</label>
				</div>

				<div class="grid grid-cols-2 gap-4">
					<label class="block">
						<span class="text-sm font-medium text-slate-700">City</span>
						<input
							type="text"
							bind:value={city}
							class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
						/>
					</label>
					<label class="block">
						<span class="text-sm font-medium text-slate-700">State</span>
						<input
							type="text"
							maxlength="2"
							bind:value={stateAbbr}
							placeholder="WV"
							class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 uppercase"
						/>
					</label>
				</div>

				<label class="block">
					<span class="text-sm font-medium text-slate-700">Email</span>
					<input
						type="email"
						bind:value={primaryEmail}
						required
						class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
					/>
					<span class="mt-1 block text-xs text-slate-500">
						We'll add you to our mailing list so you hear about future dances. We never share your email with anyone else.
					</span>
				</label>

				<label class="block">
					<span class="text-sm font-medium text-slate-700">How did you hear about us? (optional)</span>
					<input
						type="text"
						bind:value={howDidYouHear}
						class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
					/>
				</label>

				<div class="space-y-2">
					<label class="flex items-center gap-2 text-sm text-slate-700">
						<input type="checkbox" bind:checked={disability} />
						Disability in party
					</label>
					<label class="flex items-center gap-2 text-sm text-slate-700">
						<input type="checkbox" bind:checked={armedServices} />
						Armed services / reserves / national guard in party
					</label>
					<label class="flex items-center gap-2 text-sm text-slate-700">
						<input type="checkbox" bind:checked={veteran} />
						Veteran in party
					</label>
				</div>

				{#if stepError}
					<p class="text-sm text-red-600">{stepError}</p>
				{/if}

				<button
					type="button"
					onclick={goToAdults}
					class="w-full rounded-md bg-slate-900 px-4 py-2 text-white"
				>
					Next
				</button>
			</div>
		{:else if step === 'adults'}
			<div class="space-y-4">
				<p class="text-sm text-slate-500">Add up to 3 more adults in your party (optional).</p>

				{#each additionalAdults as adult, i (i)}
					{#if i === 0 || additionalAdults[i - 1].name.trim()}
						<div class="grid grid-cols-2 gap-4">
							<label class="block">
								<span class="text-sm font-medium text-slate-700">Adult {i + 2} name</span>
								<input
									type="text"
									bind:value={adult.name}
									class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
								/>
							</label>
							<label class="block">
								<span class="text-sm font-medium text-slate-700">Adult {i + 2} email</span>
								<input
									type="email"
									bind:value={adult.email}
									class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
								/>
							</label>
						</div>
					{/if}
				{/each}

				<div class="flex gap-3">
					<button
						type="button"
						onclick={() => backTo('details')}
						class="flex-1 rounded-md border border-slate-300 px-4 py-2"
					>
						Back
					</button>
					<button
						type="button"
						onclick={goToVisit}
						class="flex-1 rounded-md bg-slate-900 px-4 py-2 text-white"
					>
						Next
					</button>
				</div>
			</div>
		{:else if step === 'visit'}
			<div class="space-y-4">
				<div class="rounded-lg border border-slate-200 p-4 text-sm text-slate-600">
					<p class="font-medium text-slate-900">{leadAdultName}</p>
					<p>{[city, stateAbbr].filter(Boolean).join(', ')}</p>
					{#if primaryEmail}<p>{primaryEmail}</p>{/if}
				</div>

				<VisitFields bind:adults={visitAdults} bind:children={visitChildren} bind:notes={visitNotes} />

				{#if submitError}
					<p class="text-sm text-red-600">{submitError}</p>
				{/if}

				<div class="flex gap-3">
					<button
						type="button"
						onclick={() => backTo('adults')}
						class="flex-1 rounded-md border border-slate-300 px-4 py-2"
					>
						Back
					</button>
					<button
						type="submit"
						disabled={submitting}
						class="flex-1 rounded-md bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
					>
						{submitting ? 'Submitting…' : 'Submit'}
					</button>
				</div>
			</div>
		{/if}
	</form>
{:else}
	<div class="mt-6 rounded-lg border border-green-200 bg-green-50 p-6 text-center">
		<p class="text-lg font-medium">Party created & checked in!</p>
		<p class="mt-1 text-sm text-slate-600">Welcome, {successName}. Enjoy the dance!</p>
	</div>
{/if}
