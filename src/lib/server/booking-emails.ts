/**
 * Booking emails (NL/EN, in the booking's locale) and the .ics calendar file.
 * All messages go through sendEmail() → the outbox table (no provider connected yet).
 *
 * CONTRACT (used by the booking wizard, the CMS and the cron job — keep these signatures):
 *   sendBookingConfirmation(bookingId)        customer confirmation with booking summary + .ics link
 *   sendNewBookingAlert(bookingId)            internal "new booking" alert to settings.booking.notifyEmail
 *   sendBookingReminder(bookingId)            customer reminder ~48 h before the visit
 *   sendStatusChangeEmail(bookingId, status)  customer email when the CMS changes the status / reschedules
 *   buildIcs(bookingId)                       iCalendar text for the booking (null when it has no slot)
 *   icsToken(reference)                       HMAC token for the public .ics download URL
 */
import { createHmac } from 'node:crypto';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { eq, inArray } from 'drizzle-orm';
import { db } from './db';
import { bookingAttachments, bookingServices, bookings, customers, serviceTranslations, slots } from './db/schema';
import { emailLayout, escapeHtml, sendEmail } from './email';
import { getBookingSettings, getCompany, type CompanySettings } from './settings';
import { brusselsDateTime } from './availability';
import {
	FREQUENCY_LABELS,
	GARDEN_SIZE_LABELS,
	SLOT_LABELS,
	TYPE_LABELS,
	type BookingStatus,
	type BookingType,
	type Frequency,
	type GardenSize,
	type SlotKind
} from '$lib/domain';
import { formatLongDate, localizePath, translator, type Locale, type MessageKey } from '$lib/i18n';

/* ------------------------------------------------------------------ helpers */

/** Absolute public origin (no trailing slash) for links in emails and .ics files. */
export function siteUrl() {
	const raw = publicEnv.PUBLIC_SITE_URL || env.PUBLIC_SITE_URL || process.env.PUBLIC_SITE_URL || 'http://localhost:5173';
	return raw.replace(/\/+$/, '');
}

function secret() {
	return env.APP_SECRET || 'dev-secret-change-me';
}

/** HMAC token that authorises downloading a booking's .ics without logging in. */
export function icsToken(reference: string): string {
	return createHmac('sha256', secret()).update(`ics:${reference.toUpperCase()}`).digest('base64url').slice(0, 32);
}

export function icsUrl(reference: string) {
	return `${siteUrl()}/api/bookings/${encodeURIComponent(reference)}/ics?token=${icsToken(reference)}`;
}

type BookingBundle = Awaited<ReturnType<typeof loadBooking>>;

/** `titleLocale` picks the service-name language (defaults to the booking's own locale). */
async function loadBooking(bookingId: number, titleLocale?: Locale) {
	const [row] = await db
		.select({ booking: bookings, customer: customers, slot: slots })
		.from(bookings)
		.innerJoin(customers, eq(customers.id, bookings.customerId))
		.leftJoin(slots, eq(slots.id, bookings.slotId))
		.where(eq(bookings.id, bookingId))
		.limit(1);
	if (!row) return null;
	const locale: Locale = row.booking.locale === 'en' ? 'en' : 'nl';
	const serviceRows = await db
		.select({ id: serviceTranslations.serviceId, locale: serviceTranslations.locale, title: serviceTranslations.title })
		.from(bookingServices)
		.innerJoin(serviceTranslations, eq(serviceTranslations.serviceId, bookingServices.serviceId))
		.where(eq(bookingServices.bookingId, bookingId));
	const titles = new Map<number, string>();
	const want = titleLocale ?? locale;
	for (const s of serviceRows) if (!titles.has(s.id) || s.locale === want) titles.set(s.id, s.title);
	const attachments = await db
		.select({ mediaId: bookingAttachments.mediaId })
		.from(bookingAttachments)
		.where(inArray(bookingAttachments.bookingId, [bookingId]));
	const company = await getCompany();
	return {
		...row,
		locale,
		services: [...titles.values()],
		photoCount: attachments.length,
		company
	};
}

function whenText(slot: { date: string; start: string; end: string; slotKind: string } | null, locale: Locale) {
	if (!slot) return null;
	const kind = SLOT_LABELS[slot.slotKind as SlotKind]?.[locale] ?? '';
	return {
		date: formatLongDate(slot.date, locale),
		time: `${kind ? kind.toLowerCase() + ' ' : ''}${slot.start}–${slot.end}`
	};
}

function addressLine(c: { street: string; postcode: string; municipality: string }) {
	return [c.street, [c.postcode, c.municipality].filter(Boolean).join(' ')].filter(Boolean).join(', ');
}

function footer(company: CompanySettings, t: ReturnType<typeof translator>) {
	return escapeHtml(
		t('email.footer', {
			address: `${company.street}, ${company.postcode} ${company.town}`,
			phone: company.phone,
			email: company.email
		})
	);
}

