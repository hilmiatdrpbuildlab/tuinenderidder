<script lang="ts">
	import CircleAlert from '@lucide/svelte/icons/circle-alert';

	/** Radio chips (e.g. garden size). Native radios inside labels; selected styling via :has(:checked). */
	interface Props {
		name: string;
		legend: string;
		options: { value: string; label: string }[];
		value?: string | null;
		error?: string | string[] | null;
		required?: boolean;
	}

	let { name, legend, options, value = null, error, required = false }: Props = $props();
	const uid = $props.id();
	const message = $derived(Array.isArray(error) ? error[0] : error);
</script>

<fieldset class="chips" aria-describedby={message ? `${uid}-error` : undefined}>
	<legend>{legend}{#if required}<span class="req" aria-hidden="true">*</span>{/if}</legend>
	{#if message}
		<p class="error" id="{uid}-error">
			<CircleAlert size={16} strokeWidth={2} aria-hidden="true" />
			<span>{message}</span>
		</p>
	{/if}
	<div class="list">
		{#each options as opt (opt.value)}
			<label class="chip" data-invalid={message ? true : undefined}>
				<input
					class="visually-hidden"
					type="radio"
					{name}
					value={opt.value}
					checked={value === opt.value}
					{required}
				/>
				<span>{opt.label}</span>
			</label>
		{/each}
	</div>
</fieldset>

<style>
	.chips {
		border: 0;
		padding: 0;
		margin: 0;
		min-width: 0;
	}
	legend {
		padding: 0;
		margin-bottom: var(--space-3);
		font-size: var(--text-h4);
		font-weight: 600;
		color: var(--color-heading);
	}
	.req {
		color: var(--color-error);
		margin-left: 2px;
	}
	.error {
		display: flex;
		gap: 6px;
		align-items: flex-start;
		margin-bottom: var(--space-3);
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--color-error);
	}
	.list {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}
	.chip {
		position: relative;
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		padding: 0 var(--space-5);
		border: 1.5px solid var(--color-border-strong);
		border-radius: var(--radius-pill);
		background: var(--color-surface);
		font-weight: 600;
		font-size: var(--text-sm);
		color: var(--color-text);
		cursor: pointer;
		font-variant-numeric: tabular-nums;
		transition:
			background-color var(--dur-fast) var(--ease-out),
			border-color var(--dur-fast) var(--ease-out);
	}
	.chip:hover {
		border-color: var(--color-primary);
	}
	.chip:has(input:checked) {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: var(--color-on-primary);
	}
	.chip:has(input:focus-visible) {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}
	.chip[data-invalid] {
		border-color: var(--color-error);
	}
</style>
