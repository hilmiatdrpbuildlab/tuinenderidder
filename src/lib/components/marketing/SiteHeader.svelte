<script lang="ts">
	import { page } from '$app/state';
	import { afterNavigate } from '$app/navigation';
	import Phone from '@lucide/svelte/icons/phone';
	import Menu from '@lucide/svelte/icons/menu';
	import ChevronDown from '@lucide/svelte/icons/chevron-down';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import Button from '$lib/components/ui/Button.svelte';
	import Drawer from '$lib/components/ui/Drawer.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Picture from '$lib/components/ui/Picture.svelte';
	import Logo from './Logo.svelte';
	import LanguageSwitcher from './LanguageSwitcher.svelte';
	import { delocalizePath, localizePath, translator, type Locale } from '$lib/i18n';
	import type { NavService } from '$lib/server/site';

	interface Props {
		locale: Locale;
		services: NavService[];
		phone: string;
		phoneIntl: string;
		/** Transparent over a dark hero until the page scrolls 24px. */
		overlay?: boolean;
	}

	let { locale, services, phone, phoneIntl, overlay = false }: Props = $props();

	const t = $derived(translator(locale));
	const l = (p: string) => localizePath(p, locale);
	const current = $derived(delocalizePath(page.url.pathname).path);

	let scrolled = $state(false);
	let megaOpen = $state(false);
	let drawerOpen = $state(false);
	let megaEl: HTMLElement | undefined = $state();

	const solid = $derived(!overlay || scrolled || megaOpen);

	const links = $derived([
		{ href: '/realisaties', label: t('nav.projects') },
		{ href: '/over-ons', label: t('nav.about') },
		{ href: '/contact', label: t('nav.contact') }
	]);

	const isCurrent = (href: string) => current === href || current.startsWith(href + '/');

	afterNavigate(() => {
		megaOpen = false;
		drawerOpen = false;
	});

	function onWindowClick(e: MouseEvent) {
		if (megaOpen && megaEl && !megaEl.contains(e.target as Node)) megaOpen = false;
	}
</script>

<svelte:window
	onscroll={() => (scrolled = window.scrollY > 24)}
	onclick={onWindowClick}
	onkeydown={(e) => e.key === 'Escape' && (megaOpen = false)}
/>

<a class="skip" href="#main">{t('a11y.skipToContent')}</a>

