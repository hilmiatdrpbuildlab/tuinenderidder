<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Maximize from '@lucide/svelte/icons/maximize-2';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Picture from '$lib/components/ui/Picture.svelte';
	import Seo from '$lib/components/marketing/Seo.svelte';
	import PageHero from '$lib/components/marketing/PageHero.svelte';
	import SectionHeading from '$lib/components/marketing/SectionHeading.svelte';
	import ProjectGrid from '$lib/components/marketing/ProjectGrid.svelte';
	import BeforeAfter from '$lib/components/marketing/BeforeAfter.svelte';
	import Lightbox from '$lib/components/marketing/Lightbox.svelte';
	import { localizePath, translator } from '$lib/i18n';

	let { data } = $props();

	const t = $derived(translator(data.locale));
	const l = (p: string) => localizePath(p, data.locale);
	const p = $derived(data.project);
	const gallery = $derived(p.gallery);

	let lightboxOpen = $state(false);
	let lightboxIndex = $state(0);

	function openAt(e: MouseEvent, i: number) {
		// Without JS the link opens the full image; with JS we show the lightbox instead.
		e.preventDefault();
		lightboxIndex = i;
		lightboxOpen = true;
	}

	const ld = $derived([
		{
			'@context': 'https://schema.org',
			'@type': 'CreativeWork',
			name: p.title,
			description: p.summary,
			dateCreated: String(p.year),
			locationCreated: p.town ? { '@type': 'Place', name: p.town } : undefined,
			creator: { '@type': 'Organization', name: data.company.name }
		}
	]);
</script>

<Seo locale={data.locale} title={p.title} description={p.summary} image={p.cover} type="article" jsonLd={ld} />

<PageHero
	locale={data.locale}
	eyebrow={p.service?.title}
	title={p.title}
	lead={p.summary}
	crumbs={[{ href: l('/'), label: t('nav.home') }, { href: l('/realisaties'), label: t('nav.projects') }, { label: p.title }]}
/>

