<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLInputAttributes } from 'svelte/elements';

	interface Props extends Omit<HTMLInputAttributes, 'type'> {
		name: string;
		checked?: boolean;
		/** Label content (may contain links). */
		children: Snippet;
		error?: string | string[] | null;
		helper?: string;
	}

	let { name, checked = $bindable(false), children, error, helper, value = 'on', ...rest }: Props = $props();

	const uid = $props.id();
	const id = $derived(`${name}-${uid}`);
	const message = $derived(Array.isArray(error) ? error[0] : error);
</script>

<div class="checkbox" class:has-error={!!message}>
	<input
		{id}
		type="checkbox"
		{name}
		{value}
		bind:checked
		aria-invalid={message ? true : undefined}
		aria-describedby={message ? `${id}-error` : helper ? `${id}-helper` : undefined}
		{...rest}
	/>
	<label for={id}>{@render children()}</label>
	{#if message}
		<p class="error" id="{id}-error">{message}</p>
	{:else if helper}
		<p class="helper" id="{id}-helper">{helper}</p>
	{/if}
</div>

<style>
	.checkbox {
		display: grid;
		grid-template-columns: 24px 1fr;
		column-gap: var(--space-3);
		row-gap: 4px;
		align-items: start;
	}
	input {
		appearance: none;
		width: 22px;
		height: 22px;
		margin: 1px 0 0;
		border: 1.5px solid var(--color-border-strong);
		border-radius: 6px;
		background: var(--color-surface);
		display: grid;
		place-content: center;
		cursor: pointer;
		transition: background-color var(--dur-fast) var(--ease-out);
	}
	input::after {
		content: '';
		width: 12px;
		height: 7px;
		border-left: 2.5px solid var(--white);
		border-bottom: 2.5px solid var(--white);
		transform: rotate(-45deg) translate(1px, -1px);
		opacity: 0;
	}
	input:checked {
		background: var(--color-primary);
		border-color: var(--color-primary);
	}
	input:checked::after {
		opacity: 1;
	}
	input:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}
	.has-error input {
		border-color: var(--color-error);
	}
	label {
		font-size: var(--text-sm);
		line-height: 1.5;
		cursor: pointer;
		padding-top: 1px;
	}
	.error,
	.helper {
		grid-column: 2;
		font-size: var(--text-sm);
	}
	.error {
		color: var(--color-error);
		font-weight: 500;
	}
	.helper {
		color: var(--color-text-muted);
	}
</style>
