<script lang="ts">
	import type { Snippet } from 'svelte';

	/** White CMS card with optional title + header actions. */
	interface Props {
		title?: string;
		description?: string;
		actions?: Snippet;
		children: Snippet;
		footer?: Snippet;
		flush?: boolean;
		class?: string;
	}

	let { title, description, actions, children, footer, flush = false, class: className = '' }: Props = $props();
	const uid = $props.id();
</script>

<section class="panel {className}" aria-labelledby={title ? `${uid}-t` : undefined}>
	{#if title || actions}
		<header>
			<div>
				{#if title}<h2 id="{uid}-t">{title}</h2>{/if}
				{#if description}<p>{description}</p>{/if}
			</div>
			{#if actions}<div class="actions">{@render actions()}</div>{/if}
		</header>
	{/if}
	<div class="body" class:flush>{@render children()}</div>
	{#if footer}<footer>{@render footer()}</footer>{/if}
</section>

<style>
	.panel {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-1);
		min-width: 0;
	}
	header {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: var(--space-3);
		padding: var(--space-4) var(--space-5) 0;
	}
	h2 {
		font-family: var(--font-body);
		font-size: 1rem;
		font-weight: 600;
		line-height: 1.4;
		color: var(--color-heading);
	}
	header p {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
	}
	.actions {
		display: flex;
		gap: var(--space-2);
	}
	.body {
		padding: var(--space-4) var(--space-5) var(--space-5);
	}
	.body.flush {
		padding: var(--space-3) 0 0;
	}
	footer {
		padding: var(--space-3) var(--space-5);
		border-top: 1px solid var(--color-border);
	}
</style>
