<script lang="ts">
	import { page } from '$app/state';
	import { translator, type Locale } from '$lib/i18n';
	import type { MediaRef } from '$lib/media';
	import { absoluteUrl, alternatesForPathname, jsonLd as serializeLd, ogLocale, siteOrigin } from './seo';

	/**
	 * <head> tags for a public page: title "<Page> · Tuinen De Ridder", description, canonical,
	 * hreflang alternates (nl-BE / en / x-default), Open Graph + Twitter card and optional JSON-LD.
	 */
	interface Props {
		locale: Locale;
		/** Page title without the site name. Omit on the home page. */
		title?: string;
		description?: string;
		/** Main image of the page (used for og:image). */
		image?: MediaRef | null;
		type?: 'website' | 'article';
		noindex?: boolean;
		/** Structured data objects, rendered as application/ld+json. */
		jsonLd?: unknown[];
	}

	let { locale, title, description, image, type = 'website', noindex = false, jsonLd = [] }: Props = $props();

	const t = $derived(translator(locale));
	const siteName = $derived(t('meta.siteName'));
	const fullTitle = $derived(title ? `${title} · ${siteName}` : `${siteName} · ${t('meta.tagline')}`);
	const desc = $derived((description || t('meta.defaultDescription')).replace(/\s+/g, ' ').trim().slice(0, 300));
	const origin = $derived(siteOrigin(page.url.origin));
	const canonical = $derived(absoluteUrl(page.url.pathname, origin));
	const alternates = $derived(alternatesForPathname(page.url.pathname, origin));
	const ogImage = $derived(image ? absoluteUrl(image.src, origin) : null);
	const ld = $derived(jsonLd.map(serializeLd).join(''));
</script>

<svelte:head>
	<title>{fullTitle}</title>
	<meta name="description" content={desc} />
	{#if noindex}<meta name="robots" content="noindex, follow" />{/if}
	<link rel="canonical" href={canonical} />
	{#each alternates as alt (alt.hreflang)}
		<link rel="alternate" hreflang={alt.hreflang} href={alt.href} />
	{/each}

	<meta property="og:site_name" content={siteName} />
	<meta property="og:type" content={type} />
	<meta property="og:title" content={title ?? fullTitle} />
	<meta property="og:description" content={desc} />
	<meta property="og:url" content={canonical} />
	<meta property="og:locale" content={ogLocale(locale)} />
	<meta property="og:locale:alternate" content={ogLocale(locale === 'nl' ? 'en' : 'nl')} />
	{#if ogImage && image}
		<meta property="og:image" content={ogImage} />
		<meta property="og:image:width" content={String(image.width)} />
		<meta property="og:image:height" content={String(image.height)} />
		{#if image.alt}<meta property="og:image:alt" content={image.alt} />{/if}
	{/if}
	<meta name="twitter:card" content={ogImage ? 'summary_large_image' : 'summary'} />
	<meta name="twitter:title" content={title ?? fullTitle} />
	<meta name="twitter:description" content={desc} />
	{#if ogImage}<meta name="twitter:image" content={ogImage} />{/if}

	{@html ld}
</svelte:head>
