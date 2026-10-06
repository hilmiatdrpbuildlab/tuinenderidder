<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import Panel from '$lib/components/admin/Panel.svelte';
	import Avatar from '$lib/components/admin/Avatar.svelte';
	import { formatDateTime, relativeTime, shortDay } from '$lib/components/admin/format';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import Alert from '$lib/components/ui/Alert.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import { TYPE_LABELS } from '$lib/domain';
	import { formatLongDate } from '$lib/i18n';

	let { data } = $props();

	const total = $derived(
		data.bookings.length + data.customers.length + data.messages.length + data.services.length + data.projects.length
	);

	/** Split text into [plain, match, plain, match, …] parts (case-insensitive) for highlighting. */
	function parts(text: string, q: string) {
		if (!q) return [{ text, match: false }];
		const out: { text: string; match: boolean }[] = [];
		const lower = text.toLowerCase();
		const needle = q.toLowerCase();
		let i = 0;
		while (i < text.length) {
			const j = lower.indexOf(needle, i);
			if (j < 0) break;
			if (j > i) out.push({ text: text.slice(i, j), match: false });
			out.push({ text: text.slice(j, j + needle.length), match: true });
			i = j + needle.length;
		}
		if (i < text.length) out.push({ text: text.slice(i), match: false });
		return out;
	}

	const scopeHint = $derived(
		data.access.bookings
			? 'Zoek op referentie, naam, e-mailadres, telefoonnummer of gemeente.'
			: 'Zoek op titel van diensten en realisaties.'
	);
</script>

