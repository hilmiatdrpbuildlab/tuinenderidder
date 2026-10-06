<script lang="ts">
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Button from '$lib/components/ui/Button.svelte';
	import { localizePath, translator, type Locale } from '$lib/i18n';

	/** Friendly 404 / 500 body shared by the public error page and the root fallback. */
	interface Props {
		locale: Locale;
		status: number;
	}

	let { locale, status }: Props = $props();

	const t = $derived(translator(locale));
	const l = (p: string) => localizePath(p, locale);
	const notFound = $derived(status === 404);
	const links = $derived([
		{ href: l('/diensten'), label: t('nav.services') },
		{ href: l('/realisaties'), label: t('nav.projects') },
		{ href: l('/over-ons'), label: t('nav.about') },
		{ href: l('/contact'), label: t('nav.contact') }
	]);
</script>

<svelte:head>
	<title>{notFound ? t('error.notFoundTitle') : t('error.serverTitle')} · {t('meta.siteName')}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<section class="error">
	<div class="container-narrow inner">
		<svg class="art" viewBox="0 0 160 120" aria-hidden="true">
			<path d="M10 104h140" stroke="var(--bark-300)" stroke-width="4" stroke-linecap="round" />
			<path d="M80 104V58" stroke="var(--forest-500)" stroke-width="5" stroke-linecap="round" />
			<path d="M80 66c-18 0-30-12-30-32 20 0 30 12 30 32Z" fill="var(--forest-300)" />
			<path d="M80 58c0-20 12-32 32-32 0 20-12 32-32 32Z" fill="var(--forest-500)" />
			<circle cx="30" cy="104" r="6" fill="var(--bark-200)" />
			<circle cx="128" cy="104" r="4" fill="var(--bark-200)" />
		</svg>
		<p class="eyebrow">{t('error.code', { status })}</p>
		<h1>{notFound ? t('error.notFoundTitle') : t('error.serverTitle')}</h1>
		<p class="lead">{notFound ? t('error.notFoundText') : t('error.serverText')}</p>
		<div class="actions">
			<Button href={l('/')} size="lg">
				{t('error.backHome')}
				{#snippet iconEnd()}<ArrowRight />{/snippet}
			</Button>
			<Button href={l('/contact')} variant="outline" size="lg">{t('error.contactUs')}</Button>
		</div>
		<nav aria-label={t('error.suggestions')} class="links">
			<p class="links-title">{t('error.suggestions')}</p>
			<ul>
				{#each links as link (link.href)}
					<li><a href={link.href}>{link.label}</a></li>
				{/each}
			</ul>
		</nav>
	</div>
</section>

<style>
	.error {
		padding-block: var(--space-20) var(--space-16);
	}
	.inner {
		display: grid;
		justify-items: center;
		gap: var(--space-4);
		text-align: center;
	}
	.art {
		width: 160px;
		height: auto;
		margin-bottom: var(--space-2);
	}
	h1 {
		font-size: var(--text-display);
		line-height: 0.95;
		text-transform: uppercase;
	}
	.lead {
		margin-inline: auto;
	}
	.actions {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--space-3);
		margin-top: var(--space-4);
	}
	.links {
		margin-top: var(--space-8);
	}
	.links-title {
		font-size: var(--text-sm);
		font-weight: 600;
		color: var(--color-text-muted);
	}
	.links ul {
		display: flex;
		flex-wrap: wrap;
		justify-content: center;
		gap: var(--space-1) var(--space-5);
		margin-top: var(--space-2);
		padding: 0;
		list-style: none;
	}
	.links a {
		display: inline-flex;
		align-items: center;
		min-height: 44px;
		font-weight: 600;
	}
</style>
