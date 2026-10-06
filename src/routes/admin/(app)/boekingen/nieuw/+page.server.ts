import { fail, redirect } from '@sveltejs/kit';
import { z } from 'zod';
import { requireRole } from '$lib/server/permissions';
import { createBooking } from '$lib/server/bookings';
import { sendBookingConfirmation } from '$lib/server/booking-emails';
import { assignableUsers, serviceTitles, slotOptions } from '$lib/server/admin/bookings';
import { BOOKING_TYPES, FREQUENCIES, GARDEN_SIZES, SLOT_KINDS_FOR_TYPE, SOURCES } from '$lib/domain';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'bookings');
	const [services, slots, assignees] = await Promise.all([serviceTitles(), slotOptions(), assignableUsers()]);
	return {
		title: 'Nieuwe boeking',
		crumbs: [{ href: '/admin/boekingen', label: 'Boekingen' }],
		services: services.map((s) => ({ id: s.id, title: s.title, icon: s.icon })),
		slots,
		assignees
	};
};

const schema = z
	.object({
		type: z.enum(BOOKING_TYPES, { error: 'Kies een type.' }),
		serviceIds: z.array(z.coerce.number().int().positive()).min(1, 'Kies minstens één dienst.'),
		frequency: z.enum(FREQUENCIES),
		gardenSize: z.union([z.enum(GARDEN_SIZES), z.literal('')]).transform((v) => v || null),
		slotId: z
			.string()
			.optional()
			.transform((v) => (v ? Number(v) : null)),
		force: z.boolean(),
		name: z.string().trim().min(2, 'Vul de naam van de klant in.').max(120),
		email: z.string().trim().toLowerCase().email('Vul een geldig e-mailadres in.'),
		phone: z.string().trim().min(6, 'Vul een telefoonnummer in.').max(30),
		street: z.string().trim().max(160),
		postcode: z.union([z.string().trim().regex(/^\d{4}$/, 'Een Belgische postcode heeft 4 cijfers.'), z.literal('')]),
		municipality: z.string().trim().max(120),
		notesCustomer: z.string().trim().max(2000),
		notesInternal: z.string().trim().max(5000),
		source: z.enum(SOURCES),
		confirm: z.boolean(),
		assignedTo: z
			.string()
			.optional()
			.transform((v) => (v && Number(v) > 0 ? Number(v) : null)),
		sendEmail: z.boolean(),
		locale: z.enum(['nl', 'en'])
	})
	.superRefine((v, ctx) => {
		if (v.type !== 'quote' && !v.slotId) ctx.addIssue({ code: 'custom', path: ['slotId'], message: 'Kies een dag en slot.' });
	});

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const user = requireRole(locals, 'bookings');
		const fd = await request.formData();
		const str = (k: string) => String(fd.get(k) ?? '');
		const values = {
			type: str('type'),
			serviceIds: fd.getAll('serviceIds').map(String),
			frequency: str('frequency') || 'once',
			gardenSize: str('gardenSize'),
			slotId: str('slotId'),
			force: fd.get('force') === 'on',
			name: str('name'),
			email: str('email'),
			phone: str('phone'),
			street: str('street'),
			postcode: str('postcode'),
			municipality: str('municipality'),
			notesCustomer: str('notesCustomer'),
			notesInternal: str('notesInternal'),
			source: str('source') || 'phone',
			confirm: fd.get('confirm') === 'on',
			assignedTo: str('assignedTo'),
			sendEmail: fd.get('sendEmail') === 'on',
			locale: str('locale') || 'nl'
		};
		const parsed = schema.safeParse(values);
		if (!parsed.success) {
			return fail(400, { values, errors: z.flattenError(parsed.error).fieldErrors, message: 'Controleer de gemarkeerde velden.' });
		}
		const d = parsed.data;
		const slotId = d.type === 'quote' && !d.slotId ? null : d.slotId;
		if (slotId) {
			const kinds = SLOT_KINDS_FOR_TYPE[d.type];
			const options = await slotOptions(kinds.length ? kinds : undefined, '2000-01-01');
			if (!options.some((s) => s.id === slotId))
				return fail(400, { values, errors: { slotId: ['Dit slot past niet bij het gekozen type.'] }, message: 'Controleer de gemarkeerde velden.' });
		}

		const res = await createBooking({
			type: d.type,
			serviceIds: d.serviceIds,
			frequency: d.frequency,
			gardenSize: d.gardenSize,
			slotId,
			customer: {
				name: d.name,
				email: d.email,
				phone: d.phone,
				street: d.street,
				postcode: d.postcode,
				municipality: d.municipality
			},
			notesCustomer: d.notesCustomer,
			notesInternal: d.notesInternal,
			source: d.source,
			locale: d.locale,
			actorId: user.id,
			status: d.confirm && slotId ? 'scheduled' : 'new',
			assignedTo: d.assignedTo,
			force: d.force
		});
		if (!res.ok) {
			const message =
				res.reason === 'slot_full'
					? 'Dit slot is intussen volzet of gesloten. Kies een ander slot of vink “Overboeken” aan.'
					: 'Dit slot bestaat niet meer.';
			return fail(409, { values, errors: { slotId: [message] }, message });
		}
		if (d.sendEmail) {
			try {
				await sendBookingConfirmation(res.id);
			} catch (e) {
				console.error('sendBookingConfirmation failed', e);
			}
		}
		redirect(303, `/admin/boekingen?open=${res.id}`);
	}
};
