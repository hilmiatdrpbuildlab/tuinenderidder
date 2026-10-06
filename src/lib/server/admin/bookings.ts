/**
 * CMS booking operations: list/filter/sort/paginate, detail, status changes, assignment, notes and
 * reschedules. Every mutation runs in one transaction and writes a `booking_events` row; customer
 * emails are sent by the caller *after* commit (see notifyStatus()).
 */
import { and, asc, desc, eq, gte, ilike, inArray, isNull, lte, ne, or, sql, type SQL } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	bookingAttachments,
	bookingEvents,
	bookingServices,
	bookings,
	customers,
	serviceTranslations,
	services,
	slots,
	users
} from '$lib/server/db/schema';
import { addDays, forceReserveSlot, releaseSlot, reserveSlot, startOfWeek, todayISO, monthBounds } from '$lib/server/availability';
import { getBookingSettings } from '$lib/server/settings';
import { getMediaRefs } from '$lib/server/media';
import { sendStatusChangeEmail } from '$lib/server/booking-emails';
import {
	BOOKING_STATUSES,
	BOOKING_TYPES,
	SLOT_KINDS_FOR_TYPE,
	SLOT_LABELS,
	STATUS_META,
	STATUS_TRANSITIONS,
	type BookingStatus,
	type BookingType,
	type SlotKind
} from '$lib/domain';

/* ------------------------------------------------------------------ filters */

export const PERIODS = {
	vandaag: 'Vandaag',
	week: 'Deze week',
	'volgende-week': 'Volgende week',
	maand: 'Deze maand',
	komend: 'Vanaf vandaag',
	verleden: 'Verleden',
	'zonder-datum': 'Zonder datum'
} as const;
export type Period = keyof typeof PERIODS;

export const SORTS = ['referentie', 'klant', 'datum', 'status', 'aangemaakt', 'bron'] as const;
export type SortKey = (typeof SORTS)[number];
export const PAGE_SIZES = [25, 50, 100] as const;

export type BookingFilters = {
	q: string;
	statuses: BookingStatus[];
	serviceId: number | null;
	type: BookingType | null;
	period: Period | null;
	assignee: number | 'none' | null;
	sort: SortKey;
	dir: 'asc' | 'desc';
	page: number;
	per: number;
	ids: number[];
};

export function parseBookingFilters(url: URL): BookingFilters {
	const p = url.searchParams;
	const statuses = [...new Set([...(p.get('status') ?? '').split(','), ...p.getAll('st')])]
		.filter((s): s is BookingStatus => (BOOKING_STATUSES as readonly string[]).includes(s));
	const type = p.get('type');
	const period = p.get('periode');
	const sort = p.get('sort');
	const per = Number(p.get('per'));
	const serviceId = Number(p.get('dienst'));
	const assignee = p.get('toegewezen');
	return {
		q: (p.get('q') ?? '').trim().slice(0, 100),
		statuses,
		serviceId: Number.isInteger(serviceId) && serviceId > 0 ? serviceId : null,
		type: type && (BOOKING_TYPES as readonly string[]).includes(type) ? (type as BookingType) : null,
		period: period && period in PERIODS ? (period as Period) : null,
		assignee: assignee === 'geen' ? 'none' : Number(assignee) > 0 ? Number(assignee) : null,
		sort: sort && (SORTS as readonly string[]).includes(sort) ? (sort as SortKey) : 'aangemaakt',
		dir: p.get('dir') === 'asc' ? 'asc' : 'desc',
		page: Math.max(1, Math.floor(Number(p.get('page'))) || 1),
		per: (PAGE_SIZES as readonly number[]).includes(per) ? per : 25,
		ids: p
			.getAll('ids')
			.flatMap((v) => v.split(','))
			.map(Number)
			.filter((n) => Number.isInteger(n) && n > 0)
	};
}