/** Two-column details table (labels left, values right). Values are escaped here. */
function detailsTable(rows: [string, string | null | undefined][]) {
	const body = rows
		.filter(([, v]) => v)
		.map(
			([k, v]) =>
				`<tr><td style="padding:8px 12px 8px 0;vertical-align:top;color:#5C5750;font-size:14px;white-space:nowrap">${escapeHtml(k)}</td><td style="padding:8px 0;vertical-align:top;font-size:15px;color:#1C1A17">${escapeHtml(v!).replace(/\n/g, '<br>')}</td></tr>`
		)
		.join('');
	return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:20px 0;border-top:1px solid #DAD4C7;border-bottom:1px solid #DAD4C7">${body}</table>`;
}

function detailsText(rows: [string, string | null | undefined][]) {
	return rows
		.filter(([, v]) => v)
		.map(([k, v]) => `${k}: ${v}`)
		.join('\n');
}

function button(href: string, label: string) {
	return `<p style="margin:24px 0"><a href="${escapeHtml(href)}" style="display:inline-block;background:#2F6530;color:#FFFFFF;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:12px">${escapeHtml(label)}</a></p>`;
}

function p(text: string) {
	return `<p style="margin:0 0 14px;font-size:16px;line-height:1.6">${text}</p>`;
}

function customerRows(b: NonNullable<BookingBundle>, t: ReturnType<typeof translator>): [string, string | null][] {
	const when = whenText(b.slot, b.locale);
	const type = b.booking.type as BookingType;
	return [
		[t('email.reference'), b.booking.reference],
		[t('email.type'), TYPE_LABELS[type][b.locale]],
		[t('email.services'), b.services.join(', ')],
		[t('email.date'), when ? `${when.date}, ${when.time}` : type === 'quote' ? t('email.noVisit') : null],
		[t('email.address'), addressLine(b.customer)],
		[t('email.size'), b.booking.gardenSize ? GARDEN_SIZE_LABELS[b.booking.gardenSize as GardenSize] : null],
		[t('email.frequency'), type === 'maintenance' ? FREQUENCY_LABELS[b.booking.frequency as Frequency][b.locale] : null],
		[t('email.notes'), b.booking.notesCustomer || null]
	];
}

/** Compose a customer email: greeting, intro paragraphs, optional details + .ics button, sign-off. */
async function sendCustomerEmail(
	b: NonNullable<BookingBundle>,
	opts: {
		kind: 'booking_confirmation' | 'booking_reminder' | 'booking_status';
		subjectKey: MessageKey;
		titleKey: MessageKey;
		paragraphs: string[];
		details?: boolean;
		ics?: boolean;
		extraHtml?: string;
		extraText?: string;
		vars?: Record<string, string>;
	}
) {
	const t = translator(b.locale);
	const vars = { reference: b.booking.reference, ...opts.vars };
	const subject = t(opts.subjectKey, vars);
	const title = t(opts.titleKey, vars);
	const rows = opts.details ? customerRows(b, t) : [];
	const withIcs = opts.ics && !!b.slot && b.booking.status !== 'cancelled';
	const ics = withIcs ? icsUrl(b.booking.reference) : null;

	const html = [
		p(escapeHtml(t('email.greeting', { name: b.customer.name }))),
		...opts.paragraphs.map((x) => p(escapeHtml(x))),
		opts.details ? detailsTable(rows) : '',
		ics ? button(ics, t('email.addToCalendar')) : '',
		opts.extraHtml ?? '',
		p(escapeHtml(t('email.questions', { phone: b.company.phone }))),
		p(t('email.signoff'))
	].join('');

	const text = [
		t('email.greeting', { name: b.customer.name }),
		'',
		...opts.paragraphs.flatMap((x) => [x, '']),
		opts.details ? detailsText(rows) + '\n' : '',
		ics ? `${t('email.addToCalendar')}: ${ics}\n` : '',
		opts.extraText ? opts.extraText + '\n' : '',
		t('email.questions', { phone: b.company.phone }),
		'',
		t('email.signoffText'),
		'',
		'--',
		t('email.footer', {
			address: `${b.company.street}, ${b.company.postcode} ${b.company.town}`,
			phone: b.company.phone,
			email: b.company.email
		})
	]
		.filter((l) => l !== null)
		.join('\n');

	await sendEmail({
		to: b.customer.email,
		subject,
		html: emailLayout({ title: escapeHtml(title), bodyHtml: html, footer: footer(b.company, t), lang: b.locale }),
		text,
		kind: opts.kind,
		bookingId: b.booking.id,
		locale: b.locale
	});
}

function isAnonymised(b: NonNullable<BookingBundle>) {
	return !b.customer.email || b.customer.email.endsWith('.invalid');
}

