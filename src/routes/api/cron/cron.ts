import { and, eq, gte, inArray, isNull, lt, lte, notInArray, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { bookings, customers, slots } from '$lib/server/db/schema';
import { addDays, brusselsDateTime, ensureSlots, purgeExpiredHolds, todayISO } from '$lib/server/availability';
import { purgeExpiredSessions } from '$lib/server/auth';
import { purgeOldDrafts } from '$lib/server/booking-draft';
import { sendBookingReminder } from '$lib/server/booking-emails';
import { getBookingSettings } from '$lib/server/settings';
import { ACTIVE_STATUSES } from '$lib/domain';

export type CronSummary = {
	ok: true;
	ranAt: string;
	durationMs: number;
	holdsPurged: true;
	slotsEnsuredWeeks: number;
	remindersSent: string[];
	sessionsPurged: true;
	draftsDeleted: number;
	customersAnonymised: number;
	errors: string[];
};

/** Bookings with status scheduled whose visit starts within `reminderHours` and got no reminder yet. */
export async function sendDueReminders(now = new Date()) {
	const { reminderHours } = await getBookingSettings();
	const today = todayISO(now);
	const until = addDays(today, Math.ceil(reminderHours / 24) + 1);
	const rows = await db
		.select({ id: bookings.id, reference: bookings.reference, date: slots.date, start: slots.start })
		.from(bookings)
		.innerJoin(slots, eq(slots.id, bookings.slotId))
		.where(and(eq(bookings.status, 'scheduled'), isNull(bookings.reminderSentAt), gte(slots.date, today), lte(slots.date, until)));
	const sent: string[] = [];
	for (const r of rows) {
		const startsAt = brusselsDateTime(r.date, r.start).getTime();
		const hoursLeft = (startsAt - now.getTime()) / 3_600_000;
		if (hoursLeft <= 0 || hoursLeft > reminderHours) continue;
		// Claim first so two overlapping cron runs never send twice.
		const claimed = await db
			.update(bookings)
			.set({ reminderSentAt: now })
			.where(and(eq(bookings.id, r.id), isNull(bookings.reminderSentAt)))
			.returning({ id: bookings.id });
		if (claimed.length === 0) continue;
		await sendBookingReminder(r.id);
		sent.push(r.reference);
	}
	return sent;
}

/**
 * GDPR retention: customers whose bookings are all closed (completed / cancelled) and untouched for
 * `retentionMonths` lose their personal data. Booking rows stay for statistics.
 */
export async function anonymiseOldCustomers(now = new Date()) {
	const { retentionMonths } = await getBookingSettings();
	const cutoff = new Date(now);
	cutoff.setMonth(cutoff.getMonth() - retentionMonths);

	const recentOrActive = db
		.select({ id: bookings.customerId })
		.from(bookings)
		.where(or(inArray(bookings.status, ACTIVE_STATUSES), gte(bookings.updatedAt, cutoff)));
	const candidates = await db
		.selectDistinct({ id: bookings.customerId })
		.from(bookings)
		.innerJoin(customers, eq(customers.id, bookings.customerId))
		.where(
			and(
				inArray(bookings.status, ['completed', 'cancelled']),
				lt(bookings.updatedAt, cutoff),
				notInArray(bookings.customerId, recentOrActive),
				sql`${customers.email} not like '%@anonymised.invalid'`
			)
		);
	for (const { id } of candidates) {
		await db.transaction(async (tx) => {
			await tx
				.update(customers)
				.set({
					name: 'Geanonimiseerd',
					email: `anon-${id}@anonymised.invalid`,
					phone: '',
					street: '',
					marketingOptIn: false,
					updatedAt: now
				})
				.where(eq(customers.id, id));
			await tx.update(bookings).set({ notesCustomer: '' }).where(eq(bookings.customerId, id));
		});
	}
	return candidates.length;
}

export async function runCron(): Promise<CronSummary> {
	const started = Date.now();
	const errors: string[] = [];
	const step = async <T>(name: string, fn: () => Promise<T>, fallback: T): Promise<T> => {
		try {
			return await fn();
		} catch (e) {
			console.error(`[cron] ${name} failed`, e);
			errors.push(`${name}: ${e instanceof Error ? e.message : String(e)}`);
			return fallback;
		}
	};

	await step('purgeExpiredHolds', purgeExpiredHolds, undefined);
	await step('ensureSlots', () => ensureSlots(todayISO(), 12), undefined);
	const remindersSent = await step('reminders', () => sendDueReminders(), [] as string[]);
	await step('purgeExpiredSessions', purgeExpiredSessions, undefined);
	const draftsDeleted = await step('purgeOldDrafts', () => purgeOldDrafts(7), 0);
	const customersAnonymised = await step('anonymise', () => anonymiseOldCustomers(), 0);

	return {
		ok: true,
		ranAt: new Date(started).toISOString(),
		durationMs: Date.now() - started,
		holdsPurged: true,
		slotsEnsuredWeeks: 12,
		remindersSent,
		sessionsPurged: true,
		draftsDeleted,
		customersAnonymised,
		errors
	};
}
