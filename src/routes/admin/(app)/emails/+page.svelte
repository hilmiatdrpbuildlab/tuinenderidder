<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Mail from '@lucide/svelte/icons/mail';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import Panel from '$lib/components/admin/Panel.svelte';
	import { formatDateTime } from '$lib/components/admin/format';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import Drawer from '$lib/components/ui/Drawer.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Select from '$lib/components/form/Select.svelte';

	let { data } = $props();

	let hydrated = $state(false);
	onMount(() => (hydrated = true));

	type Tone = 'neutral' | 'info' | 'warning' | 'success' | 'error' | 'forest' | 'bark' | 'harvest';
	const kindTone: Record<string, Tone> = {
		booking_confirmation: 'success',
		booking_alert: 'harvest',
		booking_reminder: 'info',
		booking_status: 'forest',
		contact_alert: 'bark'
	};
	const kindLabel = (k: string) => (data.kinds as Record<string, string>)[k] ?? k;
	const kindOptions = $derived([
		{ value: '', label: 'Alle soorten' },
		...Object.entries(data.kinds).map(([value, label]) => ({ value, label }))
	]);
	const statusLabel = { queued: 'Bewaard (niet verzonden)', sent: 'Verzonden', failed: 'Mislukt' } as const;

	/** URL for this list with some params changed (null removes a param). */
	function hrefWith(changes: Record<string, string | number | null>) {
		const params = new URLSearchParams();
		if (data.kind) params.set('soort', data.kind);
		if (data.page > 1) params.set('page', String(data.page));
		for (const [k, v] of Object.entries(changes)) {
			if (v === null || v === '' || (k === 'page' && v === 1)) params.delete(k);
			else params.set(k, String(v));
		}
		const qs = params.toString();
		return qs ? `?${qs}` : page.url.pathname;
	}

	const from = $derived(data.total === 0 ? 0 : (data.page - 1) * data.perPage + 1);
	const to = $derived(Math.min(data.page * data.perPage, data.total));

	function closeDetail() {
		if (page.url.searchParams.has('id')) goto(hrefWith({ id: null }), { noScroll: true, keepFocus: true });
	}

	function rowClick(e: MouseEvent, id: number) {
		const target = e.target as HTMLElement;
		if (target.closest('a, button')) return;
		if (window.getSelection()?.toString()) return;
		goto(hrefWith({ id }), { noScroll: true });
	}
</script>

<PageHeader title="E-mails" description="Alle e-mails die het systeem zou versturen: bevestigingen, herinneringen en interne meldingen." />

