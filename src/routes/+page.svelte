<script>
	import { resolve } from '$app/paths';
</script>

<h1 class="text-2xl font-semibold">CMDF Square Dance Check-In</h1>

<div class="mt-6 flex flex-col gap-4 sm:flex-row">
	<a
		href={resolve('/volunteer')}
		class="flex-1 rounded-lg border border-slate-300 p-6 text-center hover:border-slate-400"
	>
		<span class="block text-lg font-medium">Volunteer</span>
		<span class="block text-sm text-slate-500">Look up a returning party and record their visit</span>
	</a>

	<a
		href={resolve('/new-party')}
		class="flex-1 rounded-lg border border-slate-300 p-6 text-center hover:border-slate-400"
	>
		<span class="block text-lg font-medium">New Party</span>
		<span class="block text-sm text-slate-500">First time here? Enter your info</span>
	</a>
</div>