function periodRange(period: Period): { from?: string; to?: string; none?: boolean } {
	const today = todayISO();
	switch (period) {
		case 'vandaag':
			return { from: today, to: today };
		case 'week': {
			const mon = startOfWeek(today);
			return { from: mon, to: addDays(mon, 6) };
		}
		case 'volgende-week': {
			const mon = addDays(startOfWeek(today), 7);
			return { from: mon, to: addDays(mon, 6) };
		}
		case 'maand': {
			const [y, m] = today.split('-').map(Number);
			const { first, last } = monthBounds(y, m);
			return { from: first, to: last };
		}
		case 'komend':
			return { from: today };
		case 'verleden':
			return { to: addDays(today, -1) };
		case 'zonder-datum':
			return { none: true };
	}
}

function whereFor(f: BookingFilters): SQL | undefined {
	const conds: (SQL | undefined)[] = [];
	if (f.ids.length) conds.push(inArray(bookings.id, f.ids));
	if (f.q) {
		const like = `%${f.q.replace(/[%_\\]/g, (c) => '\\' + c)}%`;
		conds.push(
			or(
				ilike(bookings.reference, like),
				ilike(customers.name, like),
				ilike(customers.email, like),
				ilike(customers.phone, like),
				ilike(customers.municipality, like),
				ilike(customers.postcode, like)
			)
		);
	}
	if (f.statuses.length) conds.push(inArray(bookings.status, f.statuses));
	if (f.type) conds.push(eq(bookings.type, f.type));
	if (f.serviceId)
		conds.push(
			sql`exists (select 1 from ${bookingServices} where ${bookingServices.bookingId} = ${bookings.id} and ${bookingServices.serviceId} = ${f.serviceId})`
		);
	if (f.assignee === 'none') conds.push(isNull(bookings.assignedTo));
	else if (typeof f.assignee === 'number') conds.push(eq(bookings.assignedTo, f.assignee));
	if (f.period) {
		const r = periodRange(f.period);
		if (r.none) conds.push(isNull(bookings.slotId));
		if (r.from) conds.push(gte(slots.date, r.from));
		if (r.to) conds.push(lte(slots.date, r.to));
	}
	const list = conds.filter((c): c is SQL => !!c);
	return list.length ? and(...list) : undefined;
}

function orderFor(f: BookingFilters): SQL[] {
	const d = f.dir === 'asc' ? asc : desc;
	switch (f.sort) {
		case 'referentie':
			return [d(bookings.reference)];
		case 'klant':
			return [d(customers.name), desc(bookings.id)];
		case 'datum':
			return [
				f.dir === 'asc' ? sql`${slots.date} asc nulls last` : sql`${slots.date} desc nulls last`,
				d(slots.start),
				desc(bookings.id)
			];
		case 'status':
			return [
				sql`array_position(array[${sql.join(
					BOOKING_STATUSES.map((s) => sql`${s}`),
					sql`, `
				)}]::text[], ${bookings.status}) ${sql.raw(f.dir)}`,
				desc(bookings.id)
			];
		case 'bron':
			return [d(bookings.source), desc(bookings.id)];
		default:
			return [d(bookings.createdAt), d(bookings.id)];
	}
}

/* --------------------------------------------------------------------- list */

export type BookingRow = Awaited<ReturnType<typeof listBookings>>['rows'][number];

const rowSelect = {
	id: bookings.id,
	reference: bookings.reference,
	type: bookings.type,
	status: bookings.status,
	source: bookings.source,
	frequency: bookings.frequency,
	createdAt: bookings.createdAt,
	customerName: customers.name,
	customerEmail: customers.email,
	customerPhone: customers.phone,
	customerTown: customers.municipality,
	customerPostcode: customers.postcode,
	customerStreet: customers.street,
	slotId: slots.id,
	slotDate: slots.date,
	slotKind: slots.slotKind,
	slotStart: slots.start,
	slotEnd: slots.end,
	assigneeId: users.id,
	assigneeName: users.name,
	notesInternal: bookings.notesInternal
};