/* ------------------------------------------------------------------ public API */

export async function sendBookingConfirmation(bookingId: number): Promise<void> {
	const b = await loadBooking(bookingId);
	if (!b || isAnonymised(b)) return;
	const t = translator(b.locale);
	await sendCustomerEmail(b, {
		kind: 'booking_confirmation',
		subjectKey: 'email.confirmation.subject',
		titleKey: 'email.confirmation.title',
		paragraphs: [t(b.booking.type === 'quote' ? 'email.confirmation.introQuote' : 'email.confirmation.intro')],
		details: true,
		ics: true
	});
}

export async function sendNewBookingAlert(bookingId: number): Promise<void> {
	const b = await loadBooking(bookingId, 'nl');
	if (!b) return;
	const settings = await getBookingSettings();
	if (!settings.notifyEmail) return;
	// The CMS is Dutch-only, so the internal alert is always Dutch.
	const t = translator('nl');
	const when = whenText(b.slot, 'nl');
	const type = b.booking.type as BookingType;
	const adminUrl = `${siteUrl()}/admin/boekingen?open=${b.booking.id}`;
	const rows: [string, string | null][] = [
		[t('email.reference'), b.booking.reference],
		[t('email.type'), TYPE_LABELS[type].nl],
		[t('email.services'), b.services.join(', ')],
		[t('email.date'), when ? `${when.date}, ${when.time}` : t('email.noVisit')],
		[t('email.alert.customer'), [b.customer.name, b.customer.email, b.customer.phone].filter(Boolean).join('\n')],
		[t('email.address'), addressLine(b.customer)],
		[t('email.size'), b.booking.gardenSize ? GARDEN_SIZE_LABELS[b.booking.gardenSize as GardenSize] : null],
		[t('email.frequency'), type === 'maintenance' ? FREQUENCY_LABELS[b.booking.frequency as Frequency].nl : null],
		[t('email.notes'), b.booking.notesCustomer || null],
		['Foto’s', b.photoCount ? t('email.alert.photos', { n: b.photoCount }) : null],
		['Taal', b.locale === 'en' ? 'English' : 'Nederlands'],
		['Marketing', b.customer.marketingOptIn ? t('email.alert.marketing') : null]
	];
	const html = [p(escapeHtml(t('email.alert.intro'))), detailsTable(rows), button(adminUrl, t('email.alert.open'))].join('');
	const text = [t('email.alert.intro'), '', detailsText(rows), '', `${t('email.alert.open')}: ${adminUrl}`].join('\n');
	await sendEmail({
		to: settings.notifyEmail,
		subject: t('email.alert.subject', { reference: b.booking.reference, type: TYPE_LABELS[type].nl }),
		html: emailLayout({ title: escapeHtml(t('email.alert.title')), bodyHtml: html, footer: footer(b.company, t), lang: 'nl' }),
		text,
		kind: 'booking_alert',
		bookingId: b.booking.id,
		locale: 'nl'
	});
}

export async function sendBookingReminder(bookingId: number): Promise<void> {
	const b = await loadBooking(bookingId);
	if (!b || !b.slot || isAnonymised(b)) return;
	const t = translator(b.locale);
	const when = whenText(b.slot, b.locale)!;
	await sendCustomerEmail(b, {
		kind: 'booking_reminder',
		subjectKey: 'email.reminder.subject',
		titleKey: 'email.reminder.title',
		paragraphs: [t('email.reminder.intro', when), t('email.reminder.tip')],
		details: true,
		ics: true,
		vars: { date: when.date }
	});
}

/** Statuses that don't warrant a customer email (internal progress). */
const SILENT_STATUSES: BookingStatus[] = ['new', 'in_progress'];

