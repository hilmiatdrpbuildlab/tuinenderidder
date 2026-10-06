import { describe, expect, it, beforeAll } from 'vitest';
import { and, eq, sql } from 'drizzle-orm';
import { db } from './db';
import { availabilityRules, blackoutDates, bookings, slotHolds, slots } from './db/schema';
import {
	addDays,
	brusselsDateTime,
	ensureSlots,
	getAvailability,
	holdSlot,
	isoWeekday,
	monthBounds,
	nextReference,
	purgeExpiredHolds,
	releaseHold,
	startOfWeek,
	todayISO
} from './availability';
import { createBooking, type CreateBookingInput } from './bookings';

/* --------------------------------------------------------------- date utils */

describe('date helpers', () => {
	it('adds days across month, year and DST boundaries', () => {
		expect(addDays('2026-01-31', 1)).toBe('2026-02-01');
		expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
		expect(addDays('2026-03-28', 2)).toBe('2026-03-30'); // DST starts 29 March
		expect(addDays('2026-10-24', 2)).toBe('2026-10-26'); // DST ends 25 October
		expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
		expect(addDays('2028-03-01', -1)).toBe('2028-02-29');
	});

	it('uses ISO weekdays (Mon = 1 … Sun = 7) and Monday week start', () => {
		expect(isoWeekday('2026-10-05')).toBe(1);
		expect(isoWeekday('2026-10-11')).toBe(7);
		expect(startOfWeek('2026-10-11')).toBe('2026-10-05');
		expect(startOfWeek('2026-10-05')).toBe('2026-10-05');
		expect(startOfWeek('2027-01-01')).toBe('2026-12-28');
	});

	it('computes month bounds incl. leap years', () => {
		expect(monthBounds(2026, 2)).toEqual({ first: '2026-02-01', last: '2026-02-28' });
		expect(monthBounds(2028, 2)).toEqual({ first: '2028-02-01', last: '2028-02-29' });
		expect(monthBounds(2026, 12)).toEqual({ first: '2026-12-01', last: '2026-12-31' });
	});

	it('converts Brussels wall-clock time to UTC in summer and winter', () => {
		expect(brusselsDateTime('2026-07-15', '08:00').toISOString()).toBe('2026-07-15T06:00:00.000Z');
		expect(brusselsDateTime('2026-12-15', '08:00').toISOString()).toBe('2026-12-15T07:00:00.000Z');
		expect(brusselsDateTime('2026-10-26', '13:00').toISOString()).toBe('2026-10-26T12:00:00.000Z');
	});

	it('gives today in Europe/Brussels, not UTC', () => {
		// 23:30 UTC on 31 Dec is already 1 Jan in Brussels.
		expect(todayISO(new Date('2026-12-31T23:30:00Z'))).toBe('2027-01-01');
		expect(todayISO(new Date('2026-06-30T21:59:00Z'))).toBe('2026-06-30');
		expect(todayISO(new Date('2026-06-30T22:01:00Z'))).toBe('2026-07-01');
	});
});

/* ----------------------------------------------------------- slot generation */

// A fixed future window, well beyond the lead time.
const MON = '2030-01-07';

async function slotsOn(date: string) {
	return db.select().from(slots).where(eq(slots.date, date));
}

async function makeSlot(date: string, capacity = 1, start = '08:00') {
	const [row] = await db
		.insert(slots)
		.values({ date, slotKind: 'morning', start, end: '12:00', capacity })
		.returning();
	return row;
}

function bookingInput(slotId: number, draftId: string | null, i: number): CreateBookingInput {
	return {
		type: 'maintenance',
		serviceIds: [],
		frequency: 'once',
		gardenSize: 'sm',
		slotId,
		draftId,
		customer: {
			name: `Klant ${i}`,
			email: `klant${i}-${slotId}@example.test`,
			phone: '+32 470 00 00 00',
			street: 'Teststraat 1',
			postcode: '3680',
			municipality: 'Maaseik'
		},
		source: 'website',
		locale: 'nl'
	};
}

