<script lang="ts">
	import type { Snippet } from 'svelte';
	import Sprout from '@lucide/svelte/icons/sprout';

	interface Props {
		title: string;
		text?: string;
		icon?: Snippet;
		actions?: Snippet;
		compact?: boolean;
	}

	let { title, text, icon, actions, compact = false }: Props = $props();
</script>

<div class="empty" class:compact>
	<div class="art" aria-hidden="true">
		{#if icon}{@render icon()}{:else}<Sprout size={compact ? 28 : 40} strokeWidth={1.5} />{/if}
	</div>
	<p class="title">{title}</p>
	{#if text}<p class="text">{text}</p>{/if}
	{#if actions}<div class="actions">{@render actions()}</div>{/if}
</div>

<style>
	.empty {
		display: grid;
		justify-items: center;
		text-align: center;
		gap: var(--space-2);
		padding: var(--space-12) var(--space-6);
		border: 1.5px dashed var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
	}
	.compact {
		padding: var(--space-8) var(--space-4);
	}
	.art {
		display: grid;
		place-items: center;
		width: 72px;
		height: 72px;
		border-radius: 50%;
		background: var(--forest-50);
		color: var(--forest-600);
		margin-bottom: var(--space-2);
	}
	.compact .art {
		width: 52px;
		height: 52px;
	}
	.title {
		font-weight: 600;
		font-size: var(--text-lg);
		color: var(--color-heading);
	}
	.text {
		color: var(--color-text-muted);
		max-width: 46ch;
		font-size: var(--text-sm);
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3);
		justify-content: center;
		margin-top: var(--space-3);
	}
</style>
