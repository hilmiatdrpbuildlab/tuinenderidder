<script lang="ts">
	import type { Snippet } from 'svelte';
	import { enhance } from '$app/forms';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { enhanceToast } from './enhance';

	/**
	 * A POST form whose submit button asks for confirmation in a Dialog first (with JS).
	 * Without JS the button submits directly. Use for deletes and other destructive actions.
	 */
	interface Props {
		action: string;
		fields?: Record<string, string | number>;
		title: string;
		description?: string;
		confirmLabel?: string;
		cancelLabel?: string;
		danger?: boolean;
		/** Trigger button contents */
		children: Snippet;
		variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
		size?: 'sm' | 'md';
		iconOnly?: boolean;
		'aria-label'?: string;
		success?: string;
	}

	let {
		action,
		fields = {},
		title,
		description,
		confirmLabel = 'Verwijderen',
		cancelLabel = 'Annuleren',
		danger = true,
		children,
		variant = 'ghost',
		size = 'sm',
		iconOnly = false,
		'aria-label': ariaLabel,
		success
	}: Props = $props();

	let open = $state(false);
	let busy = $state(false);
	let formEl: HTMLFormElement | undefined = $state();
	let confirmed = false;
</script>

<form
	bind:this={formEl}
	method="POST"
	{action}
	class="confirm-form"
	use:enhance={enhanceToast({ success, pending: (b) => (busy = b), after: () => (open = false) })}
>
	{#each Object.entries(fields) as [k, v] (k)}
		<input type="hidden" name={k} value={v} />
	{/each}
	<Button
		type="submit"
		{variant}
		{size}
		{iconOnly}
		aria-label={ariaLabel}
		loading={busy}
		onclick={(e: MouseEvent) => {
			if (confirmed) {
				confirmed = false;
				return;
			}
			e.preventDefault();
			open = true;
		}}
	>
		{@render children()}
	</Button>
</form>

<Dialog bind:open {title} {description} size="sm">
	{#snippet children()}
		<p class="hint">{danger ? 'Deze actie kan niet ongedaan worden gemaakt.' : 'Wil je doorgaan?'}</p>
	{/snippet}
	{#snippet footer()}
		<Button variant="ghost" size="sm" onclick={() => (open = false)}>{cancelLabel}</Button>
		<Button
			variant={danger ? 'danger' : 'primary'}
			size="sm"
			loading={busy}
			onclick={() => {
				confirmed = true;
				formEl?.requestSubmit();
				confirmed = false;
			}}>{confirmLabel}</Button
		>
	{/snippet}
</Dialog>

<style>
	.confirm-form {
		display: inline-flex;
	}
	.hint {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}
</style>
