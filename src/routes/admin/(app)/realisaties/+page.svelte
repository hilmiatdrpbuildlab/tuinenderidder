<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import Plus from '@lucide/svelte/icons/plus';
	import Search from '@lucide/svelte/icons/search';
	import Star from '@lucide/svelte/icons/star';
	import ImageIcon from '@lucide/svelte/icons/image';
	import Pencil from '@lucide/svelte/icons/pencil';
	import Leaf from '@lucide/svelte/icons/leaf';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import Panel from '$lib/components/admin/Panel.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { toast } from '$lib/components/ui/toast.svelte';
	import { formatDay } from '$lib/components/admin/content/shared';

	let { data } = $props();
	let filterForm: HTMLFormElement | undefined = $state();

	onMount(() => {
		if (page.url.searchParams.has('verwijderd')) {
			toast.success('Realisatie verwijderd.');
			const url = new URL(page.url);
			url.searchParams.delete('verwijderd');
			replaceState(url, {});
		}
	});

	const statusTabs = $derived([
		{ value: '', label: 'Alle', count: data.counts.all },
		{ value: 'published', label: 'Gepubliceerd', count: data.counts.published },
		{ value: 'draft', label: 'Concept', count: data.counts.draft }
	]);

	function hrefFor(status: string) {
		const u = new URL(page.url);
		if (status) u.searchParams.set('status', status);
		else u.searchParams.delete('status');
		return u.pathname + u.search;
	}

	const hasFilters = $derived(!!(data.filters.status || data.filters.serviceId || data.filters.q));
</script>

<svelte:head><title>Realisaties · CMS</title></svelte:head>

