import { and, asc, between } from 'drizzle-orm';
import { requireRole } from '$lib/server/permissions';
import { db } from '$lib/server/db';
import { blackoutDates, slots } from '$lib/server/db/schema';
import { addDays, isoWeekday, monthBounds, startOfWeek, todayISO } from '$lib/server/availability';
import { bookingsBetween } from '$lib/server/admin/bookings';
import { moveAction } from '$lib/server/admin/booking-actions';
import type { SlotKind } from '$lib/domain';
import type { Actions, PageServerLoad } from './$types';

function isoWeek(iso: string) {
	const d = new Date(`${iso}T12:00:00Z`);
	d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
	const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
	return Math.ceil(((d.getTime() - yearStart.getTime()) / 864e5 + 1) / 7);
}

export const load: PageServerLoad = async ({ locals, url }) => {
	requireRole(locals, 'calendar');
	const today = todayISO();
	const maand = url.searchParams.get('maand');
	const weekParam = url.searchParams.get('week');
	const view: 'week' | 'month' = maand && /^\d{4}-\d{2}$/.test(maand) ? 'month' : 'week';

	let from: string, to: string, anchor: string, prev: string, next: string, label: string;
	let monthKey = '';
	if (view === 'month') {
		const [y, m] = maand!.split('-').map(Number);
		const { first, last } = monthBounds(y, m);
		monthKey = maand!;
		from = startOfWeek(first);
		to = addDays(startOfWeek(last), 6);
		anchor = first;
		const pm = m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
		const nm = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
		prev = `?maand=${pm}`;
		next = `?maand=${nm}`;
		label = new Intl.DateTimeFormat('nl-BE', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${first}T12:00:00Z`));
	} else {
		const base = weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam) ? weekParam : today;
		from = startOfWeek(base);
		to = addDays(from, 6);
		anchor = from;
		prev = `?week=${addDays(from, -7)}`;
		next = `?week=${addDays(from, 7)}`;
		const fmt = (iso: string, o: Intl.DateTimeFormatOptions) =>
			new Intl.DateTimeFormat('nl-BE', { ...o, timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`));
		label = `Week ${isoWeek(from)} · ${fmt(from, { day: 'numeric', month: 'short' })} – ${fmt(addDays(from, 5), { day: 'numeric', month: 'short', year: 'numeric' })}`;
	}

	const [slotRows, bookings, blackouts] = await Promise.all([
		db.select().from(slots).where(between(slots.date, from, to)).orderBy(asc(slots.date), asc(slots.start)),
		bookingsBetween(from, to),
		db.select().from(blackoutDates).where(and(between(blackoutDates.date, from, to))).orderBy(asc(blackoutDates.date))
	]);

	// Days Mon–Sat (Sunday only when something is planned on it).
	const hasSunday = slotRows.some((s) => isoWeekday(s.date) === 7);
	const days: string[] = [];
	for (let d = from; d <= to; d = addDays(d, 1)) {
		if (isoWeekday(d) === 7 && !hasSunday) continue;
		days.push(d);
	}

	const cells: Record<string, { capacity: number; booked: number; closed: boolean; slots: number; times: string }> = {};
	for (const s of slotRows) {
		const key = `${s.date}|${s.slotKind}`;
		const c = (cells[key] ??= { capacity: 0, booked: 0, closed: true, slots: 0, times: '' });
		c.capacity += s.capacity;
		c.booked += s.bookedCount;
		c.closed = c.closed && s.isClosed;
		c.slots += 1;
		c.times = c.slots === 1 ? `${s.start}–${s.end}` : `${c.slots} tijdsloten`;
	}

	return {
		title: 'Kalender',
		view,
		days,
		today,
		anchor,
		monthKey,
		prev,
		next,
		label,
		todayHref: view === 'month' ? `?maand=${today.slice(0, 7)}` : '?',
		otherViewHref: view === 'month' ? `?week=${anchor}` : `?maand=${anchor.slice(0, 7)}`,
		cells,
		kinds: ['morning', 'afternoon', 'consult'] as SlotKind[],
		bookings: bookings.map((b) => ({
			id: b.id,
			reference: b.reference,
			type: b.type,
			status: b.status,
			customer: b.customer.name,
			town: b.customer.town,
			date: b.slot!.date,
			kind: b.slot!.kind,
			start: b.slot!.start,
			end: b.slot!.end,
			service: b.services[0]?.title ?? '',
			assignee: b.assignee?.name ?? null
		})),
		blackouts: Object.fromEntries(blackouts.map((b) => [b.date, b.reason || 'Gesloten']))
	};
};

export const actions: Actions = {
	move: (event) => moveAction(event)
};
