import { describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { bookingDrafts, bookings, customers, emails, slots } from '$lib/server/db/schema';
import { addDays, todayISO } from '$lib/server/availability';
import { createBooking } from '$lib/server/bookings';
import { anonymiseOldCustomers, runCron, sendDueReminders } from './cron';

async function book(date: string, start: string, email: string) {
	const [slot] = await db.insert(slots).values({ date, slotKind: 'morning', start, end: '12:00', capacity: 1 }).returning();
	const r = await createBooking({
		type: 'maintenance',
		serviceIds: [],
		frequency: 'once',
		gardenSize: 'sm',
		slotId: slot.id,
		customer: { name: 'Test', email, phone: '+32 470 00 00 00', street: 'Straat 1', postcode: '3680', municipality: 'Maaseik' },
		status: 'scheduled',
		locale: 'nl'
	});
	if (!r.ok) throw new Error('booking failed');
	return r.id;
}

describe('cron', () => {
	it('sends a reminder once for scheduled visits inside the reminder window', async () => {
		const soon = await book(addDays(todayISO(), 1), '09:00', 'soon@example.test');
		const later = await book(addDays(todayISO(), 6), '09:00', 'later@example.test');
		const first = await sendDueReminders();
		const second = await sendDueReminders();
		const [s] = await db.select().from(bookings).where(eq(bookings.id, soon));
		const [l] = await db.select().from(bookings).where(eq(bookings.id, later));
		expect(first).toContain(s.reference);
		expect(first).not.toContain(l.reference);
		expect(second).toHaveLength(0);
		expect(s.reminderSentAt).not.toBeNull();
		expect(l.reminderSentAt).toBeNull();
		expect(await db.select().from(emails).where(eq(emails.kind, 'booking_reminder'))).toHaveLength(1);
	});

	it('anonymises customers whose bookings are all closed and older than the retention period', async () => {
		const oldId = await book('2020-01-06', '08:00', 'old@example.test');
		await db.update(bookings).set({ status: 'completed', updatedAt: new Date('2021-01-01') }).where(eq(bookings.id, oldId));
		const n = await anonymiseOldCustomers();
		expect(n).toBe(1);
		const [b] = await db.select().from(bookings).where(eq(bookings.id, oldId));
		const [c] = await db.select().from(customers).where(eq(customers.id, b.customerId));
		expect(c.email).toMatch(/@anonymised\.invalid$/);
		expect(c.name).toBe('Geanonimiseerd');
		expect(c.phone).toBe('');
		expect(await anonymiseOldCustomers()).toBe(0);
	});

	it('runs every job and reports a summary', async () => {
		await db.insert(bookingDrafts).values({ id: 'stale-draft-000000000000', data: {}, updatedAt: new Date('2020-01-01') });
		const summary = await runCron();
		expect(summary.ok).toBe(true);
		expect(summary.errors).toEqual([]);
		expect(summary.draftsDeleted).toBe(1);
	});
});
