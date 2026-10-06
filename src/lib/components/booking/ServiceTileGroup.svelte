<script lang="ts" module>
	import type { Component } from 'svelte';

	export type TileOption = {
		value: string;
		title: string;
		description?: string;
		meta?: string;
		icon?: string;
		iconComponent?: Component<{ size?: number; strokeWidth?: number }>;
		disabled?: boolean;
	};
</script>

<script lang="ts">
	import CircleAlert from '@lucide/svelte/icons/circle-alert';
	import ServiceTile from './ServiceTile.svelte';

	/**
	 * Group of <ServiceTile>s: mode="single" → radio group, mode="multi" → checkboxes.
	 * Error text is linked to every input via aria-describedby.
	 */
	interface Props {
		mode: 'single' | 'multi';
		name: string;
		legend: string;
		options: TileOption[];
		/** selected value(s) */
		value?: string[];
		helper?: string;
		error?: string | string[] | null;
		columns?: 1 | 2 | 3;
		onchange?: (value: string[]) => void;
	}

	let { mode, name, legend, options, value = [], helper, error, columns = 2, onchange }: Props = $props();

	const uid = $props.id();
	const message = $derived(Array.isArray(error) ? error[0] : error);
	const describedby = $derived(message ? `${uid}-error` : helper ? `${uid}-helper` : undefined);

	// Local selection so the summary can follow along; initialised from (and reset by) `value`.
	let selected = $derived([...value]);

	function toggle(v: string, checked: boolean) {
		if (mode === 'single') selected = checked ? [v] : selected;
		else selected = checked ? [...new Set([...selected, v])] : selected.filter((x) => x !== v);
		onchange?.(selected);
	}
</script>

<fieldset class="group" aria-describedby={describedby}>
	<legend>{legend}</legend>
	{#if helper && !message}<p class="helper" id="{uid}-helper">{helper}</p>{/if}
	{#if message}
		<p class="error" id="{uid}-error">
			<CircleAlert size={16} strokeWidth={2} aria-hidden="true" />
			<span>{message}</span>
		</p>
	{/if}
	<div class="grid" data-columns={columns}>
		{#each options as opt (opt.value)}
			<ServiceTile
				type={mode === 'single' ? 'radio' : 'checkbox'}
				{name}
				value={opt.value}
				title={opt.title}
				description={opt.description}
				meta={opt.meta}
				icon={opt.icon}
				iconComponent={opt.iconComponent}
				disabled={opt.disabled}
				stacked={columns === 3}
				checked={selected.includes(opt.value)}
				invalid={!!message}
				describedby={message ? `${uid}-error` : undefined}
				onchange={(c) => toggle(opt.value, c)}
			/>
		{/each}
	</div>
</fieldset>

<style>
	.group {
		border: 0;
		padding: 0;
		margin: 0;
		min-width: 0;
	}
	legend {
		padding: 0;
		margin-bottom: var(--space-2);
		font-family: var(--font-body);
		font-size: var(--text-h4);
		font-weight: 600;
		color: var(--color-heading);
	}
	.helper {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
		margin-bottom: var(--space-3);
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
	.error :global(svg) {
		flex-shrink: 0;
		margin-top: 2px;
	}
	.grid {
		display: grid;
		gap: var(--space-3);
		grid-template-columns: minmax(0, 1fr);
	}
	@media (min-width: 640px) {
		.grid[data-columns='2'],
		.grid[data-columns='3'] {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}
	@media (min-width: 1024px) {
		.grid[data-columns='3'] {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}
</style>
