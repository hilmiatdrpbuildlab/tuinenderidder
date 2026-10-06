import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { requireRole } from '$lib/server/permissions';
import { getBookingSettings, getCompany, saveSetting, type BookingSettings, type CompanySettings } from '$lib/server/settings';
import type { Actions, PageServerLoad } from './$types';

const text = (max = 200) => z.string().trim().max(max, `Maximaal ${max} tekens.`).default('');
const required = (label: string, max = 200) =>
	z.string({ error: `Vul ${label} in.` }).trim().min(1, `Vul ${label} in.`).max(max, `Maximaal ${max} tekens.`);
const optionalUrl = z
	.string()
	.trim()
	.max(500, 'Maximaal 500 tekens.')
	.refine((v) => v === '' || /^https:\/\/\S+$/.test(v), 'Vul een volledige https://-link in of laat leeg.')
	.default('');
const email = z.string().trim().toLowerCase().email('Vul een geldig e-mailadres in.');
const int = (label: string, min: number, max: number) =>
	z.preprocess(
		(v) => (typeof v === 'string' && v.trim() === '' ? undefined : v),
		z.coerce
			.number({ error: `Vul een getal in voor ${label}.` })
			.int('Gebruik een geheel getal.')
			.min(min, `Minimaal ${min}.`)
			.max(max, `Maximaal ${max}.`)
	);

const companySchema = z.object({
	name: required('de bedrijfsnaam', 120),
	street: required('straat en nummer', 120),
	postcode: z.string().trim().regex(/^\d{4}$/, 'Een Belgische postcode heeft 4 cijfers.'),
	town: required('de gemeente', 80),
	phone: required('het telefoonnummer', 40),
	phoneIntl: z
		.string()
		.trim()
		.regex(/^\+\d{8,15}$/, 'Gebruik het internationale formaat zonder spaties, bv. +32470807134.'),
	email,
	vat: text(40),
	facebookUrl: optionalUrl,
	instagramUrl: optionalUrl,
	googleReviewsUrl: optionalUrl,
	mapsEmbedUrl: optionalUrl,
	openingHoursNl: text(200),
	openingHoursEn: text(200)
}) satisfies z.ZodType<CompanySettings>;

const bookingSchema = z.object({
	leadTimeDays: int('de minimale aanlooptijd', 0, 60),
	horizonWeeks: int('de planningshorizon', 1, 52),
	holdMinutes: int('de reservatieduur', 2, 60),
	reminderHours: int('de herinnering', 1, 336),
	servicePostcodes: z
		.string()
		.default('')
		.transform((v) =>
			v
				.split(/[\s,;]+/)
				.map((p) => p.trim())
				.filter(Boolean)
		)
		.pipe(
			z
				.array(z.string().regex(/^\d{1,4}$/, 'Gebruik enkel cijfers (1 tot 4), gescheiden door komma’s.'))
				.max(100, 'Maximaal 100 prefixen.')
		)
		.transform((list) => [...new Set(list)]),
	vatNoteNl: text(300),
	vatNoteEn: text(300),
	notifyEmail: email,
	retentionMonths: int('de bewaartermijn', 6, 120)
}) satisfies z.ZodType<BookingSettings, unknown>;

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'settings');
	const [company, booking] = await Promise.all([getCompany(), getBookingSettings()]);
	return { title: 'Instellingen', company, booking };
};

function strings(form: FormData) {
	const out: Record<string, string> = {};
	for (const [k, v] of form) if (typeof v === 'string') out[k] = v;
	return out;
}

export const actions: Actions = {
	company: async ({ locals, request }) => {
		requireRole(locals, 'settings');
		const values = strings(await request.formData());
		const parsed = companySchema.safeParse(values);
		if (!parsed.success) {
			return fail(400, {
				form: 'company' as const,
				message: 'Controleer de gemarkeerde velden.',
				errors: z.flattenError(parsed.error).fieldErrors as Record<string, string[] | undefined>,
				values
			});
		}
		await saveSetting('company', parsed.data);
		return { form: 'company' as const, message: 'Bedrijfsgegevens opgeslagen.' };
	},

	booking: async ({ locals, request }) => {
		requireRole(locals, 'settings');
		const values = strings(await request.formData());
		const parsed = bookingSchema.safeParse(values);
		if (!parsed.success) {
			return fail(400, {
				form: 'booking' as const,
				message: 'Controleer de gemarkeerde velden.',
				errors: z.flattenError(parsed.error).fieldErrors as Record<string, string[] | undefined>,
				values
			});
		}
		await saveSetting('booking', parsed.data);
		return { form: 'booking' as const, message: 'Boekingsinstellingen opgeslagen.' };
	}
};
