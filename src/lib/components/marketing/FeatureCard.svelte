<script lang="ts">
	import Icon from '$lib/components/ui/Icon.svelte';

	/** Icon + title + text, for "Waarom De Ridder" and company values. */
	interface Props {
		icon: string;
		title: string;
		text: string;
		headingLevel?: 3 | 4;
		variant?: 'plain' | 'card';
	}

	let { icon, title, text, headingLevel = 3, variant = 'plain' }: Props = $props();
</script>

<div class="feature" data-variant={variant}>
	<span class="chip" aria-hidden="true"><Icon name={icon} size={24} /></span>
	{#if headingLevel === 3}
		<h3>{title}</h3>
	{:else}
		<h4>{title}</h4>
	{/if}
	<p>{text}</p>
</div>

<style>
	.feature {
		display: grid;
		align-content: start;
		gap: var(--space-3);
	}
	.feature[data-variant='card'] {
		padding: var(--space-8);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		box-shadow: var(--shadow-1);
	}
	.chip {
		display: inline-grid;
		place-items: center;
		width: 48px;
		height: 48px;
		margin-bottom: var(--space-1);
		border-radius: var(--radius-md);
		background: var(--color-primary-subtle);
		color: var(--color-primary);
	}
	h3,
	h4 {
		font-family: var(--font-display);
		font-size: clamp(1.375rem, 1.3rem + 0.35vw, 1.625rem);
		font-weight: 600;
		line-height: 1.15;
	}
	p {
		color: var(--color-text-muted);
	}
</style>
