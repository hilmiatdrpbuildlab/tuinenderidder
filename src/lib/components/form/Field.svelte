<script lang="ts">
	import type { Snippet } from 'svelte';
	import CircleAlert from '@lucide/svelte/icons/circle-alert';

	/**
	 * Label above, control, helper below; an error replaces the helper (with icon).
	 * The control snippet receives the ids it must wire up (id + aria-describedby + aria-invalid).
	 */
	interface Props {
		id: string;
		label: string;
		helper?: string;
		error?: string | string[] | null;
		required?: boolean;
		optionalLabel?: string;
		hideLabel?: boolean;
		control: Snippet<[{ id: string; describedby: string | undefined; invalid: boolean }]>;
		class?: string;
	}

	let { id, label, helper, error, required = false, optionalLabel, hideLabel = false, control, class: className = '' }: Props = $props();

	const message = $derived(Array.isArray(error) ? error[0] : error);
	const describedby = $derived(message ? `${id}-error` : helper ? `${id}-helper` : undefined);
</script>

<div class="field {className}" class:has-error={!!message}>
	<label for={id} class="label" class:visually-hidden={hideLabel}>
		{label}
		{#if required}<span class="req" aria-hidden="true">*</span>{:else if optionalLabel}<span class="opt">({optionalLabel})</span>{/if}
	</label>
	{@render control({ id, describedby, invalid: !!message })}
	{#if message}
		<p class="error" id="{id}-error">
			<CircleAlert size={16} strokeWidth={2} aria-hidden="true" />
			<span>{message}</span>
		</p>
	{:else if helper}
		<p class="helper" id="{id}-helper">{helper}</p>
	{/if}
</div>

<style>
	.field {
		display: grid;
		gap: 6px;
		min-width: 0;
	}
	.label {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-text);
	}
	.req {
		color: var(--color-error);
		margin-left: 2px;
	}
	.opt {
		font-weight: 400;
		color: var(--color-text-muted);
		margin-left: 4px;
	}
	.helper {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
		line-height: 1.4;
	}
	.error {
		display: flex;
		align-items: flex-start;
		gap: 6px;
		font-size: var(--text-sm);
		color: var(--color-error);
		font-weight: 500;
		line-height: 1.4;
	}
	.error :global(svg) {
		flex-shrink: 0;
		margin-top: 1px;
	}

	/* Shared control styling for inputs rendered inside a Field */
	.field :global(.control) {
		width: 100%;
		min-height: var(--control-h);
		padding: 0 var(--space-3);
		border: 1.5px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		color: var(--color-text);
		font-size: var(--text-base);
		transition:
			border-color var(--dur-fast) var(--ease-out),
			box-shadow var(--dur-fast) var(--ease-out);
	}
	.field :global(textarea.control) {
		padding: var(--space-3);
		min-height: 120px;
		resize: vertical;
		line-height: 1.5;
	}
	.field :global(.control::placeholder) {
		color: var(--color-text-placeholder);
	}
	.field :global(.control:hover) {
		border-color: var(--neutral-700);
	}
	.field :global(.control:focus-visible) {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgb(47 101 48 / 0.25);
	}
	.field :global(.control:disabled) {
		background: var(--color-surface-sunken);
		color: var(--color-text-muted);
		cursor: not-allowed;
	}
	.has-error :global(.control) {
		border-color: var(--color-error);
	}
	.field :global(select.control) {
		appearance: none;
		padding-right: var(--space-10);
		background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%2345413B' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
		background-repeat: no-repeat;
		background-position: right 12px center;
	}
</style>
