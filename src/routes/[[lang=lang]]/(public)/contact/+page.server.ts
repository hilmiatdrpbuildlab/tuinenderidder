import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { db } from '$lib/server/db';
import { contactMessages } from '$lib/server/db/schema';
import { emailLayout, escapeHtml, sendEmail } from '$lib/server/email';
import { rateLimit } from '$lib/server/rate-limit';
import { getCompany } from '$lib/server/settings';
import { getPage } from '$lib/server/content/pages';
import { translator, type MessageKey } from '$lib/i18n';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	return { contact: await getPage('contact', locals.locale) };
};

const schema = z.object({
	name: z.string().trim().min(2).max(120),
	email: z.string().trim().max(200).pipe(z.email()),
	phone: z
		.string()
		.trim()
		.max(40)
		.regex(/^$|^[+0-9 ()./-]{6,}$/),
	message: z.string().trim().min(10).max(5000),
	consent: z.literal('on')
});

type Field = keyof z.infer<typeof schema>;
const FIELDS: Field[] = ['name', 'email', 'phone', 'message', 'consent'];

export const actions: Actions = {
	default: async ({ request, locals, getClientAddress }) => {
		const t = translator(locals.locale);
		const form = await request.formData();
		const raw = Object.fromEntries(FIELDS.map((f) => [f, String(form.get(f) ?? '')])) as Record<Field, string>;
		const values = { name: raw.name, email: raw.email, phone: raw.phone, message: raw.message, consent: raw.consent === 'on' };

		// Honeypot: real visitors never see or fill this field. Pretend success, store nothing.
		if (String(form.get('website') ?? '').trim() !== '') return { success: true };

		let ip = 'unknown';
		try {
			ip = getClientAddress();
		} catch {
			/* not available in some adapters */
		}
		const limit = rateLimit(`contact:${ip}`, 5, 10 * 60 * 1000);
		if (!limit.ok) return fail(429, { values, errors: {} as Partial<Record<Field, string>>, message: t('contact.rateLimited') });

		const parsed = schema.safeParse(raw);
		if (!parsed.success) {
			const errors: Partial<Record<Field, string>> = {};
			for (const issue of parsed.error.issues) {
				const f = issue.path[0] as Field;
				if (FIELDS.includes(f) && !errors[f]) errors[f] = t(`contact.err.${f}` as MessageKey);
			}
			return fail(400, { values, errors, message: null });
		}

		const d = parsed.data;
		await db.insert(contactMessages).values({
			name: d.name,
			email: d.email,
			phone: d.phone,
			message: d.message,
			locale: locals.locale
		});

		const company = await getCompany();
		const nl = translator('nl'); // internal alert is always in Dutch
		const row = (label: string, value: string) =>
			`<tr><td style="padding:6px 16px 6px 0;color:#5C5750;vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:6px 0">${value}</td></tr>`;
		const bodyHtml = `<p style="margin:0 0 16px">${escapeHtml(nl('contact.mailIntro'))}</p>
<table role="presentation" cellpadding="0" cellspacing="0" style="font-size:15px;margin-bottom:16px">
${row(nl('contact.name'), escapeHtml(d.name))}
${row(nl('contact.emailLabel'), `<a href="mailto:${escapeHtml(d.email)}" style="color:#2F6530">${escapeHtml(d.email)}</a>`)}
${d.phone ? row(nl('contact.phoneLabel'), escapeHtml(d.phone)) : ''}
${row('Taal', locals.locale.toUpperCase())}
</table>
<div style="padding:16px;border-radius:12px;background:#F7F1EA;white-space:pre-wrap;line-height:1.6">${escapeHtml(d.message)}</div>`;

		try {
			await sendEmail({
				kind: 'contact_alert',
				to: company.email,
				subject: nl('contact.mailSubject', { name: d.name }),
				html: emailLayout({ title: nl('contact.mailSubject', { name: d.name }), bodyHtml, footer: escapeHtml(nl('contact.mailFooter')), lang: 'nl' }),
				text: `${d.name} <${d.email}>${d.phone ? ` · ${d.phone}` : ''}\n\n${d.message}`,
				locale: 'nl'
			});
		} catch (err) {
			// The message is stored; a failed alert must not lose the visitor's submission.
			console.error('[contact] alert email failed', err);
		}

		return { success: true };
	}
};