export async function serviceTitles() {
	return db
		.select({ id: services.id, icon: services.icon, title: serviceTranslations.title, sort: services.sort })
		.from(services)
		.innerJoin(serviceTranslations, and(eq(serviceTranslations.serviceId, services.id), eq(serviceTranslations.locale, 'nl')))
		.orderBy(asc(services.sort), asc(services.id));
}

async function servicesFor(ids: number[]) {
	const map = new Map<number, { id: number; title: string; icon: string }[]>();
	if (!ids.length) return map;
	const rows = await db
		.select({ bookingId: bookingServices.bookingId, id: services.id, icon: services.icon, title: serviceTranslations.title })
		.from(bookingServices)
		.innerJoin(services, eq(services.id, bookingServices.serviceId))
		.innerJoin(serviceTranslations, and(eq(serviceTranslations.serviceId, services.id), eq(serviceTranslations.locale, 'nl')))
		.where(inArray(bookingServices.bookingId, ids))
		.orderBy(asc(services.sort));
	for (const r of rows) {
		const list = map.get(r.bookingId) ?? [];
		list.push({ id: r.id, title: r.title, icon: r.icon });
		map.set(r.bookingId, list);
	}
	return map;
}

type RawRow = Awaited<ReturnType<typeof baseQuery>>[number];

function shapeRow(r: RawRow, svc: Map<number, { id: number; title: string; icon: string }[]>) {
	return {
		id: r.id,
		reference: r.reference,
		type: r.type,
		status: r.status as BookingStatus,
		source: r.source,
		frequency: r.frequency,
		createdAt: r.createdAt.toISOString(),
		customer: {
			name: r.customerName,
			email: r.customerEmail,
			phone: r.customerPhone,
			town: r.customerTown,
			postcode: r.customerPostcode,
			street: r.customerStreet
		},
		slot: r.slotId
			? { id: r.slotId, date: r.slotDate!, kind: r.slotKind as SlotKind, start: r.slotStart!, end: r.slotEnd! }
			: null,
		assignee: r.assigneeId ? { id: r.assigneeId, name: r.assigneeName! } : null,
		services: svc.get(r.id) ?? [],
		hasNotes: r.notesInternal.trim().length > 0
	};
}

function baseQuery() {
	return db
		.select(rowSelect)
		.from(bookings)
		.innerJoin(customers, eq(customers.id, bookings.customerId))
		.leftJoin(slots, eq(slots.id, bookings.slotId))
		.leftJoin(users, eq(users.id, bookings.assignedTo));
}

export async function listBookings(f: BookingFilters, opts: { all?: boolean } = {}) {
	const where = whereFor(f);
	const [{ total }] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(bookings)
		.innerJoin(customers, eq(customers.id, bookings.customerId))
		.leftJoin(slots, eq(slots.id, bookings.slotId))
		.where(where);
	const pages = Math.max(1, Math.ceil(Number(total) / f.per));
	const page = Math.min(f.page, pages);
	let q = baseQuery()
		.where(where)
		.orderBy(...orderFor(f))
		.$dynamic();
	q = opts.all ? q.limit(5000) : q.limit(f.per).offset((page - 1) * f.per);
	const raw = await q;
	const svc = await servicesFor(raw.map((r) => r.id));
	return { rows: raw.map((r) => shapeRow(r, svc)), total: Number(total), page, pages };
}

/** Bookings whose slot falls between two dates (calendar), excluding cancelled. */
export async function bookingsBetween(from: string, to: string) {
	const raw = await baseQuery()
		.where(and(gte(slots.date, from), lte(slots.date, to), ne(bookings.status, 'cancelled')))
		.orderBy(asc(slots.date), asc(slots.start), asc(bookings.id));
	const svc = await servicesFor(raw.map((r) => r.id));
	return raw.map((r) => shapeRow(r, svc));
}

/** Quote requests for the Kanban. Closed ones only from the last 60 days. */
export async function quoteBoard() {
	const since = new Date(Date.now() - 60 * 864e5);
	const raw = await baseQuery()
		.where(
			and(
				eq(bookings.type, 'quote'),
				or(inArray(bookings.status, ['new', 'pending', 'scheduled', 'in_progress', 'rescheduled']), gte(bookings.updatedAt, since))
			)
		)
		.orderBy(desc(bookings.createdAt));
	const svc = await servicesFor(raw.map((r) => r.id));
	return raw.map((r) => shapeRow(r, svc));
}

