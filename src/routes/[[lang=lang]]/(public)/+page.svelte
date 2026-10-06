<script lang="ts">
	import { page } from '$app/state';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Phone from '@lucide/svelte/icons/phone';
	import Button from '$lib/components/ui/Button.svelte';
	import Picture from '$lib/components/ui/Picture.svelte';
	import Hero from '$lib/components/marketing/Hero.svelte';
	import Seo from '$lib/components/marketing/Seo.svelte';
	import SectionHeading from '$lib/components/marketing/SectionHeading.svelte';
	import StatCard from '$lib/components/marketing/StatCard.svelte';
	import ServiceCard from '$lib/components/marketing/ServiceCard.svelte';
	import FeatureCard from '$lib/components/marketing/FeatureCard.svelte';
	import ProjectGrid from '$lib/components/marketing/ProjectGrid.svelte';
	import TestimonialCarousel from '$lib/components/marketing/TestimonialCarousel.svelte';
	import { priceLabel } from '$lib/components/marketing/format';
	import { absoluteUrl, localBusinessLd, siteOrigin } from '$lib/components/marketing/seo';
	import { localizePath, translator } from '$lib/i18n';

	let { data } = $props();

	const t = $derived(translator(data.locale));
	const l = (p: string) => localizePath(p, data.locale);
	const b = $derived(data.home.blocks);
	const origin = $derived(siteOrigin(page.url.origin));
	const description = $derived(data.home.seoDesc || b.heroText || t('meta.defaultDescription'));
	const ld = $derived([
		localBusinessLd(data.company, {
			origin,
			locale: data.locale,
			description,
			image: data.heroImage ? absoluteUrl(data.heroImage.src, origin) : null
		}),
		{
			'@context': 'https://schema.org',
			'@type': 'WebSite',
			name: data.company.name,
			url: absoluteUrl(l('/'), origin),
			inLanguage: data.locale === 'nl' ? 'nl-BE' : 'en'
		}
	]);
</script>

<Seo
	locale={data.locale}
	title={data.home.seoTitle || t('seo.homeTitle')}
	{description}
	image={data.heroImage}
	jsonLd={ld}
/>

