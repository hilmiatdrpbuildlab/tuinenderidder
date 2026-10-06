<script lang="ts">
	import type { Snippet } from 'svelte';

	/** Standard CMS page heading: title, optional description and right-aligned actions. */
	interface Props {
		title: string;
		description?: string;
		actions?: Snippet;
		meta?: Snippet;
	}

	let { title, description, actions, meta }: Props = $props();
</script>

<div class="page-header">
	<div class="text">
		<h1>{title}</h1>
		{#if description}<p>{description}</p>{/if}
		{#if meta}<div class="meta">{@render meta()}</div>{/if}
	</div>
	{#if actions}<div class="actions">{@render actions()}</div>{/if}
</div>

<style>
	.page-header {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: var(--space-4);
		margin-bottom: var(--space-6);
	}
	.text {
		min-width: 0;
	}
	h1 {
		font-size: clamp(1.75rem, 1.5rem + 1vw, 2.25rem);
		color: var(--color-heading);
	}
	p {
		margin-top: var(--space-1);
		color: var(--color-text-muted);
		max-width: 70ch;
	}
	.meta {
		margin-top: var(--space-2);
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		align-items: center;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}
</style>
