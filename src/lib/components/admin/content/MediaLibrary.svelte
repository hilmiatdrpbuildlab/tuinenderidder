<script lang="ts">
	import type { Snippet } from 'svelte';
	import LayoutGrid from '@lucide/svelte/icons/layout-grid';
	import ListIcon from '@lucide/svelte/icons/list';
	import Search from '@lucide/svelte/icons/search';
	import TriangleAlert from '@lucide/svelte/icons/triangle-alert';
	import Check from '@lucide/svelte/icons/check';
	import ImageOff from '@lucide/svelte/icons/image-off';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { formatBytes, type MediaItem } from './shared';

	/**
	 * Media grid/list with search (filename + alt), folder filter, "zonder alt-tekst" and
	 * "niet gebruikt" filters and selection. `mode="browse"` opens items (link or callback) and
	 * offers checkboxes for bulk actions; "single"/"multiple" are for the picker.
	 */
	interface Props {
		items: MediaItem[];
		folders?: string[];
		mode?: 'browse' | 'single' | 'multiple';
		selected?: number[];
		view?: 'grid' | 'list';
		hrefFor?: (item: MediaItem) => string;
		onopen?: (item: MediaItem) => void;
		/** Highlight item (open in drawer) */
		current?: number | null;
		bulk?: Snippet<[number[]]>;
		q?: string;
		folder?: string;
		filter?: 'all' | 'noalt' | 'unused';
	}

	let {
		items,
		folders = [],
		mode = 'browse',
		selected = $bindable([]),
		view = $bindable('grid'),
		hrefFor,
		onopen,
		current = null,
		bulk,
		q = $bindable(''),
		folder = $bindable(''),
		filter = $bindable('all')
	}: Props = $props();

	const uid = $props.id();
	const allFolders = $derived([...new Set([...folders, ...items.map((i) => i.folder)])].sort());

	const visible = $derived.by(() => {
		const needle = q.trim().toLowerCase();
		return items.filter((i) => {
			if (folder && i.folder !== folder && !i.folder.startsWith(folder + '/')) return false;
			if (filter === 'noalt' && i.altNl.trim()) return false;
			if (filter === 'unused' && i.usageCount > 0) return false;
			if (needle && !`${i.filename} ${i.altNl} ${i.altEn}`.toLowerCase().includes(needle)) return false;
			return true;
		});
	});

	const missingAlt = $derived(items.filter((i) => !i.altNl.trim()).length);
	const isSelected = (id: number) => selected.includes(id);

	function toggle(id: number) {
		if (mode === 'single') selected = isSelected(id) ? [] : [id];
		else selected = isSelected(id) ? selected.filter((x) => x !== id) : [...selected, id];
	}

	function activate(item: MediaItem, e?: MouseEvent) {
		if (mode === 'browse') {
			if (onopen) {
				e?.preventDefault();
				onopen(item);
			}
			return;
		}
		e?.preventDefault();
		toggle(item.id);
	}

	const allVisibleSelected = $derived(visible.length > 0 && visible.every((i) => selected.includes(i.id)));
	function toggleAll() {
		const ids = visible.map((i) => i.id);
		selected = allVisibleSelected ? selected.filter((id) => !ids.includes(id)) : [...new Set([...selected, ...ids])];
	}
</script>

