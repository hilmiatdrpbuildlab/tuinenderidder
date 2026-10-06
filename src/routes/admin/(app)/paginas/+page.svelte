<script lang="ts">
	import FileText from '@lucide/svelte/icons/file-text';
	import House from '@lucide/svelte/icons/house';
	import Users from '@lucide/svelte/icons/users';
	import Phone from '@lucide/svelte/icons/phone';
	import Scale from '@lucide/svelte/icons/scale';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import Panel from '$lib/components/admin/Panel.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import { PAGE_PATHS } from '$lib/components/admin/content/page-fields';
	import { formatDateTime } from '$lib/components/admin/content/shared';

	let { data } = $props();

	const icons = { home: House, about: Users, contact: Phone, privacy: Scale, cookies: Scale, terms: Scale } as const;
	const descriptions = {
		home: 'Hero, kerncijfers, “Waarom De Ridder” en sectietitels',
		about: 'Intro, verhaal, waarden en cijfers',
		contact: 'Intro boven het contactformulier',
		privacy: 'Juridische tekst',
		cookies: 'Juridische tekst',
		terms: 'Juridische tekst'
	} as const;
</script>

<svelte:head><title>Pagina's · CMS</title></svelte:head>

<PageHeader title="Pagina's" description="Vaste pagina's van de website. Diensten en realisaties beheer je in hun eigen onderdeel." />

<Panel flush>
	<ul class="list">
		{#each data.pages as p (p.key)}
			{@const Icon = icons[p.key] ?? FileText}
			<li>
				<a href="/admin/paginas/{p.key}" class="row">
					<span class="ico"><Icon size={20} aria-hidden="true" /></span>
					<span class="main">
						<span class="title">{p.label}</span>
						<span class="sub">{descriptions[p.key]} · <span class="mono">{PAGE_PATHS[p.key]}</span></span>
					</span>
					<span class="badges">
						{#if p.enComplete}<Badge tone="success" dot>NL + EN</Badge>{:else}<Badge tone="warning" dot>EN valt terug op NL</Badge>{/if}
					</span>
					<span class="date">{p.updatedAt ? `Bijgewerkt ${formatDateTime(p.updatedAt)}` : 'Nog niet ingevuld'}</span>
					<ChevronRight size={18} aria-hidden="true" />
				</a>
			</li>
		{/each}
	</ul>
</Panel>

<style>
	.list {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	li + li {
		border-top: 1px solid var(--color-border);
	}
	.row {
		display: grid;
		grid-template-columns: 40px 1fr auto auto 18px;
		align-items: center;
		gap: var(--space-4);
		padding: var(--space-3) var(--space-5);
		color: var(--color-text);
		text-decoration: none;
	}
	.row:hover {
		background: var(--color-bg-alt);
	}
	.row:hover .title {
		color: var(--color-primary);
		text-decoration: underline;
	}
	.row:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: -2px;
	}
	.ico {
		display: grid;
		place-items: center;
		width: 40px;
		height: 40px;
		border-radius: 10px;
		background: var(--color-primary-subtle);
		color: var(--color-primary);
	}
	.main {
		display: grid;
		min-width: 0;
	}
	.title {
		font-weight: 600;
	}
	.sub,
	.date {
		font-size: var(--text-xs);
		color: var(--color-text-muted);
	}
	.mono {
		font-family: var(--font-mono);
	}
	@media (max-width: 760px) {
		.row {
			grid-template-columns: 40px 1fr 18px;
		}
		.badges,
		.date {
			display: none;
		}
	}
</style>
