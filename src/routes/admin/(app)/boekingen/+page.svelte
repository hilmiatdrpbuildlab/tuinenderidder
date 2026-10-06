<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { navigating, page } from '$app/state';
	import Search from '@lucide/svelte/icons/search';
	import Plus from '@lucide/svelte/icons/plus';
	import Download from '@lucide/svelte/icons/download';
	import Columns3 from '@lucide/svelte/icons/columns-3';
	import PanelRightOpen from '@lucide/svelte/icons/panel-right-open';
	import StickyNote from '@lucide/svelte/icons/sticky-note';
	import X from '@lucide/svelte/icons/x';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import DataTable, { type Column } from '$lib/components/admin/DataTable.svelte';
	import FilterChip from '$lib/components/admin/FilterChip.svelte';
	import Pagination from '$lib/components/admin/Pagination.svelte';
	import BookingDrawer from '$lib/components/admin/BookingDrawer.svelte';
	import Avatar from '$lib/components/admin/Avatar.svelte';
	import { enhanceToast } from '$lib/components/admin/enhance';
	import { shortDay } from '$lib/components/admin/format';
	import Button from '$lib/components/ui/Button.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import {
		BOOKING_STATUSES,
		BOOKING_TYPES,
		SLOT_LABELS,
		SOURCE_LABELS,
		STATUS_META,
		TYPE_LABELS,
		type BookingStatus
	} from '$lib/domain';
	import type { BookingRow } from '$lib/server/admin/bookings';

	let { data } = $props();

	const PERIODS: Record<string, string> = {
		vandaag: 'Vandaag',
		week: 'Deze week',
		'volgende-week': 'Volgende week',
		maand: 'Deze maand',
		komend: 'Vanaf vandaag',
		verleden: 'Verleden',
		'zonder-datum': 'Zonder datum'
	};

	const columns: Column[] = [
		{ key: 'referentie', label: 'Referentie', sortable: true },
		{ key: 'klant', label: 'Klant', sortable: true },
		{ key: 'dienst', label: 'Dienst', hideable: true, hideBelow: 'lg' },
		{ key: 'datum', label: 'Datum & slot', sortable: true, hideable: true },
		{ key: 'status', label: 'Status', sortable: true },
		{ key: 'bron', label: 'Bron', sortable: true, hideable: true, hideBelow: 'xl' },
		{ key: 'toegewezen', label: 'Toegewezen aan', hideable: true, hideBelow: 'lg' },
		{ key: 'acties', label: '', align: 'end', width: '56px' }
	];

	/* ------------------------------------------------------------ URL helpers */
	function hrefWith(params: Record<string, string | null>, keep: 'all' | 'filters' = 'filters') {
		const u = new URL(page.url);
		if (keep === 'filters') {
			u.searchParams.delete('page');
			u.searchParams.delete('open');
		}
		for (const [k, v] of Object.entries(params)) {
			if (v === null || v === '') u.searchParams.delete(k);
			else u.searchParams.set(k, v);
		}
		return u.pathname + u.search;
	}
	const openHref = (id: number) => hrefWith({ open: String(id) }, 'all');
	const sortHref = (key: string, dir: 'asc' | 'desc') => hrefWith({ sort: key, dir });

	/* ------------------------------------------------------------ search (debounced, synced to ?q=) */
	let q = $state('');
	$effect.pre(() => {
		q = data.filters.q;
	});
	let timer: ReturnType<typeof setTimeout> | undefined;
	function onSearch() {
		clearTimeout(timer);
		timer = setTimeout(() => {
			goto(hrefWith({ q: q.trim() || null }), { keepFocus: true, noScroll: true, replaceState: true });
		}, 300);
	}
	const searchHidden = $derived([...page.url.searchParams.entries()].filter(([k]) => !['q', 'page', 'open'].includes(k)));

	/* ------------------------------------------------------------ saved views */
	const views = [
		{ key: 'week', label: 'Deze week', params: { periode: 'week', sort: 'datum', dir: 'asc' } },
		{ key: 'confirm', label: 'Te bevestigen', params: { status: 'new,pending' } },
		{ key: 'all', label: 'Alles', params: {} }
	] as const;
	const FILTER_KEYS = ['q', 'status', 'dienst', 'type', 'periode', 'toegewezen'];
	function viewActive(params: Record<string, string>) {
		return FILTER_KEYS.every((k) => (page.url.searchParams.get(k) ?? '') === (params[k] ?? ''));
	}
	const viewHref = (params: Record<string, string>) => {
		const u = new URL(page.url.pathname, page.url.origin);
		for (const [k, v] of Object.entries(params)) u.searchParams.set(k, v);
		const per = page.url.searchParams.get('per');
		if (per) u.searchParams.set('per', per);
		return u.pathname + u.search;
	};

	/* ------------------------------------------------------------ filters */
	const statusValue = $derived(
		data.filters.statuses.length === 0
			? null
			: data.filters.statuses.length <= 2
				? data.filters.statuses.map((s) => STATUS_META[s].nl).join(', ')
				: `${data.filters.statuses.length} statussen`
	);
	const serviceValue = $derived(data.services.find((s) => s.id === data.filters.serviceId)?.title ?? null);
	const assigneeValue = $derived(
		data.filters.assignee === 'none' ? 'Niemand' : (data.assignees.find((a) => a.id === data.filters.assignee)?.name ?? null)
	);
	const statusHidden = $derived([...page.url.searchParams.entries()].filter(([k]) => !['status', 'page', 'open'].includes(k)));
	const anyFilter = $derived(FILTER_KEYS.some((k) => page.url.searchParams.has(k)));

	/* ------------------------------------------------------------ columns (persisted per browser) */
	const COLS_KEY = 'tdr-cms-bookings-columns';
	let hidden = $state<string[]>([]);
	$effect(() => {
		try {
			const raw = localStorage.getItem(COLS_KEY);
			if (raw) hidden = JSON.parse(raw);
		} catch {
			/* storage unavailable */
		}
	});
	function toggleColumn(key: string, show: boolean) {
		hidden = show ? hidden.filter((k) => k !== key) : [...hidden, key];
		try {
			localStorage.setItem(COLS_KEY, JSON.stringify(hidden));
		} catch {
			/* ignore */
		}
	}

	/* ------------------------------------------------------------ selection + bulk */
	let selected = $state<number[]>([]);
	let mounted = $state(false);
	$effect(() => {
		mounted = true;
	});
	let bulkBusy = $state(false);
	const exportHref = $derived(`/admin/boekingen/export.csv${page.url.search ? page.url.search : ''}`);
	const selectionExportHref = $derived(`/admin/boekingen/export.csv?ids=${selected.join(',')}`);

	/* ------------------------------------------------------------ loading (only when slow) */
	let slow = $state(false);
	$effect(() => {
		const nav = navigating.to;
		if (nav && nav.url.pathname === '/admin/boekingen' && !nav.url.searchParams.has('open')) {
			const t = setTimeout(() => (slow = true), 250);
			return () => {
				clearTimeout(t);
				slow = false;
			};
		}
		slow = false;
	});

	const rowLabel = (r: BookingRow) => `${r.reference} ${r.customer.name}`;
