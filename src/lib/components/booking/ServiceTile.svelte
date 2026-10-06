<script lang="ts">
	import type { Component } from 'svelte';
	import Check from '@lucide/svelte/icons/check';
	import Icon from '$lib/components/ui/Icon.svelte';

	/**
	 * Large selectable tile (design §4.2): a native radio/checkbox, visually hidden inside the
	 * <label>, so keyboard + screen readers work without JS. Selected styling uses :has(:checked).
	 */
	interface Props {
		type: 'radio' | 'checkbox';
		name: string;
		value: string;
		title: string;
		description?: string;
		meta?: string;
		/** name for <Icon> */
		icon?: string;
		/** or a component (e.g. a Lucide icon) */
		iconComponent?: Component<{ size?: number; strokeWidth?: number }>;
		checked?: boolean;
		disabled?: boolean;
		describedby?: string;
		invalid?: boolean;
		/** icon above the text (narrow multi-column grids) */
		stacked?: boolean;
		onchange?: (checked: boolean) => void;
	}

	let {
		type,
		name,
		value,
		title,
		description,
		meta,
		icon,
		iconComponent: IconComponent,
		checked = false,
		disabled = false,
		describedby,
		invalid = false,
		stacked = false,
		onchange
	}: Props = $props();
</script>

<label class="tile" data-disabled={disabled || undefined} data-invalid={invalid || undefined} data-stacked={stacked || undefined}>
	<input
		class="visually-hidden"
		{type}
		{name}
		{value}
		{checked}
		{disabled}
		aria-describedby={describedby}
		aria-invalid={type === 'checkbox' && invalid ? true : undefined}
		onchange={(e) => onchange?.(e.currentTarget.checked)}
	/>
	<span class="badge" aria-hidden="true"><Check size={14} strokeWidth={3} /></span>
	{#if IconComponent || icon}
		<span class="icon" aria-hidden="true">
			{#if IconComponent}<IconComponent size={24} strokeWidth={1.75} />{:else if icon}<Icon name={icon} size={24} />{/if}
		</span>
	{/if}
	<span class="text">
		<span class="title">{title}</span>
		{#if description}<span class="desc">{description}</span>{/if}
		{#if meta}<span class="meta">{meta}</span>{/if}
	</span>
</label>

<style>
	.tile {
		position: relative;
		display: flex;
		gap: var(--space-4);
		align-items: flex-start;
		min-height: 120px;
		padding: var(--space-5);
		padding-right: var(--space-10);
		border: 1.5px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		box-shadow: var(--shadow-1);
		cursor: pointer;
		transition:
			border-color var(--dur-fast) var(--ease-out),
			background-color var(--dur-fast) var(--ease-out),
			box-shadow var(--dur-fast) var(--ease-out);
	}
	.tile[data-stacked] {
		flex-direction: column;
		gap: var(--space-3);
	}
	.tile:hover {
		border-color: var(--forest-300);
		box-shadow: var(--shadow-2);
	}
	.tile:has(input:checked) {
		background: var(--color-primary-subtle);
		border: 2px solid var(--color-primary);
		padding: calc(var(--space-5) - 0.5px);
		padding-right: calc(var(--space-10) - 0.5px);
	}
	.tile:has(input:focus-visible) {
		outline: 2px solid var(--color-focus);
		outline-offset: 3px;
	}
	.tile[data-invalid] {
		border-color: var(--color-error);
	}
	.tile[data-disabled] {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.icon {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		width: 48px;
		height: 48px;
		border-radius: var(--radius-md);
		background: var(--forest-50);
		color: var(--forest-700);
		transition: background-color var(--dur-fast) var(--ease-out);
	}
	.tile:has(input:checked) .icon {
		background: var(--color-surface);
	}
	.text {
		display: grid;
		gap: 4px;
		min-width: 0;
	}
	.title {
		font-family: var(--font-display);
		font-weight: 600;
		font-size: 1.375rem;
		line-height: 1.15;
		color: var(--color-heading);
	}
	.desc {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
		line-height: 1.45;
	}
	.meta {
		margin-top: 4px;
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-primary-hover);
	}

	.badge {
		position: absolute;
		top: var(--space-3);
		right: var(--space-3);
		display: grid;
		place-items: center;
		width: 24px;
		height: 24px;
		border-radius: 50%;
		border: 1.5px solid var(--color-border-strong);
		background: var(--color-surface);
		color: transparent;
		transition:
			background-color var(--dur-fast) var(--ease-out),
			color var(--dur-fast) var(--ease-out);
	}
	input[type='radio'] ~ .badge {
		border-radius: 50%;
	}
	input[type='checkbox'] ~ .badge {
		border-radius: 7px;
	}
	.tile:has(input:checked) .badge {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: var(--color-on-primary);
	}
</style>
