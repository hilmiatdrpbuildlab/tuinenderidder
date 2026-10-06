<script lang="ts">
	import Sprout from '@lucide/svelte/icons/sprout';
	import Button from '$lib/components/ui/Button.svelte';
	import Seo from '$lib/components/marketing/Seo.svelte';
	import PageHero from '$lib/components/marketing/PageHero.svelte';
	import ProjectGrid from '$lib/components/marketing/ProjectGrid.svelte';
	import { localizePath, translator } from '$lib/i18n';

	let { data } = $props();

	const t = $derived(translator(data.locale));
	const l = (p: string) => localizePath(p, data.locale);
	const n = $derived(data.projects.length);
	const countText = $derived(
		data.active
			? n === 1
				? t('projects.countFilteredOne', { service: data.active.title })
				: t('projects.countFiltered', { n, service: data.active.title })
			: n === 1
				? t('projects.countOne')
				: t('projects.count', { n })
	);
	const chips = $derived([
		{ slug: null as string | null, title: t('projects.filterAll'), count: data.total },
		...data.filters
	]);
</script>

<Seo
	locale={data.locale}
	title={data.active ? t('seo.projectsFilteredTitle', { service: data.active.title }) : t('seo.projectsTitle')}
	description={t('seo.projectsDescription')}
	image={data.projects[0]?.cover}
/>

<PageHero
	locale={data.locale}
	eyebrow={t('projects.eyebrow')}
	title={t('projects.title')}
	lead={t('projects.lead')}
	crumbs={[{ href: l('/'), label: t('nav.home') }, { label: t('nav.projects') }]}
/>

<section class="section">
	<div class="container">
		<nav class="filters" aria-label={t('projects.filterLabel')}>
			<ul>
				{#each chips as c (c.slug ?? 'all')}
					{@const current = (data.active?.slug ?? null) === c.slug}
					<li>
						<a
							class="chip"
							href={l(c.slug ? `/realisaties?dienst=${c.slug}` : '/realisaties')}
							aria-current={current ? 'true' : undefined}
							data-sveltekit-noscroll
							data-sveltekit-keepfocus
						>
							{c.title}
							<span class="count" aria-hidden="true">{c.count}</span>
						</a>
					</li>
				{/each}
			</ul>
		</nav>

		<p class="result" aria-live="polite" aria-atomic="true">{countText}</p>

		{#if data.projects.length}
			<ProjectGrid locale={data.locale} projects={data.projects} headingLevel={2} />
		{:else}
			<div class="empty">
				<span class="empty-icon" aria-hidden="true"><Sprout size={32} /></span>
				<h2>{t('projects.emptyTitle')}</h2>
				<p>{t('projects.emptyText')}</p>
				<Button href={l('/realisaties')} variant="outline">{t('projects.showAll')}</Button>
			</div>
		{/if}
	</div>
</section>

<style>
	.filters ul {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		padding: 0;
		list-style: none;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		min-height: 44px;
		padding: 0 var(--space-4);
		border: 1.5px solid var(--color-border-strong);
		border-radius: var(--radius-pill);
		background: var(--color-surface);
		color: var(--color-text);
		font-weight: 600;
		font-size: var(--text-sm);
		text-decoration: none;
		transition:
			background-color var(--dur-fast) var(--ease-out),
			border-color var(--dur-fast) var(--ease-out);
	}
	.chip:hover {
		border-color: var(--color-primary);
		background: var(--color-primary-subtle);
	}
	.chip[aria-current='true'] {
		border-color: var(--color-primary);
		background: var(--color-primary);
		color: var(--color-on-primary);
	}
	.count {
		display: inline-grid;
		place-items: center;
		min-width: 22px;
		height: 22px;
		padding: 0 6px;
		border-radius: var(--radius-pill);
		background: var(--linen-100);
		color: var(--neutral-700);
		font-size: var(--text-xs);
	}
	.chip[aria-current='true'] .count {
		background: rgb(255 255 255 / 0.2);
		color: var(--white);
	}
	.result {
		margin: var(--space-6) 0 var(--space-8);
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-text-muted);
	}
	.empty {
		display: grid;
		justify-items: center;
		gap: var(--space-3);
		padding: var(--space-16) var(--space-6);
		border-radius: var(--radius-lg);
		background: var(--color-bg-alt);
		text-align: center;
	}
	.empty-icon {
		display: grid;
		place-items: center;
		width: 64px;
		height: 64px;
		border-radius: 50%;
		background: var(--color-primary-subtle);
		color: var(--color-primary);
	}
	.empty p {
		max-width: 48ch;
		color: var(--color-text-muted);
	}
</style>
