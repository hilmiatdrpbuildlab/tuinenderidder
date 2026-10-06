<script lang="ts">
	import type { Snippet } from 'svelte';

	/** Eyebrow + H2 (or H1) + optional intro, with an optional action aligned to the right on desktop. */
	interface Props {
		eyebrow?: string;
		title: string;
		text?: string;
		id?: string;
		level?: 1 | 2;
		align?: 'start' | 'center';
		tone?: 'default' | 'inverse';
		action?: Snippet;
	}

	let { eyebrow, title, text, id, level = 2, align = 'start', tone = 'default', action }: Props = $props();
</script>

<div class="heading" data-align={align} data-tone={tone} class:has-action={!!action}>
	<div class="copy">
		{#if eyebrow}<p class="eyebrow">{eyebrow}</p>{/if}
		{#if level === 1}
			<h1 {id}>{title}</h1>
		{:else}
			<h2 {id}>{title}</h2>
		{/if}
		{#if text}<p class="text">{text}</p>{/if}
	</div>
	{#if action}<div class="action">{@render action()}</div>{/if}
</div>

<style>
	.heading {
		display: grid;
		gap: var(--space-6);
		margin-bottom: clamp(var(--space-8), 4vw, var(--space-12));
	}
	.heading > * {
		min-width: 0;
	}
	/* Long translated labels ("Alle realisaties voor Snoeien & vellen van bomen") wrap instead of overflowing. */
	.action :global(.btn) {
		max-width: 100%;
		white-space: normal;
		text-align: center;
		padding-block: var(--space-2);
	}
	.copy {
		display: grid;
		gap: var(--space-3);
		max-width: 760px;
	}
	.eyebrow {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}
	.eyebrow::before {
		content: '';
		width: 28px;
		height: 2px;
		background: var(--harvest);
		border-radius: 2px;
	}
	.text {
		font-size: var(--text-lg);
		color: var(--color-text-muted);
		max-width: 60ch;
	}
	[data-align='center'] {
		justify-items: center;
		text-align: center;
	}
	[data-align='center'] .copy {
		justify-items: center;
		margin-inline: auto;
	}
	[data-align='center'] .eyebrow::after {
		content: '';
		width: 28px;
		height: 2px;
		background: var(--harvest);
		border-radius: 2px;
	}
	[data-tone='inverse'] h1,
	[data-tone='inverse'] h2 {
		color: var(--linen-25);
	}
	[data-tone='inverse'] .eyebrow {
		color: var(--forest-200);
	}
	[data-tone='inverse'] .text {
		color: var(--color-on-inverse-muted);
	}
	@media (min-width: 900px) {
		.has-action[data-align='start'] {
			grid-template-columns: 1fr auto;
			align-items: end;
		}
	}
</style>
