<script lang="ts">
	import { enhance } from '$app/forms';
	import Phone from '@lucide/svelte/icons/phone';
	import Mail from '@lucide/svelte/icons/mail';
	import MapPin from '@lucide/svelte/icons/map-pin';
	import CalendarClock from '@lucide/svelte/icons/calendar-clock';
	import ArrowRight from '@lucide/svelte/icons/arrow-right';
	import History from '@lucide/svelte/icons/history';
	import StatusBadge from '$lib/components/ui/StatusBadge.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Button from '$lib/components/ui/Button.svelte';
	import Icon from '$lib/components/ui/Icon.svelte';
	import Picture from '$lib/components/ui/Picture.svelte';
	import Avatar from './Avatar.svelte';
	import { enhanceToast } from './enhance';
	import { formatDateTime, relativeTime, shortDay } from './format';
	import { formatLongDate } from '$lib/i18n';
	import {
		FREQUENCY_LABELS,
		GARDEN_SIZE_LABELS,
		SLOT_LABELS,
		SOURCE_LABELS,
		STATUS_META,
		TYPE_LABELS,
		type BookingStatus
	} from '$lib/domain';
	import type { BookingDetail, SlotOption } from '$lib/server/admin/bookings';

	/** Body of the booking drawer: contact, job, status actions, assignment, reschedule, notes, timeline. */
	interface Props {
		booking: BookingDetail;
		assignees: { id: number; name: string }[];
		slots: SlotOption[];
		/** Builds the form action URL for a named action, keeping the drawer open after a no-JS post. */
		action: (name: string) => string;
	}

	let { booking, assignees, slots, action }: Props = $props();
	const uid = $props.id();

	let busy = $state<string | null>(null);
	const pending = (key: string) => (b: boolean) => (busy = b ? key : null);

	const actionLabel: Partial<Record<BookingStatus, string>> = {
		pending: 'In afwachting zetten',
		scheduled: 'Bevestigen (gepland)',
		in_progress: 'Start werk',
		completed: 'Afronden',
		rescheduled: 'Markeer verplaatst',
		cancelled: 'Annuleren'
	};

	const canMove = $derived(booking.status !== 'cancelled' && booking.status !== 'completed');
	const slotGroups = $derived.by(() => {
		const map = new Map<string, SlotOption[]>();
		for (const s of slots) {
			const list = map.get(s.date) ?? [];
			list.push(s);
			map.set(s.date, list);
		}
		return [...map.entries()];
	});
	let notes = $state('');
	$effect.pre(() => {
		notes = booking.notesInternal;
	});
	const address = $derived([booking.customer.street, [booking.customer.postcode, booking.customer.town].filter(Boolean).join(' ')].filter(Boolean).join(', '));
</script>

