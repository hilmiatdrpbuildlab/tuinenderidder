<script lang="ts">
	import type { Snippet } from 'svelte';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';

	/** Dashboard KPI tile: label, big number, optional hint, whole card links to the filtered list. */
	interface Props {
		label: string;
		value: number | string;
		hint?: string;
		href?: string;
		icon?: Snippet;
		tone?: 'forest' | 'info' | 'warning' | 'success' | 'bark';
	}

	let { label, value, hint, href, icon, tone = 'forest' }: Props = $props();
</script>

<svelte:element this={href ? 'a' : 'div'} {href} class="kpi" data-tone={tone}>
	<div class="top">
		<span class="label">{label}</span>
		{#if icon}<span class="icon" aria-hidden="true">{@render icon()}</span>{/if}
	</div>
	<span class="value">{value}</span>
	<span class="foot">
		{#if hint}<span class="hint">{hint}</span>{/if}
		{#if href}<span class="more">Bekijken <ArrowRight size={14} aria-hidden="true" /></span>{/if}
	</span>
</svelte:element>

<style>
	.kpi {
		--accent: var(--color-primary);
		--accent-bg: var(--color-primary-subtle);
		display: grid;
		gap: var(--space-2);
		padding: var(--space-4) var(--space-5);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-1);
		color: var(--color-text);
		text-decoration: none;
		transition:
			box-shadow var(--dur-fast) var(--ease-out),
			border-color var(--dur-fast) var(--ease-out);
	}
	a.kpi:hover {
		box-shadow: var(--shadow-2);
		border-color: var(--color-border-strong);
	}
	.kpi[data-tone='info'] {
		--accent: var(--color-info);
		--accent-bg: var(--color-info-subtle);
	}
	.kpi[data-tone='warning'] {
		--accent: var(--color-warning);
		--accent-bg: var(--color-warning-subtle);
	}
	.kpi[data-tone='success'] {
		--accent: var(--color-success);
		--accent-bg: var(--color-success-subtle);
	}
	.kpi[data-tone='bark'] {
		--accent: var(--color-secondary);
		--accent-bg: var(--color-secondary-subtle);
	}
	.top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
	}
	.label {
		font-weight: 600;
		color: var(--color-text-muted);
	}
	.icon {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border-radius: 10px;
		background: var(--accent-bg);
		color: var(--accent);
	}
	.value {
		font-family: var(--font-display);
		font-size: 2.5rem;
		font-weight: 700;
		line-height: 1;
		color: var(--color-heading);
		font-variant-numeric: tabular-nums;
	}
	.foot {
		display: flex;
		justify-content: space-between;
		gap: var(--space-2);
		font-size: var(--text-xs);
		color: var(--color-text-muted);
	}
	.more {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		color: var(--color-link);
		font-weight: 600;
	}
</style>