<PageHeader title="Realisaties" description="Projecten in het portfolio. Publiceer een realisatie zodra titel, omslagfoto en alt-teksten in orde zijn.">
	{#snippet actions()}
		<Button href="/admin/realisaties/nieuw" size="sm">
			{#snippet iconStart()}<Plus size={16} />{/snippet}
			Nieuwe realisatie
		</Button>
	{/snippet}
</PageHeader>

<div class="toolbar">
	<nav class="tabs" aria-label="Filter op status">
		{#each statusTabs as t (t.value)}
			<a href={hrefFor(t.value)} aria-current={(data.filters.status ?? '') === t.value ? 'page' : undefined} data-sveltekit-noscroll>
				{t.label} <span class="count">{t.count}</span>
			</a>
		{/each}
	</nav>
	<form method="GET" class="filters" bind:this={filterForm} data-sveltekit-keepfocus data-sveltekit-noscroll>
		{#if data.filters.status}<input type="hidden" name="status" value={data.filters.status} />{/if}
		<div class="search">
			<Search size={16} aria-hidden="true" />
			<label for="pq" class="visually-hidden">Zoek op titel of gemeente</label>
			<input id="pq" type="search" name="q" value={data.filters.q} placeholder="Zoek titel of gemeente…" />
		</div>
		<label for="pdienst" class="visually-hidden">Dienst</label>
		<select id="pdienst" name="dienst" class="select" onchange={() => filterForm?.requestSubmit()}>
			<option value="">Alle diensten</option>
			{#each data.services as s (s.value)}
				<option value={s.value} selected={data.filters.serviceId === s.value}>{s.label}</option>
			{/each}
		</select>
		<Button type="submit" variant="outline" size="sm">Filteren</Button>
		{#if hasFilters}<a href="/admin/realisaties" class="reset">Wissen</a>{/if}
	</form>
</div>

{#if data.projects.length === 0}
	{#if hasFilters}
		<EmptyState compact title="Geen realisaties gevonden" text="Pas de filters aan of wis ze.">
			{#snippet actions()}<Button href="/admin/realisaties" variant="outline" size="sm">Filters wissen</Button>{/snippet}
		</EmptyState>
	{:else}
		<EmptyState title="Nog geen realisaties" text="Laat zien wat jullie gemaakt hebben: een titel, een paar foto’s en een kort verhaal volstaan.">
			{#snippet actions()}<Button href="/admin/realisaties/nieuw">Eerste realisatie toevoegen</Button>{/snippet}
		</EmptyState>
	{/if}
{:else}
	<Panel flush>
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						<th scope="col">Realisatie</th>
						<th scope="col" class="hide-md">Dienst</th>
						<th scope="col" class="num">Jaar</th>
						<th scope="col">Status</th>
						<th scope="col" class="hide-md">Bijgewerkt</th>
						<th scope="col"><span class="visually-hidden">Acties</span></th>
					</tr>
				</thead>
				<tbody>
					{#each data.projects as p (p.id)}
						<tr>
							<td>
								<a class="proj" href="/admin/realisaties/{p.id}">
									<span class="thumb">
										{#if p.cover}<img src={p.cover.thumb} alt="" loading="lazy" style:object-position="{p.cover.focalX * 100}% {p.cover.focalY * 100}%" />
										{:else}<Leaf size={20} aria-hidden="true" />{/if}
									</span>
									<span class="text">
										<span class="title">
											{p.title}
											{#if p.isFeatured}<span class="star" title="Uitgelicht op de homepagina"><Star size={14} aria-hidden="true" /><span class="visually-hidden">(uitgelicht)</span></span>{/if}
										</span>
										<span class="sub">{p.town || '—'} · <ImageIcon size={12} aria-hidden="true" /> {p.photoCount} foto’s</span>
									</span>
								</a>
							</td>
							<td class="hide-md">{p.serviceTitle ?? '—'}</td>
							<td class="num">{p.year}</td>
							<td><StatusBadge status={p.status} /></td>
							<td class="hide-md muted">{formatDay(p.updatedAt)}</td>
							<td class="act">
								<a class="icon-btn" href="/admin/realisaties/{p.id}" aria-label="{p.title} bewerken" title="Bewerken"><Pencil size={16} /></a>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</Panel>
{/if}

<style>
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		align-items: center;
		gap: var(--space-3);
		margin-bottom: var(--space-4);
	}
	.tabs {
		display: flex;
		gap: 4px;
		padding: 3px;
		border-radius: var(--radius-md);
		background: var(--color-surface-sunken);
	}
	.tabs a {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		height: 30px;
		padding: 0 var(--space-3);
		border-radius: 9px;
		color: var(--color-text-muted);
		font-weight: 600;
		font-size: var(--text-sm);
		text-decoration: none;
	}
	.tabs a[aria-current='page'] {
		background: var(--color-surface);
		color: var(--color-primary);
		box-shadow: var(--shadow-1);
	}
	.count {
		font-size: var(--text-xs);
		font-weight: 500;
		color: var(--color-text-muted);
	}
	.filters {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
	}
	.search {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		height: var(--control-h);
		padding: 0 var(--space-3);
		border: 1.5px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		color: var(--color-text-muted);
	}
	.search:focus-within {
		border-color: var(--color-primary);
	}
	.search input {
		width: 200px;
		border: 0;
		outline: none;
		background: transparent;
		color: var(--color-text);
		font-size: var(--text-sm);
	}
	.select {
		height: var(--control-h);
		padding: 0 var(--space-3);
		border: 1.5px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		color: var(--color-text);
		font-size: var(--text-sm);
	}
	.reset {
		font-size: var(--text-sm);
	}
	.table-wrap {
		overflow-x: auto;
	}
	table {
		width: 100%;
		border-collapse: collapse;
	}
	th {
		text-align: left;
		padding: 10px 16px;
		background: var(--color-surface-sunken);
		color: var(--color-text-muted);
		font-size: var(--text-xs);
		font-weight: 600;
		white-space: nowrap;
	}
	td {
		padding: 8px 16px;
		border-top: 1px solid var(--color-border);
		vertical-align: middle;
	}
	tbody tr:hover td {
		background: var(--color-bg-alt);
	}
	.proj {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		color: var(--color-text);
		text-decoration: none;
		min-width: 220px;
	}
	.thumb {
		display: grid;
		place-items: center;
		flex-shrink: 0;
		width: 64px;
		height: 64px;
		border-radius: var(--radius-sm);
		overflow: hidden;
		background: var(--color-surface-sunken);
		color: var(--color-text-muted);
	}
	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.text {
		display: grid;
		gap: 2px;
		min-width: 0;
	}
	.title {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		font-weight: 600;
	}
	.proj:hover .title {
		color: var(--color-primary);
		text-decoration: underline;
	}
	.star {
		display: inline-flex;
		color: var(--color-warning);
	}
	.sub {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: var(--text-xs);
		color: var(--color-text-muted);
	}
	.num {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
	.muted {
		color: var(--color-text-muted);
		font-size: var(--text-sm);
		white-space: nowrap;
	}
	.act {
		text-align: right;
		width: 48px;
	}
	.icon-btn {
		display: inline-grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: 8px;
		color: var(--color-text-muted);
	}
	.icon-btn:hover {
		background: var(--color-surface-sunken);
		color: var(--color-text);
	}
	@media (max-width: 860px) {
		.hide-md {
			display: none;
		}
	}
</style>
