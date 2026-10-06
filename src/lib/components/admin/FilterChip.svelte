<script lang="ts">
	import type { Snippet } from 'svelte';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import X from '@lucide/svelte/icons/x';

	/**
	 * Toolbar filter chip with a popover. Built on <details>, so it opens without JavaScript; with JS
	 * it closes on outside click / Escape. `value` is the active filter text (chip turns "on").
	 */
	interface Props {
		label: string;
		value?: string | null;
		/** Link that removes this filter */
		clearHref?: string;
		children: Snippet<[{ close: () => void }]>;
		align?: 'start' | 'end';
		icon?: Snippet;
	}

	let { label, value, clearHref, children, align = 'start', icon }: Props = $props();
	let el: HTMLDetailsElement | undefined = $state();

	const close = () => {
		if (el) el.open = false;
	};

	$effect(() => {
		const onDoc = (e: MouseEvent) => {
			if (el?.open && !el.contains(e.target as Node)) el.open = false;
		};
		const onKey = (e: KeyboardEvent) => {
			if (e.key === 'Escape' && el?.open) {
				el.open = false;
				el.querySelector('summary')?.focus();
			}
		};
		document.addEventListener('click', onDoc);
		document.addEventListener('keydown', onKey);
		return () => {
			document.removeEventListener('click', onDoc);
			document.removeEventListener('keydown', onKey);
		};
	});
</script>

<div class="chip-wrap" class:active={!!value}>
	<details bind:this={el} class="chip">
		<summary>
			{#if icon}<span class="ico" aria-hidden="true">{@render icon()}</span>{/if}
			<span class="lbl">{label}</span>{#if value}<span class="sep" aria-hidden="true">:</span>
				<span class="val">{value}</span>{/if}
			<ChevronDown size={14} aria-hidden="true" />
		</summary>
		<div class="pop" data-align={align}>
			{@render children({ close })}
		</div>
	</details>
	{#if value && clearHref}
		<a class="clear" href={clearHref} aria-label="Filter {label} wissen" data-sveltekit-noscroll data-sveltekit-keepfocus><X size={14} /></a>
	{/if}
</div>

<style>
	.chip-wrap {
		position: relative;
		display: inline-flex;
		align-items: center;
		border: 1.5px dashed var(--color-border-strong);
		border-radius: var(--radius-pill);
		background: var(--color-surface);
	}
	.chip-wrap.active {
		border-style: solid;
		border-color: var(--color-primary);
		background: var(--color-primary-subtle);
	}
	summary {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		height: 32px;
		padding: 0 var(--space-3);
		border-radius: var(--radius-pill);
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-text);
		cursor: pointer;
		list-style: none;
		white-space: nowrap;
		user-select: none;
	}
	summary::-webkit-details-marker {
		display: none;
	}
	.ico {
		display: inline-flex;
		color: var(--color-text-muted);
	}
	.active summary {
		padding-right: var(--space-1);
		color: var(--color-primary-hover);
	}
	.lbl {
		color: var(--color-text-muted);
	}
	.active .lbl {
		color: inherit;
		font-weight: 500;
	}
	.val {
		max-width: 18ch;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.clear {
		display: inline-grid;
		place-items: center;
		width: 28px;
		height: 28px;
		margin-right: 2px;
		border-radius: 50%;
		color: var(--color-primary-hover);
	}
	.clear:hover {
		background: var(--color-surface);
	}
	.pop {
		position: absolute;
		top: calc(100% + 6px);
		left: 0;
		z-index: 25;
		min-width: 220px;
		max-height: 60vh;
		overflow-y: auto;
		padding: var(--space-2);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
		box-shadow: var(--shadow-2);
	}
	.pop[data-align='end'] {
		left: auto;
		right: 0;
	}
	/* shared menu styling for children */
	.pop :global(.menu-link) {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-height: 36px;
		padding: 0 var(--space-3);
		border-radius: 8px;
		color: var(--color-text);
		text-decoration: none;
		font-size: var(--text-sm);
	}
	.pop :global(.menu-link:hover) {
		background: var(--color-bg-alt);
	}
	.pop :global(.menu-link[aria-current='true']) {
		background: var(--color-primary-subtle);
		color: var(--color-primary-hover);
		font-weight: 600;
	}
	.pop :global(.menu-check) {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-height: 36px;
		padding: 0 var(--space-3);
		border-radius: 8px;
		cursor: pointer;
		font-size: var(--text-sm);
		white-space: nowrap;
	}
	.pop :global(.menu-check:hover) {
		background: var(--color-bg-alt);
	}
	.pop :global(.menu-check input) {
		width: 16px;
		height: 16px;
		accent-color: var(--color-primary);
	}
	.pop :global(.menu-foot) {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-1) var(--space-1);
		margin-top: var(--space-1);
		border-top: 1px solid var(--color-border);
	}
</style>