<header class="header" class:solid class:overlay>
	<div class="container bar">
		<a href={l('/')} class="brand" aria-label="Tuinen De Ridder — {t('nav.home')}">
			<Logo inverse={!solid} />
		</a>

		<nav class="nav" aria-label={t('a11y.mainNav')}>
			<ul>
				<li class="has-mega" bind:this={megaEl}>
					<button
						type="button"
						class="nav-link"
						class:active={isCurrent('/diensten')}
						aria-expanded={megaOpen}
						aria-controls="mega-menu"
						onclick={() => (megaOpen = !megaOpen)}
					>
						{t('nav.services')}
						<ChevronDown size={16} strokeWidth={2.25} aria-hidden="true" />
					</button>
					<div id="mega-menu" class="mega" hidden={!megaOpen}>
						<ul class="mega-grid">
							{#each services as s (s.id)}
								<li>
									<a href={l(`/diensten/${s.slug}`)} class="mega-item" aria-current={isCurrent(`/diensten/${s.slug}`) ? 'page' : undefined}>
										<Picture media={s.image} ratio="4 / 3" sizes="220px" alt="" class="mega-img" />
										<span class="mega-title"><Icon name={s.icon} size={18} />{s.title}</span>
									</a>
								</li>
							{/each}
						</ul>
						<a class="mega-all" href={l('/diensten')}>{t('nav.allServices')} <ArrowRight size={16} aria-hidden="true" /></a>
					</div>
				</li>
				{#each links as link (link.href)}
					<li>
						<a
							class="nav-link"
							class:active={isCurrent(link.href)}
							href={l(link.href)}
							aria-current={isCurrent(link.href) ? 'page' : undefined}>{link.label}</a
						>
					</li>
				{/each}
			</ul>
		</nav>

		<div class="actions">
			<a class="phone" href="tel:{phoneIntl}">
				<Phone size={18} strokeWidth={2} aria-hidden="true" />
				<span class="phone-number">{phone}</span>
				<span class="visually-hidden">{t('a11y.callUs')}</span>
			</a>
			<div class="lang-desktop">
				<LanguageSwitcher {locale} variant={solid ? 'default' : 'inverse'} />
			</div>
			<div class="cta-desktop">
				<Button href={l('/boeken/dienst')} variant={solid ? 'primary' : 'inverse'}>{t('cta.book')}</Button>
			</div>
			<button type="button" class="burger" aria-label={t('a11y.openMenu')} aria-expanded={drawerOpen} onclick={() => (drawerOpen = true)}>
				<Menu size={26} />
			</button>
		</div>
	</div>
</header>

<Drawer bind:open={drawerOpen} title={t('a11y.mainNav')} hideTitle side="left" width="100%" tone="inverse" closeLabel={t('a11y.closeMenu')}>
	{#snippet header()}<Logo inverse compact />{/snippet}
	<nav aria-label={t('a11y.mainNav')} class="mobile-nav">
		<ul>
			<li><a href={l('/diensten')} aria-current={current === '/diensten' ? 'page' : undefined}>{t('nav.services')}</a></li>
			{#each services as s (s.id)}
				<li class="sub"><a href={l(`/diensten/${s.slug}`)}>{s.title}</a></li>
			{/each}
			{#each links as link (link.href)}
				<li><a href={l(link.href)} aria-current={isCurrent(link.href) ? 'page' : undefined}>{link.label}</a></li>
			{/each}
		</ul>
	</nav>
	<div class="mobile-meta">
		<LanguageSwitcher {locale} variant="inverse" />
		<a class="mobile-phone" href="tel:{phoneIntl}"><Phone size={18} aria-hidden="true" /> {phone}</a>
	</div>
	{#snippet footer()}
		<Button href={l('/boeken/dienst')} variant="inverse" size="lg" fullWidth>{t('cta.book')}</Button>
	{/snippet}
</Drawer>

<style>
	.skip {
		position: absolute;
		left: var(--space-4);
		top: -100px;
		z-index: 200;
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-md);
		background: var(--color-primary);
		color: var(--white);
		font-weight: 600;
	}
	.skip:focus {
		top: var(--space-3);
	}

	.header {
		position: sticky;
		top: 0;
		z-index: 50;
		height: var(--header-h);
		background: var(--color-bg);
		transition:
			background-color var(--dur-panel) var(--ease-out),
			box-shadow var(--dur-panel) var(--ease-out);
	}
	.header.overlay {
		position: fixed;
		inset: 0 0 auto;
	}
	.header:not(.solid) {
		background: transparent;
		color: var(--linen-25);
	}
	.header.solid.overlay,
	.header.solid {
		box-shadow: var(--shadow-1);
	}
	.bar {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-6);
		height: 100%;
	}
	.brand {
		text-decoration: none;
		display: inline-flex;
	}

	.nav {
		display: none;
	}
	.nav > ul {
		display: flex;
		align-items: center;
		gap: var(--space-1);
		list-style: none;
		padding: 0;
	}
	.nav-link {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		min-height: 44px;
		padding: 0 var(--space-3);
		border: 0;
		background: none;
		color: inherit;
		font-weight: 600;
		font-size: var(--text-base);
		text-decoration: none;
		border-bottom: 2px solid transparent;
	}
	.solid .nav-link {
		color: var(--color-text);
	}
	.nav-link:hover {
		color: var(--color-primary);
	}
	.header:not(.solid) .nav-link:hover {
		color: var(--white);
		border-bottom-color: rgb(255 255 255 / 0.5);
	}
	.nav-link.active {
		border-bottom-color: currentColor;
	}
	.solid .nav-link.active {
		color: var(--color-primary-hover);
		border-bottom-color: var(--color-primary);
	}
	.nav-link[aria-expanded='true'] :global(svg) {
		transform: rotate(180deg);
	}
	.nav-link :global(svg) {
		transition: transform var(--dur-fast) var(--ease-out);
	}

	.has-mega {
		position: relative;
	}
	.mega {
		position: absolute;
		top: calc(100% + 14px);
		left: 50%;
		transform: translateX(-35%);
		width: min(920px, 80vw);
		padding: var(--space-5);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		color: var(--color-text);
		box-shadow: var(--shadow-3);
		border: 1px solid var(--color-border);
	}
	.mega[hidden] {
		display: none;
	}
	.mega-grid {
		display: grid;
		grid-template-columns: repeat(5, 1fr);
		gap: var(--space-4);
		list-style: none;
		padding: 0;
	}
	.mega-item {
		display: grid;
		gap: var(--space-2);
		text-decoration: none;
		color: var(--color-text);
	}
	.mega-item :global(.mega-img) {
		border-radius: var(--radius-md);
		transition: transform var(--dur-fast) var(--ease-out);
	}
	.mega-item:hover :global(.mega-img) {
		transform: scale(1.03);
	}
	.mega-title {
		display: flex;
		align-items: flex-start;
		gap: 6px;
		font-weight: 600;
		font-size: var(--text-sm);
		line-height: 1.3;
	}
	.mega-title :global(svg) {
		flex-shrink: 0;
		color: var(--color-primary);
	}
	.mega-item:hover .mega-title {
		color: var(--color-primary);
	}
	.mega-all {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-top: var(--space-4);
		font-weight: 600;
	}

	.actions {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}
	.phone {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		gap: var(--space-2);
		min-width: 44px;
		min-height: 44px;
		color: inherit;
		font-weight: 600;
		text-decoration: none;
	}
	.solid .phone {
		color: var(--color-primary-hover);
	}
	.phone-number,
	.lang-desktop,
	.cta-desktop {
		display: none;
	}
	.burger {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		border: 0;
		border-radius: var(--radius-sm);
		background: transparent;
		color: inherit;
	}
	.solid .burger {
		color: var(--forest-900);
	}

	@media (min-width: 1024px) {
		.nav,
		.lang-desktop,
		.cta-desktop {
			display: block;
		}
		.burger {
			display: none;
		}
		.actions {
			gap: var(--space-3);
		}
	}
	@media (min-width: 1200px) {
		.phone-number {
			display: inline;
		}
	}

	.mobile-nav ul {
		list-style: none;
		padding: 0;
		display: grid;
		gap: var(--space-1);
	}
	.mobile-nav a {
		display: block;
		padding: var(--space-2) 0;
		font-family: var(--font-display);
		font-size: 2.25rem;
		font-weight: 700;
		line-height: 1.1;
		text-transform: uppercase;
		color: var(--linen-25);
		text-decoration: none;
	}
	.mobile-nav a[aria-current='page'] {
		color: var(--forest-300);
	}
	.mobile-nav .sub a {
		font-family: var(--font-body);
		font-size: var(--text-base);
		font-weight: 500;
		text-transform: none;
		padding: var(--space-2) 0 var(--space-2) var(--space-4);
		color: var(--color-on-inverse-muted);
	}
	.mobile-meta {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: var(--space-8);
		padding-top: var(--space-4);
		border-top: 1px solid rgb(255 255 255 / 0.12);
	}
	.mobile-phone {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		min-height: 44px;
		color: var(--linen-25);
		font-weight: 600;
		text-decoration: none;
	}
</style>
