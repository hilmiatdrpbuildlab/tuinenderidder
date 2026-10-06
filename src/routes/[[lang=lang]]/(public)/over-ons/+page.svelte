<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Button from '$lib/components/ui/Button.svelte';
	import Picture from '$lib/components/ui/Picture.svelte';
	import Seo from '$lib/components/marketing/Seo.svelte';
	import PageHero from '$lib/components/marketing/PageHero.svelte';
	import SectionHeading from '$lib/components/marketing/SectionHeading.svelte';
	import FeatureCard from '$lib/components/marketing/FeatureCard.svelte';
	import StatCard from '$lib/components/marketing/StatCard.svelte';
	import { localizePath, translator } from '$lib/i18n';

	let { data } = $props();

	const t = $derived(translator(data.locale));
	const l = (p: string) => localizePath(p, data.locale);
	const b = $derived(data.about.blocks);
	const title = $derived(data.about.title || t('nav.about'));
</script>

<Seo locale={data.locale} title={data.about.seoTitle || title} description={data.about.seoDesc || b.intro} image={data.image} />

<PageHero
	locale={data.locale}
	eyebrow={b.eyebrow}
	{title}
	lead={b.intro}
	crumbs={[{ href: l('/'), label: t('nav.home') }, { label: title }]}
/>

<section class="section" aria-labelledby="story-title">
	<div class="container story-grid">
		<div class="story-copy">
			<SectionHeading id="story-title" eyebrow={t('about.storyEyebrow')} title={t('about.storyTitle')} />
			{#if b.story}<div class="prose story">{@html b.story}</div>{/if}
		</div>
		<div class="story-media">
			<Picture media={data.image} ratio="3 / 2" sizes="(min-width: 1024px) 45vw, 100vw" priority class="story-img" />
		</div>
	</div>
</section>

{#if b.stats?.length}
	<section class="stats-band" aria-label={t('about.statsLabel')}>
		<div class="container">
			<dl class="stats">
				{#each b.stats as s, i (i)}
					<StatCard value={s.value} label={s.label} tone="inverse" />
				{/each}
			</dl>
		</div>
	</section>
{/if}

{#if b.values?.length}
	<section class="section" aria-labelledby="values-title">
		<div class="container">
			<SectionHeading id="values-title" eyebrow={b.eyebrow} title={b.valuesTitle ?? ''} align="center" />
			<div class="values">
				{#each b.values as v, i (i)}
					<FeatureCard icon={v.icon} title={v.title} text={v.text} variant="card" />
				{/each}
			</div>
			<div class="center">
				<Button href={l('/contact')} variant="outline" size="lg">
					{t('nav.contact')}
					{#snippet iconEnd()}<ArrowRight />{/snippet}
				</Button>
			</div>
		</div>
	</section>
{/if}

<style>
	.story-grid {
		display: grid;
		gap: var(--space-12);
		align-items: center;
	}
	.story {
		font-size: var(--text-lg);
	}
	.story-media :global(.story-img) {
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-2);
	}
	@media (min-width: 1024px) {
		.story-grid {
			grid-template-columns: 1fr 1fr;
			gap: var(--space-20);
		}
	}
	.stats-band {
		padding-block: var(--space-16);
		background: var(--color-inverse);
	}
	.stats {
		display: grid;
		gap: var(--space-8);
	}
	@media (min-width: 640px) {
		.stats {
			grid-template-columns: repeat(3, 1fr);
		}
		.stats > :global(* + *) {
			padding-left: var(--space-8);
			border-left: 1px solid rgb(255 255 255 / 0.15);
		}
	}
	.values {
		display: grid;
		gap: var(--space-6);
	}
	@media (min-width: 900px) {
		.values {
			grid-template-columns: repeat(3, 1fr);
		}
	}
	.center {
		display: flex;
		justify-content: center;
		margin-top: var(--space-12);
	}
</style>