export async function latestBookings(limit = 8) {
	const raw = await baseQuery().orderBy(desc(bookings.createdAt), desc(bookings.id)).limit(limit);
	const svc = await servicesFor(raw.map((r) => r.id));
	return raw.map((r) => shapeRow(r, svc));
}

/* ------------------------------------------------------------------- detail */

export async function getBookingDetail(id: number) {
	const [r] = await baseQuery().where(eq(bookings.id, id)).limit(1);
	if (!r) return null;
	const [extra] = await db
		.select({
			gardenSize: bookings.gardenSize,
			notesCustomer: bookings.notesCustomer,
			notesInternal: bookings.notesInternal,
			locale: bookings.locale,
			customerId: bookings.customerId,
			updatedAt: bookings.updatedAt
		})
		.from(bookings)
		.where(eq(bookings.id, id));
	const svc = await servicesFor([id]);
	const events = await db
		.select({
			id: bookingEvents.id,
			fromStatus: bookingEvents.fromStatus,
			toStatus: bookingEvents.toStatus,
			note: bookingEvents.note,
			createdAt: bookingEvents.createdAt,
			actorName: users.name
		})
		.from(bookingEvents)
		.leftJoin(users, eq(users.id, bookingEvents.actorId))
		.where(eq(bookingEvents.bookingId, id))
		.orderBy(desc(bookingEvents.createdAt), desc(bookingEvents.id));
	const att = await db.select({ mediaId: bookingAttachments.mediaId }).from(bookingAttachments).where(eq(bookingAttachments.bookingId, id));
	const refs = await getMediaRefs(
		att.map((a) => a.mediaId),
		'nl'
	);
	const [{ n: otherBookings }] = await db
		.select({ n: sql<number>`count(*)::int` })
		.from(bookings)
		.where(and(eq(bookings.customerId, extra.customerId), ne(bookings.id, id)));
	return {
		...shapeRow(r, svc),
		gardenSize: extra.gardenSize,
		notesCustomer: extra.notesCustomer,
		notesInternal: extra.notesInternal,
		locale: extra.locale,
		updatedAt: extra.updatedAt.toISOString(),
		otherBookings: Number(otherBookings),
		photos: [...refs.values()],
		events: events.map((e) => ({ ...e, createdAt: e.createdAt.toISOString() })),
		transitions: STATUS_TRANSITIONS[r.status as BookingStatus]
	};
}
export type BookingDetail = NonNullable<Awaited<ReturnType<typeof getBookingDetail>>>;

/** Users who can be assigned to a booking (active planners + admins). */
export async function assignableUsers() {
	return db
		.select({ id: users.id, name: users.name })
		.from(users)
		.where(and(eq(users.isActive, true), inArray(users.role, ['admin', 'planner'])))
		.orderBy(asc(users.name));
}

/** Upcoming slots for the reschedule / manual booking picker (incl. full ones, flagged). */
export async function slotOptions(kinds: readonly SlotKind[] = ['morning', 'afternoon', 'consult'], fromISO = todayISO()) {
	const { horizonWeeks } = await getBookingSettings();
	const rows = await db
		.select()
		.from(slots)
		.where(and(gte(slots.date, fromISO), lte(slots.date, addDays(fromISO, horizonWeeks * 7)), inArray(slots.slotKind, [...kinds])))
		.orderBy(asc(slots.date), asc(slots.start));
	return rows.map((s) => ({
		id: s.id,
		date: s.date,
		kind: s.slotKind as SlotKind,
		start: s.start,
		end: s.end,
		capacity: s.capacity,
		booked: s.bookedCount,
		closed: s.isClosed
	}));
}
export type SlotOption = Awaited<ReturnType<typeof slotOptions>>[number];

