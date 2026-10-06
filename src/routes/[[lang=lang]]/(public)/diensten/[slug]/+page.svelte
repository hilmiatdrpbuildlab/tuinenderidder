<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Check from '@lucide/svelte/icons/check';
	import Phone from '@lucide/svelte/icons/phone';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Picture from '$lib/components/ui/Picture.svelte';
	import Seo from '$lib/components/marketing/Seo.svelte';
	import PageHero from '$lib/components/marketing/PageHero.svelte';
	import SectionHeading from '$lib/components/marketing/SectionHeading.svelte';
	import ProjectGrid from '$lib/components/marketing/ProjectGrid.svelte';
	import { priceLabel, serviceCta } from '$lib/components/marketing/format';
	import { localizePath, translator } from '$lib/i18n';

	let { data } = $props();

	const t = $derived(translator(data.locale));
	const l = (p: string) => localizePath(p, data.locale);
	const s = $derived(data.service);
	const cta = $derived(serviceCta(s, data.locale));
	const ctaHref = $derived(s.isBookable ? l(cta.href) : l('/contact'));
	const isQuote = $derived(s.priceMode !== 'fixed' || s.priceFrom == null);
</script>

<Seo locale={data.locale} title={s.seoTitle || s.title} description={s.seoDesc || s.summary} image={s.image} />

<PageHero
	locale={data.locale}
	title={s.title}
	lead={s.summary}
	crumbs={[{ href: l('/'), label: t('nav.home') }, { href: l('/diensten'), label: t('nav.services') }, { label: s.title }]}
