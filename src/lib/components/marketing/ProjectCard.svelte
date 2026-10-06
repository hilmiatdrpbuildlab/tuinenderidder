<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Picture from '$lib/components/ui/Picture.svelte';
	import { translator, type Locale } from '$lib/i18n';
	import type { MediaRef } from '$lib/media';

	/**
	 * Portfolio tile. `grid`: image fills a 4:5 / 1:1 tile with the text on a bottom gradient.
	 * `feature`: 16:9 image with the summary beside it. One tab stop (stretched title link).
	 */
	interface Props {
		locale: Locale;
		href: string;
		title: string;
		town: string;
		year: number;
		serviceTitle?: string | null;
		summary?: string;
		cover: MediaRef | null;
		beforeAfter?: boolean;
		variant?: 'grid' | 'feature';
		ratio?: '4 / 5' | '1 / 1';
		headingLevel?: 2 | 3;
		sizes?: string;
	}

	let {
		locale,
		href,
		title,
		town,
		year,
		serviceTitle,
		summary,
		cover,
		beforeAfter = false,
		variant = 'grid',
		ratio = '4 / 5',
		headingLevel = 3,
		sizes
	}: Props = $props();

	const t = $derived(translator(locale));
	const meta = $derived([town, year].filter(Boolean).join(' · '));
	const imgSizes = $derived(
		sizes ??
			(variant === 'feature'
				? '(min-width: 1024px) 60vw, 100vw'
				: '(min-width: 1280px) 420px, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw')
	);
</script>

<article class="project" data-variant={variant}>
	<div class="media">
		<Picture media={cover} ratio={variant === 'feature' ? '16 / 9' : ratio} sizes={imgSizes} alt="" class="img" />
		{#if beforeAfter}<span class="ba">{t('common.beforeAfter')}</span>{/if}
	</div>
	<div class="body">
		{#if serviceTitle}<p class="eyebrow">{serviceTitle}</p>{/if}
		<svelte:element this={headingLevel === 2 ? 'h2' : 'h3'} class="title">
			<a {href} class="stretched">{title}</a>
		</svelte:element>
		{#if meta}<p class="meta">{meta}</p>{/if}
		{#if variant === 'feature' && summary}
			<p class="summary">{summary}</p>
			<span class="more" aria-hidden="true">{t('cta.moreInfo')} <ArrowRight size={18} strokeWidth={2.25} /></span>
		{/if}
	</div>
</article>

<style>
	.project {
		position: relative;
		isolation: isolate;
		overflow: hidden;
		border-radius: var(--radius-lg);
		background: var(--color-inverse);
		box-shadow: var(--shadow-1);
		transition: box-shadow var(--dur-fast) var(--ease-out);
	}
	.project:hover {
		box-shadow: var(--shadow-2);
	}
	.project:focus-within {
		outline: 2px solid var(--color-focus);
		outline-offset: 3px;
	}
	.media :global(.img img) {
		transition: transform var(--dur-panel) var(--ease-out);
	}
	.project:hover .media :global(.img img) {
		transform: scale(1.03);
	}
	.ba {
		position: absolute;
		top: var(--space-4);
		left: var(--space-4);
		z-index: 1;
		display: inline-flex;
		align-items: center;
		height: 28px;
		padding: 0 12px;
		border-radius: var(--radius-pill);
		background: var(--harvest);
		color: var(--neutral-900);
		font-size: var(--text-xs);
		font-weight: 700;
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

	/* grid: text on a gradient over the image */
	[data-variant='grid'] .body {
		position: absolute;
		inset: auto 0 0;
		display: grid;
		gap: var(--space-1);
		padding: var(--space-16) var(--space-6) var(--space-6);
		background: linear-gradient(to top, color-mix(in srgb, var(--forest-900) 88%, transparent) 0%, color-mix(in srgb, var(--forest-900) 60%, transparent) 55%, transparent 100%);
		color: var(--linen-25);
	}
	.eyebrow {
		color: var(--forest-200);
	}
	.title {
		font-family: var(--font-display);
		font-size: clamp(1.375rem, 1.25rem + 0.6vw, 1.75rem);
		font-weight: 700;
		line-height: 1.05;
	}
	.stretched {
		color: var(--linen-25);
		text-decoration: none;
	}
	.stretched:focus-visible {
		outline: none;
	}
	.stretched::after {
		content: '';
		position: absolute;
		inset: 0;
		z-index: 2;
	}
	.meta {
		font-size: var(--text-sm);
		font-weight: 500;
		color: var(--color-on-inverse-muted);
	}

	/* feature: image + text side by side on a light surface */
	[data-variant='feature'] {
		display: grid;
		background: var(--color-surface);
		border: 1px solid var(--color-border);
	}
	[data-variant='feature'] .body {
		display: grid;
		align-content: center;
		gap: var(--space-3);
		padding: var(--space-8);
	}
	[data-variant='feature'] .eyebrow {
		color: var(--color-secondary);
	}
	[data-variant='feature'] .title {
		font-size: var(--text-h2);
	}
	[data-variant='feature'] .stretched {
		color: var(--color-heading);
	}
	[data-variant='feature'] .meta {
		color: var(--color-text-muted);
	}
	.summary {
		color: var(--color-text-muted);
	}
	.more {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-weight: 600;
		color: var(--color-primary);
	}
	@media (min-width: 1024px) {
		[data-variant='feature'] {
			grid-template-columns: 3fr 2fr;
		}
	}
</style>
