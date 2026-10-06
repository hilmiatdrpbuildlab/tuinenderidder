import { and, asc, eq, gte, inArray } from 'drizzle-orm';
import { db } from '../db';
import { availabilityRules, blackoutDates, slots } from '../db/schema';
import { addDays, syncFutureSlots, todayISO } from '../availability';
import { getBookingSettings } from '../settings';
import { SLOT_KINDS, type SlotKind } from '$lib/domain';
import { formatLongDate } from '$lib/i18n';

export const WEEKDAYS = [
	{ value: 1, label: 'Maandag' },
	{ value: 2, label: 'Dinsdag' },
	{ value: 3, label: 'Woensdag' },
	{ value: 4, label: 'Donderdag' },
	{ value: 5, label: 'Vrijdag' },
	{ value: 6, label: 'Zaterdag' },
	{ value: 7, label: 'Zondag' }
] as const;

const kindOrder = (k: SlotKind) => SLOT_KINDS.indexOf(k);

export type Rule = typeof availabilityRules.$inferSelect;

/** All weekly rules, sorted by weekday → slot kind → start time. */
export async function listRules() {
	const rows = await db.select().from(availabilityRules);
	return rows.sort(
		(a, b) => a.weekday - b.weekday || kindOrder(a.slotKind) - kindOrder(b.slotKind) || a.start.localeCompare(b.start)
	);
}

export async function rulesForWeekday(weekday: number) {
	return db.select().from(availabilityRules).where(eq(availabilityRules.weekday, weekday));
}

export async function updateRules(rows: { id: number; start: string; end: string; capacity: number; isActive: boolean }[]) {
	await db.transaction(async (tx) => {
		for (const r of rows) {
			await tx
				.update(availabilityRules)
				.set({ start: r.start, end: r.end, capacity: r.capacity, isActive: r.isActive })
				.where(eq(availabilityRules.id, r.id));
		}
	});
}

export async function addRule(rule: { weekday: number; slotKind: SlotKind; start: string; end: string; capacity: number }) {
	await db.insert(availabilityRules).values({ ...rule, isActive: true });
}

export async function removeRule(id: number) {
	const deleted = await db.delete(availabilityRules).where(eq(availabilityRules.id, id)).returning({ id: availabilityRules.id });
	return deleted.length > 0;
}

/* ---------------------------------------------------------------- blackouts */

export async function upcomingBlackouts() {
	return db.select().from(blackoutDates).where(gte(blackoutDates.date, todayISO())).orderBy(asc(blackoutDates.date));
}

/** Inserts one row per date in [from, to]; existing dates are skipped. Returns the number added. */
export async function addBlackoutRange(from: string, to: string, reason: string) {
	const rows: { date: string; reason: string }[] = [];
	for (let d = from; d <= to; d = addDays(d, 1)) rows.push({ date: d, reason });
	if (rows.length === 0) return 0;
	const inserted = await db.insert(blackoutDates).values(rows).onConflictDoNothing().returning({ id: blackoutDates.id });
	return inserted.length;
}

export async function deleteBlackout(id: number) {
	const deleted = await db.delete(blackoutDates).where(eq(blackoutDates.id, id)).returning({ date: blackoutDates.date });
	return deleted[0]?.date ?? null;
}

/* ------------------------------------------------------------- closed slots */

/** Manually (or blackout-) closed future slots, with whether the day is a blackout date. */
export async function upcomingClosedSlots() {
	const rows = await db
		.select({
			id: slots.id,
			date: slots.date,
			slotKind: slots.slotKind,
			start: slots.start,
			end: slots.end,
			capacity: slots.capacity,
			bookedCount: slots.bookedCount,
			blackoutReason: blackoutDates.reason,
			blackoutId: blackoutDates.id
		})
		.from(slots)
		.leftJoin(blackoutDates, eq(blackoutDates.date, slots.date))
		.where(and(eq(slots.isClosed, true), gte(slots.date, todayISO())))
		.orderBy(asc(slots.date), asc(slots.start));
	return rows.map((r) => ({ ...r, isBlackout: r.blackoutId !== null }));
}

export async function getSlot(id: number) {
	const [row] = await db.select().from(slots).where(eq(slots.id, id)).limit(1);
	return row ?? null;
}

export async function isBlackoutDate(date: string) {
	const [row] = await db.select({ id: blackoutDates.id }).from(blackoutDates).where(eq(blackoutDates.date, date)).limit(1);
	return !!row;
}

export async function setSlotClosed(id: number, isClosed: boolean) {
	await db.update(slots).set({ isClosed }).where(eq(slots.id, id));
}

/** Close all (open) slots on a date, optionally only one slot kind. Returns the number closed. */
export async function closeSlotsOn(date: string, kind: SlotKind | null) {
	const updated = await db
		.update(slots)
		.set({ isClosed: true })
		.where(
			and(eq(slots.date, date), eq(slots.isClosed, false), kind ? eq(slots.slotKind, kind) : inArray(slots.slotKind, [...SLOT_KINDS]))
		)
		.returning({ id: slots.id });
	return updated.length;
}

/* --------------------------------------------------------------------- sync */

/** Re-apply rules + blackouts to future slots and describe the result for a toast. */
export async function syncAndDescribe(prefix = 'Opgeslagen') {
	await syncFutureSlots();
	const { horizonWeeks } = await getBookingSettings();
	const until = addDays(todayISO(), horizonWeeks * 7);
	return `${prefix} · beschikbaarheid bijgewerkt tot ${formatLongDate(until, 'nl')}`;
}