>
	{#snippet actions()}
		<Button href={ctaHref} size="lg">
			{cta.label}
			{#snippet iconEnd()}<ArrowRight />{/snippet}
		</Button>
		<Button href="tel:{data.company.phoneIntl}" variant="outline" size="lg">
			{#snippet iconStart()}<Phone />{/snippet}
			{data.company.phone}
		</Button>
	{/snippet}
	{#snippet aside()}
		<div class="hero-media">
			<Picture media={s.image} ratio="4 / 3" priority sizes="(min-width: 1024px) 45vw, 100vw" class="hero-img" />
			<span class="hero-chip" aria-hidden="true"><Icon name={s.icon} size={28} /></span>
		</div>
	{/snippet}
</PageHero>

<section class="section">
	<div class="container layout">
		<div class="prose body">
			{@html s.body}
		</div>
		<aside class="panel" aria-labelledby="panel-title">
			<h2 id="panel-title" class="panel-title">{t('service.included')}</h2>
			{#if s.highlights.length}
				<ul class="highlights">
					{#each s.highlights as h, i (i)}
						<li><span class="tick" aria-hidden="true"><Check size={16} strokeWidth={2.75} /></span>{h}</li>
					{/each}
				</ul>
			{/if}
			<div class="price">
				<p class="price-label">{t('service.price')}</p>
				<p class="price-value">{priceLabel(s, data.locale)}</p>
				<p class="price-note">{isQuote ? t('service.quoteNote') : t('service.priceNote')}</p>
			</div>
			<Button href={ctaHref} size="lg" fullWidth>
				{cta.label}
				{#snippet iconEnd()}<ArrowRight />{/snippet}
			</Button>
			<p class="call">
				{t('service.orCall')}
				<a href="tel:{data.company.phoneIntl}">{data.company.phone}</a>
			</p>
		</aside>
	</div>
</section>

{#if data.projects.length}
	<section class="section related" aria-labelledby="related-title">
		<div class="container">
			<SectionHeading id="related-title" eyebrow={t('service.relatedEyebrow')} title={t('service.relatedTitle', { service: s.title })}>
				{#snippet action()}
					<Button href={l(`/realisaties?dienst=${s.slug}`)} variant="outline">
						{t('service.allProjectsFor', { service: s.title })}
						{#snippet iconEnd()}<ArrowRight />{/snippet}
					</Button>
				{/snippet}
			</SectionHeading>
			<ProjectGrid locale={data.locale} projects={data.projects} />
		</div>
	</section>
{/if}

{#if data.otherServices.length}
	<section class="section others" aria-labelledby="others-title">
		<div class="container">
			<SectionHeading id="others-title" eyebrow={t('service.otherEyebrow')} title={t('service.otherTitle')} />
			<ul class="other-grid">
				{#each data.otherServices as o (o.id)}
					<li>
						<a class="other" href={l(`/diensten/${o.slug}`)}>
							<span class="other-chip" aria-hidden="true"><Icon name={o.icon} size={24} /></span>
							<span class="other-text">
								<span class="other-title">{o.title}</span>
								<span class="other-price">{priceLabel(o, data.locale)}</span>
							</span>
							<ArrowRight size={20} strokeWidth={2.25} aria-hidden="true" class="other-arrow" />
						</a>
					</li>
				{/each}
			</ul>
		</div>
	</section>
{/if}

<style>
	.hero-media {
		position: relative;
	}
	.hero-media :global(.hero-img) {
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-3);
	}
	.hero-chip {
		position: absolute;
		left: var(--space-6);
		bottom: -28px;
		display: grid;
		place-items: center;
		width: 56px;
		height: 56px;
		border-radius: var(--radius-md);
		background: var(--color-primary-subtle);
		color: var(--color-primary);
		box-shadow: 0 0 0 5px var(--color-bg-alt);
	}

	.layout {
		display: grid;
		gap: var(--space-12);
		align-items: start;
	}
	.body {
		font-size: var(--text-lg);
	}
	.body :global(h2),
	.body :global(h3) {
		font-size: var(--text-h3);
	}
	.panel {
		display: grid;
		gap: var(--space-5);
		padding: var(--space-8);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		box-shadow: var(--shadow-2);
	}
	.panel-title {
		font-family: var(--font-body);
		font-size: var(--text-h4);
		font-weight: 600;
	}
	.highlights {
		display: grid;
		gap: var(--space-3);
		padding: 0;
		list-style: none;
	}
	.highlights li {
		display: flex;
		gap: var(--space-3);
		align-items: flex-start;
		font-weight: 500;
	}
	.tick {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		width: 24px;
		height: 24px;
		margin-top: 1px;
		border-radius: 50%;
		background: var(--color-primary-subtle);
		color: var(--color-primary);
	}
	.price {
		padding: var(--space-5);
		border-radius: var(--radius-md);
		background: var(--color-secondary-subtle);
	}
	.price-label {
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.1em;
		text-transform: uppercase;
		color: var(--bark-700);
	}
	.price-value {
		font-family: var(--font-display);
		font-size: var(--text-h3);
		font-weight: 700;
		line-height: 1.1;
		color: var(--color-heading);
	}
	.price-note {
		margin-top: var(--space-1);
		font-size: var(--text-sm);
		color: var(--bark-700);
	}
	.call {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
		text-align: center;
	}
	.call a {
		font-weight: 600;
		white-space: nowrap;
	}
	@media (min-width: 1024px) {
		.layout {
			grid-template-columns: minmax(0, 1fr) 380px;
			gap: var(--space-20);
		}
		.panel {
			position: sticky;
			top: calc(var(--header-h) + var(--space-6));
		}
	}

	.related {
		background: var(--color-bg-alt);
	}

	.other-grid {
		display: grid;
		gap: var(--space-4);
		padding: 0;
		list-style: none;
	}
	@media (min-width: 640px) {
		.other-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	@media (min-width: 1024px) {
		.other-grid {
			grid-template-columns: repeat(4, 1fr);
		}
	}
	.other {
		display: flex;
		align-items: center;
		gap: var(--space-4);
		height: 100%;
		padding: var(--space-5);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		box-shadow: var(--shadow-1);
		color: var(--color-text);
		text-decoration: none;
		transition: box-shadow var(--dur-fast) var(--ease-out);
	}
	.other:hover {
		box-shadow: var(--shadow-2);
	}
	.other-chip {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		width: 48px;
		height: 48px;
		border-radius: var(--radius-md);
		background: var(--color-primary-subtle);
		color: var(--color-primary);
	}
	.other-text {
		display: grid;
		flex: 1;
		min-width: 0;
	}
	.other-title {
		font-family: var(--font-display);
		font-size: 1.375rem;
		font-weight: 600;
		line-height: 1.1;
		color: var(--color-heading);
	}
	.other:hover .other-title {
		color: var(--color-primary-hover);
	}
	.other-price {
		font-size: var(--text-sm);
		color: var(--color-text-muted);
	}
	.other :global(.other-arrow) {
		flex-shrink: 0;
		color: var(--color-primary);
		transition: transform var(--dur-fast) var(--ease-out);
	}
	.other:hover :global(.other-arrow) {
		transform: translateX(3px);
	}
</style>
