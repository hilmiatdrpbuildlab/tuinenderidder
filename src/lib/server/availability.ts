import { and, asc, between, eq, gt, gte, inArray, lt, ne, sql } from 'drizzle-orm';
import { db, type Tx } from './db';
import { availabilityRules, blackoutDates, counters, slotHolds, slots } from './db/schema';
import { getBookingSettings } from './settings';
import type { SlotKind } from '$lib/domain';

/* --------------------------------------------------------------- date utils */

const brusselsDate = new Intl.DateTimeFormat('en-CA', {
	timeZone: 'Europe/Brussels',
	year: 'numeric',
	month: '2-digit',
	day: '2-digit'
});

/** Today in Europe/Brussels as YYYY-MM-DD. */
export function todayISO(now = new Date()) {
	return brusselsDate.format(now);
}

export function addDays(iso: string, n: number) {
	const d = new Date(`${iso}T12:00:00Z`);
	d.setUTCDate(d.getUTCDate() + n);
	return d.toISOString().slice(0, 10);
}

/** ISO weekday 1 (Mon) … 7 (Sun). */
export function isoWeekday(iso: string) {
	const d = new Date(`${iso}T12:00:00Z`).getUTCDay();
	return d === 0 ? 7 : d;
}

/** Monday of the week containing `iso`. */
export function startOfWeek(iso: string) {
	return addDays(iso, 1 - isoWeekday(iso));
}

export function monthBounds(year: number, month: number) {
	const first = `${year}-${String(month).padStart(2, '0')}-01`;
	const last = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);
	return { first, last };
}

/** Local Brussels date + HH:MM → absolute Date (handles DST). */
export function brusselsDateTime(iso: string, hhmm: string) {
	const utcGuess = new Date(`${iso}T${hhmm.padStart(5, '0')}:00Z`);
	const tz =
		new Intl.DateTimeFormat('en-US', { timeZone: 'Europe/Brussels', timeZoneName: 'longOffset' })
			.formatToParts(utcGuess)
			.find((p) => p.type === 'timeZoneName')?.value ?? 'GMT+01:00';
	const m = tz.match(/GMT([+-])(\d{2}):?(\d{2})?/);
	const offsetMin = m ? (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 60 + Number(m[3] ?? 0)) : 60;
	return new Date(utcGuess.getTime() - offsetMin * 60_000);
}

/* ----------------------------------------------------------- slot generation */

/**
 * Make sure slots exist from today through the booking horizon (default 12 weeks), following the
 * weekly availability rules and skipping blackout dates. Idempotent; existing slots are kept.
 */
export async function ensureSlots(fromISO = todayISO(), weeks?: number) {
	const horizon = weeks ?? (await getBookingSettings()).horizonWeeks;
	const toISO = addDays(fromISO, horizon * 7);
	const rules = await db.select().from(availabilityRules).where(eq(availabilityRules.isActive, true));
	const blackouts = new Set(
		(await db.select({ date: blackoutDates.date }).from(blackoutDates).where(between(blackoutDates.date, fromISO, toISO))).map(
			(b) => b.date
		)
	);
	const rows: (typeof slots.$inferInsert)[] = [];
	for (let d = fromISO; d <= toISO; d = addDays(d, 1)) {
		if (blackouts.has(d)) continue;
		const wd = isoWeekday(d);
		for (const r of rules) {
			if (r.weekday !== wd) continue;
			rows.push({ date: d, slotKind: r.slotKind, start: r.start, end: r.end, capacity: r.capacity });
		}
	}
	for (let i = 0; i < rows.length; i += 200) {
		await db.insert(slots).values(rows.slice(i, i + 200)).onConflictDoNothing();
	}
}

/**
 * Re-apply rules and blackouts to future slots after the planner changes them in the CMS:
 *  - capacity follows the rule (never below what is already booked)
 *  - empty slots that no longer match a rule or fall on a blackout date are removed
 *  - booked slots on new blackout dates are closed (the planner must reschedule them)
 */
