import { timingSafeEqual } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { bookings, customers, slots } from '$lib/server/db/schema';
import { DONE_COOKIE } from '$lib/server/booking-draft';
import { icsToken } from '$lib/server/booking-emails';
import type { BookingType, SlotKind } from '$lib/domain';
import type { PageServerLoad } from './$types';

/**
 * Thank-you page. Details are only shown when `?ref=` matches the signed reference in this
 * browser's short-lived `tdr_booking_done` cookie, so guessing references reveals nothing.
 */
export const load: PageServerLoad = async ({ cookies, url }) => {
	const ref = (url.searchParams.get('ref') ?? '').toUpperCase();
	const cookie = cookies.get(DONE_COOKIE) ?? '';
	const [cRef, cSig] = cookie.split('.');

	let booking: {
		reference: string;
		type: BookingType;
		email: string;
		slot: { date: string; slotKind: SlotKind; start: string; end: string } | null;
		icsHref: string | null;
	} | null = null;

	if (ref && cRef === ref && cSig) {
		const expected = Buffer.from(icsToken(ref));
		const given = Buffer.from(cSig);
		if (expected.length === given.length && timingSafeEqual(expected, given)) {
			const [row] = await db
				.select({ reference: bookings.reference, type: bookings.type, email: customers.email, slot: slots })
				.from(bookings)
				.innerJoin(customers, eq(customers.id, bookings.customerId))
				.leftJoin(slots, eq(slots.id, bookings.slotId))
				.where(eq(bookings.reference, ref))
				.limit(1);
			if (row) {
				booking = {
					reference: row.reference,
					type: row.type as BookingType,
					email: row.email,
					slot: row.slot
						? { date: row.slot.date, slotKind: row.slot.slotKind as SlotKind, start: row.slot.start, end: row.slot.end }
						: null,
					icsHref: row.slot ? `/api/bookings/${encodeURIComponent(row.reference)}/ics?token=${cSig}` : null
				};
			}
		}
	}

	return { step: 'bedankt' as const, booking };
};