describe('ensureSlots', () => {
	beforeAll(async () => {
		await db.delete(availabilityRules);
		const rules: (typeof availabilityRules.$inferInsert)[] = [];
		for (let wd = 1; wd <= 5; wd++) rules.push({ weekday: wd, slotKind: 'morning', start: '08:00', end: '12:00', capacity: 2 });
		rules.push({ weekday: 6, slotKind: 'consult', start: '09:00', end: '10:00', capacity: 1 });
		rules.push({ weekday: 3, slotKind: 'afternoon', start: '13:00', end: '17:00', capacity: 1, isActive: false });
		await db.insert(availabilityRules).values(rules);
		await db.insert(blackoutDates).values({ date: '2030-01-09', reason: 'Test blackout' });
	});

	it('creates slots from the weekly rules, skipping blackouts, Sundays and inactive rules', async () => {
		await ensureSlots(MON, 1); // 2030-01-07 … 2030-01-14
		expect((await slotsOn('2030-01-07')).map((s) => s.slotKind)).toEqual(['morning']);
		expect(await slotsOn('2030-01-09')).toHaveLength(0); // blackout (also no inactive afternoon)
		expect(await slotsOn('2030-01-13')).toHaveLength(0); // Sunday
		const sat = await slotsOn('2030-01-12');
		expect(sat.map((s) => [s.slotKind, s.start, s.capacity])).toEqual([['consult', '09:00', 1]]);
		expect((await slotsOn('2030-01-14'))[0].capacity).toBe(2);
	});

	it('is idempotent', async () => {
		const count = async () =>
			(await db.select({ n: sql<number>`count(*)::int` }).from(slots).where(sql`${slots.date} between '2030-01-07' and '2030-01-14'`))[0].n;
		const before = await count();
		await ensureSlots(MON, 1);
		expect(await count()).toBe(before);
		expect(before).toBe(6); // Mon, Tue, Thu, Fri, Sat, Mon
	});

	it('reports availability for the requested kinds only', async () => {
		const morning = await getAvailability({ from: '2030-01-07', to: '2030-01-14', kinds: ['morning'] });
		expect(morning.map((s) => s.date)).toEqual(['2030-01-07', '2030-01-08', '2030-01-10', '2030-01-11', '2030-01-14']);
		expect(morning.every((s) => s.remaining === 2)).toBe(true);
		const consult = await getAvailability({ from: '2030-01-07', to: '2030-01-14', kinds: ['consult'] });
		expect(consult.map((s) => s.date)).toEqual(['2030-01-12']);
		expect(await getAvailability({ from: '2030-01-07', to: '2030-01-14', kinds: [] })).toEqual([]);
	});

	it('never offers days before the lead time', async () => {
		const today = todayISO();
		await makeSlot(today, 3, '07:00');
		const rows = await getAvailability({ from: addDays(today, -1), to: addDays(today, 1), kinds: ['morning'] });
		expect(rows.find((r) => r.date === today)).toBeUndefined();
	});
});

/* ------------------------------------------------------------------- holds */

