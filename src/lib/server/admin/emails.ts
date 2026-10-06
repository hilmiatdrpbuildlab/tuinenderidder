import { desc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { bookings, emails } from '$lib/server/db/schema';

/** Read side of the email outbox for CMS → Beheer → E-mails. */

export const EMAIL_KIND_LABELS = {
	booking_confirmation: 'Bevestiging',
	booking_alert: 'Interne melding',
	booking_reminder: 'Herinnering',
	booking_status: 'Statuswijziging',
	contact_alert: 'Contactformulier'
} as const;

export type EmailKind = keyof typeof EMAIL_KIND_LABELS;

export function isEmailKind(v: string | null): v is EmailKind {
	return !!v && v in EMAIL_KIND_LABELS;
}

export async function listEmails(opts: { page: number; perPage: number; kind?: EmailKind }) {
	const where = opts.kind ? eq(emails.kind, opts.kind) : undefined;
	const [{ total }] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(emails)
		.where(where);
	const rows = await db
		.select({
			id: emails.id,
			to: emails.to,
			subject: emails.subject,
			kind: emails.kind,
			status: emails.status,
			createdAt: emails.createdAt,
			bookingId: emails.bookingId,
			reference: bookings.reference
		})
		.from(emails)
		.leftJoin(bookings, eq(emails.bookingId, bookings.id))
		.where(where)
		.orderBy(desc(emails.createdAt), desc(emails.id))
		.limit(opts.perPage)
		.offset((opts.page - 1) * opts.perPage);
	return { rows, total: Number(total) };
}

export async function getEmail(id: number) {
	const [row] = await db
		.select({
			id: emails.id,
			to: emails.to,
			subject: emails.subject,
			html: emails.html,
			text: emails.text,
			kind: emails.kind,
			locale: emails.locale,
			status: emails.status,
			createdAt: emails.createdAt,
			bookingId: emails.bookingId,
			reference: bookings.reference
		})
		.from(emails)
		.leftJoin(bookings, eq(emails.bookingId, bookings.id))
		.where(eq(emails.id, id))
		.limit(1);
	return row ?? null;
}