<div class="detail">
	<div class="head">
		<div class="badges">
			<StatusBadge status={booking.status} />
			<Badge tone="neutral">{TYPE_LABELS[booking.type].nl}</Badge>
			<Badge tone="neutral">{SOURCE_LABELS[booking.source]}</Badge>
		</div>
		<p class="created">Aangemaakt {relativeTime(booking.createdAt)} · <time datetime={booking.createdAt}>{formatDateTime(booking.createdAt)}</time></p>
	</div>

	<!-- ------------------------------------------------------------ status -->
	{#if booking.transitions.length}
		<section class="block" aria-labelledby="{uid}-status">
			<h3 id="{uid}-status">Status wijzigen</h3>
			<form method="POST" action={action('status')} use:enhance={enhanceToast({ pending: pending('status') })} class="status-form">
				<input type="hidden" name="id" value={booking.id} />
				<input type="hidden" name="notify_present" value="1" />
				<div class="status-buttons">
					{#each booking.transitions as t (t)}
						<Button
							type="submit"
							name="status"
							value={t}
							size="sm"
							variant={t === 'cancelled' ? 'ghost' : t === booking.transitions[0] ? 'primary' : 'outline'}
							disabled={busy === 'status'}
							data-danger={t === 'cancelled' || undefined}
						>
							{actionLabel[t] ?? STATUS_META[t].nl}
						</Button>
					{/each}
				</div>
				<label class="inline-check">
					<input type="checkbox" name="notify" checked />
					E-mail naar klant sturen
				</label>
			</form>
		</section>
	{/if}

	<!-- ------------------------------------------------------------ planning -->
	<section class="block" aria-labelledby="{uid}-plan">
		<h3 id="{uid}-plan">Planning</h3>
		{#if booking.slot}
			<p class="slot">
				<CalendarClock size={18} aria-hidden="true" />
				<span>
					<strong>{formatLongDate(booking.slot.date, 'nl')}</strong><br />
					{SLOT_LABELS[booking.slot.kind].nl} · {booking.slot.start}–{booking.slot.end}
				</span>
			</p>
		{:else}
			<p class="muted">Nog geen datum ingepland.</p>
		{/if}

		{#if canMove}
			<details class="move" open={!booking.slot && booking.type !== 'quote'}>
				<summary>{booking.slot ? 'Verplaatsen naar een ander slot' : 'Inplannen in een slot'}</summary>
				<form method="POST" action={action('reschedule')} use:enhance={enhanceToast({ pending: pending('move') })} class="stack">
					<input type="hidden" name="id" value={booking.id} />
					<input type="hidden" name="notify_present" value="1" />
					<div class="field">
						<label for="{uid}-slot">Nieuw slot</label>
						<select id="{uid}-slot" name="slotId" required class="control">
							<option value="">Kies een dag en slot…</option>
							{#each slotGroups as [date, list] (date)}
								<optgroup label={shortDay(date)}>
									{#each list as s (s.id)}
										{@const full = s.booked >= s.capacity}
										<option value={s.id} disabled={s.id === booking.slot?.id}>
											{SLOT_LABELS[s.kind].nl} {s.start}–{s.end} · {s.booked}/{s.capacity}{s.closed ? ' · gesloten' : full ? ' · volzet' : ''}
										</option>
									{/each}
								</optgroup>
							{/each}
						</select>
					</div>
					<label class="inline-check">
						<input type="checkbox" name="force" />
						Overboeken (ook als het slot volzet of gesloten is)
					</label>
					<label class="inline-check">
						<input type="checkbox" name="notify" checked />
						E-mail naar klant sturen
					</label>
					<div><Button type="submit" size="sm" loading={busy === 'move'}>{booking.slot ? 'Verplaatsen' : 'Inplannen'}</Button></div>
				</form>
			</details>
		{/if}
	</section>

	<!-- ------------------------------------------------------------ assignment -->
	<section class="block" aria-labelledby="{uid}-assign">
		<h3 id="{uid}-assign">Toegewezen aan</h3>
		<form method="POST" action={action('assign')} use:enhance={enhanceToast({ pending: pending('assign') })} class="row">
			<input type="hidden" name="id" value={booking.id} />
			{#if booking.assignee}<Avatar name={booking.assignee.name} size={32} />{/if}
			<label for="{uid}-assignee" class="visually-hidden">Medewerker</label>
			<select
				id="{uid}-assignee"
				name="assignee"
				class="control grow"
				value={booking.assignee ? String(booking.assignee.id) : 'geen'}
				onchange={(e) => e.currentTarget.form?.requestSubmit()}
			>
				<option value="geen">Niemand</option>
				{#each assignees as a (a.id)}<option value={String(a.id)}>{a.name}</option>{/each}
			</select>
			<noscript><Button type="submit" size="sm" variant="outline">Opslaan</Button></noscript>
		</form>
	</section>

	<!-- ------------------------------------------------------------ customer -->
	<section class="block" aria-labelledby="{uid}-cust">
		<h3 id="{uid}-cust">Klant</h3>
		<p class="cust-name">{booking.customer.name}</p>
		<ul class="contact">
			{#if booking.customer.phone}
				<li><Phone size={16} aria-hidden="true" /><a href="tel:{booking.customer.phone.replace(/[^\d+]/g, '')}">{booking.customer.phone}</a></li>
			{/if}
			<li><Mail size={16} aria-hidden="true" /><a href="mailto:{booking.customer.email}?subject={encodeURIComponent(`Uw aanvraag ${booking.reference}`)}">{booking.customer.email}</a></li>
			{#if address}
				<li>
					<MapPin size={16} aria-hidden="true" />
					<a href="https://www.openstreetmap.org/search?query={encodeURIComponent(address + ', België')}" target="_blank" rel="noopener noreferrer">{address}<span class="visually-hidden"> (kaart, nieuw venster)</span></a>
				</li>
			{/if}
		</ul>
		<p class="muted small">
			Taal: {booking.locale === 'en' ? 'Engels' : 'Nederlands'}
			{#if booking.otherBookings > 0}
				· <a href="/admin/boekingen?q={encodeURIComponent(booking.customer.email)}">{booking.otherBookings} andere {booking.otherBookings === 1 ? 'boeking' : 'boekingen'}</a>
			{/if}
		</p>
	</section>

	<!-- ------------------------------------------------------------ job -->
	<section class="block" aria-labelledby="{uid}-job">
		<h3 id="{uid}-job">Opdracht</h3>
		{#if booking.services.length}
			<ul class="services">
				{#each booking.services as s (s.id)}
					<li><Icon name={s.icon} size={18} /> {s.title}</li>
				{/each}
			</ul>
		{/if}
		<dl class="facts">
			<div><dt>Frequentie</dt><dd>{FREQUENCY_LABELS[booking.frequency].nl}</dd></div>
			<div><dt>Tuinoppervlakte</dt><dd>{booking.gardenSize ? GARDEN_SIZE_LABELS[booking.gardenSize] : 'Niet opgegeven'}</dd></div>
		</dl>
		{#if booking.notesCustomer}
			<div class="quote">
				<p class="label">Opmerking van de klant</p>
				<p class="pre">{booking.notesCustomer}</p>
			</div>
		{/if}
		{#if booking.photos.length}
			<p class="label">Foto’s van de klant ({booking.photos.length})</p>
			<ul class="photos">
				{#each booking.photos as p (p.id)}
					<li>
						<a href={p.src} target="_blank" rel="noopener">
							<Picture media={p} ratio="1 / 1" sizes="140px" alt={p.alt || 'Foto van de klant'} />
							<span class="visually-hidden">(open in nieuw venster)</span>
						</a>
					</li>
				{/each}
			</ul>
		{/if}
	</section>

	<!-- ------------------------------------------------------------ notes -->
	<section class="block" aria-labelledby="{uid}-notes">
		<h3 id="{uid}-notes">Interne notities</h3>
		<form method="POST" action={action('notes')} use:enhance={enhanceToast({ pending: pending('notes') })} class="stack">
			<input type="hidden" name="id" value={booking.id} />
			<label for="{uid}-notes-ta" class="visually-hidden">Interne notitie</label>
			<textarea id="{uid}-notes-ta" name="notes" class="control" rows="4" maxlength="5000" bind:value={notes} placeholder="Alleen zichtbaar voor het team (bv. sleutel bij de buren, hond in de tuin)…"></textarea>
			<div><Button type="submit" size="sm" variant="outline" loading={busy === 'notes'} disabled={notes === booking.notesInternal}>Notitie opslaan</Button></div>
		</form>
	</section>

	<!-- ------------------------------------------------------------ timeline -->
	<section class="block" aria-labelledby="{uid}-tl">
		<h3 id="{uid}-tl"><History size={16} aria-hidden="true" /> Tijdlijn</h3>
		<ol class="timeline">
			{#each booking.events as e (e.id)}
				<li>
					<span class="dot" aria-hidden="true"></span>
					<div>
						<p class="ev-main">
							{#if e.toStatus}
								{#if e.fromStatus}
									<StatusBadge status={e.fromStatus} /> <ArrowRight size={14} aria-label="naar" /> <StatusBadge status={e.toStatus} />
								{:else}
									<StatusBadge status={e.toStatus} />
								{/if}
							{/if}
							{#if e.note}<span class="ev-note">{e.note}</span>{/if}
						</p>
						<p class="ev-meta">
							{e.actorName ?? 'Klant / systeem'} ·
							<time datetime={e.createdAt} title={formatDateTime(e.createdAt)}>{relativeTime(e.createdAt)}</time>
						</p>
					</div>
				</li>
			{/each}
		</ol>
	</section>
</div>

<style>
	.detail {
		display: grid;
		gap: var(--space-5);
		font-size: var(--text-sm);
	}
	.head {
		display: grid;
		gap: var(--space-2);
	}
	.badges {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}
	.created,
	.muted {
		color: var(--color-text-muted);
	}
	.small {
		font-size: var(--text-xs);
		margin-top: var(--space-2);
	}
	.block {
		display: grid;
		gap: var(--space-3);
		padding-top: var(--space-4);
		border-top: 1px solid var(--color-border);
	}
	h3 {
		display: flex;
		align-items: center;
		gap: 6px;
		font-family: var(--font-body);
		font-size: var(--text-xs);
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--color-text-muted);
	}
	.status-form,
	.stack {
		display: grid;
		gap: var(--space-3);
	}
	.status-buttons {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}
	.status-buttons :global([data-danger]) {
		color: var(--color-error);
	}
	.inline-check {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		cursor: pointer;
	}
	.inline-check input {
		width: 16px;
		height: 16px;
		accent-color: var(--color-primary);
	}
	.slot {
		display: flex;
		gap: var(--space-3);
		align-items: flex-start;
		padding: var(--space-3);
		border-radius: var(--radius-md);
		background: var(--color-bg-alt);
	}
	.slot :global(svg) {
		color: var(--color-primary);
		margin-top: 2px;
		flex-shrink: 0;
	}
	.move summary {
		cursor: pointer;
		font-weight: 600;
		color: var(--color-link);
		padding: var(--space-1) 0;
	}
	.move[open] summary {
		margin-bottom: var(--space-3);
	}
	.field {
		display: grid;
		gap: 6px;
	}
	.field label {
		font-weight: 600;
	}
	.control {
		width: 100%;
		min-height: var(--control-h);
		padding: 0 var(--space-3);
		border: 1.5px solid var(--color-border-strong);
		border-radius: var(--radius-sm);
		background: var(--color-surface);
		color: var(--color-text);
		font-size: var(--text-sm);
	}
	textarea.control {
		padding: var(--space-2) var(--space-3);
		resize: vertical;
		line-height: 1.5;
	}
	.control:focus-visible {
		outline: 2px solid var(--color-focus);
		outline-offset: 0;
		border-color: var(--color-primary);
	}
	.row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}
	.grow {
		flex: 1;
	}
	.cust-name {
		font-size: var(--text-base);
		font-weight: 600;
	}
	.contact {
		list-style: none;
		padding: 0;
		display: grid;
		gap: var(--space-2);
	}
	.contact li {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		min-width: 0;
		overflow-wrap: anywhere;
	}
	.contact :global(svg) {
		color: var(--color-text-muted);
		flex-shrink: 0;
	}
	.services {
		list-style: none;
		padding: 0;
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2);
	}
	.services li {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 4px 10px 4px 8px;
		border-radius: var(--radius-pill);
		background: var(--color-primary-subtle);
		color: var(--color-primary-hover);
		font-weight: 600;
	}
	.facts {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-3);
	}
	dt,
	.label {
		font-size: var(--text-xs);
		color: var(--color-text-muted);
	}
	dd {
		margin: 0;
		font-weight: 600;
	}
	.quote {
		padding: var(--space-3);
		border-left: 3px solid var(--color-accent);
		border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
		background: var(--color-bg-alt);
	}
	.pre {
		white-space: pre-line;
	}
	.photos {
		list-style: none;
		padding: 0;
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
		gap: var(--space-2);
	}
	.photos a {
		display: block;
		border-radius: var(--radius-sm);
		overflow: hidden;
	}
	.timeline {
		list-style: none;
		padding: 0;
		display: grid;
		gap: var(--space-4);
		position: relative;
	}
	.timeline li {
		display: grid;
		grid-template-columns: 12px 1fr;
		gap: var(--space-3);
		position: relative;
	}
	.timeline li:not(:last-child)::before {
		content: '';
		position: absolute;
		left: 5px;
		top: 14px;
		bottom: calc(var(--space-4) * -1);
		width: 2px;
		background: var(--color-border);
	}
	.dot {
		width: 12px;
		height: 12px;
		margin-top: 4px;
		border-radius: 50%;
		border: 2px solid var(--color-primary);
		background: var(--color-surface);
	}
	.ev-main {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 6px;
	}
	.ev-note {
		color: var(--color-text);
	}
	.ev-meta {
		margin-top: 2px;
		font-size: var(--text-xs);
		color: var(--color-text-muted);
	}
</style>
