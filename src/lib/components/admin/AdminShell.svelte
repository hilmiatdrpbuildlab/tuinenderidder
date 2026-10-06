<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { afterNavigate, goto } from '$app/navigation';
	import Menu from '@lucide/svelte/icons/menu';
	import Search from '@lucide/svelte/icons/search';
	import Plus from '@lucide/svelte/icons/plus';
	import LogOut from '@lucide/svelte/icons/log-out';
	import Moon from '@lucide/svelte/icons/moon';
	import Sun from '@lucide/svelte/icons/sun';
	import ExternalLink from '@lucide/svelte/icons/external-link';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Logo from '$lib/components/marketing/Logo.svelte';
	import Drawer from '$lib/components/ui/Drawer.svelte';
	import Toaster from '$lib/components/ui/Toaster.svelte';
	import AdminIcon from './AdminIcon.svelte';
	import { adminNav, type NavItem } from './nav';
	import { ROLE_LABELS } from '$lib/domain';
	import type { SessionUser } from '$lib/server/auth';
	import type { Area } from '$lib/server/permissions';

	interface Props {
		user: SessionUser;
		areas: Area[];
		counts: Partial<Record<NonNullable<NavItem['badge']>, number>>;
		children: Snippet;
	}

	let { user, areas, counts, children }: Props = $props();

	const sections = $derived(
		adminNav
			.map((s) => ({ ...s, items: s.items.filter((i) => areas.includes(i.area)) }))
			.filter((s) => s.items.length > 0)
	);

	const path = $derived(page.url.pathname);
	const isActive = (href: string) => (href === '/admin' ? path === '/admin' : path === href || path.startsWith(href + '/'));

	const pageData = $derived(page.data as { title?: string; crumbs?: { href: string; label: string }[] });

	let drawerOpen = $state(false);
	let newOpen = $state(false);
	let dark = $state(false);
	let searchEl: HTMLInputElement | undefined = $state();

	$effect(() => {
		try {
			dark = localStorage.getItem('tdr-cms-theme') === 'dark';
		} catch {
			/* storage unavailable */
		}
	});

	function toggleTheme() {
		dark = !dark;
		try {
			localStorage.setItem('tdr-cms-theme', dark ? 'dark' : 'light');
		} catch {
			/* ignore */
		}
	}

	afterNavigate(() => {
		drawerOpen = false;
		newOpen = false;
	});

	function onKeydown(e: KeyboardEvent) {
		if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
			e.preventDefault();
			searchEl?.focus();
		}
		if (e.key === 'Escape') newOpen = false;
	}

	const newItems = $derived(
		[
			{ href: '/admin/boekingen/nieuw', label: 'Boeking', area: 'bookings' as Area },
			{ href: '/admin/realisaties/nieuw', label: 'Realisatie', area: 'content' as Area },
			{ href: '/admin/getuigenissen/nieuw', label: 'Getuigenis', area: 'content' as Area },
			{ href: '/admin/media', label: 'Foto’s uploaden', area: 'media' as Area }
		].filter((i) => areas.includes(i.area))
	);

	const initials = $derived(
		user.name
			.split(' ')
			.map((p) => p[0])
			.slice(0, 2)
			.join('')
			.toUpperCase()
	);
</script>

<svelte:window onkeydown={onKeydown} />

