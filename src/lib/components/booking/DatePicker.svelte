<script lang="ts">
	import ChevronLeft from '@lucide/svelte/icons/chevron-left';
	import ChevronRight from '@lucide/svelte/icons/chevron-right';
	import { goto } from '$app/navigation';
	import { tick } from 'svelte';
	import { intlLocale, translator, type Locale } from '$lib/i18n';
	import { addDaysISO, addMonths, daysInMonth, weekdayISO } from './dates';

	/**
	 * Inline month calendar (desktop) + horizontally scrolling day strip (mobile), design §4.3.
	 * Every day is a plain link (?maand=…&dag=…), so it works without JS; with JS the grid follows
	 * the ARIA grid keyboard pattern: arrows = day/week, PageUp/PageDown = month, Enter = select.
	 */
	interface Props {
		locale: Locale;
		/** 'YYYY-MM' */
		month: string;
		/** free places per date in this month (absent or 0 = unavailable) */
		days: Record<string, number>;
		selected: string | null;
		today: string;
		minMonth: string;
		maxMonth: string;
		/** URL for a month (+ optional day) */
		href: (month: string, day?: string) => string;
	}

	let { locale, month, days, selected, today, minMonth, maxMonth, href }: Props = $props();

	const t = $derived(translator(locale));
	const uid = $props.id();

	const first = $derived(`${month}-01`);
	const count = $derived(daysInMonth(month));
	const monthDates = $derived(Array.from({ length: count }, (_, i) => addDaysISO(first, i)));

	/** 6×7 (or 5×7) grid of dates; null = padding outside the month. */
	const weeks = $derived.by(() => {
		const lead = weekdayISO(first) - 1;
		const cells: (string | null)[] = [...Array(lead).fill(null), ...monthDates];
		while (cells.length % 7) cells.push(null);
		const rows: (string | null)[][] = [];
		for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
		return rows;
	});

	const weekdayFmt = $derived(new Intl.DateTimeFormat(intlLocale[locale], { weekday: 'short', timeZone: 'UTC' }));
	const weekdayLongFmt = $derived(new Intl.DateTimeFormat(intlLocale[locale], { weekday: 'long', timeZone: 'UTC' }));
	const weekdays = $derived(
		Array.from({ length: 7 }, (_, i) => {
			const d = new Date(Date.UTC(2024, 0, 1 + i)); // 1 Jan 2024 = Monday
			return { short: weekdayFmt.format(d), long: weekdayLongFmt.format(d) };
		})
	);
	const monthLabel = $derived(
		new Intl.DateTimeFormat(intlLocale[locale], { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
			new Date(`${first}T12:00:00Z`)
		)
	);
	const dayLabelFmt = $derived(
		new Intl.DateTimeFormat(intlLocale[locale], { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
	);

	const prevMonth = $derived(month > minMonth ? addMonths(month, -1) : null);
	const nextMonth = $derived(month < maxMonth ? addMonths(month, 1) : null);

	function dayState(date: string) {
		const free = days[date] ?? 0;
		if (date < today || free <= 0) return 'unavailable' as const;
		return free === 1 ? ('limited' as const) : ('available' as const);
	}

	function label(date: string) {
		const s = dayState(date);
		const parts = [dayLabelFmt.format(new Date(`${date}T12:00:00Z`))];
		if (date === today) parts.push(t('booking.calendar.today'));
		if (date === selected) parts.push(t('booking.calendar.selected'));
		parts.push(
			s === 'limited' ? t('booking.calendar.limited') : s === 'available' ? t('booking.calendar.available') : t('booking.calendar.unavailable')
		);
		return parts.join(', ');
	}

	/* ---------------------------------------------------- roving focus (grid) */

	const firstAvailable = $derived(monthDates.find((d) => dayState(d) !== 'unavailable') ?? null);
	let focusDate = $derived(selected && selected.startsWith(month) ? selected : (firstAvailable ?? first));

	let grid: HTMLTableElement | undefined = $state();
	let pendingFocus: string | null = null;

	async function focusCell(date: string) {
		focusDate = date;
		await tick();
		grid?.querySelector<HTMLElement>(`[data-date="${date}"]`)?.focus();
	}

	async function move(target: string) {
		const targetMonth = target.slice(0, 7);
		if (targetMonth === month) return focusCell(target);
		if (targetMonth < minMonth || targetMonth > maxMonth) return;
		pendingFocus = target;
		await goto(href(targetMonth), { noScroll: true, keepFocus: true });
		const p = pendingFocus;
		pendingFocus = null;
		if (p) await focusCell(p.slice(0, 7) === month ? p : first);
	}

	function onkeydown(e: KeyboardEvent) {
		const el = e.target as HTMLElement;
		const date = el.dataset.date;
		if (!date) return;
		let target: string | null = null;
		switch (e.key) {
			case 'ArrowLeft':
				target = addDaysISO(date, -1);
				break;
			case 'ArrowRight':
				target = addDaysISO(date, 1);
				break;
			case 'ArrowUp':
				target = addDaysISO(date, -7);
				break;
			case 'ArrowDown':
				target = addDaysISO(date, 7);
				break;
			case 'Home':
				target = addDaysISO(date, 1 - weekdayISO(date));
				break;
			case 'End':
				target = addDaysISO(date, 7 - weekdayISO(date));
				break;
			case 'PageUp':
			case 'PageDown': {
				const m = addMonths(date.slice(0, 7), e.key === 'PageUp' ? -1 : 1);
				const day = Math.min(Number(date.slice(8)), daysInMonth(m));
				target = `${m}-${String(day).padStart(2, '0')}`;
				break;
			}
			case ' ':
				if (el.tagName === 'A') {
					e.preventDefault();
					el.click();
				}
				return;
			default:
				return;
		}
		e.preventDefault();
		void move(target);
	}

	/* ------------------------------------------------- mobile strip scrolling */

	let strip: HTMLUListElement | undefined = $state();
	$effect(() => {
		void selected;
		void month;
		const el = strip?.querySelector<HTMLElement>('[data-selected="true"]');
		if (strip && el) strip.scrollLeft = el.offsetLeft - strip.clientWidth / 2 + el.clientWidth / 2;
	});

	const stripDates = $derived(monthDates.filter((d) => d >= today));
</script>

<div class="datepicker">
	<div class="head">
		{#if prevMonth}
			<a class="nav" href={href(prevMonth)} data-sveltekit-noscroll aria-label={t('booking.calendar.prev')}>
				<ChevronLeft size={20} aria-hidden="true" />
			</a>
		{:else}
			<span class="nav" aria-hidden="true"><ChevronLeft size={20} /></span>
		{/if}
		<h2 class="month" id="{uid}-month" aria-live="polite">{monthLabel}</h2>
		{#if nextMonth}
			<a class="nav" href={href(nextMonth)} data-sveltekit-noscroll aria-label={t('booking.calendar.next')}>
				<ChevronRight size={20} aria-hidden="true" />
			</a>
		{:else}
			<span class="nav" aria-hidden="true"><ChevronRight size={20} /></span>
		{/if}
	</div>

	<!-- Desktop: ARIA grid -->
	<table
		class="grid"
		role="grid"
		bind:this={grid}
		aria-labelledby="{uid}-month"
		aria-describedby="{uid}-hint"
		{onkeydown}
	>
		<thead>
			<tr>
				{#each weekdays as wd (wd.long)}
					<th scope="col" abbr={wd.long}><span aria-hidden="true">{wd.short}</span><span class="visually-hidden">{wd.long}</span></th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each weeks as week, w (w)}
				<tr>
					{#each week as date, d (date ?? `pad-${w}-${d}`)}
						{#if date}
							{@const s = dayState(date)}
							<td
								role="gridcell"
								aria-selected={date === selected}
								aria-disabled={s === 'unavailable' ? 'true' : undefined}
							>
								{#if s === 'unavailable'}
									<span
										class="day"
										data-state={s}
										data-today={date === today || undefined}
										data-date={date}
										tabindex={date === focusDate ? 0 : -1}
										aria-label={label(date)}
										role="button"
										aria-disabled="true"
									>
										{Number(date.slice(8))}
									</span>
								{:else}
									<a
										class="day"
										href={href(month, date)}
										data-state={s}
										data-selected={date === selected || undefined}
										data-today={date === today || undefined}
										data-date={date}
										data-sveltekit-noscroll
										data-sveltekit-keepfocus
										tabindex={date === focusDate ? 0 : -1}
										aria-label={label(date)}
										aria-current={date === today ? 'date' : undefined}
										onfocus={() => (focusDate = date)}
									>
										{Number(date.slice(8))}
										{#if s === 'limited'}<span class="dot" aria-hidden="true"></span>{/if}
									</a>
								{/if}
							</td>
						{:else}
							<td role="gridcell" aria-hidden="true"></td>
						{/if}
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
	<p class="hint" id="{uid}-hint">{t('booking.calendar.hint')}</p>

	<!-- Mobile: day strip -->
	<ul class="strip" bind:this={strip} aria-labelledby="{uid}-month">
		{#each stripDates as date (date)}
			{@const s = dayState(date)}
			{@const wd = weekdays[weekdayISO(date) - 1]}
			<li>
				{#if s === 'unavailable'}
					<span class="pill" data-state={s} aria-label={label(date)} role="img">
						<span class="pill-wd" aria-hidden="true">{wd.short}</span>
						<span class="pill-day" aria-hidden="true">{Number(date.slice(8))}</span>
						<span class="pill-note" aria-hidden="true">–</span>
					</span>
				{:else}
					<a
						class="pill"
						href={href(month, date)}
						data-state={s}
						data-selected={date === selected}
						data-today={date === today || undefined}
						data-sveltekit-noscroll
						data-sveltekit-keepfocus
						aria-label={label(date)}
						aria-current={date === selected ? 'true' : undefined}
					>
						<span class="pill-wd" aria-hidden="true">{wd.short}</span>
						<span class="pill-day" aria-hidden="true">{Number(date.slice(8))}</span>
						<span class="pill-note" aria-hidden="true">•</span>
					</a>
				{/if}
			</li>
		{/each}
	</ul>

	<ul class="legend" aria-hidden="true">
		<li><span class="swatch" data-state="available"></span>{t('booking.calendar.legendAvailable')}</li>
		<li><span class="swatch" data-state="limited"></span>{t('booking.calendar.legendLimited')}</li>
		<li><span class="swatch" data-state="unavailable"></span>{t('booking.calendar.legendUnavailable')}</li>
	</ul>
</div>

<style>
	.datepicker {
		min-width: 0;
		padding: var(--space-4);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		box-shadow: var(--shadow-1);
	}
	@media (min-width: 640px) {
		.datepicker {
			padding: var(--space-6);
		}
	}
	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
		margin-bottom: var(--space-4);
	}
	.month {
		font-family: var(--font-display);
		font-size: var(--text-h3);
		font-weight: 600;
		text-transform: capitalize;
		text-align: center;
	}
	.nav {
		display: grid;
		place-items: center;
		width: 44px;
		height: 44px;
		border-radius: 50%;
		border: 1.5px solid var(--color-border);
		color: var(--color-primary-hover);
		background: var(--color-surface);
		transition: background-color var(--dur-fast) var(--ease-out);
	}
	a.nav:hover {
		background: var(--color-primary-subtle);
		border-color: var(--color-primary);
	}
	span.nav {
		color: var(--neutral-300);
	}

	/* ---------- grid (≥ 640px) */
	.grid,
	.hint {
		display: none;
	}
	@media (min-width: 640px) {
		.grid {
			display: table;
			width: 100%;
			border-collapse: separate;
			border-spacing: 4px;
			table-layout: fixed;
		}
		.hint {
			display: block;
			margin-top: var(--space-2);
			font-size: var(--text-xs);
			color: var(--color-text-muted);
			text-align: center;
		}
		.strip {
			display: none !important;
		}
	}
	th {
		padding-bottom: var(--space-2);
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--color-text-muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}
	td {
		padding: 0;
		text-align: center;
	}
	.day {
		position: relative;
		display: grid;
		place-items: center;
		width: 100%;
		max-width: 52px;
		height: 48px;
		margin: 0 auto;
		border-radius: var(--radius-md);
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		text-decoration: none;
		color: var(--color-text);
		transition:
			background-color var(--dur-fast) var(--ease-out),
			color var(--dur-fast) var(--ease-out);
	}
	a.day {
		background: var(--color-surface);
		border: 1.5px solid var(--forest-200);
	}
	a.day:hover {
		background: var(--color-primary-subtle);
		border-color: var(--color-primary);
	}
	.day[data-state='unavailable'] {
		font-weight: 400;
		color: var(--neutral-500);
		text-decoration: line-through;
		cursor: not-allowed;
	}
	.day[data-today] {
		box-shadow: inset 0 0 0 2px var(--bark-400);
	}
	a.day[data-selected] {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: var(--color-on-primary);
	}
	.dot {
		position: absolute;
		bottom: 6px;
		left: 50%;
		width: 6px;
		height: 6px;
		margin-left: -3px;
		border-radius: 50%;
		background: var(--harvest);
	}
	[data-selected] .dot {
		background: var(--color-on-primary);
	}

	/* ---------- strip (< 640px) */
	.strip {
		display: flex;
		gap: var(--space-2);
		overflow-x: auto;
		scroll-snap-type: x proximity;
		list-style: none;
		margin: 0 calc(var(--space-4) * -1);
		padding: 4px var(--space-4) var(--space-3);
		scrollbar-width: thin;
	}
	.strip li {
		scroll-snap-align: center;
	}
	.pill {
		display: grid;
		justify-items: center;
		gap: 2px;
		width: 56px;
		padding: var(--space-2) 0;
		border-radius: var(--radius-md);
		border: 1.5px solid var(--forest-200);
		background: var(--color-surface);
		color: var(--color-text);
		text-decoration: none;
	}
	.pill-wd {
		font-size: var(--text-xs);
		font-weight: 600;
		text-transform: uppercase;
		color: var(--color-text-muted);
	}
	.pill-day {
		font-size: 1.25rem;
		font-weight: 700;
		font-variant-numeric: tabular-nums;
	}
	.pill-note {
		font-size: var(--text-xs);
		line-height: 1;
		color: var(--forest-600);
	}
	.pill-note {
		font-size: 1.1rem;
	}
	.pill[data-state='limited'] .pill-note {
		color: var(--harvest);
	}
	.pill[data-state='unavailable'] {
		border-color: var(--color-border);
		background: var(--color-bg-alt);
		color: var(--neutral-500);
	}
	.pill[data-state='unavailable'] .pill-day {
		text-decoration: line-through;
		font-weight: 400;
	}
	.pill[data-today] {
		box-shadow: inset 0 0 0 2px var(--bark-400);
	}
	.pill[data-selected='true'] {
		background: var(--color-primary);
		border-color: var(--color-primary);
		color: var(--color-on-primary);
	}
	.pill[data-selected='true'] .pill-wd,
	.pill[data-selected='true'] .pill-note {
		color: var(--color-on-primary);
	}

	/* ---------- legend */
	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-5);
		margin-top: var(--space-4);
		padding: 0;
		list-style: none;
		font-size: var(--text-xs);
		color: var(--color-text-muted);
	}
	.legend li {
		display: inline-flex;
		align-items: center;
		gap: 6px;
	}
	.swatch {
		position: relative;
		width: 16px;
		height: 16px;
		border-radius: 5px;
		border: 1.5px solid var(--forest-200);
		background: var(--color-surface);
	}
	.swatch[data-state='limited']::after {
		content: '';
		position: absolute;
		left: 50%;
		bottom: 2px;
		width: 4px;
		height: 4px;
		margin-left: -2px;
		border-radius: 50%;
		background: var(--harvest);
	}
	.swatch[data-state='unavailable'] {
		border-color: var(--color-border);
		background: var(--color-bg-alt);
	}
</style>
