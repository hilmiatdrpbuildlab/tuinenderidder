<script lang="ts">
	import { enhance } from '$app/forms';
	import Sparkles from '@lucide/svelte/icons/sparkles';
	import CalendarCheck from '@lucide/svelte/icons/calendar-check';
	import CircleCheck from '@lucide/svelte/icons/circle-check';
	import FileText from '@lucide/svelte/icons/file-text';
	import Images from '@lucide/svelte/icons/images';
	import Shovel from '@lucide/svelte/icons/shovel';
	import MessageSquareQuote from '@lucide/svelte/icons/message-square-quote';
	import ImageOff from '@lucide/svelte/icons/image-off';
	import Plus from '@lucide/svelte/icons/plus';
	import Upload from '@lucide/svelte/icons/upload';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import Panel from '$lib/components/admin/Panel.svelte';
	import KpiCard from '$lib/components/admin/KpiCard.svelte';
	import DataTable, { type Column } from '$lib/components/admin/DataTable.svelte';
	import Avatar from '$lib/components/admin/Avatar.svelte';
	import { enhanceToast } from '$lib/components/admin/enhance';
	import { relativeTime, formatDateTime, shortDay } from '$lib/components/admin/format';
	import Button from '$lib/components/ui/Button.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import EmptyState from '$lib/components/ui/EmptyState.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import { formatLongDate } from '$lib/i18n';
	import { SLOT_LABELS, TYPE_LABELS } from '$lib/domain';

	let { data } = $props();

	const latestColumns: Column[] = [
		{ key: 'ref', label: 'Referentie' },
		{ key: 'klant', label: 'Klant' },
		{ key: 'type', label: 'Type', hideBelow: 'lg' },
		{ key: 'datum', label: 'Datum' },
		{ key: 'status', label: 'Status' },
		{ key: 'ontvangen', label: 'Ontvangen', hideBelow: 'xl' }
	];

	const hour = Number(new Intl.DateTimeFormat('nl-BE', { hour: 'numeric', hour12: false, timeZone: 'Europe/Brussels' }).format(new Date()));
	const greeting = hour < 12 ? 'Goeiemorgen' : hour < 18 ? 'Goeiemiddag' : 'Goeieavond';
	const quick: Record<string, { to: string; label: string }> = {
		scheduled: { to: 'in_progress', label: 'Start werk' },
		rescheduled: { to: 'scheduled', label: 'Bevestigen' },
		in_progress: { to: 'completed', label: 'Afronden' },
		new: { to: 'scheduled', label: 'Bevestigen' },
		pending: { to: 'scheduled', label: 'Bevestigen' }
	};
</script>

<svelte:head><title>Dashboard · CMS Tuinen De Ridder</title></svelte:head>