<div class="library">
	<div class="toolbar">
		<div class="search">
			<Search size={16} aria-hidden="true" />
			<label for="{uid}-q" class="visually-hidden">Zoek op bestandsnaam of alt-tekst</label>
			<input
				id="{uid}-q"
				type="search"
				placeholder="Zoek op bestandsnaam of alt-tekst…"
				bind:value={q}
				onkeydown={(e) => e.key === 'Enter' && e.preventDefault()}
			/>
		</div>
		<label class="visually-hidden" for="{uid}-folder">Map</label>
		<select id="{uid}-folder" class="select" bind:value={folder}>
			<option value="">Alle mappen</option>
			{#each allFolders as f (f)}<option value={f}>{f}</option>{/each}
		</select>
		<div class="chips" role="group" aria-label="Filter">
			<button type="button" class="chip" aria-pressed={filter === 'all'} onclick={() => (filter = 'all')}>Alle <span>{items.length}</span></button>
			<button type="button" class="chip" aria-pressed={filter === 'noalt'} onclick={() => (filter = 'noalt')}>
				<TriangleAlert size={14} aria-hidden="true" /> Zonder alt-tekst <span>{missingAlt}</span>
			</button>
			<button type="button" class="chip" aria-pressed={filter === 'unused'} onclick={() => (filter = 'unused')}>Niet gebruikt</button>
		</div>
		<div class="views" role="group" aria-label="Weergave">
			<button type="button" aria-pressed={view === 'grid'} aria-label="Rasterweergave" title="Raster" onclick={() => (view = 'grid')}><LayoutGrid size={16} /></button>
			<button type="button" aria-pressed={view === 'list'} aria-label="Lijstweergave" title="Lijst" onclick={() => (view = 'list')}><ListIcon size={16} /></button>
		</div>
	</div>

	{#if (mode !== 'single' && selected.length > 0) || (mode === 'browse' && bulk)}
		<div class="selection" class:has={selected.length > 0}>
			<label class="all">
				<input type="checkbox" checked={allVisibleSelected} onchange={toggleAll} />
				{selected.length ? `${selected.length} geselecteerd` : 'Alles selecteren'}
			</label>
			{#if selected.length}
				<button type="button" class="link-btn" onclick={() => (selected = [])}>Selectie wissen</button>
				{#if bulk}{@render bulk(selected)}{/if}
			{/if}
		</div>
	{/if}

	<p class="visually-hidden" aria-live="polite">{visible.length} afbeeldingen getoond</p>

	{#if items.length === 0}
		<EmptyState compact title="Nog geen foto’s" text="Upload je eerste foto’s via het vak hierboven.">
			{#snippet icon()}<ImageOff size={28} strokeWidth={1.5} />{/snippet}
		</EmptyState>
	{:else if visible.length === 0}
		<EmptyState compact title="Geen resultaten" text="Pas de zoekterm of filters aan.">
			{#snippet actions()}
				<button type="button" class="link-btn" onclick={() => { q = ''; folder = ''; filter = 'all'; }}>Filters wissen</button>
			{/snippet}
		</EmptyState>
	{:else if view === 'grid'}
		<ul class="grid" role="list">
			{#each visible as item (item.id)}
				{@const sel = isSelected(item.id)}
				<li class="tile" class:sel class:current={current === item.id}>
					<a
						href={hrefFor?.(item) ?? '#'}
						class="open"
						aria-label="{item.altNl || item.filename}{mode !== 'browse' ? (sel ? ', geselecteerd' : ', niet geselecteerd') : ''}"
						aria-current={current === item.id ? 'true' : undefined}
						aria-pressed={mode !== 'browse' ? sel : undefined}
						role={mode !== 'browse' ? 'button' : undefined}
						onclick={(e) => activate(item, e)}
						onkeydown={(e) => {
							if (mode !== 'browse' && e.key === ' ') {
								e.preventDefault();
								toggle(item.id);
							}
						}}
					>
						<span class="img" style:background-image={item.lqip ? `url(${item.lqip})` : undefined}>
							<img src={item.thumb} alt="" loading="lazy" style:object-position="{item.focalX * 100}% {item.focalY * 100}%" />
						</span>
						<span class="cap">
							<span class="fn">{item.filename || `#${item.id}`}</span>
							<span class="tags">
								{#if !item.altNl.trim()}<span class="warn" title="Geen Nederlandse alt-tekst"><TriangleAlert size={12} aria-hidden="true" />alt</span>{/if}
								{#if item.usageCount}<span class="use" title="Gebruikt op {item.usageCount} plaats(en)">{item.usageCount}×</span>{/if}
							</span>
						</span>
					</a>
					{#if mode !== 'single'}
						<label class="check" class:visible={sel || selected.length > 0}>
							<input type="checkbox" checked={sel} onchange={() => toggle(item.id)} aria-label="Selecteer {item.filename}" />
							<span aria-hidden="true"><Check size={14} strokeWidth={3} /></span>
						</label>
					{:else if sel}
						<span class="check visible static" aria-hidden="true"><span><Check size={14} strokeWidth={3} /></span></span>
					{/if}
				</li>
			{/each}
		</ul>
	{:else}
		<div class="table-wrap">
			<table>
				<thead>
					<tr>
						{#if mode !== 'single'}<th class="c"><span class="visually-hidden">Selectie</span></th>{/if}
						<th>Bestand</th>
						<th>Alt-tekst (NL)</th>
						<th class="hide-sm">Map</th>
						<th class="hide-sm">Afmetingen</th>
						<th class="num">Gebruik</th>
					</tr>
				</thead>
				<tbody>
					{#each visible as item (item.id)}
						{@const sel = isSelected(item.id)}
						<tr class:sel class:current={current === item.id}>
							{#if mode !== 'single'}
								<td class="c"><input type="checkbox" checked={sel} onchange={() => toggle(item.id)} aria-label="Selecteer {item.filename}" /></td>
							{/if}
							<td>
								<a href={hrefFor?.(item) ?? '#'} class="row-link" onclick={(e) => activate(item, e)} role={mode !== 'browse' ? 'button' : undefined} aria-pressed={mode !== 'browse' ? sel : undefined}>
									<img src={item.thumb} alt="" loading="lazy" />
									<span class="fn">{item.filename || `#${item.id}`}</span>
								</a>
							</td>
							<td>
								{#if item.altNl.trim()}<span class="alt-text">{item.altNl}</span>
								{:else}<span class="warn"><TriangleAlert size={12} aria-hidden="true" /> ontbreekt</span>{/if}
							</td>
							<td class="hide-sm mono">{item.folder}</td>
							<td class="hide-sm">{item.width}×{item.height} · {formatBytes(item.bytes)}</td>
							<td class="num">{item.usageCount || '—'}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>

<style>
	.library {
		display: grid;
		gap: var(--space-3);
		min-width: 0;
	}
	.toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
	}
	.search {
		flex: 1 1 220px;
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
		flex: 1;
		min-width: 0;
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
		max-width: 220px;
	}
	.chips,
	.views {
		display: flex;
		gap: 4px;
	}
	.chip {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		height: 30px;
		padding: 0 var(--space-3);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-pill);
		background: var(--color-surface);
		color: var(--color-text-muted);
		font-size: var(--text-xs);
		font-weight: 600;
		cursor: pointer;
	}
	.chip span {
		color: var(--color-text-muted);
		font-weight: 500;
	}
	.chip[aria-pressed='true'] {
		border-color: var(--color-primary);
		background: var(--color-primary-subtle);
		color: var(--color-primary);
	}
	.views {
		margin-left: auto;
		padding: 2px;
		border-radius: var(--radius-sm);
		background: var(--color-surface-sunken);
	}
	.views button {
		display: grid;
		place-items: center;
		width: 30px;
		height: 28px;
		border: 0;
		border-radius: 5px;
		background: transparent;
		color: var(--color-text-muted);
		cursor: pointer;
	}
	.views button[aria-pressed='true'] {
		background: var(--color-surface);
		color: var(--color-primary);
		box-shadow: var(--shadow-1);
	}
	button:focus-visible,
	a:focus-visible,
	input:focus-visible,
	select:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}
	.selection {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-3);
		min-height: 40px;
		padding: var(--space-1) var(--space-3);
		border-radius: var(--radius-sm);
		font-size: var(--text-sm);
	}
	.selection.has {
		background: var(--color-primary-subtle);
	}
	.all {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		font-weight: 600;
	}
	.link-btn {
		border: 0;
		background: none;
		padding: 0;
		color: var(--color-link);
		font-size: var(--text-sm);
		text-decoration: underline;
		cursor: pointer;
	}
	.grid {
		list-style: none;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
		gap: var(--space-3);
	}
	.tile {
		position: relative;
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		border: 1px solid var(--color-border);
		overflow: hidden;
		transition:
			box-shadow var(--dur-fast) var(--ease-out),
			border-color var(--dur-fast) var(--ease-out);
	}
	.tile:hover {
		box-shadow: var(--shadow-2);
	}
	.tile.sel,
	.tile.current {
		border-color: var(--color-primary);
		box-shadow: 0 0 0 2px var(--color-primary);
	}
	.open {
		display: block;
		color: inherit;
		text-decoration: none;
	}
	.img {
		display: block;
		aspect-ratio: 1;
		background: var(--color-surface-sunken) center / cover;
	}
	.img img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}
	.cap {
		display: flex;
		align-items: center;
		gap: 4px;
		padding: 6px 8px;
		font-size: var(--text-xs);
	}
	.fn {
		flex: 1;
		min-width: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	.tags {
		display: flex;
		gap: 4px;
	}
	.warn {
		display: inline-flex;
		align-items: center;
		gap: 2px;
		padding: 1px 6px;
		border-radius: var(--radius-pill);
		background: var(--color-warning-subtle);
		color: var(--color-warning-text);
		font-size: 11px;
		font-weight: 700;
	}
	.use {
		padding: 1px 6px;
		border-radius: var(--radius-pill);
		background: var(--color-surface-sunken);
		color: var(--color-text-muted);
		font-size: 11px;
		font-weight: 700;
	}
	.check {
		position: absolute;
		top: 6px;
		left: 6px;
		opacity: 0;
		transition: opacity var(--dur-fast);
	}
	.tile:hover .check,
	.tile:focus-within .check,
	.check.visible {
		opacity: 1;
	}
	.check input {
		position: absolute;
		inset: 0;
		opacity: 0;
		margin: 0;
		cursor: pointer;
	}
	.check span {
		display: grid;
		place-items: center;
		width: 22px;
		height: 22px;
		border-radius: 6px;
		border: 2px solid var(--white);
		background: rgb(0 0 0 / 0.35);
		color: transparent;
	}
	.check input:checked + span,
	.check.static span {
		background: var(--color-primary);
		color: var(--color-on-primary);
	}
	.check:has(input:focus-visible) span {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
	}
	.table-wrap {
		overflow-x: auto;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-sm);
	}
	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}
	th {
		text-align: left;
		padding: 8px 12px;
		background: var(--color-surface-sunken);
		color: var(--color-text-muted);
		font-size: var(--text-xs);
		font-weight: 600;
		white-space: nowrap;
	}
	td {
		padding: 6px 12px;
		border-top: 1px solid var(--color-border);
		vertical-align: middle;
		background: var(--color-surface);
	}
	tr.sel td,
	tr.current td {
		background: var(--color-primary-subtle);
	}
	.c {
		width: 36px;
	}
	.num {
		text-align: right;
		white-space: nowrap;
	}
	.row-link {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		color: var(--color-text);
		text-decoration: none;
		font-weight: 600;
		max-width: 280px;
	}
	.row-link img {
		width: 40px;
		height: 40px;
		flex-shrink: 0;
		border-radius: 6px;
		object-fit: cover;
	}
	.row-link:hover .fn {
		text-decoration: underline;
	}
	.alt-text {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
		max-width: 360px;
	}
	.mono {
		font-family: var(--font-mono);
		font-size: var(--text-xs);
	}
	@media (max-width: 720px) {
		.hide-sm {
			display: none;
		}
	}
	:global([data-theme='dark']) .warn {
		background: transparent;
		color: var(--harvest);
		border: 1px solid var(--harvest);
	}
</style>