<Hero image={data.heroImage} eyebrow={b.heroEyebrow} title={b.heroTitle ?? t('meta.tagline')} text={b.heroText}>
	{#snippet actions()}
		<Button href={l('/boeken/dienst')} size="lg">
			{t('home.heroBook')}
			{#snippet iconEnd()}<ArrowRight />{/snippet}
		</Button>
		<Button href={l('/contact')} variant="inverse" size="lg">{t('cta.quote')}</Button>
		<a class="hero-phone" href="tel:{data.company.phoneIntl}">
			<Phone size={18} strokeWidth={2} aria-hidden="true" />
			<span><span class="hero-phone-label">{t('home.heroCallLabel')}</span> {data.company.phone}</span>
		</a>
	{/snippet}
</Hero>

{#if b.stats?.length}
	<section class="stats-wrap" aria-label={t('home.statsLabel')}>
		<div class="container">
			<dl class="stats">
				{#each b.stats as s, i (i)}
					<StatCard value={s.value} label={s.label} />
				{/each}
			</dl>
		</div>
	</section>
{/if}

<section class="section" aria-labelledby="services-title">
	<div class="container">
		<SectionHeading id="services-title" eyebrow={b.servicesEyebrow} title={b.servicesTitle ?? t('services.title')} text={b.servicesText}>
			{#snippet action()}
				<Button href={l('/diensten')} variant="outline">
					{t('home.allServices')}
					{#snippet iconEnd()}<ArrowRight />{/snippet}
				</Button>
			{/snippet}
		</SectionHeading>
		<ul class="service-grid">
			{#each data.services as s (s.id)}
				<li>
					<ServiceCard
						locale={data.locale}
						href={l(`/diensten/${s.slug}`)}
						title={s.title}
						summary={s.summary}
						icon={s.icon}
						image={s.image}
						highlights={s.highlights}
						price={priceLabel(s, data.locale)}
					/>
				</li>
			{/each}
			{#if data.services.length % 3 !== 0}
				<li class="quote-tile">
					<p class="eyebrow">{t('common.freeQuote')}</p>
					<p class="quote-title">{t('ctaBand.title')}</p>
					<p class="quote-text">{t('service.quoteNote')}</p>
					<div class="quote-actions">
						<Button href={l('/contact')} variant="inverse">{t('cta.quote')}</Button>
					</div>
				</li>
			{/if}
		</ul>
	</div>
</section>

<section class="section why" aria-labelledby="why-title">
	<div class="container why-grid">
		<div class="why-media">
			<Picture media={data.whyImage} ratio="4 / 5" sizes="(min-width: 1024px) 40vw, 100vw" class="why-img" />
			{#if b.stats?.[0]}
				<div class="why-badge" aria-hidden="true">
					<span class="why-badge-value">{b.stats[0].value}</span>
					<span class="why-badge-label">{b.stats[0].label}</span>
				</div>
			{/if}
		</div>
		<div class="why-copy">
			<SectionHeading id="why-title" eyebrow={b.whyEyebrow} title={b.whyTitle ?? ''} text={b.whyText} />
			<div class="features">
				{#each b.features ?? [] as f, i (i)}
					<FeatureCard icon={f.icon} title={f.title} text={f.text} />
				{/each}
			</div>
		</div>
	</div>
</section>

{#if data.projects.length}
	<section class="section" aria-labelledby="projects-title">
		<div class="container">
			<SectionHeading id="projects-title" eyebrow={b.projectsEyebrow} title={b.projectsTitle ?? t('projects.title')}>
				{#snippet action()}
					<Button href={l('/realisaties')} variant="outline">
						{t('home.allProjects')}
						{#snippet iconEnd()}<ArrowRight />{/snippet}
					</Button>
				{/snippet}
			</SectionHeading>
			<ProjectGrid locale={data.locale} projects={data.projects} />
		</div>
	</section>
{/if}

{#if data.testimonials.length}
	<section class="section testimonials" aria-labelledby="testimonials-title">
		<div class="container">
			<SectionHeading id="testimonials-title" eyebrow={b.testimonialsEyebrow} title={b.testimonialsTitle ?? ''} />
			<TestimonialCarousel locale={data.locale} items={data.testimonials} />
		</div>
	</section>
{/if}

<style>
	.hero-phone {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		min-height: 44px;
		padding: 0 var(--space-2);
		color: var(--linen-25);
		font-weight: 600;
		text-decoration: none;
	}
	.hero-phone:hover span {
		text-decoration: underline;
	}
	.hero-phone-label {
		font-weight: 400;
		color: var(--linen-50);
	}

	.stats-wrap {
		position: relative;
		z-index: 1;
		margin-top: calc(var(--space-12) * -1);
	}
	.stats {
		display: grid;
		gap: var(--space-6);
		padding: var(--space-8);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		box-shadow: var(--shadow-3);
	}
	.stats > :global(*) {
		padding-bottom: var(--space-6);
		border-bottom: 1px solid var(--color-border);
	}
	.stats > :global(*:last-child) {
		padding-bottom: 0;
		border-bottom: 0;
	}
	@media (min-width: 640px) {
		.stats {
			grid-template-columns: repeat(3, 1fr);
			padding: var(--space-8) var(--space-10);
		}
		.stats > :global(*) {
			padding-bottom: 0;
			border-bottom: 0;
		}
		.stats > :global(* + *) {
			padding-left: var(--space-6);
			border-left: 1px solid var(--color-border);
		}
	}

	.service-grid {
		display: grid;
		gap: var(--space-6);
		padding: 0;
		list-style: none;
	}
	@media (min-width: 640px) {
		.service-grid {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	@media (min-width: 1024px) {
		.service-grid {
			grid-template-columns: repeat(3, 1fr);
		}
	}
	.quote-tile {
		display: flex;
		flex-direction: column;
		gap: var(--space-4);
		justify-content: flex-end;
		min-height: 280px;
		padding: var(--space-8);
		border-radius: var(--radius-lg);
		background: var(--color-inverse);
		color: var(--color-on-inverse);
	}
	.quote-tile .eyebrow {
		color: var(--forest-200);
	}
	.quote-title {
		font-family: var(--font-display);
		font-size: var(--text-h2);
		font-weight: 700;
		line-height: 1;
		text-transform: uppercase;
		color: var(--linen-25);
	}
	.quote-text {
		color: var(--color-on-inverse-muted);
	}
	.quote-actions {
		margin-top: var(--space-2);
	}

	.why {
		background: var(--color-bg-alt);
	}
	.why-grid {
		display: grid;
		gap: var(--space-12);
		align-items: center;
	}
	.why-media {
		position: relative;
		max-width: 560px;
	}
	.why-media :global(.why-img) {
		border-radius: var(--radius-xl);
		box-shadow: var(--shadow-2);
	}
	.why-badge {
		position: absolute;
		right: var(--space-4);
		bottom: var(--space-4);
		display: grid;
		padding: var(--space-4) var(--space-6);
		border-radius: var(--radius-lg);
		background: var(--harvest);
		color: var(--neutral-900);
		box-shadow: var(--shadow-3);
	}
	.why-badge-value {
		font-family: var(--font-display);
		font-size: 2.75rem;
		font-weight: 700;
		line-height: 0.95;
	}
	.why-badge-label {
		font-size: var(--text-sm);
		font-weight: 600;
	}
	.features {
		display: grid;
		gap: var(--space-8);
	}
	@media (min-width: 640px) {
		.features {
			grid-template-columns: repeat(2, 1fr);
		}
	}
	@media (min-width: 1024px) {
		.why-grid {
			grid-template-columns: 5fr 7fr;
			gap: var(--space-20);
		}
		.why-badge {
			right: calc(var(--space-8) * -1);
			bottom: var(--space-10);
		}
	}
</style>
