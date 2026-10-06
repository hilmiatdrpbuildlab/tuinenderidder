<script lang="ts" module>
	export type CalBooking = {
		id: number;
		reference: string;
		type: 'consultation' | 'maintenance' | 'quote';
		status: import('$lib/domain').BookingStatus;
		customer: string;
		town: string;
		date: string;
		kind: import('$lib/domain').SlotKind;
		start: string;
		end: string;
		service: string;
		assignee: string | null;
	};
	export type CalCell = { capacity: number; booked: number; closed: boolean; slots: number; times: string };
</script>

<script lang="ts">
	import { tick } from 'svelte';
	import { enhance } from '$app/forms';
	import MoveRight from '@lucide/svelte/icons/move-right';
	import Ban from '@lucide/svelte/icons/ban';
	import Dialog from '$lib/components/ui/Dialog.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import { enhanceToast } from './enhance';
	import { SLOT_KINDS_FOR_TYPE, SLOT_LABELS, STATUS_META, type SlotKind } from '$lib/domain';
	import { formatDate } from '$lib/i18n';

	/**
	 * Week / month planning grid. Chips are coloured by status *and* carry the status label.
	 * Drag a chip onto another cell to reschedule (posts ?/move); keyboard users use "Verplaatsen".
	 */
	interface Props {
		view: 'week' | 'month';
		days: string[];
		today: string;
		monthKey: string;
		kinds: SlotKind[];
		cells: Record<string, CalCell>;
		bookings: CalBooking[];
		blackouts: Record<string, string>;
	}

	let { view, days, today, monthKey, kinds, cells, bookings, blackouts }: Props = $props();

	const byCell = $derived.by(() => {
		const m = new Map<string, CalBooking[]>();
		for (const b of bookings) {
			const k = view === 'week' ? `${b.date}|${b.kind}` : b.date;
			const list = m.get(k) ?? [];
			list.push(b);
			m.set(k, list);
		}
		return m;
	});

	const kindsFor = (b: CalBooking) => (SLOT_KINDS_FOR_TYPE[b.type].length ? SLOT_KINDS_FOR_TYPE[b.type] : kinds);
	const dayName = (iso: string) => formatDate(iso, 'nl', { weekday: 'short' });
	const dayNum = (iso: string) => formatDate(iso, 'nl', { day: 'numeric', month: 'short' });
	const openHref = (id: number) => `/admin/boekingen?open=${id}`;
	const monthCols = $derived(days.some((d) => new Date(`${d}T12:00:00Z`).getUTCDay() === 0) ? 7 : 6);

	/* ------------------------------------------------------------ move form (shared by drag & dialog) */
	let moveForm: HTMLFormElement | undefined = $state();
	let mv = $state({ id: 0, date: '', kind: 'morning' as SlotKind, force: false, notify: true });
	let dialogOpen = $state(false);
	let moving = $state<CalBooking | null>(null);
	let busy = $state(false);

	function openMove(b: CalBooking) {
		moving = b;
		mv = { id: b.id, date: b.date, kind: b.kind, force: false, notify: true };
		dialogOpen = true;
	}

	/* ------------------------------------------------------------ drag & drop */
	let dragging = $state<CalBooking | null>(null);
	let over = $state<string | null>(null);

	function canDrop(date: string, kind: SlotKind | null) {
		if (!dragging) return false;
		if (blackouts[date]) return false;
		const k = kind ?? dragging.kind;
		if (!kindsFor(dragging).includes(k)) return false;
		return !(dragging.date === date && dragging.kind === k);
	}
	function onDragStart(e: DragEvent, b: CalBooking) {
		dragging = b;
		e.dataTransfer?.setData('text/plain', String(b.id));
		if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
	}
	function onDragOver(e: DragEvent, date: string, kind: SlotKind | null) {
		if (!canDrop(date, kind)) return;
		e.preventDefault();
		if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
		over = `${date}|${kind ?? ''}`;
	}
	async function onDrop(e: DragEvent, date: string, kind: SlotKind | null) {
		e.preventDefault();
		const b = dragging;
		over = null;
		dragging = null;
		if (!b || !canDrop2(b, date, kind)) return;
		mv = { id: b.id, date, kind: kind ?? b.kind, force: false, notify: true };
		await tick();
		moveForm?.requestSubmit();
	}
	function canDrop2(b: CalBooking, date: string, kind: SlotKind | null) {
		const k = kind ?? b.kind;
		return !blackouts[date] && kindsFor(b).includes(k) && !(b.date === date && b.kind === k);
	}
	function onDragEnd() {
		dragging = null;
		over = null;
	}
