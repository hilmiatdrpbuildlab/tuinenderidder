<script lang="ts" module>
	export type Column = {
		key: string;
		label: string;
		sortable?: boolean;
		/** Can be switched off in the column toggle */
		hideable?: boolean;
		/** Hide automatically below this breakpoint (table view only) */
		hideBelow?: 'lg' | 'xl';
		align?: 'start' | 'end';
		width?: string;
	};
</script>

<script lang="ts" generics="T extends { id: number }">
	import type { Snippet } from 'svelte';
	import { goto } from '$app/navigation';
	import ArrowUp from '@lucide/svelte/icons/arrow-up';
	import ArrowDown from '@lucide/svelte/icons/arrow-down';
	import ArrowUpDown from '@lucide/svelte/icons/arrow-up-down';
	import Skeleton from '$lib/components/ui/Skeleton.svelte';

	/**
	 * CMS data table (design_system.md §5.1): sortable headers with aria-sort, sticky header,
	 * hover/selected rows, checkbox selection, row click → detail link. Below md every row becomes a
	 * stacked card (`card` snippet) so primary info never scrolls horizontally.
	 */
	interface Props {
		rows: T[];
		columns: Column[];
		/** Accessible name of the table */
		label: string;
		sort?: string;
		dir?: 'asc' | 'desc';
		sortHref?: (key: string, dir: 'asc' | 'desc') => string;
		hidden?: string[];
		selectable?: boolean;
		selected?: number[];
		/** Form id the row checkboxes belong to (bulk actions) */
		form?: string;
		rowHref?: (row: T) => string;
		activeId?: number | null;
		loading?: boolean;
		cell: Snippet<[T, string]>;
		card: Snippet<[T]>;
		rowLabel?: (row: T) => string;
		empty?: Snippet;
	}

	let {
		rows,
		columns,
		label,
		sort,
		dir = 'desc',
		sortHref,
		hidden = [],
		selectable = false,
		selected = $bindable([]),
		form,
		rowHref,
		activeId = null,
		loading = false,
		cell,
		card,
		rowLabel = (r) => `#${r.id}`,
		empty
	}: Props = $props();

	const visible = $derived(columns.filter((c) => !hidden.includes(c.key)));
	const allOnPage = $derived(rows.length > 0 && rows.every((r) => selected.includes(r.id)));
	const someOnPage = $derived(rows.some((r) => selected.includes(r.id)));

	function toggle(id: number, on: boolean) {
		selected = on ? [...new Set([...selected, id])] : selected.filter((x) => x !== id);
	}
	function toggleAll(on: boolean) {
		const ids = rows.map((r) => r.id);
		selected = on ? [...new Set([...selected, ...ids])] : selected.filter((x) => !ids.includes(x));
	}

	function onRowClick(e: MouseEvent, row: T) {
		if (!rowHref) return;
		const t = e.target as HTMLElement;
		if (t.closest('a, button, input, label, select, textarea, summary')) return;
		if (window.getSelection()?.toString()) return;
		goto(rowHref(row), { noScroll: true, keepFocus: true });
	}

	function ariaSort(c: Column) {
		if (!c.sortable) return undefined;
		if (sort !== c.key) return 'none';
		return dir === 'asc' ? 'ascending' : 'descending';
	}
</script>

