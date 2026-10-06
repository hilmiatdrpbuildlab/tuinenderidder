<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Check from '@lucide/svelte/icons/check';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Picture from '$lib/components/ui/Picture.svelte';
	import { translator, type Locale } from '$lib/i18n';
	import type { MediaRef } from '$lib/media';

	/**
	 * Whole card is one tab stop: the link sits on the title and its ::after stretches over the card.
	 * 4:3 image → 48px icon chip overlapping the image edge → H3 → summary (3 lines) → 3 highlights.
	 */
	interface Props {
		locale: Locale;
		href: string;
		title: string;
		summary: string;
		icon: string;
		image: MediaRef | null;
		highlights?: string[];
		/** Formatted price line, e.g. "vanaf € 180" or "Prijs op offerte". */
		price?: string;
		headingLevel?: 2 | 3;
		sizes?: string;
	}

	let {
		locale,
		href,
		title,
		summary,
		icon,
		image,
		highlights = [],
		price,
		headingLevel = 3,
		sizes = '(min-width: 1280px) 400px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'
	}: Props = $props();

	const t = $derived(translator(locale));
</script>

<article class="card">
	<div class="media">
		<Picture media={image} ratio="4 / 3" {sizes} alt="" class="img" />
		<span class="chip" aria-hidden="true"><Icon name={icon} size={24} /></span>
	</div>
	<div class="body">
		<svelte:element this={headingLevel === 2 ? 'h2' : 'h3'} class="title">
			<a {href} class="stretched">{title}</a>
		</svelte:element>
		<p class="summary">{summary}</p>
		{#if highlights.length}
			<ul class="highlights">
				{#each highlights.slice(0, 3) as h, i (i)}
					<li><Check size={16} strokeWidth={2.5} aria-hidden="true" />{h}</li>
				{/each}
			</ul>
		{/if}
		<div class="foot">
			{#if price}<span class="price">{price}</span>{/if}
			<span class="more" aria-hidden="true">{t('cta.moreInfo')} <ArrowRight size={18} strokeWidth={2.25} /></span>
		</div>
	</div>
</article>

<style>
	.card {
		position: relative;
		display: flex;
		flex-direction: column;
		height: 100%;
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		box-shadow: var(--shadow-1);
		transition:
			box-shadow var(--dur-fast) var(--ease-out),
			transform var(--dur-fast) var(--ease-out);
	}
	.card:hover {
		box-shadow: var(--shadow-2);
	}
	.card:focus-within {
		outline: 2px solid var(--color-focus);
		outline-offset: 3px;
	}
	.media {
		position: relative;
	}
	.media :global(.img) {
		border-radius: var(--radius-lg) var(--radius-lg) 0 0;
	}
	.media :global(.img img) {
		transition: transform var(--dur-panel) var(--ease-out);
	}
	.card:hover .media :global(.img img) {
		transform: scale(1.03);
	}
	.chip {
		position: absolute;
		left: var(--space-6);
		bottom: -24px;
		display: grid;
		place-items: center;
		width: 48px;
		height: 48px;
		border-radius: var(--radius-md);
		background: var(--color-primary-subtle);
		color: var(--color-primary);
		box-shadow: 0 0 0 4px var(--color-surface);
	}
	.body {
		display: flex;
		flex-direction: column;
		gap: var(--space-3);
		flex: 1;
		padding: var(--space-10) var(--space-6) var(--space-6);
	}
	.title {
		font-family: var(--font-display);
		font-size: var(--text-h3);
		font-weight: 600;
		line-height: 1.1;
	}
	.stretched {
		color: var(--color-heading);
		text-decoration: none;
	}
	.stretched:focus-visible {
		outline: none;
	}
	.stretched::after {
		content: '';
		position: absolute;
		inset: 0;
		border-radius: var(--radius-lg);
	}
	.card:hover .stretched {
		color: var(--color-primary-hover);
	}
	.summary {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		overflow: hidden;
		color: var(--color-text-muted);
	}
	.highlights {
		display: grid;
		gap: var(--space-2);
		padding: 0;
		list-style: none;
		font-size: var(--text-sm);
		font-weight: 500;
	}
	.highlights li {
		display: flex;
		align-items: flex-start;
		gap: var(--space-2);
	}
	.highlights :global(svg) {
		flex-shrink: 0;
		margin-top: 2px;
		color: var(--color-primary);
	}
	.foot {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		margin-top: auto;
		padding-top: var(--space-4);
		border-top: 1px solid var(--color-border);
	}
	.price {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-secondary);
	}
	.more {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-left: auto;
		font-weight: 600;
		color: var(--color-primary);
	}
	.more :global(svg) {
		transition: transform var(--dur-fast) var(--ease-out);
	}
	.card:hover .more :global(svg) {
		transform: translateX(3px);
	}
</style>