</script>

{#snippet chip(b: CalBooking, compact: boolean)}
	<div
		class="chip"
		data-status={b.status}
		class:compact
		class:dragging={dragging?.id === b.id}
		draggable="true"
		role="group"
		aria-label="{b.reference} {b.customer}"
		ondragstart={(e) => onDragStart(e, b)}
		ondragend={onDragEnd}
	>
		<a class="chip-link" href={openHref(b.id)}>
			<span class="chip-top">
				<span class="chip-status">{STATUS_META[b.status].nl}</span>
				{#if compact}<span class="chip-time">{b.start}</span>{/if}
			</span>
			<span class="chip-name">{b.customer}</span>
			{#if !compact}<span class="chip-sub">{b.town}{b.service ? ` · ${b.service}` : ''}</span>{/if}
		</a>
		<button type="button" class="chip-move" onclick={() => openMove(b)} aria-label="{b.reference} verplaatsen" title="Verplaatsen">
			<MoveRight size={14} />
		</button>
	</div>
{/snippet}

{#if view === 'week'}
	<div class="week" style:--cols={days.length} role="group" aria-label="Weekplanning">
		<div class="corner" aria-hidden="true"></div>
		{#each days as d (d)}
			<div class="day-head" class:today={d === today} class:closed={!!blackouts[d]} aria-hidden="true">
				<span class="dn">{dayName(d)}</span>
				<span class="dd">{dayNum(d)}</span>
			</div>
		{/each}
		{#each kinds as k (k)}
			<div class="kind-head" aria-hidden="true">{SLOT_LABELS[k].nl}</div>
			{#each days as d (d)}
				{@const cell = cells[`${d}|${k}`]}
				{@const list = byCell.get(`${d}|${k}`) ?? []}
				<div
					class="cell"
					role="group"
					aria-label="{dayName(d)} {dayNum(d)}, {SLOT_LABELS[k].nl}"
					class:today={d === today}
					class:blackout={!!blackouts[d]}
					class:noslot={!cell}
					class:over={over === `${d}|${k}`}
					class:droppable={dragging && canDrop(d, k)}
					ondragover={(e) => onDragOver(e, d, k)}
					ondragleave={() => over === `${d}|${k}` && (over = null)}
					ondrop={(e) => onDrop(e, d, k)}
				>
					{#if blackouts[d]}
						{#if k === kinds[0]}<span class="bo"><Ban size={14} aria-hidden="true" /> {blackouts[d]}</span>{/if}
					{:else if cell}
						<span class="usage" class:full={cell.booked >= cell.capacity} class:closed={cell.closed} title={cell.times}>
							{#if cell.closed}Gesloten · {/if}{cell.booked}/{cell.capacity}<span class="visually-hidden"> geboekt</span>
						</span>
					{/if}
					{#each list as b (b.id)}{@render chip(b, false)}{/each}
				</div>
			{/each}
		{/each}
	</div>

	<!-- below md: one card per day -->
	<ol class="agenda" aria-label="Weekplanning per dag">
		{#each days as d (d)}
			<li class="agenda-day" class:today={d === today}>
				<h3>{formatDate(d, 'nl', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
				{#if blackouts[d]}
					<p class="bo"><Ban size={14} aria-hidden="true" /> Gesloten: {blackouts[d]}</p>
				{:else}
					{#each kinds as k (k)}
						{@const cell = cells[`${d}|${k}`]}
						{@const list = byCell.get(`${d}|${k}`) ?? []}
						{#if cell || list.length}
							<div class="agenda-kind">
								<p class="agenda-label">{SLOT_LABELS[k].nl} {#if cell}<span class="usage" class:full={cell.booked >= cell.capacity}>{cell.booked}/{cell.capacity}</span>{/if}</p>
								{#each list as b (b.id)}{@render chip(b, false)}{/each}
							</div>
						{/if}
					{/each}
				{/if}
			</li>
		{/each}
	</ol>
{:else}
	<div class="month" style:--cols={monthCols} role="group" aria-label="Maandplanning">
		{#each days.slice(0, monthCols) as d (d)}
			<div class="m-head" aria-hidden="true">{dayName(d)}</div>
		{/each}
		{#each days as d (d)}
			{@const list = byCell.get(d) ?? []}
			{@const inMonth = d.startsWith(monthKey)}
			<div
				class="m-cell"
				role="group"
				aria-label={formatDate(d, 'nl', { weekday: 'long', day: 'numeric', month: 'long' })}
				class:out={!inMonth}
				class:today={d === today}
				class:blackout={!!blackouts[d]}
				class:over={over === `${d}|`}
				class:droppable={dragging && canDrop(d, null)}
				ondragover={(e) => onDragOver(e, d, null)}
				ondragleave={() => over === `${d}|` && (over = null)}
				ondrop={(e) => onDrop(e, d, null)}
			>
				<a class="m-date" href="?week={d}" aria-label="Week van {formatDate(d, 'nl', { day: 'numeric', month: 'long' })} openen">{Number(d.slice(8))}</a>
				{#if blackouts[d]}<span class="bo small"><Ban size={12} aria-hidden="true" /> {blackouts[d]}</span>{/if}
				{#each list.slice(0, 4) as b (b.id)}{@render chip(b, true)}{/each}
				{#if list.length > 4}<a class="m-more" href="?week={d}">+{list.length - 4} meer</a>{/if}
			</div>
		{/each}
	</div>
{/if}

<form
	bind:this={moveForm}
	method="POST"
	action="?/move"
	class="visually-hidden"
	aria-hidden="true"
	use:enhance={enhanceToast({ pending: (b) => (busy = b), after: (ok) => ok && (dialogOpen = false) })}
>
	<input type="hidden" name="id" value={mv.id} />
	<input type="hidden" name="date" value={mv.date} />
	<input type="hidden" name="kind" value={mv.kind} />
	<input type="hidden" name="notify_present" value="1" />
	{#if mv.notify}<input type="hidden" name="notify" value="on" />{/if}
	{#if mv.force}<input type="hidden" name="force" value="on" />{/if}
</form>

<Dialog bind:open={dialogOpen} title={moving ? `${moving.reference} verplaatsen` : 'Verplaatsen'} description={moving ? `${moving.customer} · nu ${formatDate(moving.date, 'nl', { weekday: 'short', day: 'numeric', month: 'short' })}, ${SLOT_LABELS[moving.kind].nl.toLowerCase()}` : undefined} size="sm">
	{#snippet children()}
		<div class="dlg">
			<div class="f">
				<label for="mv-date">Nieuwe datum</label>
				<input id="mv-date" type="date" class="control" bind:value={mv.date} min={today} required />
			</div>
			<div class="f">
				<label for="mv-kind">Slot</label>
				<select id="mv-kind" class="control" bind:value={mv.kind}>
					{#each moving ? kindsFor(moving) : kinds as k (k)}<option value={k}>{SLOT_LABELS[k].nl}</option>{/each}
				</select>
			</div>
			<label class="chk"><input type="checkbox" bind:checked={mv.force} /> Overboeken als het slot volzet is</label>
			<label class="chk"><input type="checkbox" bind:checked={mv.notify} /> E-mail naar klant sturen</label>
		</div>
	{/snippet}
	{#snippet footer()}
		<Button variant="ghost" size="sm" onclick={() => (dialogOpen = false)}>Annuleren</Button>
		<Button size="sm" loading={busy} disabled={!mv.date} onclick={() => moveForm?.requestSubmit()}>Verplaatsen</Button>
	{/snippet}
</Dialog>

<style>
	/* ---------- status colours (always paired with the label) */
	.chip {
		--bg: var(--color-info-subtle);
		--fg: var(--color-info-text);
		--bar: var(--color-info);
	}
	.chip[data-status='pending'] {
		--bg: var(--color-warning-subtle);
		--fg: var(--color-warning-text);
		--bar: var(--color-warning);
	}
	.chip[data-status='scheduled'] {
		--bg: var(--color-primary-subtle);
		--fg: var(--color-primary-hover);
		--bar: var(--color-primary);
	}
	.chip[data-status='in_progress'] {
		--bg: var(--color-secondary-subtle);
		--fg: var(--color-secondary-hover);
		--bar: var(--color-secondary);
	}
	.chip[data-status='completed'] {
		--bg: var(--color-success-subtle);
		--fg: var(--color-success-text);
		--bar: var(--color-success);
	}
	.chip[data-status='rescheduled'] {
		--bg: var(--color-surface-sunken);
		--fg: var(--color-text);
		--bar: var(--color-border-strong);
	}

	.chip {
		position: relative;
		display: flex;
		align-items: stretch;
		margin-top: var(--space-1);
		border-radius: 8px;
		border-left: 3px solid var(--bar);
		background: var(--bg);
		color: var(--fg);
		cursor: grab;
		font-size: var(--text-xs);
		line-height: 1.3;
	}
	.chip.dragging {
		opacity: 0.5;
	}
	.chip-link {
		flex: 1;
		min-width: 0;
		display: grid;
		gap: 1px;
		padding: 4px 6px;
		color: inherit;
		text-decoration: none;
	}
	.chip-link:hover .chip-name {
		text-decoration: underline;
	}
	.chip-top {
		display: flex;
		justify-content: space-between;
		gap: 4px;
	}
	.chip-status {
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		font-size: 10px;
	}
	.chip-name {
		font-weight: 600;
		font-size: var(--text-sm);
		color: var(--color-text);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.compact .chip-name {
		font-size: var(--text-xs);
	}
	.chip-sub {
		color: var(--color-text-muted);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}
	.chip-move {
		display: grid;
		place-items: center;
		width: 26px;
		flex-shrink: 0;
		border: 0;
		border-radius: 0 8px 8px 0;
		background: transparent;
		color: inherit;
		opacity: 0.7;
	}
	.chip-move:hover,
	.chip-move:focus-visible {
		opacity: 1;
		background: var(--color-surface);
	}

	/* ---------- week grid */
	.week {
		display: none;
		grid-template-columns: 112px repeat(var(--cols), minmax(0, 1fr));
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		overflow: hidden;
	}
	.corner,
	.day-head,
	.kind-head {
		background: var(--color-bg-alt);
		border-bottom: 1px solid var(--color-border);
	}
	.day-head {
		display: grid;
		padding: var(--space-2) var(--space-3);
		border-left: 1px solid var(--color-border);
	}
	.day-head.today {
		box-shadow: inset 0 -3px 0 var(--color-primary);
	}
	.day-head.today .dd {
		color: var(--color-primary-hover);
	}
	.dn {
		font-size: var(--text-xs);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-text-muted);
		font-weight: 600;
	}
	.dd {
		font-weight: 700;
		font-size: var(--text-sm);
	}
	.kind-head {
		display: flex;
		align-items: flex-start;
		padding: var(--space-3);
		font-weight: 600;
		font-size: var(--text-sm);
		color: var(--color-text-muted);
	}
	.cell {
		min-height: 104px;
		padding: var(--space-2);
		border-left: 1px solid var(--color-border);
		border-bottom: 1px solid var(--color-border);
		transition: background-color var(--dur-fast) var(--ease-out);
	}
	.cell.today {
		background: color-mix(in srgb, var(--color-primary-subtle) 45%, transparent);
	}
	.cell.noslot {
		background: repeating-linear-gradient(-45deg, transparent 0 8px, var(--color-bg-alt) 8px 9px);
	}
	.cell.blackout,
	.m-cell.blackout {
		background: repeating-linear-gradient(-45deg, var(--color-surface-sunken) 0 8px, var(--color-bg-alt) 8px 16px);
	}
	.cell.droppable,
	.m-cell.droppable {
		outline: 2px dashed var(--color-border-strong);
		outline-offset: -4px;
	}
	.cell.over,
	.m-cell.over {
		outline: 2px solid var(--color-primary);
		background: var(--color-primary-subtle);
	}
	.usage {
		display: inline-block;
		padding: 0 6px;
		border-radius: var(--radius-pill);
		background: var(--color-surface-sunken);
		font-size: var(--text-xs);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--color-text-muted);
	}
	.usage.full {
		background: var(--color-warning-subtle);
		color: var(--color-warning-text);
	}
	.usage.closed {
		background: var(--color-error-subtle);
		color: var(--color-error-text);
	}
	.bo {
		display: inline-flex;
		align-items: center;
		gap: 4px;
		font-size: var(--text-xs);
		font-weight: 600;
		color: var(--color-text-muted);
	}
	.bo.small {
		display: flex;
	}

	/* ---------- agenda (sm) */
	.agenda {
		list-style: none;
		padding: 0;
		display: grid;
		gap: var(--space-3);
	}
	.agenda-day {
		padding: var(--space-3) var(--space-4);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		background: var(--color-surface);
	}
	.agenda-day.today {
		border-color: var(--color-primary);
	}
	.agenda-day h3 {
		font-family: var(--font-body);
		font-size: var(--text-sm);
		font-weight: 700;
		text-transform: capitalize;
	}
	.agenda-kind {
		margin-top: var(--space-2);
	}
	.agenda-label {
		display: flex;
		gap: var(--space-2);
		align-items: center;
		font-size: var(--text-xs);
		color: var(--color-text-muted);
		font-weight: 600;
	}

	/* ---------- month grid */
	.month {
		display: grid;
		grid-template-columns: repeat(var(--cols), minmax(0, 1fr));
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		background: var(--color-surface);
		overflow: hidden;
	}
	.m-head {
		padding: var(--space-2) var(--space-3);
		background: var(--color-bg-alt);
		border-bottom: 1px solid var(--color-border);
		font-size: var(--text-xs);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--color-text-muted);
	}
	.m-cell {
		min-height: 112px;
		padding: var(--space-2);
		border-right: 1px solid var(--color-border);
		border-bottom: 1px solid var(--color-border);
		min-width: 0;
	}
	.m-cell.out {
		background: var(--color-bg-alt);
	}
	.m-cell.out .m-date {
		color: var(--color-text-muted);
	}
	.m-cell.today .m-date {
		background: var(--color-primary);
		color: var(--color-on-primary);
	}
	.m-date {
		display: inline-grid;
		place-items: center;
		min-width: 26px;
		height: 26px;
		border-radius: 50%;
		font-weight: 700;
		font-size: var(--text-sm);
		color: var(--color-text);
		text-decoration: none;
	}
	.m-date:hover {
		background: var(--color-surface-sunken);
	}
	.m-more {
		display: block;
		margin-top: 4px;
		font-size: var(--text-xs);
		font-weight: 600;
	}

	/* ---------- dialog */
	.dlg {
		display: grid;
		gap: var(--space-3);
	}
	.f {
		display: grid;
		gap: 6px;
	}
	.f label {
		font-weight: 600;
		font-size: var(--text-sm);
	}
	.control {
		min-height: var(--control-h);
		padding: 0 var(--space-3);
		border: 1.5px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		color: var(--color-text);
	}
	.chk {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--text-sm);
	}
	.chk input {
		accent-color: var(--color-primary);
	}

	@media (min-width: 640px) {
		.week {
			display: grid;
		}
		.agenda {
			display: none;
		}
	}
	@media (max-width: 639px) {
		.m-cell {
			min-height: 72px;
			padding: 4px;
		}
		.m-cell .chip-link {
			padding: 2px 4px;
		}
		.m-cell .chip-move,
		.m-cell .chip-status {
			display: none;
		}
	}
</style>