<section class="section gallery-section" aria-labelledby="gallery-title">
	<div class="container">
		<h2 id="gallery-title" class="visually-hidden">{t('project.gallery')}</h2>
		<ul class="gallery" data-count={Math.min(gallery.length, 3)}>
			{#each gallery as img, i (img.id)}
				<li class:lead-item={i === 0}>
					<a
						class="thumb"
						href={img.src}
						onclick={(e) => openAt(e, i)}
						aria-label={t('project.openImage', { n: i + 1, total: gallery.length })}
					>
						<Picture
							media={img}
							ratio="3 / 2"
							priority={i === 0}
							sizes={i === 0 ? '(min-width: 1024px) 66vw, 100vw' : '(min-width: 1024px) 33vw, 50vw'}
						/>
						<span class="zoom" aria-hidden="true"><Maximize size={18} strokeWidth={2.25} /></span>
					</a>
				</li>
			{/each}
		</ul>
	</div>
</section>

{#if p.before && p.after}
	<section class="section ba-section" aria-labelledby="ba-title">
		<div class="container">
			<SectionHeading id="ba-title" eyebrow={t('project.beforeAfterEyebrow')} title={t('project.beforeAfterTitle')} />
			<BeforeAfter locale={data.locale} before={p.before} after={p.after} />
		</div>
	</section>
{/if}

<section class="section story-section" aria-labelledby="story-title">
	<div class="container story-grid">
		<div>
			<h2 id="story-title">{t('project.storyTitle')}</h2>
			<div class="prose story">{@html p.story}</div>
		</div>
		<aside class="facts" aria-labelledby="facts-title">
			<h2 id="facts-title" class="facts-title">{t('project.details')}</h2>
			<dl>
				{#if p.service}
					<div>
						<dt>{t('project.service')}</dt>
						<dd><a href={l(`/diensten/${p.service.slug}`)}><Icon name={p.service.icon} size={18} />{p.service.title}</a></dd>
					</div>
				{/if}
				{#if p.town}
					<div>
						<dt>{t('project.location')}</dt>
						<dd>{p.town}</dd>
					</div>
				{/if}
				<div>
					<dt>{t('project.year')}</dt>
					<dd>{p.year}</dd>
				</div>
			</dl>
			<div class="facts-cta">
				<p class="facts-cta-title">{t('project.ctaTitle')}</p>
				<p class="facts-cta-text">{t('project.ctaText')}</p>
				<Button href={l(p.service ? `/boeken/dienst?dienst=${p.service.slug}` : '/boeken/dienst')} fullWidth>
					{t('cta.book')}
					{#snippet iconEnd()}<ArrowRight />{/snippet}
				</Button>
				{#if p.service}
					<Button href={l(`/diensten/${p.service.slug}`)} variant="ghost" fullWidth>{t('project.viewService')}</Button>
				{/if}
			</div>
		</aside>
	</div>
</section>

{#if data.more.length}
	<section class="section more" aria-labelledby="more-title">
		<div class="container">
			<SectionHeading id="more-title" eyebrow={t('project.moreEyebrow')} title={t('project.moreTitle')}>
				{#snippet action()}
					<Button href={l('/realisaties')} variant="outline">
						{t('home.allProjects')}
						{#snippet iconEnd()}<ArrowRight />{/snippet}
					</Button>
				{/snippet}
			</SectionHeading>
			<ProjectGrid locale={data.locale} projects={data.more} />
		</div>
	</section>
{/if}

<Lightbox locale={data.locale} images={gallery} bind:open={lightboxOpen} bind:index={lightboxIndex} />

<style>
	.gallery-section {
		padding-bottom: 0;
	}
	.gallery {
		display: grid;
		gap: var(--space-4);
		padding: 0;
		list-style: none;
		grid-template-columns: repeat(2, 1fr);
	}
	.gallery li {
		min-width: 0;
	}
	.gallery .lead-item {
		grid-column: 1 / -1;
	}
	@media (min-width: 1024px) {
		.gallery[data-count='2'],
		.gallery[data-count='3'] {
			grid-template-columns: 2fr 1fr;
			gap: var(--space-6);
		}
		.gallery[data-count='2'] .lead-item,
		.gallery[data-count='3'] .lead-item {
			grid-column: 1;
			grid-row: span 2;
		}
		.gallery[data-count='2'] .lead-item :global(.picture),
		.gallery[data-count='3'] .lead-item :global(.picture) {
			height: 100%;
		}
		.gallery[data-count='2'] .lead-item .thumb,
		.gallery[data-count='3'] .lead-item .thumb {
			height: 100%;
		}
	}
	.thumb {
		position: relative;
		display: block;
		overflow: hidden;
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-1);
	}
	.thumb :global(img) {
		transition: transform var(--dur-panel) var(--ease-out);
	}
	.thumb:hover :global(img) {
		transform: scale(1.03);
	}
	.zoom {
		position: absolute;
		right: var(--space-3);
		bottom: var(--space-3);
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border-radius: 50%;
		background: color-mix(in srgb, var(--forest-900) 75%, transparent);
		color: var(--linen-25);
		opacity: 0.9;
	}

	.ba-section {
		padding-bottom: 0;
	}

	.story-grid {
		display: grid;
		gap: var(--space-12);
		align-items: start;
	}
	.story {
		margin-top: var(--space-5);
		font-size: var(--text-lg);
	}
	.facts {
		display: grid;
		gap: var(--space-5);
		padding: var(--space-8);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		box-shadow: var(--shadow-2);
	}
	.facts-title {
		font-family: var(--font-body);
		font-size: var(--text-h4);
		font-weight: 600;
	}
	dl {
		display: grid;
		gap: var(--space-3);
	}
	dl > div {
		display: flex;
		justify-content: space-between;
		gap: var(--space-4);
		padding-bottom: var(--space-3);
		border-bottom: 1px solid var(--color-border);
	}
	dt {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}
	dd {
		font-weight: 600;
		text-align: right;
	}
	dd a {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.facts-cta {
		display: grid;
		gap: var(--space-3);
		padding: var(--space-5);
		border-radius: var(--radius-md);
		background: var(--color-secondary-subtle);
	}
	.facts-cta-title {
		font-family: var(--font-display);
		font-size: var(--text-h3);
		font-weight: 700;
		line-height: 1.1;
		color: var(--color-heading);
	}
	.facts-cta-text {
		font-size: var(--text-sm);
		color: var(--bark-700);
	}
	@media (min-width: 1024px) {
		.story-grid {
			grid-template-columns: minmax(0, 1fr) 380px;
			gap: var(--space-20);
		}
		.facts {
			position: sticky;
			top: calc(var(--header-h) + var(--space-6));
		}
	}
	.more {
		background: var(--color-bg-alt);
	}
</style>
