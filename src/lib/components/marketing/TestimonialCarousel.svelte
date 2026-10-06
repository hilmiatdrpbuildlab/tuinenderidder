<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import TestimonialCard from './TestimonialCard.svelte';
	import { translator, type Locale } from '$lib/i18n';
	import type { PublicTestimonial } from '$lib/server/content/testimonials';

	/**
	 * Mobile: horizontal scroll-snap row (next card peeks in) with prev/next buttons.
	 * Desktop (≥1024px): 3-up grid. Never autoplays.
	 */
	interface Props {
		locale: Locale;
		items: PublicTestimonial[];
	}

	let { locale, items }: Props = $props();

	const t = $derived(translator(locale));
	let track: HTMLUListElement | undefined = $state();
	let atStart = $state(true);
	let atEnd = $state(false);

	function update() {
		if (!track) return;
		atStart = track.scrollLeft <= 4;
		atEnd = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
	}

	function go(dir: -1 | 1) {
		if (!track) return;
		const first = track.querySelector('li');
		const step = first ? first.getBoundingClientRect().width + 16 : track.clientWidth;
		const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		track.scrollBy({ left: dir * step, behavior: reduce ? 'auto' : 'smooth' });
	}

	$effect(() => {
		update();
	});
</script>

<div class="carousel" role="region" aria-roledescription="carousel" aria-label={t('testimonials.carouselLabel')}>
	<!-- svelte-ignore a11y_no_noninteractive_tabindex -- scrollable region must be keyboard reachable -->
	<ul class="track" bind:this={track} onscroll={update} tabindex="0">
		{#each items as item, i (item.id)}
			<li aria-roledescription="slide" aria-label={t('testimonials.slide', { n: i + 1, total: items.length })}>
				<TestimonialCard
					{locale}
					quote={item.quote}
					authorName={item.authorName}
					town={item.town}
					serviceTitle={item.serviceTitle}
					rating={item.rating}
					source={item.source}
					sourceUrl={item.sourceUrl}
					reviewDate={item.reviewDate}
				/>
			</li>
		{/each}
	</ul>
	{#if items.length > 1}
		<div class="controls">
			<button type="button" class="nav" aria-label={t('a11y.previous')} disabled={atStart} onclick={() => go(-1)}>
				<ChevronLeft size={22} aria-hidden="true" />
			</button>
			<button type="button" class="nav" aria-label={t('a11y.next')} disabled={atEnd} onclick={() => go(1)}>
				<ChevronRight size={22} aria-hidden="true" />
			</button>
		</div>
	{/if}
</div>

<style>
	.track {
		display: grid;
		grid-auto-flow: column;
		grid-auto-columns: min(85%, 380px);
		gap: var(--space-4);
		margin: 0 calc(var(--gutter) * -1);
		padding: var(--space-1) var(--gutter) var(--space-2);
		list-style: none;
		overflow-x: auto;
		scroll-snap-type: x mandatory;
		scroll-padding-inline: var(--gutter);
		overscroll-behavior-x: contain;
		scrollbar-width: none;
	}
	.track::-webkit-scrollbar {
		display: none;
	}
	.track li {
		scroll-snap-align: start;
		min-width: 0;
	}
	.controls {
		display: flex;
		justify-content: flex-end;
		gap: var(--space-2);
		margin-top: var(--space-5);
	}
	.nav {
		display: inline-grid;
		place-items: center;
		width: 48px;
		height: 48px;
		border: 1.5px solid var(--color-primary);
		border-radius: 50%;
		background: transparent;
		color: var(--color-primary);
		transition: background-color var(--dur-fast) var(--ease-out);
	}
	.nav:hover:not(:disabled) {
		background: var(--color-primary-subtle);
	}
	.nav:disabled {
		border-color: var(--color-border);
		color: var(--neutral-500);
		cursor: not-allowed;
	}
	@media (min-width: 1024px) {
		.track {
			grid-auto-flow: row;
			grid-template-columns: repeat(3, 1fr);
			grid-auto-columns: auto;
			gap: var(--space-6);
			margin: 0;
			padding: 0;
			overflow: visible;
		}
		.controls {
			display: none;
		}
	}
</style>
