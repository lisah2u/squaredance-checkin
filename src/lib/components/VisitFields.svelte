<script>
	let { adults = $bindable(0), children = $bindable(0), notes = $bindable('') } = $props();
</script>

<div class="space-y-4">
	<div class="grid grid-cols-2 gap-4">
		<label class="block">
			<span class="text-sm font-medium text-slate-700">Adults today</span>
			<input
				type="number"
				name="adultsThisVisit"
				min="0"
				required
				bind:value={adults}
				class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
			/>
		</label>
		<label class="block">
			<span class="text-sm font-medium text-slate-700">Children today</span>
			<input
				type="number"
				name="childrenThisVisit"
				min="0"
				required
				bind:value={children}
				class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
			/>
		</label>
	</div>
	<label class="block">
		<span class="text-sm font-medium text-slate-700">Notes (optional)</span>
		<textarea
			name="notes"
			bind:value={notes}
			rows="2"
			class="mt-1 w-full rounded-md border border-slate-300 px-3 py-2"
		></textarea>
	</label>
</div>
