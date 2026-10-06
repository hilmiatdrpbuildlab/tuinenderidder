import {
	getBookableServices,
	getDraft,
	getSlot,
	isStepComplete,
	stepPath,
	stepsFor,
	type StepKey
} from '$lib/server/booking-draft';
import { getBookingSettings } from '$lib/server/settings';
import { delocalizePath, translator } from '$lib/i18n';
import type { BookingSummaryData, StepItem } from '$lib/components/booking/types';
import type { LayoutServerLoad } from './$types';

/** Wizard chrome: stepper state + order summary, derived from the server-side draft. */
export const load: LayoutServerLoad = async ({ cookies, locals, url }) => {
	const locale = locals.locale;
	const t = translator(locale);
	const [draft, services, settings] = await Promise.all([getDraft(cookies), getBookableServices(locale), getBookingSettings()]);
	const data = draft?.data ?? {};
	const slot = data.type && data.type !== 'quote' ? await getSlot(data.slotId) : null;

	const current = delocalizePath(url.pathname).path.split('/')[2] as StepKey | 'bedankt' | undefined;
	const keys = stepsFor(data);
	let reachable = true;
	const steps: StepItem[] = keys.map((key) => {
		const item: StepItem = {
			key,
			label: t(`booking.step.${key}`),
			href: stepPath(key, locale),
			state: key === current ? 'current' : isStepComplete(key, data) ? 'complete' : 'upcoming',
			reachable
		};
		if (!isStepComplete(key, data)) reachable = false;
		return item;
	});

	const byId = new Map(services.map((s) => [s.id, s]));
	const summary: BookingSummaryData = {
		type: data.type ?? null,
		services: (data.serviceIds ?? [])
			.map((id) => byId.get(id))
			.filter((s): s is NonNullable<typeof s> => !!s)
			.map((s) => ({ id: s.id, title: s.title, icon: s.icon, priceFrom: s.priceFrom, priceMode: s.priceMode })),
		frequency: data.frequency ?? null,
		gardenSize: data.gardenSize ?? null,
		slot: slot ? { date: slot.date, slotKind: slot.slotKind, start: slot.start, end: slot.end } : null,
		address:
			data.street && data.postcode
				? { street: data.street, postcode: data.postcode, municipality: data.municipality ?? '' }
				: null,
		photoCount: data.photoIds?.length ?? 0,
		vatNote: locale === 'en' ? settings.vatNoteEn : settings.vatNoteNl,
		links: {
			dienst: stepPath('dienst', locale),
			details: stepPath('details', locale),
			datum: data.type === 'quote' ? null : stepPath('datum', locale)
		}
	};

	return {
		steps,
		summary,
		currentStep: current ?? null,
		holdMinutes: settings.holdMinutes,
		catalog: services.map((s) => ({ id: s.id, title: s.title, icon: s.icon, priceFrom: s.priceFrom, priceMode: s.priceMode }))
	};
};