export function kindsForType(type: BookingType): SlotKind[] {
	const k = SLOT_KINDS_FOR_TYPE[type];
	return k.length ? k : ['morning', 'afternoon', 'consult'];
}

/* ---------------------------------------------------------------- mutations */

type Fail = { ok: false; message: string };
type Ok<T = object> = { ok: true } & T;

export async function changeStatus(
	id: number,
	to: BookingStatus,
	actorId: number,
	note = ''
): Promise<Ok<{ from: BookingStatus; reference: string }> | Fail> {
	return db.transaction(async (tx) => {
		const [b] = await tx.select().from(bookings).where(eq(bookings.id, id)).for('update');
		if (!b) return { ok: false, message: 'Boeking niet gevonden.' } as const;
		const from = b.status as BookingStatus;
		if (!STATUS_TRANSITIONS[from].includes(to)) {
			return {
				ok: false,
				message: `${b.reference}: van “${STATUS_META[from].nl}” naar “${STATUS_META[to].nl}” is niet toegestaan.`
			} as const;
		}
		await tx.update(bookings).set({ status: to, updatedAt: new Date() }).where(eq(bookings.id, id));
		if (to === 'cancelled' && b.slotId) await releaseSlot(tx, b.slotId);
		await tx.insert(bookingEvents).values({ bookingId: id, fromStatus: from, toStatus: to, actorId, note: note.trim() });
		return { ok: true, from, reference: b.reference } as const;
	});
}

/** Send the customer email after commit; never let a mail failure break the action. */
export async function notifyStatus(id: number, status: BookingStatus) {
	try {
		await sendStatusChangeEmail(id, status);
		return true;
	} catch (e) {
		console.error('sendStatusChangeEmail failed', e);
		return false;
	}
}

export async function assignBookings(ids: number[], assigneeId: number | null, actorId: number) {
	if (!ids.length) return 0;
	let name = 'niemand';
	if (assigneeId) {
		const [u] = await db.select({ name: users.name }).from(users).where(eq(users.id, assigneeId));
		if (!u) return 0;
		name = u.name;
	}
	return db.transaction(async (tx) => {
		const updated = await tx
			.update(bookings)
			.set({ assignedTo: assigneeId, updatedAt: new Date() })
			.where(inArray(bookings.id, ids))
			.returning({ id: bookings.id });
		if (updated.length)
			await tx
				.insert(bookingEvents)
				.values(updated.map((u) => ({ bookingId: u.id, actorId, note: assigneeId ? `Toegewezen aan ${name}` : 'Toewijzing verwijderd' })));
		return updated.length;
	});
}

export async function saveInternalNotes(id: number, notes: string, actorId: number) {
	return db.transaction(async (tx) => {
		const [b] = await tx.select({ notes: bookings.notesInternal }).from(bookings).where(eq(bookings.id, id));
		if (!b) return false;
		if (b.notes === notes) return true;
		await tx.update(bookings).set({ notesInternal: notes, updatedAt: new Date() }).where(eq(bookings.id, id));
		await tx.insert(bookingEvents).values({ bookingId: id, actorId, note: notes ? 'Interne notitie bijgewerkt' : 'Interne notitie gewist' });
		return true;
	});
}

const slotText = (s: { date: string; slotKind: string; start: string; end: string }) =>
	`${s.date.split('-').reverse().join('/')} ${SLOT_LABELS[s.slotKind as SlotKind].nl.toLowerCase()} ${s.start}–${s.end}`;

/**
 * Move a booking to another slot in one transaction: take a place in the new slot (atomic, or forced
 * when the planner explicitly overbooks), release the old one, log an event. A 'scheduled' booking
 * becomes 'rescheduled'.
 */
