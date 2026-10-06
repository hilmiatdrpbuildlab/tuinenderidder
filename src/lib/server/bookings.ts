import { and, eq } from 'drizzle-orm';
import { db } from './db';
import { bookingAttachments, bookingEvents, bookingServices, bookings, customers, slots } from './db/schema';
import { forceReserveSlot, nextReference, reserveSlot } from './availability';
import type { BookingSource, BookingStatus, BookingType, Frequency, GardenSize } from '$lib/domain';
import type { Locale } from '$lib/i18n';

export type CustomerInput = {
	name: string;
	email: string;
	phone: string;
	street: string;
	postcode: string;
	municipality: string;
	marketingOptIn?: boolean;
};

export type CreateBookingInput = {
	type: BookingType;
	serviceIds: number[];
	frequency: Frequency;
	gardenSize: GardenSize | null;
	/** null for quote requests without a visit */
	slotId: number | null;
	/** the wizard draft whose hold should be consumed */
	draftId?: string | null;
	customer: CustomerInput;
	notesCustomer?: string;
	notesInternal?: string;
	source?: BookingSource;
	locale: Locale;
	/** CMS user creating the booking (manual entry); null for the public wizard */
	actorId?: number | null;
	attachmentMediaIds?: number[];
	status?: BookingStatus;
	assignedTo?: number | null;
	/** Planner override: book even if the slot is full (capacity grows by one). */
	force?: boolean;
};

export type CreateBookingResult = { ok: true; id: number; reference: string } | { ok: false; reason: 'slot_full' | 'slot_missing' };

/**
 * Create a booking in one transaction: reserve the slot atomically (no double booking), upsert the
 * customer by email, store services/attachments, write the first audit event and allocate the
 * TDR-YYYY-NNNN reference. Emails are sent by the caller after commit.
 *
 * Slot accounting rule: `slots.booked_count` = number of non-cancelled bookings in that slot.
 */
export async function createBooking(input: CreateBookingInput): Promise<CreateBookingResult> {
	return db.transaction(async (tx) => {
		if (input.slotId) {
			const [slot] = await tx.select({ id: slots.id }).from(slots).where(eq(slots.id, input.slotId)).limit(1);
			if (!slot) return { ok: false, reason: 'slot_missing' } as const;
			if (input.force) {
				await forceReserveSlot(tx, input.slotId);
			} else {
				const ok = await reserveSlot(tx, input.slotId, input.draftId ?? null);
				if (!ok) {
					// Rolls back: nothing was written yet, but make the intent explicit.
					return { ok: false, reason: 'slot_full' } as const;
				}
			}
		}

		const email = input.customer.email.trim().toLowerCase();
		const [existing] = await tx.select().from(customers).where(eq(customers.email, email)).limit(1);
		let customerId: number;
		const customerValues = {
			name: input.customer.name.trim(),
			email,
			phone: input.customer.phone.trim(),
			street: input.customer.street.trim(),
			postcode: input.customer.postcode.trim(),
			municipality: input.customer.municipality.trim(),
			locale: input.locale,
			consentAt: new Date(),
			marketingOptIn: input.customer.marketingOptIn ?? false,
			updatedAt: new Date()
		};
		if (existing) {
			await tx.update(customers).set(customerValues).where(eq(customers.id, existing.id));
			customerId = existing.id;
		} else {
			const [created] = await tx.insert(customers).values(customerValues).returning({ id: customers.id });
			customerId = created.id;
		}

		const reference = await nextReference(tx);
		const status = input.status ?? 'new';
		const [booking] = await tx
			.insert(bookings)
			.values({
				reference,
				customerId,
				type: input.type,
				frequency: input.frequency,
				gardenSize: input.gardenSize,
				slotId: input.slotId,
				status,
				assignedTo: input.assignedTo ?? null,
				notesCustomer: input.notesCustomer?.trim() ?? '',
				notesInternal: input.notesInternal?.trim() ?? '',
				source: input.source ?? 'website',
				locale: input.locale
			})
			.returning({ id: bookings.id });

		const serviceIds = [...new Set(input.serviceIds)];
		if (serviceIds.length) {
			await tx.insert(bookingServices).values(serviceIds.map((serviceId) => ({ bookingId: booking.id, serviceId })));
		}
		if (input.attachmentMediaIds?.length) {
			await tx
				.insert(bookingAttachments)
				.values(input.attachmentMediaIds.map((mediaId) => ({ bookingId: booking.id, mediaId })));
		}
		await tx.insert(bookingEvents).values({
			bookingId: booking.id,
			fromStatus: null,
			toStatus: status,
			actorId: input.actorId ?? null,
			note: input.actorId ? 'Manueel ingevoerd in het CMS' : 'Online geboekt'
		});

		return { ok: true, id: booking.id, reference } as const;
	});
}

/** Look up a booking id by its public reference. */
export async function findBookingByReference(reference: string) {
	const [row] = await db
		.select({ id: bookings.id })
		.from(bookings)
		.where(and(eq(bookings.reference, reference.toUpperCase())))
		.limit(1);
	return row?.id ?? null;
}
