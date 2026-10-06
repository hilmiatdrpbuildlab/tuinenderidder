import { beforeAll, describe, expect, it } from 'vitest';
import { eq } from 'drizzle-orm';
import { db } from './db';
import { emails, serviceTranslations, services, slots } from './db/schema';
import { createBooking } from './bookings';
import {
	buildIcs,
	buildIcsText,
	icsEscape,
	icsFold,
	icsToken,
	sendBookingConfirmation,
	sendBookingReminder,
	sendNewBookingAlert,
	sendStatusChangeEmail
} from './booking-emails';

const enc = new TextEncoder();

describe('ics helpers', () => {
	it('escapes TEXT values', () => {
		expect(icsEscape('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne');
	});

	it('folds long lines at 75 octets without splitting characters', () => {
		const line = 'DESCRIPTION:' + 'é'.repeat(80);
		const folded = icsFold(line);
		const parts = folded.split('\r\n');
		expect(parts.length).toBeGreaterThan(1);
		for (const p of parts) expect(enc.encode(p).length).toBeLessThanOrEqual(75);
		expect(parts.slice(1).every((p) => p.startsWith(' '))).toBe(true);
		expect(parts.map((p, i) => (i ? p.slice(1) : p)).join('')).toBe(line);
	});

	it('builds a calendar with CRLF line endings', () => {
		const ics = buildIcsText({
			uid: 'x@y',
			start: new Date('2026-07-01T06:00:00Z'),
			end: new Date('2026-07-01T10:00:00Z'),
			summary: 'Test',
			location: 'Kerkstraat 1, 3680 Maaseik',
			description: 'Lijn 1\nLijn 2',
			stamp: new Date('2026-06-01T00:00:00Z')
		});
		expect(ics.startsWith('BEGIN:VCALENDAR\r\n')).toBe(true);
		expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
		expect(ics.replace(/\r\n/g, '')).not.toMatch(/\n/);
		expect(ics).toContain('DTSTART:20260701T060000Z');
		expect(ics).toContain('DTSTAMP:20260601T000000Z');
		expect(ics).toContain('LOCATION:Kerkstraat 1\\, 3680 Maaseik');
	});

	it('signs references with a stable HMAC', () => {
		expect(icsToken('TDR-2026-0001')).toBe(icsToken('tdr-2026-0001'));
		expect(icsToken('TDR-2026-0001')).not.toBe(icsToken('TDR-2026-0002'));
		expect(icsToken('TDR-2026-0001')).toMatch(/^[A-Za-z0-9_-]{32}$/);
	});
});

describe('booking emails', () => {
	let bookingId = 0;
	let reference = '';

	beforeAll(async () => {
		const [svc] = await db.insert(services).values({ slug: 'gazon-test', icon: 'grass', priceFrom: 95, priceMode: 'fixed' }).returning();
		await db.insert(serviceTranslations).values([
			{ serviceId: svc.id, locale: 'nl', title: 'Gazon' },
			{ serviceId: svc.id, locale: 'en', title: 'Lawn care' }
		]);
		const [slot] = await db
			.insert(slots)
			.values({ date: '2030-07-15', slotKind: 'morning', start: '08:00', end: '12:00', capacity: 2 })
			.returning();
		const r = await createBooking({
			type: 'maintenance',
			serviceIds: [svc.id],
			frequency: 'monthly',
			gardenSize: 'md',
			slotId: slot.id,
			customer: {
				name: 'Eve <script>alert(1)</script>',
				email: 'eve@example.test',
				phone: '+32 470 12 34 56',
				street: 'Rozenlaan 9',
				postcode: '3680',
				municipality: 'Maaseik'
			},
			notesCustomer: 'Poort is "open" & hond <binnen>',
			source: 'website',
			locale: 'en'
		});
		if (!r.ok) throw new Error('booking failed');
		bookingId = r.id;
		reference = r.reference;
	});

	it('sends an escaped, English confirmation with an absolute .ics link', async () => {
		await sendBookingConfirmation(bookingId);
		const [mail] = await db.select().from(emails).where(eq(emails.kind, 'booking_confirmation'));
		expect(mail.to).toBe('eve@example.test');
		expect(mail.locale).toBe('en');
		expect(mail.subject).toContain(reference);
		expect(mail.html).not.toContain('<script>');
		expect(mail.html).toContain('Eve &lt;script&gt;');
		expect(mail.html).toContain('hond &lt;binnen&gt;');
		expect(mail.html).toContain(`https://example.test/api/bookings/${reference}/ics?token=${icsToken(reference)}`);
		expect(mail.html).toContain('Lawn care');
		expect(mail.text).toContain('Monday, 15 July 2030');
		expect(mail.text).toContain('08:00–12:00');
	});

	it('sends a Dutch internal alert with a CMS link', async () => {
		await sendNewBookingAlert(bookingId);
		const [mail] = await db.select().from(emails).where(eq(emails.kind, 'booking_alert'));
		expect(mail.to).toBe('info@tuinen-deridder.be');
		expect(mail.locale).toBe('nl');
		expect(mail.html).toContain(`https://example.test/admin/boekingen?open=${bookingId}`);
		expect(mail.html).toContain('Gazon');
	});

	it('sends reminders and status emails, skipping silent statuses', async () => {
		await sendBookingReminder(bookingId);
		await sendStatusChangeEmail(bookingId, 'in_progress');
		await sendStatusChangeEmail(bookingId, 'scheduled');
		await sendStatusChangeEmail(bookingId, 'cancelled');
		const rows = await db.select().from(emails).where(eq(emails.bookingId, bookingId));
		const kinds = rows.map((r) => r.kind);
		expect(kinds.filter((k) => k === 'booking_reminder')).toHaveLength(1);
		expect(kinds.filter((k) => k === 'booking_status')).toHaveLength(2);
		expect(rows.some((r) => r.subject.includes('cancelled'))).toBe(true);
	});

	it('builds a valid VEVENT in UTC for the Brussels slot', async () => {
		const ics = await buildIcs(bookingId);
		expect(ics).not.toBeNull();
		expect(ics).toContain(`UID:${reference.toLowerCase()}@tuinen-deridder.be`);
		expect(ics).toContain('DTSTART:20300715T060000Z'); // 08:00 CEST
		expect(ics).toContain('DTEND:20300715T100000Z');
		for (const line of ics!.split('\r\n')) expect(enc.encode(line).length).toBeLessThanOrEqual(75);
	});
});