<div class="dt">
	<table aria-label={label} aria-busy={loading || undefined}>
		<thead>
			<tr>
				{#if selectable}
					<th scope="col" class="check">
						<input
							type="checkbox"
							aria-label="Alles op deze pagina selecteren"
							checked={allOnPage}
							indeterminate={someOnPage && !allOnPage}
							onchange={(e) => toggleAll(e.currentTarget.checked)}
						/>
					</th>
				{/if}
				{#each visible as c (c.key)}
					<th scope="col" aria-sort={ariaSort(c)} data-hide={c.hideBelow} data-align={c.align} style:width={c.width}>
						{#if c.sortable && sortHref}
							{@const next = sort === c.key && dir === 'asc' ? 'desc' : 'asc'}
							<a class="sort" href={sortHref(c.key, next)} data-sveltekit-noscroll data-sveltekit-keepfocus>
								{c.label}
								<span class="sort-ico" aria-hidden="true">
									{#if sort === c.key}{#if dir === 'asc'}<ArrowUp size={14} />{:else}<ArrowDown size={14} />{/if}{:else}<ArrowUpDown size={14} />{/if}
								</span>
							</a>
						{:else if c.label}
							{c.label}
						{:else}
							<span class="visually-hidden">Acties</span>
						{/if}
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#if loading}
				{#each Array(6) as _, i (i)}
					<tr class="skeleton-row">
						{#if selectable}<td class="check"></td>{/if}
						{#each visible as c (c.key)}<td data-hide={c.hideBelow}><Skeleton width="70%" /></td>{/each}
					</tr>
				{/each}
			{:else}
				{#each rows as row (row.id)}
					{@const isSel = selected.includes(row.id)}
					<tr class:selected={isSel} class:active={activeId === row.id} class:clickable={!!rowHref} onclick={(e) => onRowClick(e, row)}>
						{#if selectable}
							<td class="check">
								<input
									type="checkbox"
									name="ids"
									value={row.id}
									{form}
									checked={isSel}
									aria-label="{rowLabel(row)} selecteren"
									onchange={(e) => toggle(row.id, e.currentTarget.checked)}
								/>
							</td>
						{/if}
						{#each visible as c (c.key)}
							<td data-hide={c.hideBelow} data-align={c.align}>{@render cell(row, c.key)}</td>
						{/each}
					</tr>
				{/each}
			{/if}
		</tbody>
	</table>

	<ul class="cards" aria-label={label}>
		{#if loading}
			{#each Array(4) as _, i (i)}<li class="card"><Skeleton height="64px" /></li>{/each}
		{:else}
			{#each rows as row (row.id)}
				{@const isSel = selected.includes(row.id)}
				<li class="card" class:selected={isSel} class:active={activeId === row.id}>
					{#if selectable}
						<input
							class="card-check"
							type="checkbox"
							name="ids"
							value={row.id}
							{form}
							checked={isSel}
							aria-label="{rowLabel(row)} selecteren"
							onchange={(e) => toggle(row.id, e.currentTarget.checked)}
						/>
					{/if}
					<div class="card-body">{@render card(row)}</div>
				</li>
			{/each}
		{/if}
	</ul>

	{#if !loading && rows.length === 0 && empty}
		<div class="empty">{@render empty()}</div>
	{/if}
</div>

<style>
	.dt {
		min-width: 0;
	}
	table {
		display: none;
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
		font-size: var(--text-sm);
	}
	thead th {
		position: sticky;
		top: 64px;
		z-index: 2;
		height: 40px;
		padding: 0 var(--space-3);
		background: var(--color-bg-alt);
		border-bottom: 1px solid var(--color-border);
		text-align: start;
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.04em;
		text-transform: uppercase;
		color: var(--color-text-muted);
		white-space: nowrap;
	}
	th[data-align='end'],
	td[data-align='end'] {
		text-align: end;
	}
	.sort {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		color: inherit;
		text-decoration: none;
	}
	.sort:hover {
		color: var(--color-text);
	}
	th[aria-sort='ascending'],
	th[aria-sort='descending'] {
		color: var(--color-text);
	}
	.sort-ico {
		display: inline-flex;
		opacity: 0.7;
	}
	tbody td {
		height: var(--row-h, 40px);
		padding: var(--space-2) var(--space-3);
		border-bottom: 1px solid var(--color-border);
		vertical-align: middle;
	}
	tbody tr:last-child td {
		border-bottom: 0;
	}
	tbody tr {
		transition: background-color var(--dur-fast) var(--ease-out);
	}
	tbody tr.clickable {
		cursor: pointer;
	}
	tbody tr:hover {
		background: var(--color-bg-alt);
	}
	tbody tr.selected,
	tbody tr.active {
		background: var(--color-primary-subtle);
	}
	tbody tr.active td:first-child {
		box-shadow: inset 3px 0 0 var(--color-primary);
	}
	.check {
		width: 44px;
		padding-right: 0;
	}
	input[type='checkbox'] {
		width: 16px;
		height: 16px;
		accent-color: var(--color-primary);
		cursor: pointer;
	}

	.cards {
		list-style: none;
		padding: 0;
		display: grid;
	}
	.card {
		display: flex;
		gap: var(--space-3);
		padding: var(--space-3) var(--space-4);
		border-bottom: 1px solid var(--color-border);
	}
	.card:last-child {
		border-bottom: 0;
	}
	.card.selected,
	.card.active {
		background: var(--color-primary-subtle);
	}
	.card-check {
		margin-top: 3px;
		flex-shrink: 0;
	}
	.card-body {
		flex: 1;
		min-width: 0;
	}
	.empty {
		padding: var(--space-4);
	}

	@media (min-width: 640px) {
		table {
			display: table;
		}
		.cards {
			display: none;
		}
		[data-hide='lg'],
		[data-hide='xl'] {
			display: none;
		}
	}
	@media (min-width: 1100px) {
		[data-hide='lg'] {
			display: table-cell;
		}
	}
	@media (min-width: 1360px) {
		[data-hide='xl'] {
			display: table-cell;
		}
	}
</style>
