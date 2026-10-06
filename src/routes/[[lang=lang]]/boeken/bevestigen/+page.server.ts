import { fail, redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { z } from 'zod';
import { createBooking } from '$lib/server/bookings';
import { sendBookingConfirmation, sendNewBookingAlert, icsToken } from '$lib/server/booking-emails';
import {
	clearDraft,
	DONE_COOKIE,
	firstIncompleteStep,
	getDraft,
	getDraftPhotos,
	guardStep,
	saveDraft,
	stepPath
} from '$lib/server/booking-draft';
import { rateLimit } from '$lib/server/rate-limit';
import { normalizePhone } from '$lib/components/booking/phone';
import { translator } from '$lib/i18n';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ cookies, locals }) => {
	const draft = await guardStep(cookies, 'bevestigen', locals.locale);
	const d = draft.data;
	const photos = await getDraftPhotos(d.photoIds);
	return {
		step: 'bevestigen' as const,
		values: { name: d.name ?? '', email: d.email ?? '', phone: d.phone ?? '', marketingOptIn: d.marketingOptIn ?? false, consent: false },
		review: { notes: d.notes ?? '', photos }
	};
};

export const actions: Actions = {
	default: async ({ request, cookies, locals, getClientAddress }) => {
		const locale = locals.locale;
		const t = translator(locale);
		const form = await request.formData();

		// Honeypot: real people never see or fill this field. Pretend all went well.
		if (String(form.get('website') ?? '').trim()) redirect(303, stepPath('bedankt', locale));

		const values = {
			name: String(form.get('name') ?? '').trim().slice(0, 120),
			email: String(form.get('email') ?? '').trim().slice(0, 200),
			phone: String(form.get('phone') ?? '').trim().slice(0, 40),
			marketingOptIn: form.get('marketingOptIn') === 'on',
			consent: form.get('consent') === 'on'
		};

		const schema = z.object({
			name: z.string().min(2, t('booking.contact.errorName')),
			email: z.email(t('booking.contact.errorEmail')),
			phone: z.string().refine((p) => normalizePhone(p) !== null, t('booking.contact.errorPhone')),
			consent: z.literal(true, t('booking.consent.error'))
		});
		const parsed = schema.safeParse(values);

		const draft = await getDraft(cookies);
		if (!draft) redirect(303, stepPath('dienst', locale));
		const phone = normalizePhone(values.phone) ?? values.phone;
		// Remember what was typed, so nothing has to be re-entered (WCAG 3.3.7).
		await saveDraft(cookies, { name: values.name, email: values.email, phone, marketingOptIn: values.marketingOptIn });

		if (!parsed.success) {
			return fail(400, { values: { ...values, phone }, errors: z.flattenError(parsed.error).fieldErrors });
		}

		const d = draft.data;
		const missing = firstIncompleteStep(d);
		if (missing !== 'bevestigen') redirect(303, stepPath(missing, locale));

		const ip = getClientAddress();
		const limit = rateLimit(`booking:${ip}`, dev ? 50 : 5, 15 * 60_000);
		if (!limit.ok) {
			return fail(429, {
				values: { ...values, phone },
				message: t('booking.bevestigen.errorRate', { minutes: Math.ceil(limit.retryAfter / 60) })
			});
		}

		let result: Awaited<ReturnType<typeof createBooking>>;
		try {
			result = await createBooking({
				type: d.type!,
				serviceIds: d.serviceIds ?? [],
				frequency: d.type === 'maintenance' ? (d.frequency ?? 'once') : 'once',
				gardenSize: d.gardenSize ?? null,
				slotId: d.type === 'quote' ? null : (d.slotId ?? null),
				draftId: draft.id,
				customer: {
					name: values.name,
					email: values.email,
					phone,
					street: d.street ?? '',
					postcode: d.postcode ?? '',
					municipality: d.municipality ?? '',
					marketingOptIn: values.marketingOptIn
				},
				notesCustomer: d.notes ?? '',
				attachmentMediaIds: d.photoIds ?? [],
				source: 'website',
				locale
			});
		} catch (e) {
			console.error('[booking] createBooking failed', e);
			return fail(500, { values: { ...values, phone }, message: t('booking.bevestigen.errorGeneric') });
		}

		if (!result.ok) {
			return fail(409, { values: { ...values, phone }, slotFull: true, message: t('booking.bevestigen.errorSlotFull') });
		}

		// Emails go to the outbox after commit; a mail problem must never lose the booking.
		await Promise.allSettled([sendBookingConfirmation(result.id), sendNewBookingAlert(result.id)]).then((r) =>
			r.forEach((x) => x.status === 'rejected' && console.error('[booking] email failed', x.reason))
		);
		await clearDraft(cookies, draft.id);

		// Proof for the thank-you page that this browser made this booking (refs are guessable).
		cookies.set(DONE_COOKIE, `${result.reference}.${icsToken(result.reference)}`, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: !dev,
			maxAge: 60 * 60 * 2
		});
		redirect(303, stepPath('bedankt', locale, `?ref=${encodeURIComponent(result.reference)}`));
	}
};