{#snippet navList(rail: boolean)}
	{#each sections as section (section.label)}
		<div class="nav-section">
			<p class="nav-label" class:rail-hide={rail}>{section.label}</p>
			<ul>
				{#each section.items as item (item.href)}
					{@const count = item.badge ? (counts[item.badge] ?? 0) : 0}
					<li>
						<a
							href={item.href}
							class="nav-item"
							aria-current={isActive(item.href) ? 'page' : undefined}
							title={rail ? item.label : undefined}
						>
							<AdminIcon name={item.icon} />
							<span class="nav-text" class:rail-hide={rail}>{item.label}</span>
							{#if count > 0}
								<span class="count" class:rail-dot={rail} aria-label="{count} nieuw">{count}</span>
							{/if}
						</a>
					</li>
				{/each}
			</ul>
		</div>
	{/each}
{/snippet}

{#snippet userBlock(rail: boolean)}
	<div class="user" class:rail>
		<span class="avatar" aria-hidden="true">{initials}</span>
		<div class="user-meta" class:rail-hide={rail}>
			<span class="user-name">{user.name}</span>
			<span class="user-role">{ROLE_LABELS[user.role]}</span>
		</div>
		<form method="POST" action="/admin/logout" class="logout">
			<button type="submit" aria-label="Afmelden" title="Afmelden"><LogOut size={18} /></button>
		</form>
	</div>
{/snippet}

<div class="shell" data-density="compact" data-theme={dark ? 'dark' : 'light'}>
	<aside class="sidebar" aria-label="CMS-navigatie">
		<a href="/admin" class="side-brand"><Logo inverse compact /></a>
		<nav class="side-nav">{@render navList(false)}</nav>
		{@render userBlock(false)}
	</aside>

	<aside class="rail" aria-label="CMS-navigatie">
		<a href="/admin" class="rail-brand" aria-label="Dashboard">
			<svg viewBox="0 0 64 64" width="36" height="36" aria-hidden="true"><rect width="64" height="64" rx="16" fill="rgb(255 255 255 / .1)" /><path d="M32 52V30" stroke="#84B582" stroke-width="4" stroke-linecap="round" /><path d="M32 34c-9 0-15-6-15-16 10 0 15 6 15 16Z" fill="#5B9858" /><path d="M32 30c0-10 6-16 16-16 0 10-6 16-16 16Z" fill="#84B582" /><path d="M18 52h28" stroke="#E3A72F" stroke-width="4" stroke-linecap="round" /></svg>
		</a>
		<nav class="side-nav">{@render navList(true)}</nav>
		{@render userBlock(true)}
	</aside>

	<div class="main-col">
		<header class="topbar">
			<button type="button" class="icon-btn burger" aria-label="Menu openen" onclick={() => (drawerOpen = true)}><Menu size={22} /></button>

			<nav class="crumbs" aria-label="Kruimelpad">
				<ol>
					{#each pageData.crumbs ?? [] as c (c.href)}
						<li><a href={c.href}>{c.label}</a><ChevronRight size={14} aria-hidden="true" /></li>
					{/each}
					{#if pageData.title}<li aria-current="page">{pageData.title}</li>{/if}
				</ol>
			</nav>

			<form class="search" role="search" action="/admin/zoeken" method="GET" onsubmit={(e) => {
				e.preventDefault();
				const q = new FormData(e.currentTarget).get('q');
				goto(`/admin/zoeken?q=${encodeURIComponent(String(q ?? ''))}`);
			}}>
				<Search size={16} aria-hidden="true" />
				<label for="cms-search" class="visually-hidden">Zoeken</label>
				<input bind:this={searchEl} id="cms-search" name="q" type="search" placeholder="Zoek klant, referentie…" value={page.url.pathname === '/admin/zoeken' ? (page.url.searchParams.get('q') ?? '') : ''} />
				<kbd aria-hidden="true">Ctrl K</kbd>
			</form>

			<div class="top-actions">
				{#if newItems.length}
					<div class="new">
						<button type="button" class="new-btn" aria-expanded={newOpen} aria-haspopup="true" onclick={() => (newOpen = !newOpen)}>
							<Plus size={18} aria-hidden="true" /><span>Nieuw</span>
						</button>
						{#if newOpen}
							<ul class="new-menu">
								{#each newItems as item (item.href)}
									<li><a href={item.href}>{item.label}</a></li>
								{/each}
							</ul>
						{/if}
					</div>
				{/if}
				<button type="button" class="icon-btn" aria-label={dark ? 'Licht thema' : 'Donker thema'} aria-pressed={dark} onclick={toggleTheme}>
					{#if dark}<Sun size={20} />{:else}<Moon size={20} />{/if}
				</button>
				<a class="icon-btn" href="/" target="_blank" rel="noopener" aria-label="Website bekijken (nieuw venster)" title="Website bekijken"><ExternalLink size={20} /></a>
			</div>
		</header>

		<main id="main" class="content">
			{@render children()}
		</main>
	</div>

	<Drawer bind:open={drawerOpen} title="Menu" side="left" width="300px" tone="inverse" closeLabel="Menu sluiten">
		{#snippet header()}<Logo inverse compact />{/snippet}
		<nav class="side-nav drawer-nav">{@render navList(false)}</nav>
		{#snippet footer()}{@render userBlock(false)}{/snippet}
	</Drawer>

	<Toaster />
</div>

<style>
	.shell {
		min-height: 100dvh;
		background: var(--color-bg);
		color: var(--color-text);
		font-size: var(--text-sm);
		display: grid;
		grid-template-columns: 1fr;
	}

	/* ---------- sidebar (lg) and rail (md) */
	.sidebar,
	.rail {
		display: none;
		position: sticky;
		top: 0;
		height: 100dvh;
		flex-direction: column;
		background: var(--forest-900);
		color: var(--linen-25);
	}
	.side-brand {
		display: flex;
		align-items: center;
		height: 64px;
		padding: 0 var(--space-5);
		text-decoration: none;
	}
	.rail-brand {
		display: grid;
		place-items: center;
		height: 64px;
	}
	.side-nav {
		flex: 1;
		overflow-y: auto;
		padding: var(--space-2) var(--space-3);
	}
	.drawer-nav {
		padding: 0;
	}
	.nav-section + .nav-section {
		margin-top: var(--space-4);
	}
	.nav-label {
		padding: 0 var(--space-3) var(--space-2);
		font-size: 11px;
		font-weight: 600;
		letter-spacing: 0.12em;
		text-transform: uppercase;
		color: var(--forest-300);
	}
	.side-nav ul {
		list-style: none;
		padding: 0;
		display: grid;
		gap: 2px;
	}
	.nav-item {
		position: relative;
		display: flex;
		align-items: center;
		gap: var(--space-3);
		height: 40px;
		padding: 0 var(--space-3);
		border-radius: 10px;
		color: var(--color-on-inverse-muted);
		text-decoration: none;
		font-weight: 500;
	}
	.nav-item:hover {
		background: rgb(255 255 255 / 0.06);
		color: var(--linen-25);
	}
	.nav-item[aria-current='page'] {
		background: var(--forest-700);
		color: var(--linen-25);
	}
	.nav-item[aria-current='page']::before {
		content: '';
		position: absolute;
		left: -12px;
		top: 8px;
		bottom: 8px;
		width: 3px;
		border-radius: 0 3px 3px 0;
		background: var(--harvest);
	}
	.nav-text {
		flex: 1;
	}
	.count {
		min-width: 22px;
		height: 20px;
		padding: 0 6px;
		border-radius: var(--radius-pill);
		background: var(--harvest);
		color: var(--neutral-900);
		font-size: 11px;
		font-weight: 700;
		display: inline-grid;
		place-items: center;
	}
	.count.rail-dot {
		position: absolute;
		top: 4px;
		right: 4px;
		min-width: 16px;
		height: 16px;
		padding: 0 4px;
		font-size: 10px;
	}

	.user {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-4);
		border-top: 1px solid rgb(255 255 255 / 0.08);
		width: 100%;
	}
	.user.rail {
		flex-direction: column;
		padding: var(--space-3) 0;
	}
	.avatar {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		flex-shrink: 0;
		border-radius: 50%;
		background: var(--forest-100);
		color: var(--forest-900);
		font-weight: 700;
		font-size: 13px;
	}
	.user-meta {
		display: grid;
		flex: 1;
		min-width: 0;
		line-height: 1.3;
	}
	.user-name {
		font-weight: 600;
		color: var(--linen-25);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.user-role {
		font-size: 12px;
		color: var(--forest-300);
	}
	.logout button {
		display: grid;
		place-items: center;
		width: 36px;
		height: 36px;
		border: 0;
		border-radius: 8px;
		background: transparent;
		color: var(--color-on-inverse-muted);
	}
	.logout button:hover {
		background: rgb(255 255 255 / 0.08);
		color: var(--linen-25);
	}

	/* ---------- topbar */
	.main-col {
		min-width: 0;
		display: flex;
		flex-direction: column;
	}
	.topbar {
		position: sticky;
		top: 0;
		z-index: 20;
		display: flex;
		align-items: center;
		gap: var(--space-3);
		height: 64px;
		padding: 0 var(--space-4);
		background: var(--color-surface);
		border-bottom: 1px solid var(--color-border);
	}
	.crumbs {
		flex: 1;
		min-width: 0;
	}
	.crumbs ol {
		display: flex;
		align-items: center;
		gap: 6px;
		list-style: none;
		padding: 0;
		white-space: nowrap;
		overflow: hidden;
	}
	.crumbs li {
		display: flex;
		align-items: center;
		gap: 6px;
		color: var(--color-text-muted);
	}
	.crumbs li[aria-current='page'] {
		color: var(--color-text);
		font-weight: 600;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.crumbs a {
		color: var(--color-text-muted);
		text-decoration: none;
	}
	.crumbs a:hover {
		color: var(--color-primary);
		text-decoration: underline;
	}
	.search {
		display: none;
		align-items: center;
		gap: var(--space-2);
		width: 300px;
		height: 36px;
		padding: 0 var(--space-3);
		border: 1.5px solid var(--color-border);
		border-radius: 10px;
		background: var(--color-bg);
		color: var(--color-text-muted);
	}
	.search:focus-within {
		border-color: var(--color-primary);
	}
	.search input {
		flex: 1;
		min-width: 0;
		border: 0;
		background: transparent;
		outline: none;
		font-size: var(--text-sm);
		color: var(--color-text);
	}
	kbd {
		font-family: var(--font-mono);
		font-size: 11px;
		padding: 2px 6px;
		border-radius: 4px;
		background: var(--color-surface-sunken);
		color: var(--color-text-muted);
	}
	.top-actions {
		display: flex;
		align-items: center;
		gap: var(--space-1);
	}
	.icon-btn {
		display: inline-grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border: 0;
		border-radius: 10px;
		background: transparent;
		color: var(--color-text-muted);
	}
	.icon-btn:hover {
		background: var(--color-surface-sunken);
		color: var(--color-text);
	}
	.new {
		position: relative;
	}
	.new-btn {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 36px;
		padding: 0 var(--space-3);
		border: 0;
		border-radius: 10px;
		background: var(--color-primary);
		color: var(--color-on-primary);
		font-weight: 600;
		font-size: var(--text-sm);
	}
	.new-btn:hover {
		background: var(--color-primary-hover);
	}
	.new-menu {
		position: absolute;
		right: 0;
		top: calc(100% + 6px);
		min-width: 200px;
		list-style: none;
		padding: 6px;
		border-radius: var(--radius-md);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		box-shadow: var(--shadow-2);
		z-index: 30;
	}
	.new-menu a {
		display: block;
		padding: 8px 10px;
		border-radius: 8px;
		color: var(--color-text);
		text-decoration: none;
	}
	.new-menu a:hover {
		background: var(--color-primary-subtle);
	}

	.content {
		flex: 1;
		width: 100%;
		max-width: 1440px;
		padding: var(--space-6) var(--space-4) var(--space-12);
	}
	.content:focus {
		outline: none;
	}

	@media (min-width: 640px) {
		.shell {
			grid-template-columns: 72px 1fr;
		}
		.rail {
			display: flex;
		}
		.rail .side-nav {
			padding: var(--space-2);
		}
		.rail .nav-item {
			justify-content: center;
			padding: 0;
		}
		.rail .nav-item[aria-current='page']::before {
			left: -8px;
		}
		.rail .nav-section + .nav-section {
			margin-top: var(--space-2);
			padding-top: var(--space-2);
			border-top: 1px solid rgb(255 255 255 / 0.08);
		}
		.rail-hide {
			display: none;
		}
		.burger {
			display: none;
		}
		.content {
			padding: var(--space-6) var(--space-6) var(--space-12);
		}
	}
	@media (min-width: 900px) {
		.search {
			display: flex;
		}
	}
	@media (min-width: 1024px) {
		.shell {
			grid-template-columns: 264px 1fr;
		}
		.rail {
			display: none;
		}
		.sidebar {
			display: flex;
		}
		.content {
			padding: var(--space-8) var(--space-8) var(--space-16);
		}
	}
</style>