{#snippet hl(text: string)}{#each parts(text, data.q) as p, i (i)}{#if p.match}<mark>{p.text}</mark>{:else}{p.text}{/if}{/each}{/snippet}

<PageHeader title="Zoeken" description={scopeHint} />

<form class="search" role="search" method="GET" action="/admin/zoeken">
	<label for="search-q" class="visually-hidden">Zoekterm</label>
	<div class="search-input">
		<Search size={18} aria-hidden="true" />
		<input
			id="search-q"
			name="q"
			type="search"
			value={data.q}
			minlength={data.minQuery}
			maxlength={100}
			placeholder={data.access.bookings ? 'Klant, referentie, e-mail, telefoon…' : 'Dienst of realisatie…'}
			aria-describedby="search-help"
		/>
	</div>
	<Button type="submit" size="sm">Zoeken</Button>
</form>
<p id="search-help" class="help">Minstens {data.minQuery} tekens.</p>

{#if !data.access.bookings}
	<div class="note">
		<Alert tone="info">Als redacteur kun je alleen in de inhoud zoeken (diensten en realisaties), niet in boekingen, klanten of berichten.</Alert>
	</div>
{/if}

{#if !data.searched}
	<Panel>
		<EmptyState
			title={data.q ? `Typ minstens ${data.minQuery} tekens` : 'Waar ben je naar op zoek?'}
			text={scopeHint}
		>
			{#snippet icon()}<Search size={40} strokeWidth={1.5} />{/snippet}
		</EmptyState>
	</Panel>
{:else}
	<p class="summary" role="status">
		{total === 0 ? 'Geen resultaten' : total === 1 ? '1 resultaat' : `${total} resultaten`} voor <strong>“{data.q}”</strong>
	</p>

	{#if total === 0}
		<Panel>
			<EmptyState title="Niets gevonden" text="Controleer de spelling of zoek op een deel van de naam, het e-mailadres of de referentie.">
				{#snippet icon()}<Search size={40} strokeWidth={1.5} />{/snippet}
			</EmptyState>
		</Panel>
	{:else}
		<div class="results">
			{#if data.bookings.length > 0}
				<Panel title="Boekingen ({data.bookings.length})" flush>
					<table class="bookings">
						<caption class="visually-hidden">Gevonden boekingen</caption>
						<thead>
							<tr>
								<th scope="col">Referentie</th>
								<th scope="col">Klant</th>
								<th scope="col">Type</th>
								<th scope="col">Datum</th>
								<th scope="col">Status</th>
							</tr>
						</thead>
						<tbody>
							{#each data.bookings as b (b.id)}
								<tr>
									<th scope="row" class="ref">
										<a href="/admin/boekingen?open={b.id}" class="mono">{@render hl(b.reference)}</a>
									</th>
									<td data-label="Klant">
										<span class="strong">{@render hl(b.customerName)}</span>
										<span class="sub">{@render hl(b.customerEmail)}{#if b.municipality} · {@render hl(b.municipality)}{/if}</span>
									</td>
									<td data-label="Type">{TYPE_LABELS[b.type].nl}</td>
									<td data-label="Datum">
										{#if b.slotDate}
											<time datetime={b.slotDate} title={formatLongDate(b.slotDate, 'nl')}>{shortDay(b.slotDate)}</time>
											{#if b.slotStart}<span class="sub mono">{b.slotStart}</span>{/if}
										{:else}
											<span class="muted">Nog niet gepland</span>
										{/if}
									</td>
									<td data-label="Status"><StatusBadge status={b.status} /></td>
								</tr>
							{/each}
						</tbody>
					</table>
				</Panel>
			{/if}

			{#if data.customers.length > 0}
				<Panel title="Klanten ({data.customers.length})" flush>
					<ul class="list" aria-label="Gevonden klanten">
						{#each data.customers as c (c.id)}
							<li>
								<a class="item" href="/admin/boekingen?q={encodeURIComponent(c.email)}">
									<Avatar name={c.name} size={32} />
									<span class="main">
										<span class="strong">{@render hl(c.name)}</span>
										<span class="sub">
											{@render hl(c.email)}{#if c.phone} · {@render hl(c.phone)}{/if}{#if c.municipality} · {@render hl(c.municipality)}{/if}
										</span>
									</span>
									<Badge tone="neutral">{c.bookingCount} {c.bookingCount === 1 ? 'boeking' : 'boekingen'}</Badge>
									<ArrowRight size={16} aria-hidden="true" />
								</a>
							</li>
						{/each}
					</ul>
				</Panel>
			{/if}

			{#if data.messages.length > 0}
				<Panel title="Berichten ({data.messages.length})" flush>
					<ul class="list" aria-label="Gevonden berichten">
						{#each data.messages as m (m.id)}
							<li>
								<a class="item" href={m.isRead ? '/admin/berichten' : '/admin/berichten?filter=ongelezen'}>
									<Avatar name={m.name} size={32} />
									<span class="main">
										<span class="strong">
											{@render hl(m.name)}
											<span class="sub inline">{@render hl(m.email)}</span>
										</span>
										<span class="excerpt">{@render hl(m.excerpt)}</span>
									</span>
									<span class="side">
										{#if !m.isRead}<Badge tone="info" dot>Ongelezen</Badge>{/if}
										<time datetime={new Date(m.createdAt).toISOString()} title={formatDateTime(m.createdAt)}>
											{relativeTime(m.createdAt)}
										</time>
									</span>
								</a>
							</li>
						{/each}
					</ul>
				</Panel>
			{/if}

			{#if data.services.length > 0}
				<Panel title="Diensten ({data.services.length})" flush>
					<ul class="list" aria-label="Gevonden diensten">
						{#each data.services as s (s.id)}
							<li>
								<a class="item" href="/admin/diensten/{s.id}">
									<span class="main">
										<span class="strong">{@render hl(s.title)}</span>
										<span class="sub mono">/{s.slug}</span>
									</span>
									<StatusBadge status={s.status} />
									<ArrowRight size={16} aria-hidden="true" />
								</a>
							</li>
						{/each}
					</ul>
				</Panel>
			{/if}

			{#if data.projects.length > 0}
				<Panel title="Realisaties ({data.projects.length})" flush>
					<ul class="list" aria-label="Gevonden realisaties">
						{#each data.projects as p (p.id)}
							<li>
								<a class="item" href="/admin/realisaties/{p.id}">
									<span class="main">
										<span class="strong">{@render hl(p.title)}</span>
										<span class="sub">{#if p.town}{@render hl(p.town)} · {/if}{p.year}</span>
									</span>
									<StatusBadge status={p.status} />
									<ArrowRight size={16} aria-hidden="true" />
								</a>
							</li>
						{/each}
					</ul>
				</Panel>
			{/if}
		</div>
	{/if}
{/if}

<style>
	.search {
		display: flex;
		gap: var(--space-2);
		max-width: 40rem;
	}
	.search-input {
		flex: 1;
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-height: var(--control-h-sm);
		padding: 0 var(--space-3);
		background: var(--color-surface);
		border: 1px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		color: var(--color-text-muted);
	}
	.search-input:focus-within {
		outline: 2px solid var(--color-focus);
		outline-offset: 1px;
	}
	.search-input input {
		flex: 1;
		min-width: 0;
		height: calc(var(--control-h-sm) - 2px);
		border: 0;
		background: transparent;
		color: var(--color-text);
		font: inherit;
		font-size: var(--text-sm);
	}
	.search-input input:focus {
		outline: none;
	}
	.search-input input::placeholder {
		color: var(--color-text-placeholder);
	}
	.help {
		margin: var(--space-1) 0 var(--space-5);
		font-size: var(--text-xs);
		color: var(--color-text-muted);
	}
	.note {
		margin-bottom: var(--space-5);
	}
	.summary {
		margin-bottom: var(--space-4);
		color: var(--color-text-muted);
		font-size: var(--text-sm);
	}
	.summary strong {
		color: var(--color-text);
	}
	.results {
		display: grid;
		gap: var(--space-5);
	}
	mark {
		background: var(--color-accent);
		color: var(--neutral-900);
		border-radius: 2px;
		padding: 0 1px;
	}
	.strong {
		font-weight: 600;
		color: var(--color-text);
	}
	.sub {
		display: block;
		font-size: var(--text-xs);
		color: var(--color-text-muted);
		overflow-wrap: anywhere;
	}
	.sub.inline {
		display: inline;
		font-weight: 400;
		margin-left: var(--space-1);
	}
	.muted {
		color: var(--color-text-muted);
	}
	.mono {
		font-family: var(--font-mono);
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--text-sm);
	}
	thead th {
		text-align: left;
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--color-text-muted);
		padding: var(--space-2) var(--space-5);
		border-bottom: 1px solid var(--color-border);
	}
	tbody th,
	tbody td {
		text-align: left;
		vertical-align: middle;
		padding: var(--space-2) var(--space-5);
		height: var(--row-h);
	}
	tbody tr + tr > * {
		border-top: 1px solid var(--color-border);
	}
	.ref a {
		color: var(--color-link);
		font-weight: 600;
		white-space: nowrap;
	}

	.list {
		list-style: none;
		margin: 0;
		padding: 0;
	}
	.list li + li {
		border-top: 1px solid var(--color-border);
	}
	.item {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		min-height: var(--row-h);
		padding: var(--space-2) var(--space-5);
		color: var(--color-text-muted);
		text-decoration: none;
		font-size: var(--text-sm);
	}
	.item:hover {
		background: var(--color-bg);
	}
	.item:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: -2px;
	}
	.main {
		flex: 1;
		min-width: 0;
		display: grid;
	}
	.excerpt {
		color: var(--color-text);
		overflow-wrap: anywhere;
	}
	.side {
		display: flex;
		flex-direction: column;
		align-items: flex-end;
		gap: var(--space-1);
		font-size: var(--text-xs);
		flex-shrink: 0;
	}

	@media (max-width: 639px) {
		table,
		tbody,
		tr,
		tbody th,
		tbody td {
			display: block;
		}
		thead {
			position: absolute;
			width: 1px;
			height: 1px;
			overflow: hidden;
			clip: rect(0 0 0 0);
			white-space: nowrap;
		}
		tbody tr {
			display: grid;
			grid-template-columns: 1fr 1fr;
			gap: var(--space-2) var(--space-3);
			padding: var(--space-3) var(--space-4);
		}
		tbody tr + tr {
			border-top: 1px solid var(--color-border);
		}
		tbody tr + tr > * {
			border-top: 0;
		}
		tbody th,
		tbody td {
			height: auto;
			padding: 0;
		}
		tbody th,
		tbody td[data-label='Klant'] {
			grid-column: 1 / -1;
		}
		td[data-label]::before {
			content: attr(data-label);
			display: block;
			font-size: var(--text-xs);
			font-weight: 600;
			color: var(--color-text-muted);
		}
		.item {
			flex-wrap: wrap;
			padding-inline: var(--space-4);
		}
		.side {
			flex-direction: row;
		}
	}
</style>