describe('slot holds', () => {
	it('block other drafts but not the owner', async () => {
		const slot = await makeSlot('2030-02-04');
		expect(await holdSlot(slot.id, 'draft-A')).toBe(true);
		expect(await holdSlot(slot.id, 'draft-B')).toBe(false);
		// Re-holding by the owner replaces their own hold.
		expect(await holdSlot(slot.id, 'draft-A')).toBe(true);

		const forA = await getAvailability({ from: '2030-02-04', to: '2030-02-04', kinds: ['morning'], draftId: 'draft-A' });
		const forB = await getAvailability({ from: '2030-02-04', to: '2030-02-04', kinds: ['morning'], draftId: 'draft-B' });
		expect(forA[0].remaining).toBe(1);
		expect(forB[0].remaining).toBe(0);

		const b = await createBooking(bookingInput(slot.id, 'draft-B', 1));
		expect(b).toEqual({ ok: false, reason: 'slot_full' });
		const a = await createBooking(bookingInput(slot.id, 'draft-A', 2));
		expect(a.ok).toBe(true);

		const [after] = await db.select().from(slots).where(eq(slots.id, slot.id));
		expect(after.bookedCount).toBe(1);
		expect(await db.select().from(slotHolds).where(eq(slotHolds.draftId, 'draft-A'))).toHaveLength(0);
	});

	it('moves a draft hold to another slot and frees the first', async () => {
		const s1 = await makeSlot('2030-02-05');
		const s2 = await makeSlot('2030-02-06');
		expect(await holdSlot(s1.id, 'draft-C')).toBe(true);
		expect(await holdSlot(s2.id, 'draft-C')).toBe(true);
		expect(await holdSlot(s1.id, 'draft-D')).toBe(true);
		await releaseHold('draft-C');
		expect(await holdSlot(s2.id, 'draft-E')).toBe(true);
	});

	it('ignores and purges expired holds', async () => {
		const slot = await makeSlot('2030-02-07');
		expect(await holdSlot(slot.id, 'draft-old', -1)).toBe(true); // already expired
		expect(await holdSlot(slot.id, 'draft-new')).toBe(true);
		await purgeExpiredHolds();
		expect(await db.select().from(slotHolds).where(eq(slotHolds.draftId, 'draft-old'))).toHaveLength(0);
	});

	it('refuses closed slots', async () => {
		const slot = await makeSlot('2030-02-08');
		await db.update(slots).set({ isClosed: true }).where(eq(slots.id, slot.id));
		expect(await holdSlot(slot.id, 'draft-F')).toBe(false);
		expect((await createBooking(bookingInput(slot.id, null, 3))).ok).toBe(false);
	});
});

/* ------------------------------------------------------- double-booking proof */

describe('createBooking under load', () => {
	it('50 parallel booking attempts on a 1-capacity slot produce exactly 1 booking', async () => {
		const slot = await makeSlot('2030-03-04');
		const results = await Promise.all(
			Array.from({ length: 50 }, (_, i) => createBooking(bookingInput(slot.id, `load-${i}`, i)))
		);
		const ok = results.filter((r) => r.ok);
		expect(ok).toHaveLength(1);
		expect(results.filter((r) => !r.ok && r.reason === 'slot_full')).toHaveLength(49);

		const [after] = await db.select().from(slots).where(eq(slots.id, slot.id));
		expect(after.bookedCount).toBe(1);
		const rows = await db.select().from(bookings).where(eq(bookings.slotId, slot.id));
		expect(rows).toHaveLength(1);
	});

	it('fills a 3-capacity slot exactly to capacity', async () => {
		const slot = await makeSlot('2030-03-05', 3);
		const results = await Promise.all(Array.from({ length: 20 }, (_, i) => createBooking(bookingInput(slot.id, null, 100 + i))));
		expect(results.filter((r) => r.ok)).toHaveLength(3);
		const rows = await db.select().from(bookings).where(and(eq(bookings.slotId, slot.id)));
		expect(rows).toHaveLength(3);
	});

	it('allocates unique, sequential references', async () => {
		const refs = await Promise.all(Array.from({ length: 10 }, () => db.transaction((tx) => nextReference(tx, 2031))));
		expect(new Set(refs).size).toBe(10);
		expect(refs.every((r) => /^TDR-2031-\d{4}$/.test(r))).toBe(true);
		expect(refs.sort().at(-1)).toBe('TDR-2031-0010');
	});

	it('creates quote requests without a slot', async () => {
		const r = await createBooking({ ...bookingInput(0, null, 999), type: 'quote', slotId: null });
		expect(r.ok).toBe(true);
	});
});
