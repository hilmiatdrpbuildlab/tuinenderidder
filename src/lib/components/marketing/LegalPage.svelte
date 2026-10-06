<script lang="ts">
	import Seo from './Seo.svelte';
	import PageHero from './PageHero.svelte';
	import { formatDate, localizePath, translator, type Locale } from '$lib/i18n';
	import type { LegalBlocks } from '$lib/content/pages';

	/** Privacy / cookies / terms: narrow prose layout from LegalBlocks (rich text sanitized on save). */
	interface Props {
		locale: Locale;
		title: string;
		fallbackTitle: string;
		seoTitle?: string;
		seoDesc?: string;
		blocks: Partial<LegalBlocks>;
	}

	let { locale, title, fallbackTitle, seoTitle, seoDesc, blocks }: Props = $props();

	const t = $derived(translator(locale));
	const heading = $derived(title || fallbackTitle);
	const description = $derived(
		seoDesc ||
			(blocks.body ?? '')
				.replace(/<[^>]+>/g, ' ')
				.replace(/\s+/g, ' ')
				.trim()
				.slice(0, 160)
	);
	const updated = $derived(blocks.updated ? formatDate(blocks.updated, locale, { day: 'numeric', month: 'long', year: 'numeric' }) : '');
</script>

<Seo {locale} title={seoTitle || heading} {description} />

<PageHero
	{locale}
	narrow
	eyebrow={t('legal.eyebrow')}
	title={heading}
	lead={updated ? t('legal.updated', { date: updated }) : undefined}
	crumbs={[{ href: localizePath('/', locale), label: t('nav.home') }, { label: heading }]}
/>

<section class="section">
	<div class="container-narrow">
		<div class="prose legal">
			{@html blocks.body ?? ''}
		</div>
	</div>
</section>

<style>
	.legal :global(h2) {
		font-size: var(--text-h3);
	}
	.legal :global(h3) {
		font-family: var(--font-body);
		font-size: var(--text-h4);
	}
</style>