export async function syncFutureSlots() {
	const from = todayISO();
	const rules = await db.select().from(availabilityRules).where(eq(availabilityRules.isActive, true));
	const blackouts = new Set((await db.select({ date: blackoutDates.date }).from(blackoutDates)).map((b) => b.date));
	const future = await db.select().from(slots).where(gte(slots.date, from));
	for (const s of future) {
		const rule = rules.find((r) => r.weekday === isoWeekday(s.date) && r.slotKind === s.slotKind && r.start === s.start);
		const blocked = blackouts.has(s.date);
		if ((!rule || blocked) && s.bookedCount === 0) {
			await db.delete(slots).where(eq(slots.id, s.id));
		} else if (blocked) {
			await db.update(slots).set({ isClosed: true }).where(eq(slots.id, s.id));
		} else if (rule) {
			await db
				.update(slots)
				.set({ capacity: Math.max(rule.capacity, s.bookedCount), end: rule.end })
				.where(eq(slots.id, s.id));
		}
	}
	await ensureSlots(from);
}

/* -------------------------------------------------------------- availability */

export type SlotAvailability = {
	id: number;
	date: string;
	slotKind: SlotKind;
	start: string;
	end: string;
	capacity: number;
	remaining: number;
};

/**
 * Bookable slots between two dates (inclusive) for the given kinds. Respects the lead time,
 * closed slots, bookings and other customers' active holds. `draftId`'s own hold does not count
 * against it, so a customer going back a step still sees their chosen slot.
 */
export async function getAvailability(opts: { from: string; to: string; kinds: SlotKind[]; draftId?: string }) {
	if (opts.kinds.length === 0) return [] as SlotAvailability[];
	const { leadTimeDays } = await getBookingSettings();
	const earliest = addDays(todayISO(), leadTimeDays);
	const from = opts.from < earliest ? earliest : opts.from;
	if (from > opts.to) return [];

	const rows = await db
		.select({
			id: slots.id,
			date: slots.date,
			slotKind: slots.slotKind,
			start: slots.start,
			end: slots.end,
			capacity: slots.capacity,
			booked: slots.bookedCount
		})
		.from(slots)
		.where(
			and(
				between(slots.date, from, opts.to),
				inArray(slots.slotKind, opts.kinds),
				eq(slots.isClosed, false)
			)
		)
		.orderBy(asc(slots.date), asc(slots.start));
	if (rows.length === 0) return [];

	// Active holds of other drafts, counted per slot. (A separate query: drizzle drops table
	// qualifiers in single-table select lists, which made a correlated subquery compare the wrong ids.)
	const holds = await db
		.select({ slotId: slotHolds.slotId, n: sql<number>`count(*)::int` })
		.from(slotHolds)
		.where(
			and(
				inArray(
					slotHolds.slotId,
					rows.map((r) => r.id)
				),
				gt(slotHolds.expiresAt, new Date()),
				opts.draftId ? ne(slotHolds.draftId, opts.draftId) : undefined
			)
		)
		.groupBy(slotHolds.slotId);
	const held = new Map(holds.map((h) => [h.slotId, Number(h.n)]));

	return rows.map((r) => ({
		id: r.id,
		date: r.date,
		slotKind: r.slotKind as SlotKind,
		start: r.start,
		end: r.end,
		capacity: r.capacity,
		remaining: Math.max(0, r.capacity - r.booked - (held.get(r.id) ?? 0))
	}));
}

/* ----------------------------------------------------------- holds & booking */

/**
 * Hold one place in a slot for `draftId` for N minutes (default from settings, 10).
 * Replaces any previous hold of the same draft. Returns false when the slot is full.
 */