export async function rescheduleBooking(
	id: number,
	newSlotId: number,
	opts: { actorId: number; force?: boolean; note?: string }
): Promise<Ok<{ status: BookingStatus; statusChanged: boolean; reference: string; label: string }> | Fail> {
	return db.transaction(async (tx) => {
		const [b] = await tx.select().from(bookings).where(eq(bookings.id, id)).for('update');
		if (!b) return { ok: false, message: 'Boeking niet gevonden.' } as const;
		if (b.status === 'cancelled' || b.status === 'completed')
			return { ok: false, message: `${STATUS_META[b.status].nl} boekingen kunnen niet verplaatst worden.` } as const;
		if (b.slotId === newSlotId) return { ok: false, message: 'De boeking staat al in dit slot.' } as const;
		const [slot] = await tx.select().from(slots).where(eq(slots.id, newSlotId));
		if (!slot) return { ok: false, message: 'Dit slot bestaat niet (meer).' } as const;
		if (opts.force) {
			if (slot.isClosed) await tx.update(slots).set({ isClosed: false }).where(eq(slots.id, slot.id));
			await forceReserveSlot(tx, slot.id);
		} else {
			const ok = await reserveSlot(tx, slot.id);
			if (!ok)
				return {
					ok: false,
					message: slot.isClosed ? 'Dit slot is gesloten. Vink “overboeken” aan om toch te plannen.' : 'Dit slot is volzet. Vink “overboeken” aan om toch te plannen.'
				} as const;
		}
		let oldLabel = 'geen datum';
		if (b.slotId) {
			const [old] = await tx.select().from(slots).where(eq(slots.id, b.slotId));
			if (old) oldLabel = slotText(old);
			await releaseSlot(tx, b.slotId);
		}
		const from = b.status as BookingStatus;
		const status: BookingStatus = from === 'scheduled' ? 'rescheduled' : from;
		await tx.update(bookings).set({ slotId: slot.id, status, updatedAt: new Date() }).where(eq(bookings.id, id));
		const label = slotText(slot);
		await tx.insert(bookingEvents).values({
			bookingId: id,
			fromStatus: status !== from ? from : null,
			toStatus: status !== from ? status : null,
			actorId: opts.actorId,
			note: [`Verplaatst van ${oldLabel} naar ${label}${opts.force ? ' (overboekt)' : ''}`, opts.note?.trim()].filter(Boolean).join(' · ')
		});
		return { ok: true, status, statusChanged: status !== from, reference: b.reference, label } as const;
	});
}

/** Calendar drop: pick the slot of `kind` on `date` with the most room. */
export async function findTargetSlot(date: string, kind: SlotKind) {
	const rows = await db
		.select()
		.from(slots)
		.where(and(eq(slots.date, date), eq(slots.slotKind, kind)))
		.orderBy(asc(slots.start));
	if (!rows.length) return null;
	const open = rows.filter((r) => !r.isClosed);
	const pool = open.length ? open : rows;
	return pool.reduce((best, s) => (s.capacity - s.bookedCount > best.capacity - best.bookedCount ? s : best), pool[0]);
}

/* ---------------------------------------------------------------- dashboard */

export async function bookingKpis() {
	const today = todayISO();
	const mon = startOfWeek(today);
	const sun = addDays(mon, 6);
	const [y, m] = today.split('-').map(Number);
	const { first } = monthBounds(y, m);
	const [row] = await db
		.select({
			newCount: sql<number>`count(*) filter (where ${bookings.status} = 'new')::int`,
			weekCount: sql<number>`count(*) filter (where ${bookings.status} in ('scheduled','in_progress','rescheduled') and ${slots.date} between ${mon} and ${sun})::int`,
			doneMonth: sql<number>`count(*) filter (where ${bookings.status} = 'completed' and ${bookings.updatedAt} >= ${first}::date)::int`,
			openQuotes: sql<number>`count(*) filter (where ${bookings.type} = 'quote' and ${bookings.status} in ('new','pending'))::int`
		})
		.from(bookings)
		.leftJoin(slots, eq(slots.id, bookings.slotId));
	return {
		newCount: Number(row.newCount),
		weekCount: Number(row.weekCount),
		doneMonth: Number(row.doneMonth),
		openQuotes: Number(row.openQuotes)
	};
}

export async function scheduleForDay(iso = todayISO()) {
	return bookingsBetween(iso, iso);
}

