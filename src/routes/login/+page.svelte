<script>
	import { enhance } from '$app/forms';

	let { form } = $props();
	let submitting = $state(false);
</script>

<h1 class="text-xl font-semibold">Volunteer Login</h1>

<form
	method="POST"
	class="mt-6 space-y-4"
	use:enhance={() => {
		submitting = true;
		return async ({ update }) => {
			submitting = false;
			await update();
		};
	}}
>
	<label class="block">
		<span class="block text-sm font-medium text-slate-700">Password</span>
		<input
			type="password"
			name="password"
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
		{submitting ? 'Signing in…' : 'Sign in'}
	</button>
</form>
