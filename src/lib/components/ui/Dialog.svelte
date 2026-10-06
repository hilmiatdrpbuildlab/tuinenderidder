<script lang="ts">
	import type { Snippet } from 'svelte';
	import X from '@lucide/svelte/icons/x';

	/**
	 * Modal dialog on the native <dialog> element: focus trap, Esc to close and inert background
	 * come from the browser. Bind `open` to control it.
	 */
	interface Props {
		open?: boolean;
		title: string;
		description?: string;
		size?: 'sm' | 'md' | 'lg';
		closeLabel?: string;
		children: Snippet;
		footer?: Snippet;
		onclose?: () => void;
	}

	let { open = $bindable(false), title, description, size = 'md', closeLabel = 'Sluiten', children, footer, onclose }: Props = $props();

	let el: HTMLDialogElement | undefined = $state();
	const uid = $props.id();

	$effect(() => {
		if (!el) return;
		if (open && !el.open) el.showModal();
		if (!open && el.open) el.close();
	});

	function handleClose() {
		open = false;
		onclose?.();
	}
</script>

<dialog
	bind:this={el}
	class="dialog"
	data-size={size}
	aria-labelledby="{uid}-title"
	aria-describedby={description ? `${uid}-desc` : undefined}
	onclose={handleClose}
	onclick={(e) => e.target === el && el?.close()}
>
	<div class="panel">
		<header>
			<div>
				<h2 id="{uid}-title">{title}</h2>
				{#if description}<p id="{uid}-desc" class="desc">{description}</p>{/if}
			</div>
			<button type="button" class="close" aria-label={closeLabel} onclick={() => el?.close()}><X size={20} /></button>
		</header>
		<div class="body">{@render children()}</div>
		{#if footer}<footer>{@render footer()}</footer>{/if}
	</div>
</dialog>

<style>
	.dialog {
		width: min(100% - 32px, 520px);
		max-height: min(90dvh, 900px);
		padding: 0;
		border: 0;
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		color: var(--color-text);
		box-shadow: var(--shadow-3);
	}
	.dialog[data-size='sm'] {
		width: min(100% - 32px, 420px);
	}
	.dialog[data-size='lg'] {
		width: min(100% - 32px, 760px);
	}
	.dialog::backdrop {
		background: rgb(19 42 22 / 0.45);
	}
	.dialog[open] {
		animation: pop var(--dur-panel) var(--ease-out);
	}
	@keyframes pop {
		from {
			opacity: 0;
			transform: translateY(8px) scale(0.98);
		}
	}
	.panel {
		display: flex;
		flex-direction: column;
		max-height: inherit;
	}
	header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-4);
		padding: var(--space-6) var(--space-6) var(--space-3);
	}
	h2 {
		font-family: var(--font-body);
		font-size: var(--text-h4);
		font-weight: 600;
		line-height: 1.25;
	}
	.desc {
		margin-top: var(--space-1);
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}
	.body {
		padding: var(--space-3) var(--space-6) var(--space-6);
		overflow-y: auto;
	}
	footer {
		display: flex;
		flex-wrap: wrap;
		justify-content: flex-end;
		gap: var(--space-3);
		padding: var(--space-4) var(--space-6);
		border-top: 1px solid var(--color-border);
	}
	.close {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		flex-shrink: 0;
		border: 0;
		border-radius: var(--radius-sm);
		background: transparent;
		color: var(--color-text-muted);
	}
	.close:hover {
		background: var(--color-surface-sunken);
		color: var(--color-text);
	}
</style>
