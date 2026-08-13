<script>
	import { resolve } from '$app/paths';
</script>

<h1 class="text-2xl font-semibold">CMDF Square Dance Check-In</h1>

<div class="mt-6 flex flex-col gap-4 sm:flex-row">
	<a
		href={resolve('/new-party')}
		class="flex-1 rounded-lg border border-slate-300 p-6 text-center hover:border-slate-400"
	>
		<span class="block text-lg font-medium">New Party</span>
		<span class="block text-sm text-slate-500">First time here? Enter your info</span>
	</a>

	<a
		href={resolve('/returning-party')}
		class="flex-1 rounded-lg border border-slate-300 p-6 text-center hover:border-slate-400"
	>
		<span class="block text-lg font-medium">Returning Party</span>
		<span class="block text-sm text-slate-500">Look up your party and record today's visit</span>
	</a>
</div>

<a
	href={resolve('/staff')}
	class="mt-4 flex items-center justify-center gap-2 rounded-lg border border-slate-200 p-4 text-center text-sm text-slate-500 hover:border-slate-300 hover:text-slate-700"
>
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 20 20"
		fill="currentColor"
		class="h-4 w-4 shrink-0"
		aria-hidden="true"
	>
		<path
			fill-rule="evenodd"
			d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z"
			clip-rule="evenodd"
		/>
	</svg>
	<span>Staff — create an event</span>
</a>