export async function sendStatusChangeEmail(bookingId: number, status: BookingStatus): Promise<void> {
	if (SILENT_STATUSES.includes(status)) return;
	const b = await loadBooking(bookingId);
	if (!b || isAnonymised(b)) return;
	const t = translator(b.locale);
	const when = whenText(b.slot, b.locale);
	const bookAgain = `${siteUrl()}${localizePath('/boeken', b.locale)}`;

	switch (status) {
		case 'pending':
			return sendCustomerEmail(b, {
				kind: 'booking_status',
				subjectKey: 'email.status.pending.subject',
				titleKey: 'email.status.pending.title',
				paragraphs: [t('email.status.pending.intro')],
				details: true
			});
		case 'scheduled':
			return sendCustomerEmail(b, {
				kind: 'booking_status',
				subjectKey: 'email.status.scheduled.subject',
				titleKey: 'email.status.scheduled.title',
				paragraphs: [t(b.slot ? 'email.status.scheduled.intro' : 'email.status.scheduled.introQuote')],
				details: true,
				ics: true
			});
		case 'rescheduled':
			return sendCustomerEmail(b, {
				kind: 'booking_status',
				subjectKey: 'email.status.rescheduled.subject',
				titleKey: 'email.status.rescheduled.title',
				paragraphs: [
					t('email.status.rescheduled.intro'),
					when ? t('email.status.rescheduled.newDate', when) : t('email.status.rescheduled.noDate')
				],
				details: true,
				ics: true
			});
		case 'cancelled':
			return sendCustomerEmail(b, {
				kind: 'booking_status',
				subjectKey: 'email.status.cancelled.subject',
				titleKey: 'email.status.cancelled.title',
				paragraphs: [t('email.status.cancelled.intro')],
				extraHtml: button(bookAgain, t('email.bookAgain')),
				extraText: `${t('email.bookAgain')}: ${bookAgain}`
			});
		case 'completed': {
			const review = b.company.googleReviewsUrl;
			return sendCustomerEmail(b, {
				kind: 'booking_status',
				subjectKey: 'email.status.completed.subject',
				titleKey: 'email.status.completed.title',
				paragraphs: [t('email.status.completed.intro'), ...(review ? [t('email.status.completed.review')] : [])],
				extraHtml: review ? button(review, t('email.status.completed.reviewLink')) : '',
				extraText: review ? `${t('email.status.completed.reviewLink')}: ${review}` : ''
			});
		}
	}
}

/* ------------------------------------------------------------------------ ics */

/** Escape a TEXT value (RFC 5545 §3.3.11). */
export function icsEscape(s: string) {
	return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Fold a content line at 75 octets (RFC 5545 §3.1), never splitting a UTF-8 character. */
export function icsFold(line: string) {
	const enc = new TextEncoder();
	if (enc.encode(line).length <= 75) return line;
	const parts: string[] = [];
	let current = '';
	let bytes = 0;
	let limit = 75;
	for (const ch of line) {
		const n = enc.encode(ch).length;
		if (bytes + n > limit) {
			parts.push(current);
			current = '';
			bytes = 0;
			limit = 74; // continuation lines start with a space
		}
		current += ch;
		bytes += n;
	}
	parts.push(current);
	return parts.join('\r\n ');
}

function icsDate(d: Date) {
	return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export function buildIcsText(opts: {
	uid: string;
	start: Date;
	end: Date;
	summary: string;
	location: string;
	description: string;
	url?: string;
	cancelled?: boolean;
	stamp?: Date;
	organizerEmail?: string;
}) {
	const lines = [
		'BEGIN:VCALENDAR',
		'VERSION:2.0',
		'PRODID:-//Tuinen De Ridder//Booking//NL',
		'CALSCALE:GREGORIAN',
		'METHOD:PUBLISH',
		'BEGIN:VEVENT',
		`UID:${opts.uid}`,
		`DTSTAMP:${icsDate(opts.stamp ?? new Date())}`,
		`DTSTART:${icsDate(opts.start)}`,
		`DTEND:${icsDate(opts.end)}`,
		`SUMMARY:${icsEscape(opts.summary)}`,
		`LOCATION:${icsEscape(opts.location)}`,
		`DESCRIPTION:${icsEscape(opts.description)}`,
		...(opts.url ? [`URL:${opts.url}`] : []),
		...(opts.organizerEmail ? [`ORGANIZER;CN=Tuinen De Ridder:mailto:${opts.organizerEmail}`] : []),
		`STATUS:${opts.cancelled ? 'CANCELLED' : 'CONFIRMED'}`,
		'TRANSP:OPAQUE',
		'BEGIN:VALARM',
		'ACTION:DISPLAY',
		'TRIGGER:-PT12H',
		`DESCRIPTION:${icsEscape(opts.summary)}`,
		'END:VALARM',
		'END:VEVENT',
		'END:VCALENDAR'
	];
	return lines.map(icsFold).join('\r\n') + '\r\n';
}

export async function buildIcs(bookingId: number): Promise<string | null> {
	const b = await loadBooking(bookingId);
	if (!b || !b.slot) return null;
	const t = translator(b.locale);
	const type = TYPE_LABELS[b.booking.type as BookingType][b.locale];
	const description = [
		t('ics.description', { reference: b.booking.reference, phone: b.company.phone }),
		b.services.length ? `${t('email.services')}: ${b.services.join(', ')}` : ''
	]
		.filter(Boolean)
		.join('\n');
	return buildIcsText({
		uid: `${b.booking.reference.toLowerCase()}@tuinen-deridder.be`,
		start: brusselsDateTime(b.slot.date, b.slot.start),
		end: brusselsDateTime(b.slot.date, b.slot.end),
		summary: t('ics.summary', { type }),
		location: addressLine(b.customer),
		description,
		url: siteUrl(),
		cancelled: b.booking.status === 'cancelled',
		stamp: b.booking.updatedAt,
		organizerEmail: b.company.email
	});
}