<div class="stack">
	<Alert tone="info" title="Nog geen e-maildienst gekoppeld">
		De website is nog niet verbonden met een e-maildienst. Elke e-mail die het systeem zou versturen, wordt
		daarom hier bewaard in plaats van verzonden. Zo kun je nakijken wat klanten en het team zouden ontvangen.
	</Alert>

	{#if data.selectedMissing}
		<Alert tone="warning">Deze e-mail bestaat niet (meer).</Alert>
	{/if}

	{#if data.selected && !hydrated}
		<!-- Without JavaScript the detail is shown inline; with JavaScript it opens in the drawer below. -->
		<Panel title={data.selected.subject}>
			{#snippet actions()}
				<Button href={hrefWith({ id: null })} variant="ghost" size="sm">Sluiten</Button>
			{/snippet}
			{@render detail(data.selected)}
		</Panel>
	{/if}

	<Panel
		title="Verstuurde e-mails"
		description="{data.total} {data.total === 1 ? 'e-mail' : 'e-mails'}"
		flush
		footer={data.total > 0 ? pager : undefined}
	>
		{#snippet actions()}
			<form method="GET" class="filter" data-sveltekit-keepfocus data-sveltekit-noscroll>
				<Select
					label="Soort"
					hideLabel
					name="soort"
					options={kindOptions}
					value={data.kind ?? ''}
					onchange={(e: Event) => (e.currentTarget as HTMLSelectElement).form?.requestSubmit()}
				/>
				<noscript><Button type="submit" variant="outline" size="sm">Filter</Button></noscript>
			</form>
		{/snippet}

		{#if data.emails.length === 0}
			<EmptyState
				compact
				title={data.kind ? 'Geen e-mails van deze soort' : 'Nog geen e-mails'}
				text="E-mails verschijnen hier zodra er een boeking of contactbericht binnenkomt."
			>
				{#snippet icon()}<Mail />{/snippet}
			</EmptyState>
		{:else}
			<table aria-label="E-mails, nieuwste eerst">
				<thead>
					<tr>
						<th scope="col">Datum</th>
						<th scope="col">Onderwerp</th>
						<th scope="col">Aan</th>
						<th scope="col">Soort</th>
						<th scope="col">Boeking</th>
					</tr>
				</thead>
				<tbody>
					{#each data.emails as m (m.id)}
						<tr class:selected={data.selected?.id === m.id} onclick={(e) => rowClick(e, m.id)}>
							<td class="date" data-label="Datum">
								<time datetime={m.createdAt.toISOString()}>{formatDateTime(m.createdAt)}</time>
							</td>
							<th scope="row" class="subject">
								<a href={hrefWith({ id: m.id })} data-sveltekit-noscroll aria-current={data.selected?.id === m.id ? 'true' : undefined}>
									{m.subject}
								</a>
							</th>
							<td class="to" data-label="Aan">{m.to}</td>
							<td data-label="Soort"><Badge tone={kindTone[m.kind] ?? 'neutral'}>{kindLabel(m.kind)}</Badge></td>
							<td data-label="Boeking">
								{#if m.bookingId && m.reference}
									<a class="ref" href="/admin/boekingen?open={m.bookingId}">{m.reference}</a>
								{:else}
									<span class="none" aria-label="Geen boeking">—</span>
								{/if}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		{/if}
	</Panel>
</div>

{#if hydrated}
	<Drawer open={!!data.selected} title={data.selected?.subject ?? 'E-mail'} width="720px" onclose={closeDetail}>
		{#if data.selected}
			{@render detail(data.selected)}
		{/if}
	</Drawer>
{/if}

{#snippet pager()}
	<nav class="pager" aria-label="Paginering">
		<span class="count">{from}–{to} van {data.total}</span>
		<div class="pager-buttons">
			{#if data.page > 1}
				<Button href={hrefWith({ page: data.page - 1, id: null })} variant="outline" size="sm" rel="prev">
					{#snippet iconStart()}<ChevronLeft size={16} />{/snippet}
					Vorige
				</Button>
			{/if}
			<span class="current" aria-current="page">Pagina {data.page} van {data.pages}</span>
			{#if data.page < data.pages}
				<Button href={hrefWith({ page: data.page + 1, id: null })} variant="outline" size="sm" rel="next">
					Volgende
					{#snippet iconEnd()}<ChevronRight size={16} />{/snippet}
				</Button>
			{/if}
		</div>
	</nav>
{/snippet}

{#snippet detail(m: NonNullable<typeof data.selected>)}
	<div class="detail">
		<dl class="headers">
			<div><dt>Aan</dt><dd>{m.to}</dd></div>
			<div><dt>Onderwerp</dt><dd>{m.subject}</dd></div>
			<div>
				<dt>Datum</dt>
				<dd><time datetime={m.createdAt.toISOString()}>{formatDateTime(m.createdAt)}</time></dd>
			</div>
			<div><dt>Soort</dt><dd><Badge tone={kindTone[m.kind] ?? 'neutral'}>{kindLabel(m.kind)}</Badge></dd></div>
			<div><dt>Taal</dt><dd>{m.locale === 'en' ? 'Engels' : 'Nederlands'}</dd></div>
			<div><dt>Status</dt><dd>{statusLabel[m.status] ?? m.status}</dd></div>
			{#if m.bookingId && m.reference}
				<div><dt>Boeking</dt><dd><a href="/admin/boekingen?open={m.bookingId}">{m.reference}</a></dd></div>
			{/if}
		</dl>

		<iframe class="preview" srcdoc={m.html} sandbox="" title="Voorbeeld e-mail" loading="lazy"></iframe>

		<details class="plain">
			<summary>Tekstversie</summary>
			{#if m.text}
				<pre>{m.text}</pre>
			{:else}
				<p class="none">Deze e-mail heeft geen tekstversie.</p>
			{/if}
		</details>
	</div>
{/snippet}

<style>
	.stack {
		display: grid;
		gap: var(--space-5);
	}
	.filter {
		display: flex;
		gap: var(--space-2);
		align-items: center;
		min-width: 11rem;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}
	thead th {
		text-align: left;
		font-weight: 600;
		font-size: var(--text-xs);
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-muted);
		padding: var(--space-2) var(--space-3);
		border-bottom: 1px solid var(--color-border);
		white-space: nowrap;
	}
	thead th:first-child,
	tbody td:first-child {
		padding-left: var(--space-5);
	}
	thead th:last-child,
	tbody td:last-child {
		padding-right: var(--space-5);
	}
	tbody th,
	tbody td {
		height: var(--row-h);
		padding: var(--space-2) var(--space-3);
		border-bottom: 1px solid var(--color-border);
		vertical-align: middle;
		text-align: left;
		font-weight: 400;
	}
	tbody tr {
		cursor: pointer;
	}
	tbody tr:last-child > * {
		border-bottom: 0;
	}
	tbody tr:hover,
	tbody tr.selected {
		background: var(--color-bg-alt);
	}
	tbody tr.selected {
		box-shadow: inset 3px 0 0 var(--color-primary);
	}
	.date {
		white-space: nowrap;
		color: var(--color-text-muted);
		font-variant-numeric: tabular-nums;
	}
	.subject a {
		color: var(--color-text);
		font-weight: 600;
		text-decoration: none;
	}
	.subject a:hover {
		text-decoration: underline;
	}
	.to {
		color: var(--color-text-muted);
		overflow-wrap: anywhere;
	}
	.ref {
		color: var(--color-link);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		white-space: nowrap;
	}
	a:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
		border-radius: var(--radius-sm);
	}
	.none {
		color: var(--color-text-muted);
	}

	.pager {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		font-size: var(--text-sm);
	}
	.count,
	.current {
		color: var(--color-text-muted);
	}
	.pager-buttons {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.detail {
		display: grid;
		gap: var(--space-4);
	}
	.headers {
		display: grid;
		gap: var(--space-2);
		font-size: var(--text-sm);
		padding: var(--space-3) var(--space-4);
		background: var(--color-surface-sunken);
		border-radius: var(--radius-md);
	}
	.headers div {
		display: grid;
		grid-template-columns: 7rem minmax(0, 1fr);
		gap: var(--space-2);
		align-items: center;
	}
	.headers dt {
		color: var(--color-text-muted);
	}
	.headers dd {
		overflow-wrap: anywhere;
	}
	.headers a {
		color: var(--color-link);
	}
	.preview {
		width: 100%;
		height: min(70vh, 720px);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		/* the email itself is light-themed; keep a light canvas behind it */
		background: var(--white);
	}
	.plain summary {
		cursor: pointer;
		font-weight: 600;
		font-size: var(--text-sm);
		min-height: var(--control-h);
		display: flex;
		align-items: center;
	}
	.plain summary:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 2px;
		border-radius: var(--radius-sm);
	}
	.plain pre {
		margin-top: var(--space-2);
		padding: var(--space-3) var(--space-4);
		background: var(--color-surface-sunken);
		border-radius: var(--radius-md);
		font-family: var(--font-mono);
		font-size: var(--text-xs);
		white-space: pre-wrap;
		overflow-wrap: anywhere;
		color: var(--color-text);
	}

	@media (max-width: 639px) {
		thead {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip: rect(0 0 0 0);
			white-space: nowrap;
		}
		table,
		tbody,
		tr {
			display: block;
		}
		tbody tr {
			display: grid;
			gap: var(--space-1);
			padding: var(--space-3) var(--space-4);
			border-bottom: 1px solid var(--color-border);
		}
		tbody tr:last-child {
			border-bottom: 0;
		}
		tbody th,
		tbody td,
		tbody td:first-child,
		tbody td:last-child {
			display: flex;
			align-items: center;
			justify-content: space-between;
			gap: var(--space-3);
			height: auto;
			padding: 0;
			border: 0;
		}
		.subject {
			order: -1;
		}
		tbody td[data-label]::before {
			content: attr(data-label);
			color: var(--color-text-muted);
			font-size: var(--text-xs);
		}
		.headers div {
			grid-template-columns: 1fr;
			gap: 0;
		}
	}
</style>