export async function holdSlot(slotId: number, draftId: string, minutes?: number) {
	const holdMinutes = minutes ?? (await getBookingSettings()).holdMinutes;
	return db.transaction(async (tx) => {
		const [slot] = await tx.select().from(slots).where(eq(slots.id, slotId)).for('update');
		if (!slot || slot.isClosed) return false;
		await tx.delete(slotHolds).where(eq(slotHolds.draftId, draftId));
		const [{ n }] = await tx
			.select({ n: sql<number>`count(*)::int` })
			.from(slotHolds)
			.where(and(eq(slotHolds.slotId, slotId), gt(slotHolds.expiresAt, new Date())));
		if (slot.bookedCount + Number(n) >= slot.capacity) return false;
		await tx.insert(slotHolds).values({ slotId, draftId, expiresAt: new Date(Date.now() + holdMinutes * 60_000) });
		return true;
	});
}

export async function releaseHold(draftId: string) {
	await db.delete(slotHolds).where(eq(slotHolds.draftId, draftId));
}

/**
 * Atomically take one place in a slot. A single conditional UPDATE, so 50 parallel attempts on a
 * 1-capacity slot produce exactly one success (development plan §3). Other customers' active holds
 * count as taken; the caller's own hold (draftId) is consumed. Returns false when full.
 */
export async function reserveSlot(tx: Tx, slotId: number, draftId: string | null = null) {
	// Explicitly qualified: drizzle renders bare column names inside UPDATE … WHERE.
	const others = sql`(
		select count(*) from "slot_holds" h
		where h."slot_id" = ${slotId}
		and h."expires_at" > now()
		${draftId ? sql`and h."draft_id" <> ${draftId}` : sql``}
	)`;
	const updated = await tx
		.update(slots)
		.set({ bookedCount: sql`${slots.bookedCount} + 1` })
		.where(
			and(eq(slots.id, slotId), eq(slots.isClosed, false), sql`${slots.bookedCount} + ${others} < ${slots.capacity}`)
		)
		.returning({ id: slots.id });
	if (updated.length === 0) return false;
	if (draftId) await tx.delete(slotHolds).where(eq(slotHolds.draftId, draftId));
	return true;
}

/** Give a place back (cancel / reschedule away). */
export async function releaseSlot(tx: Tx, slotId: number) {
	await tx
		.update(slots)
		.set({ bookedCount: sql`greatest(${slots.bookedCount} - 1, 0)` })
		.where(eq(slots.id, slotId));
}

/** Planner override: put a booking in a slot even if it is full (capacity grows by one). */
export async function forceReserveSlot(tx: Tx, slotId: number) {
	await tx
		.update(slots)
		.set({
			bookedCount: sql`${slots.bookedCount} + 1`,
			capacity: sql`greatest(${slots.capacity}, ${slots.bookedCount} + 1)`
		})
		.where(eq(slots.id, slotId));
}

export async function purgeExpiredHolds() {
	await db.delete(slotHolds).where(lt(slotHolds.expiresAt, new Date()));
}

/** Find (or create on the fly) the slot for a date + kind + start, e.g. for planner reschedules. */
export async function findOrCreateSlot(tx: Tx, date: string, slotKind: SlotKind, start: string, end: string) {
	const [existing] = await tx
		.select()
		.from(slots)
		.where(and(eq(slots.date, date), eq(slots.slotKind, slotKind), eq(slots.start, start)))
		.limit(1);
	if (existing) return existing;
	const [created] = await tx.insert(slots).values({ date, slotKind, start, end, capacity: 1 }).returning();
	return created;
}

/* --------------------------------------------------------------- references */

/** Next booking reference TDR-YYYY-NNNN, from an atomic per-year counter. */
export async function nextReference(tx: Tx, year = Number(todayISO().slice(0, 4))) {
	const key = `booking-${year}`;
	const [row] = await tx
		.insert(counters)
		.values({ key, value: 1 })
		.onConflictDoUpdate({ target: counters.key, set: { value: sql`${counters.value} + 1` } })
		.returning({ value: counters.value });
	return `TDR-${year}-${String(row.value).padStart(4, '0')}`;
}