</script>

<svelte:head><title>Boekingen · CMS Tuinen De Ridder</title></svelte:head>

<PageHeader title="Boekingen" description="Alle afspraken, onderhoudsbeurten en offerteaanvragen.">
	{#snippet actions()}
		<Button href={exportHref} variant="outline" size="sm" data-sveltekit-reload>
			{#snippet iconStart()}<Download />{/snippet}
			Exporteren (CSV)
		</Button>
		<Button href="/admin/boekingen/nieuw" size="sm">
			{#snippet iconStart()}<Plus />{/snippet}
			Nieuwe boeking
		</Button>
	{/snippet}
</PageHeader>

{#if data.detailMissing}
	<div class="notice"><Alert tone="warning" dismissible>Deze boeking bestaat niet (meer).</Alert></div>
{/if}

<BookingDrawer booking={data.detail} assignees={data.assignees} slots={data.slots} />

<section class="panel" aria-label="Boekingenlijst">
	<!-- views -->
	<nav class="views" aria-label="Opgeslagen weergaven">
		{#each views as v (v.key)}
			<a href={viewHref(v.params)} aria-current={viewActive(v.params) ? 'true' : undefined} data-sveltekit-noscroll>{v.label}</a>
		{/each}
	</nav>

	<!-- toolbar -->
	<div class="toolbar">
		<form method="GET" role="search" class="search" onsubmit={(e) => {
			e.preventDefault();
			clearTimeout(timer);
			goto(hrefWith({ q: q.trim() || null }), { keepFocus: true, noScroll: true });
		}}>
			{#each searchHidden as [k, v], i (k + i)}<input type="hidden" name={k} value={v} />{/each}
			<Search size={16} aria-hidden="true" />
			<label for="bk-search" class="visually-hidden">Zoek op referentie, naam, e-mail, telefoon of gemeente</label>
			<input id="bk-search" name="q" type="search" placeholder="Zoek referentie, klant, gemeente…" bind:value={q} oninput={onSearch} autocomplete="off" />
		</form>

		<div class="chips">
			<FilterChip label="Status" value={statusValue} clearHref={hrefWith({ status: null })}>
				{#snippet children()}
					<form method="GET" onsubmit={(e) => {
						e.preventDefault();
						const vals = new FormData(e.currentTarget).getAll('st').map(String);
						goto(hrefWith({ status: vals.join(',') || null }), { keepFocus: true, noScroll: true });
					}}>
						{#each statusHidden as [k, v], i (k + i)}<input type="hidden" name={k} value={v} />{/each}
						{#each BOOKING_STATUSES as s (s)}
							<label class="menu-check">
								<input type="checkbox" name="st" value={s} checked={data.filters.statuses.includes(s)} />
								<StatusBadge status={s} />
							</label>
						{/each}
						<div class="menu-foot"><Button type="submit" size="sm">Toepassen</Button></div>
					</form>
				{/snippet}
			</FilterChip>

			<FilterChip label="Dienst" value={serviceValue} clearHref={hrefWith({ dienst: null })}>
				{#snippet children()}
					{#each data.services as s (s.id)}
						<a class="menu-link" href={hrefWith({ dienst: String(s.id) })} aria-current={data.filters.serviceId === s.id ? 'true' : undefined} data-sveltekit-noscroll>
							<Icon name={s.icon} size={16} />
							{s.title}
						</a>
					{/each}
				{/snippet}
			</FilterChip>

			<FilterChip label="Type" value={data.filters.type ? TYPE_LABELS[data.filters.type].nl : null} clearHref={hrefWith({ type: null })}>
				{#snippet children()}
					{#each BOOKING_TYPES as t (t)}
						<a class="menu-link" href={hrefWith({ type: t })} aria-current={data.filters.type === t ? 'true' : undefined} data-sveltekit-noscroll>{TYPE_LABELS[t].nl}</a>
					{/each}
				{/snippet}
			</FilterChip>

			<FilterChip label="Periode" value={data.filters.period ? PERIODS[data.filters.period] : null} clearHref={hrefWith({ periode: null })}>
				{#snippet children()}
					{#each Object.entries(PERIODS) as [k, label] (k)}
						<a class="menu-link" href={hrefWith({ periode: k })} aria-current={data.filters.period === k ? 'true' : undefined} data-sveltekit-noscroll>{label}</a>
					{/each}
				{/snippet}
			</FilterChip>

			<FilterChip label="Toegewezen" value={assigneeValue} clearHref={hrefWith({ toegewezen: null })}>
				{#snippet children()}
					<a class="menu-link" href={hrefWith({ toegewezen: 'geen' })} aria-current={data.filters.assignee === 'none' ? 'true' : undefined} data-sveltekit-noscroll>Niemand</a>
					{#each data.assignees as a (a.id)}
						<a class="menu-link" href={hrefWith({ toegewezen: String(a.id) })} aria-current={data.filters.assignee === a.id ? 'true' : undefined} data-sveltekit-noscroll>
							<Avatar name={a.name} size={22} />
							{a.name}
						</a>
					{/each}
				{/snippet}
			</FilterChip>

			{#if anyFilter}
				<a class="reset" href="/admin/boekingen" data-sveltekit-noscroll><X size={14} aria-hidden="true" /> Alles wissen</a>
			{/if}
		</div>

		{#if mounted}
			<div class="cols">
				<FilterChip label="Kolommen" align="end">
					{#snippet icon()}<Columns3 size={14} />{/snippet}
					{#snippet children()}
						<fieldset class="col-set">
							<legend class="visually-hidden">Zichtbare kolommen</legend>
							{#each columns.filter((c) => c.hideable) as c (c.key)}
								<label class="menu-check">
									<input type="checkbox" checked={!hidden.includes(c.key)} onchange={(e) => toggleColumn(c.key, e.currentTarget.checked)} />
									{c.label}
								</label>
							{/each}
						</fieldset>
					{/snippet}
				</FilterChip>
			</div>
		{/if}
	</div>

	<!-- bulk bar -->
	<form
		id="bulk"
		method="POST"
		action="?/bulkStatus"
		class="bulk"
		class:show={!mounted || selected.length > 0}
		use:enhance={enhanceToast({ pending: (b) => (bulkBusy = b), after: (ok) => ok && (selected = []) })}
	>
		<p class="bulk-count" aria-live="polite">
			{#if mounted}<strong>{selected.length}</strong> geselecteerd{:else}Met selectie:{/if}
		</p>
		<div class="bulk-group">
			<label for="bulk-status" class="visually-hidden">Nieuwe status</label>
			<select id="bulk-status" name="status" class="mini">
				{#each BOOKING_STATUSES.filter((s) => s !== 'new') as s (s)}<option value={s}>{STATUS_META[s as BookingStatus].nl}</option>{/each}
			</select>
			<Button type="submit" size="sm" variant="outline" formaction="?/bulkStatus" loading={bulkBusy}>Status wijzigen</Button>
		</div>
		<div class="bulk-group">
			<label for="bulk-assignee" class="visually-hidden">Medewerker</label>
			<select id="bulk-assignee" name="assignee" class="mini">
				<option value="geen">Niemand</option>
				{#each data.assignees as a (a.id)}<option value={String(a.id)}>{a.name}</option>{/each}
			</select>
			<Button type="submit" size="sm" variant="outline" formaction="?/bulkAssign">Toewijzen</Button>
		</div>
		<label class="bulk-check"><input type="checkbox" name="notify" checked /> Klanten mailen</label>
		{#if mounted}
			<Button href={selectionExportHref} size="sm" variant="ghost" data-sveltekit-reload>
				{#snippet iconStart()}<Download />{/snippet}
				Exporteren
			</Button>
			<button type="button" class="bulk-clear" onclick={() => (selected = [])}>Selectie wissen</button>
		{/if}
	</form>

	<div class="table-wrap" class:dim={slow}>
		<DataTable
			rows={data.rows}
			{columns}
			label="Boekingen"
			sort={data.filters.sort}
			dir={data.filters.dir}
			{sortHref}
			{hidden}
			selectable
			bind:selected
			form="bulk"
			rowHref={(r) => openHref(r.id)}
			activeId={data.detail?.id ?? null}
			loading={slow && data.rows.length === 0}
			{rowLabel}
		>
			{#snippet cell(r, key)}
				{#if key === 'referentie'}
					<a class="ref" href={openHref(r.id)} data-sveltekit-noscroll data-sveltekit-keepfocus>{r.reference}</a>
					<span class="sub">{TYPE_LABELS[r.type].nl}</span>
				{:else if key === 'klant'}
					<span class="name">{r.customer.name}</span>
					<span class="sub">{r.customer.town || '—'}</span>
				{:else if key === 'dienst'}
					{#if r.services.length}
						<span class="svc"><Icon name={r.services[0].icon} size={16} /> {r.services[0].title}{#if r.services.length > 1}<span class="more" title={r.services.slice(1).map((s) => s.title).join(', ')}>+{r.services.length - 1}</span>{/if}</span>
					{:else}<span class="sub">—</span>{/if}
				{:else if key === 'datum'}
					{#if r.slot}
						<span class="date">{shortDay(r.slot.date)}</span>
						<span class="sub">{SLOT_LABELS[r.slot.kind].nl} · {r.slot.start}</span>
					{:else}
						<span class="sub">Nog in te plannen</span>
					{/if}
				{:else if key === 'status'}
					<StatusBadge status={r.status} />
				{:else if key === 'bron'}
					{SOURCE_LABELS[r.source]}
				{:else if key === 'toegewezen'}
					{#if r.assignee}
						<span class="assignee"><Avatar name={r.assignee.name} size={26} /> <span class="assignee-name">{r.assignee.name.split(' ')[0]}</span></span>
					{:else}<span class="sub">—</span>{/if}
				{:else if key === 'acties'}
					<span class="row-actions">
						{#if r.hasNotes}<span class="note-ico" title="Heeft interne notitie"><StickyNote size={16} aria-label="Heeft interne notitie" /></span>{/if}
						<a class="icon-link" href={openHref(r.id)} aria-label="Details van {r.reference} openen" data-sveltekit-noscroll data-sveltekit-keepfocus><PanelRightOpen size={18} /></a>
					</span>
				{/if}
			{/snippet}

			{#snippet card(r)}
				<a class="card-link" href={openHref(r.id)} data-sveltekit-noscroll>
					<span class="card-top">
						<span class="ref">{r.reference}</span>
						<StatusBadge status={r.status} />
					</span>
					<span class="name">{r.customer.name}{#if r.customer.town}<span class="sub inline"> · {r.customer.town}</span>{/if}</span>
					<span class="sub">
						{#if r.slot}{shortDay(r.slot.date)} · {SLOT_LABELS[r.slot.kind].nl} {r.slot.start}{:else}Nog in te plannen{/if}
						{#if r.services.length} · {r.services.map((s) => s.title).join(', ')}{/if}
					</span>
					{#if r.assignee}<span class="sub">Toegewezen aan {r.assignee.name}</span>{/if}
				</a>
			{/snippet}

			{#snippet empty()}
				{#if anyFilter}
					<EmptyState compact title="Geen boekingen gevonden" text="Er zijn geen boekingen die aan deze filters voldoen.">
						{#snippet actions()}<Button href="/admin/boekingen" variant="outline" size="sm">Filters wissen</Button>{/snippet}
					</EmptyState>
				{:else}
					<EmptyState title="Nog geen boekingen — deel je boekingslink" text="Klanten kunnen online een afspraak maken via de website. Telefonische boekingen voeg je hier zelf toe.">
						{#snippet actions()}
							<Button href="/boeken" variant="outline" size="sm" target="_blank">Boekingspagina bekijken</Button>
							<Button href="/admin/boekingen/nieuw" size="sm">Boeking toevoegen</Button>
						{/snippet}
					</EmptyState>
				{/if}
			{/snippet}
		</DataTable>
	</div>

	{#if data.total > 0}
		<Pagination url={page.url} page={data.page} pages={data.pages} per={data.filters.per} total={data.total} label="Paginering boekingen" />
	{/if}
</section>

<style>
	.notice {
		margin-bottom: var(--space-4);
	}
	.panel {
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		box-shadow: var(--shadow-1);
		min-width: 0;
	}
	.views {
		display: flex;
		gap: var(--space-1);
		padding: var(--space-3) var(--space-4) 0;
		border-bottom: 1px solid var(--color-border);
		overflow-x: auto;
	}
	.views a {
		position: relative;
		padding: var(--space-2) var(--space-3) var(--space-3);
		color: var(--color-text-muted);
		font-weight: 600;
		text-decoration: none;
		white-space: nowrap;
	}
	.views a:hover {
		color: var(--color-text);
	}
	.views a[aria-current='true'] {
		color: var(--color-primary-hover);
	}
	.views a[aria-current='true']::after {
		content: '';
		position: absolute;
		left: var(--space-3);
		right: var(--space-3);
		bottom: -1px;
		height: 2px;
		border-radius: 2px;
		background: var(--color-primary);
	}
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
	}
	.search {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		flex: 1 1 240px;
		max-width: 340px;
		height: 36px;
		padding: 0 var(--space-3);
		border: 1.5px solid var(--color-border-strong);
		border-radius: 10px;
		background: var(--color-surface);
		color: var(--color-text-muted);
	}
	.search:focus-within {
		border-color: var(--color-primary);
		outline: 2px solid var(--color-focus);
		outline-offset: 1px;
	}
	.search input {
		flex: 1;
		min-width: 0;
		border: 0;
		outline: none;
		background: transparent;
		color: var(--color-text);
		font-size: var(--text-sm);
	}
	.chips {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
	}
	.reset {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: var(--text-sm);
		font-weight: 600;
	}
	.cols {
		margin-left: auto;
	}
	.col-set {
		border: 0;
		padding: 0;
	}

	.bulk {
		display: none;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
		padding: var(--space-2) var(--space-4);
		background: var(--color-primary-subtle);
		border-block: 1px solid var(--color-border);
		font-size: var(--text-sm);
	}
	.bulk.show {
		display: flex;
	}
	.bulk-count strong {
		font-variant-numeric: tabular-nums;
	}
	.bulk-group {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}
	.mini {
		height: 32px;
		padding: 0 var(--space-2);
		border: 1.5px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		color: var(--color-text);
	}
	.bulk-check {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.bulk-check input {
		accent-color: var(--color-primary);
	}
	.bulk-clear {
		margin-left: auto;
		border: 0;
		background: none;
		color: var(--color-link);
		font-weight: 600;
		text-decoration: underline;
	}

	.table-wrap {
		transition: opacity var(--dur-fast) var(--ease-out);
	}
	.table-wrap.dim {
		opacity: 0.55;
	}
	.ref {
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		font-weight: 600;
		color: var(--color-link);
		text-decoration: none;
		white-space: nowrap;
	}
	a.ref:hover {
		text-decoration: underline;
	}
	.name {
		display: block;
		font-weight: 600;
		color: var(--color-text);
	}
	.sub {
		display: block;
		font-size: var(--text-xs);
		color: var(--color-text-muted);
	}
	.sub.inline {
		display: inline;
	}
	.date {
		display: block;
		white-space: nowrap;
	}
	.svc {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.svc :global(svg) {
		color: var(--color-primary);
		flex-shrink: 0;
	}
	.more {
		margin-left: 4px;
		padding: 0 6px;
		border-radius: var(--radius-pill);
		background: var(--color-surface-sunken);
		font-size: var(--text-xs);
		font-weight: 600;
	}
	.assignee {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.row-actions {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
	}
	.note-ico {
		display: inline-flex;
		color: var(--color-text-muted);
	}
	.icon-link {
		display: inline-grid;
		place-items: center;
		width: 32px;
		height: 32px;
		border-radius: 8px;
		color: var(--color-text-muted);
	}
	.icon-link:hover {
		background: var(--color-surface-sunken);
		color: var(--color-text);
	}
	.card-link {
		display: grid;
		gap: 4px;
		color: inherit;
		text-decoration: none;
	}
	.card-top {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
	}
	@media (max-width: 639px) {
		.search {
			max-width: none;
			flex-basis: 100%;
		}
		.cols {
			display: none;
		}
	}
</style>
