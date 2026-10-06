<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import Plus from '@lucide/svelte/icons/plus';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import CalendarView from '$lib/components/admin/CalendarView.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import type { BookingStatus } from '$lib/domain';

	let { data } = $props();
	const legend: BookingStatus[] = ['new', 'pending', 'scheduled', 'in_progress', 'rescheduled', 'completed'];
</script>

<svelte:head><title>Kalender · CMS Tuinen De Ridder</title></svelte:head>

<PageHeader title="Kalender" description="Sleep een afspraak naar een ander vak om te verplaatsen, of gebruik de pijlknop.">
	{#snippet actions()}
		<Button href="/admin/beschikbaarheid" variant="outline" size="sm">Beschikbaarheid</Button>
		<Button href="/admin/boekingen/nieuw" size="sm">
			{#snippet iconStart()}<Plus />{/snippet}
			Nieuwe boeking
		</Button>
	{/snippet}
</PageHeader>

<div class="bar">
	<div class="nav">
		<a class="step" href={data.prev} aria-label={data.view === 'week' ? 'Vorige week' : 'Vorige maand'} data-sveltekit-noscroll><ChevronLeft size={18} /></a>
		<a class="step" href={data.next} aria-label={data.view === 'week' ? 'Volgende week' : 'Volgende maand'} data-sveltekit-noscroll><ChevronRight size={18} /></a>
		<a class="today" href={data.todayHref} data-sveltekit-noscroll>Vandaag</a>
		<h2 aria-live="polite">{data.label}</h2>
	</div>
	<nav class="switch" aria-label="Weergave">
		<a href={data.view === 'week' ? '?' : data.otherViewHref} aria-current={data.view === 'week' ? 'page' : undefined} data-sveltekit-noscroll>Week</a>
		<a href={data.view === 'month' ? `?maand=${data.monthKey}` : data.otherViewHref} aria-current={data.view === 'month' ? 'page' : undefined} data-sveltekit-noscroll>Maand</a>
	</nav>
</div>

<CalendarView
	view={data.view}
	days={data.days}
	today={data.today}
	monthKey={data.monthKey}
	kinds={data.kinds}
	cells={data.cells}
	bookings={data.bookings}
	blackouts={data.blackouts}
/>

<ul class="legend" aria-label="Legende">
	{#each legend as s (s)}<li><StatusBadge status={s} /></li>{/each}
	<li class="hint">Gestreept = geen slot of gesloten dag · “1/2” = geboekt / capaciteit</li>
</ul>

<style>
	.bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3);
		margin-bottom: var(--space-4);
	}
	.nav {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}
	h2 {
		margin-left: var(--space-2);
		font-family: var(--font-body);
		font-size: var(--text-base);
		font-weight: 700;
		text-transform: capitalize;
	}
	.step,
	.today {
		display: inline-grid;
		place-items: center;
		height: 36px;
		min-width: 36px;
		border: 1px solid var(--color-border);
		border-radius: 10px;
		background: var(--color-surface);
		color: var(--color-text);
		text-decoration: none;
		font-weight: 600;
	}
	.today {
		padding: 0 var(--space-3);
	}
	.step:hover,
	.today:hover {
		background: var(--color-bg-alt);
	}
	.switch {
		display: flex;
		padding: 3px;
		border-radius: 10px;
		background: var(--color-surface-sunken);
	}
	.switch a {
		padding: 6px var(--space-4);
		border-radius: 8px;
		color: var(--color-text-muted);
		font-weight: 600;
		text-decoration: none;
	}
	.switch a[aria-current='page'] {
		background: var(--color-surface);
		color: var(--color-primary-hover);
		box-shadow: var(--shadow-1);
	}
	.legend {
		list-style: none;
		padding: 0;
		margin-top: var(--space-4);
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
		align-items: center;
	}
	.hint {
		font-size: var(--text-xs);
		color: var(--color-text-muted);
	}
</style>
