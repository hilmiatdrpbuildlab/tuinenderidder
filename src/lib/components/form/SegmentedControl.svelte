<script lang="ts">
	/**
	 * Radio group styled as a segmented control (e.g. Eenmalig / Wekelijks / Maandelijks / Jaarlijks).
	 * Native radios, so it works without JS and with arrow keys.
	 */
	interface Props {
		name: string;
		legend: string;
		options: { value: string; label: string }[];
		value?: string;
		hideLegend?: boolean;
		size?: 'sm' | 'md';
		onchange?: (value: string) => void;
	}

	let { name, legend, options, value = $bindable(''), hideLegend = false, size = 'md', onchange }: Props = $props();
	const uid = $props.id();
</script>

<fieldset class="segmented" data-size={size}>
	<legend class:visually-hidden={hideLegend}>{legend}</legend>
	<div class="track">
		{#each options as opt (opt.value)}
			<label class:selected={value === opt.value}>
				<input
					type="radio"
					{name}
					value={opt.value}
					id="{name}-{opt.value}-{uid}"
					bind:group={value}
					onchange={() => onchange?.(opt.value)}
				/>
				<span>{opt.label}</span>
			</label>
		{/each}
	</div>
</fieldset>

<style>
	.segmented {
		border: 0;
		padding: 0;
		min-width: 0;
	}
	legend {
		font-size: var(--text-sm);
		font-weight: 600;
		margin-bottom: 6px;
		padding: 0;
	}
	.track {
		display: flex;
		flex-wrap: wrap;
		gap: 4px;
		padding: 4px;
		border-radius: var(--radius-md);
		background: var(--color-surface-sunken);
	}
	label {
		position: relative;
		flex: 1 1 auto;
		display: flex;
		align-items: center;
		justify-content: center;
		min-height: calc(var(--control-h) - 8px);
		padding: 0 var(--space-4);
		border-radius: 9px;
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-text-muted);
		cursor: pointer;
		transition:
			background-color var(--dur-fast) var(--ease-out),
			color var(--dur-fast) var(--ease-out);
	}
	[data-size='sm'] label {
		min-height: 28px;
		padding: 0 var(--space-3);
	}
	label:hover {
		color: var(--color-text);
	}
	label.selected {
		background: var(--color-surface);
		color: var(--color-primary-hover);
		box-shadow: var(--shadow-1);
	}
	input {
		position: absolute;
		opacity: 0;
		inset: 0;
		margin: 0;
		cursor: pointer;
	}
	label:has(input:focus-visible) {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}
</style>