<PageHeader title="{greeting}, {data.firstName}" description={formatLongDate(data.today, 'nl')}>
	{#snippet actions()}
		{#if data.ops}
			<Button href="/admin/kalender" variant="outline" size="sm">Kalender</Button>
			<Button href="/admin/boekingen/nieuw" size="sm">
				{#snippet iconStart()}<Plus />{/snippet}
				Nieuwe boeking
			</Button>
		{:else}
			<Button href="/admin/realisaties/nieuw" size="sm">
				{#snippet iconStart()}<Plus />{/snippet}
				Nieuwe realisatie
			</Button>
		{/if}
	{/snippet}
</PageHeader>

{#if data.ops && data.kpis}
	<div class="kpis">
		<KpiCard label="Nieuwe aanvragen" value={data.kpis.newCount} hint="Nog niet bekeken" href="/admin/boekingen?status=new" tone="info">
			{#snippet icon()}<Sparkles size={18} />{/snippet}
		</KpiCard>
		<KpiCard label="Gepland deze week" value={data.kpis.weekCount} hint="Ma – zo" href="/admin/boekingen?periode=week&sort=datum&dir=asc">
			{#snippet icon()}<CalendarCheck size={18} />{/snippet}
		</KpiCard>
		<KpiCard label="Afgerond deze maand" value={data.kpis.doneMonth} href="/admin/boekingen?status=completed&periode=maand" tone="success">
			{#snippet icon()}<CircleCheck size={18} />{/snippet}
		</KpiCard>
		<KpiCard label="Openstaande offertes" value={data.kpis.openQuotes} hint="Nieuw of in afwachting" href="/admin/aanvragen" tone="warning">
			{#snippet icon()}<FileText size={18} />{/snippet}
		</KpiCard>
	</div>

	<div class="split">
		<Panel title="Vandaag" description={data.schedule.length ? `${data.schedule.length} ${data.schedule.length === 1 ? 'afspraak' : 'afspraken'}` : undefined}>
			{#snippet actions()}<a class="more" href="/admin/kalender">Kalender <ArrowRight size={14} aria-hidden="true" /></a>{/snippet}
			{#if data.schedule.length === 0}
				<EmptyState compact title="Geen afspraken vandaag" text="Tijd voor offertes, onderhoud aan het materiaal of een koffie." />
			{:else}
				<ol class="schedule">
					{#each data.schedule as b (b.id)}
						{@const q = quick[b.status]}
						<li>
							<div class="time">
								<span class="t">{b.slot?.start}</span>
								<span class="k">{b.slot ? SLOT_LABELS[b.slot.kind].nl : ''}</span>
							</div>
							<div class="what">
								<a class="who" href="/admin/boekingen?open={b.id}">{b.customer.name}</a>
								<p class="line">
									{#if b.services[0]}<Icon name={b.services[0].icon} size={14} /> {b.services[0].title}{:else}{TYPE_LABELS[b.type].nl}{/if}
									{#if b.customer.town}<span class="sep" aria-hidden="true">·</span> <MapPin size={14} aria-hidden="true" /> {b.customer.town}{/if}
								</p>
							</div>
							<div class="state">
								<StatusBadge status={b.status} />
								{#if b.assignee}<Avatar name={b.assignee.name} size={26} labelled />{:else}<span class="unassigned">Niet toegewezen</span>{/if}
								{#if q}
									<form method="POST" action="?/status" use:enhance={enhanceToast()}>
										<input type="hidden" name="id" value={b.id} />
										<input type="hidden" name="status" value={q.to} />
										<Button type="submit" size="sm" variant="outline">{q.label}</Button>
									</form>
								{/if}
							</div>
						</li>
					{/each}
				</ol>
			{/if}
		</Panel>

		<Panel title="Ongelezen berichten">
			{#snippet actions()}<a class="more" href="/admin/berichten">Alle berichten <ArrowRight size={14} aria-hidden="true" /></a>{/snippet}
			{#if data.messages.length === 0}
				<p class="muted">Alles gelezen.</p>
			{:else}
				<ul class="msgs">
					{#each data.messages as m (m.id)}
						<li>
							<a href="/admin/berichten">{m.name}</a>
							<span class="muted small" title={formatDateTime(m.createdAt)}>{relativeTime(m.createdAt)}</span>
							<p class="excerpt">{m.message}</p>
						</li>
					{/each}
				</ul>
			{/if}
		</Panel>
	</div>

	<Panel title="Laatste aanvragen" flush>
		{#snippet actions()}<a class="more" href="/admin/boekingen">Alle boekingen <ArrowRight size={14} aria-hidden="true" /></a>{/snippet}
		<DataTable rows={data.latest} columns={latestColumns} label="Laatste aanvragen" rowHref={(r) => `/admin/boekingen?open=${r.id}`}>
			{#snippet cell(r, key)}
				{#if key === 'ref'}
					<a class="ref" href="/admin/boekingen?open={r.id}">{r.reference}</a>
				{:else if key === 'klant'}
					<span class="strong">{r.customer.name}</span> <span class="muted small">{r.customer.town}</span>
				{:else if key === 'type'}
					{TYPE_LABELS[r.type].nl}
				{:else if key === 'datum'}
					{r.slot ? `${shortDay(r.slot.date)} · ${SLOT_LABELS[r.slot.kind].nl}` : 'Nog in te plannen'}
				{:else if key === 'status'}
					<StatusBadge status={r.status} />
				{:else if key === 'ontvangen'}
					<span class="muted" title={formatDateTime(r.createdAt)}>{relativeTime(r.createdAt)}</span>
				{/if}
			{/snippet}
			{#snippet card(r)}
				<a class="card" href="/admin/boekingen?open={r.id}">
					<span class="card-top"><span class="ref">{r.reference}</span><StatusBadge status={r.status} /></span>
					<span class="strong">{r.customer.name}</span>
					<span class="muted small">{TYPE_LABELS[r.type].nl} · {r.slot ? shortDay(r.slot.date) : 'Nog in te plannen'} · {relativeTime(r.createdAt)}</span>
				</a>
			{/snippet}
			{#snippet empty()}
				<EmptyState compact title="Nog geen aanvragen" text="Nieuwe boekingen via de website verschijnen hier." />
			{/snippet}
		</DataTable>
	</Panel>
{/if}

{#if data.stats}
	{#if data.ops}<h2 class="section">Website-inhoud</h2>{/if}
	<div class="kpis">
		<KpiCard label="Realisaties online" value={data.stats.publishedProjects} hint="{data.stats.draftProjects} in concept" href="/admin/realisaties" tone="forest">
			{#snippet icon()}<Images size={18} />{/snippet}
		</KpiCard>
		<KpiCard label="Diensten online" value={data.stats.publishedServices} href="/admin/diensten" tone="bark">
			{#snippet icon()}<Shovel size={18} />{/snippet}
		</KpiCard>
		<KpiCard label="Zichtbare getuigenissen" value={data.stats.visibleTestimonials} href="/admin/getuigenissen" tone="success">
			{#snippet icon()}<MessageSquareQuote size={18} />{/snippet}
		</KpiCard>
		<KpiCard label="Foto’s zonder alt-tekst" value={data.stats.mediaNoAlt} hint="van {data.stats.mediaTotal} in de bibliotheek" href="/admin/media" tone={data.stats.mediaNoAlt ? 'warning' : 'success'}>
			{#snippet icon()}<ImageOff size={18} />{/snippet}
		</KpiCard>
	</div>

	{#if !data.ops}
		<div class="split">
			<Panel title="Recent bewerkte realisaties">
				{#if data.stats.recentProjects.length === 0}
					<EmptyState compact title="Nog geen realisaties" />
				{:else}
					<ul class="recent">
						{#each data.stats.recentProjects as p (p.id)}
							<li>
								<a href="/admin/realisaties/{p.id}">{p.title}</a>
								<StatusBadge status={p.status} />
								<span class="muted small" title={formatDateTime(p.updatedAt)}>{relativeTime(p.updatedAt)}</span>
							</li>
						{/each}
					</ul>
				{/if}
			</Panel>
			<Panel title="Snel naar">
				<ul class="quick">
					<li><a href="/admin/realisaties/nieuw"><Plus size={16} aria-hidden="true" /> Nieuwe realisatie</a></li>
					<li><a href="/admin/getuigenissen/nieuw"><MessageSquareQuote size={16} aria-hidden="true" /> Getuigenis toevoegen</a></li>
					<li><a href="/admin/media"><Upload size={16} aria-hidden="true" /> Foto’s uploaden</a></li>
					<li><a href="/admin/paginas"><FileText size={16} aria-hidden="true" /> Pagina’s bewerken</a></li>
					<li><a href="/admin/diensten"><Shovel size={16} aria-hidden="true" /> Diensten</a></li>
				</ul>
			</Panel>
		</div>
	{/if}
{/if}

<style>
	.kpis {
		display: grid;
		gap: var(--space-4);
		margin-bottom: var(--space-6);
	}
	.split {
		display: grid;
		gap: var(--space-6);
		margin-bottom: var(--space-6);
		align-items: start;
	}
	.section {
		font-size: var(--text-h4);
		margin: var(--space-8) 0 var(--space-4);
	}
	.more {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: var(--text-sm);
		font-weight: 600;
		white-space: nowrap;
	}
	.muted {
		color: var(--color-text-muted);
	}
	.small {
		font-size: var(--text-xs);
	}
	.strong {
		font-weight: 600;
	}
	.schedule {
		list-style: none;
		padding: 0;
		display: grid;
	}
	.schedule li {
		display: grid;
		grid-template-columns: 72px 1fr;
		gap: var(--space-2) var(--space-4);
		padding: var(--space-3) 0;
		border-bottom: 1px solid var(--color-border);
	}
	.schedule li:last-child {
		border-bottom: 0;
	}
	.time {
		display: grid;
	}
	.t {
		font-family: var(--font-mono);
		font-weight: 700;
	}
	.k {
		font-size: var(--text-xs);
		color: var(--color-text-muted);
	}
	.who {
		font-weight: 600;
		color: var(--color-text);
	}
	.line {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 4px;
		font-size: var(--text-xs);
		color: var(--color-text-muted);
	}
	.state {
		grid-column: 2;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
	}
	.unassigned {
		font-size: var(--text-xs);
		color: var(--color-warning-text);
		font-weight: 600;
	}
	.msgs,
	.recent,
	.quick {
		list-style: none;
		padding: 0;
		display: grid;
		gap: var(--space-3);
	}
	.msgs a,
	.recent a {
		font-weight: 600;
		margin-right: var(--space-2);
	}
	.excerpt {
		color: var(--color-text-muted);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	.recent li {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
	}
	.quick a {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-height: 40px;
		padding: 0 var(--space-3);
		border-radius: var(--radius-sm);
		border: 1px solid var(--color-border);
		color: var(--color-text);
		text-decoration: none;
		font-weight: 600;
	}
	.quick a:hover {
		background: var(--color-primary-subtle);
		border-color: var(--color-primary);
	}
	.ref {
		font-family: var(--font-mono);
		font-size: 0.8125rem;
		font-weight: 600;
	}
	.card {
		display: grid;
		gap: 2px;
		color: inherit;
		text-decoration: none;
	}
	.card-top {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	@media (min-width: 640px) {
		.kpis {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
		.schedule li {
			grid-template-columns: 72px 1fr auto;
		}
		.state {
			grid-column: auto;
			justify-content: flex-end;
		}
	}
	@media (min-width: 1100px) {
		.kpis {
			grid-template-columns: repeat(4, minmax(0, 1fr));
		}
		.split {
			grid-template-columns: minmax(0, 2fr) minmax(0, 1fr);
		}
	}
</style>
