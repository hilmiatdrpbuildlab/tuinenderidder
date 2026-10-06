<script lang="ts">
	import type { Snippet } from 'svelte';
	import X from '@lucide/svelte/icons/x';

	/**
	 * Side drawer on the native <dialog> element (modal: focus trap + Esc).
	 * side="right" is the CMS detail drawer (480px); side="left" is used for off-canvas navigation.
	 */
	interface Props {
		open?: boolean;
		title: string;
		hideTitle?: boolean;
		side?: 'left' | 'right';
		width?: string;
		tone?: 'surface' | 'inverse';
		closeLabel?: string;
		header?: Snippet;
		children: Snippet;
		footer?: Snippet;
		onclose?: () => void;
	}

	let {
		open = $bindable(false),
		title,
		hideTitle = false,
		side = 'right',
		width = '480px',
		tone = 'surface',
		closeLabel = 'Sluiten',
		header,
		children,
		footer,
		onclose
	}: Props = $props();

	let el: HTMLDialogElement | undefined = $state();
	const uid = $props.id();

	$effect(() => {
		if (!el) return;
		if (open && !el.open) el.showModal();
		if (!open && el.open) el.close();
	});
</script>

<dialog
	bind:this={el}
	class="drawer"
	data-side={side}
	data-tone={tone}
	style:--drawer-w={width}
	aria-labelledby="{uid}-title"
	onclose={() => {
		open = false;
		onclose?.();
	}}
	onclick={(e) => e.target === el && el?.close()}
>
	<div class="panel">
		<header>
			<h2 id="{uid}-title" class:visually-hidden={hideTitle}>{title}</h2>
			{#if header}<div class="extra">{@render header()}</div>{/if}
			<button type="button" class="close" aria-label={closeLabel} onclick={() => el?.close()}><X size={22} /></button>
		</header>
		<div class="body">{@render children()}</div>
		{#if footer}<footer>{@render footer()}</footer>{/if}
	</div>
</dialog>

<style>
	.drawer {
		position: fixed;
		inset: 0 0 0 auto;
		width: min(100%, var(--drawer-w));
		max-width: 100%;
		height: 100dvh;
		max-height: 100dvh;
		margin: 0;
		padding: 0;
		border: 0;
		background: var(--color-surface);
		color: var(--color-text);
		box-shadow: var(--shadow-3);
	}
	.drawer[data-side='left'] {
		inset: 0 auto 0 0;
	}
	.drawer[data-tone='inverse'] {
		background: var(--color-inverse);
		color: var(--color-on-inverse);
	}
	.drawer::backdrop {
		background: rgb(19 42 22 / 0.45);
	}
	.drawer[open] {
		animation: slide-in var(--dur-panel) var(--ease-out);
	}
	.drawer[data-side='left'][open] {
		animation-name: slide-in-left;
	}
	@keyframes slide-in {
		from {
			transform: translateX(24px);
			opacity: 0;
		}
	}
	@keyframes slide-in-left {
		from {
			transform: translateX(-24px);
			opacity: 0;
		}
	}
	.panel {
		display: flex;
		flex-direction: column;
		height: 100%;
	}
	header {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-4) var(--space-5);
		border-bottom: 1px solid var(--color-border);
		min-height: 64px;
	}
	[data-tone='inverse'] header {
		border-bottom-color: rgb(255 255 255 / 0.1);
	}
	h2 {
		flex: 1;
		font-family: var(--font-body);
		font-size: var(--text-h4);
		font-weight: 600;
		color: inherit;
	}
	.extra {
		flex: 1;
	}
	.body {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-5);
	}
	footer {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		padding: var(--space-4) var(--space-5);
		border-top: 1px solid var(--color-border);
	}
	.close {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		margin-left: auto;
		flex-shrink: 0;
		border: 0;
		border-radius: var(--radius-sm);
		background: transparent;
		color: inherit;
	}
	.close:hover {
		background: rgb(127 127 127 / 0.15);
	}
</style>
