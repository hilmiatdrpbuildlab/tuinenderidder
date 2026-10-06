import { fail, redirect } from '@sveltejs/kit';
import { releaseHold } from '$lib/server/availability';
import { getBookableServices, getDraft, guardStep, saveDraft, stepPath } from '$lib/server/booking-draft';
import { BOOKING_TYPES, type BookingType } from '$lib/domain';
import { translator } from '$lib/i18n';
import type { Actions, PageServerLoad } from './$types';

function isType(v: unknown): v is BookingType {
	return typeof v === 'string' && (BOOKING_TYPES as readonly string[]).includes(v);
}

export const load: PageServerLoad = async ({ cookies, locals, url }) => {
	const draft = await guardStep(cookies, 'dienst', locals.locale);
	const services = await getBookableServices(locals.locale);

	// Deep links: ?dienst=<slug> preselects a service, ?type=quote|maintenance|consultation a type.
	const slug = url.searchParams.get('dienst') ?? url.searchParams.get('service');
	const linked = slug ? services.find((s) => s.slug === slug)?.id : undefined;
	const qType = url.searchParams.get('type');
	const selectedServices = [...new Set([...(draft.data.serviceIds ?? []), ...(linked ? [linked] : [])])];
	const type: BookingType = isType(qType) ? qType : (draft.data.type ?? 'consultation');

	return { step: 'dienst' as const, services, values: { type, serviceIds: selectedServices } };
};

export const actions: Actions = {
	default: async ({ request, cookies, locals }) => {
		const t = translator(locals.locale);
		const form = await request.formData();
		const type = form.get('type');
		const services = await getBookableServices(locals.locale);
		const valid = new Set(services.map((s) => s.id));
		const serviceIds = [...new Set(form.getAll('services').map(Number))].filter((id) => valid.has(id));

		const errors: { type?: string[]; services?: string[] } = {};
		if (!isType(type)) errors.type = [t('booking.dienst.errorType')];
		if (serviceIds.length === 0) errors.services = [t('booking.dienst.errorServices')];
		if (errors.type || errors.services) {
			return fail(400, { values: { type: isType(type) ? type : null, serviceIds }, errors });
		}

		const previous = await getDraft(cookies);
		const typeChanged = previous?.data.type && previous.data.type !== type;
		if (typeChanged && previous) await releaseHold(previous.id);
		await saveDraft(cookies, {
			type: type as BookingType,
			serviceIds,
			...(typeChanged ? { slotId: null } : {}),
			...(type !== 'maintenance' ? { frequency: 'once' as const } : {})
		});
		redirect(303, stepPath('details', locals.locale));
	}
};
