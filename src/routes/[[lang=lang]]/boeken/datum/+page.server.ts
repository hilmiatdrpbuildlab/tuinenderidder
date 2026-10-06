import { fail, redirect } from '@sveltejs/kit';
import { addDays, getAvailability, holdSlot, todayISO, type SlotAvailability } from '$lib/server/availability';
import { getOrCreateDraft, getSlot, guardStep, saveDraft, stepPath } from '$lib/server/booking-draft';
import { getBookingSettings } from '$lib/server/settings';
import { SLOT_KINDS_FOR_TYPE } from '$lib/domain';
import { translator } from '$lib/i18n';
import { addMonths, isISODate, isMonth } from '$lib/components/booking/dates';
import type { Actions, PageServerLoad } from './$types';

async function bookableWindow(type: keyof typeof SLOT_KINDS_FOR_TYPE, draftId: string) {
	const settings = await getBookingSettings();
	const today = todayISO();
	const earliest = addDays(today, settings.leadTimeDays);
	const last = addDays(today, settings.horizonWeeks * 7);
	const all = await getAvailability({
		from: `${earliest.slice(0, 7)}-01`,
		to: last,
		kinds: SLOT_KINDS_FOR_TYPE[type],
		draftId: draftId || undefined
	});
	return { settings, today, earliest, last, all };
}

export const load: PageServerLoad = async ({ cookies, locals, url }) => {
	const draft = await guardStep(cookies, 'datum', locals.locale);
	const type = draft.data.type ?? 'consultation';
	const { settings, today, earliest, last, all } = await bookableWindow(type, draft.id);
	const minMonth = earliest.slice(0, 7);
	const maxMonth = last.slice(0, 7);
	const ownSlot = await getSlot(draft.data.slotId);

	const freeByDate = new Map<string, number>();
	for (const s of all) freeByDate.set(s.date, (freeByDate.get(s.date) ?? 0) + s.remaining);
	const firstFreeDate = [...freeByDate.entries()].find(([, n]) => n > 0)?.[0] ?? null;

	// Month: ?maand= → the month of the chosen slot → first month with room → earliest month.
	const qMonth = url.searchParams.get('maand');
	let month =
		isMonth(qMonth) && qMonth >= minMonth && qMonth <= maxMonth
			? qMonth
			: ownSlot && ownSlot.date >= earliest
				? ownSlot.date.slice(0, 7)
				: (firstFreeDate?.slice(0, 7) ?? minMonth);
	if (month < minMonth) month = minMonth;

	const days: Record<string, number> = {};
	for (const [date, n] of freeByDate) if (date.startsWith(month)) days[date] = n;

	// Day: ?dag= → chosen slot's day → first day with room in this month.
	const qDay = url.searchParams.get('dag');
	const firstInMonth = Object.keys(days).sort().find((d) => days[d] > 0) ?? null;
	const selectedDate =
		isISODate(qDay) && qDay.startsWith(month) && (days[qDay] ?? 0) > 0
			? qDay
			: ownSlot && ownSlot.date.startsWith(month) && (days[ownSlot.date] ?? 0) > 0
				? ownSlot.date
				: firstInMonth;

	const slots: SlotAvailability[] = selectedDate ? all.filter((s) => s.date === selectedDate) : [];
	const nextWithRoom = [...freeByDate.entries()].find(([d, n]) => n > 0 && d.slice(0, 7) > month)?.[0] ?? null;

	return {
		step: 'datum' as const,
		month,
		minMonth,
		maxMonth,
		today,
		days,
		selectedDate,
		slots: slots.map((s) => ({ id: s.id, slotKind: s.slotKind, start: s.start, end: s.end, remaining: s.remaining })),
		selectedSlotId: draft.data.slotId ?? null,
		nextMonth: nextWithRoom ? nextWithRoom.slice(0, 7) : month < maxMonth ? addMonths(month, 1) : null,
		holdMinutes: settings.holdMinutes
	};
};

export const actions: Actions = {
	default: async ({ request, cookies, locals }) => {
		const t = translator(locals.locale);
		const form = await request.formData();
		const slotId = Number(form.get('slotId'));
		const draft = await getOrCreateDraft(cookies);
		const type = draft.data.type;
		if (!type || type === 'quote') redirect(303, stepPath('dienst', locals.locale));

		if (!Number.isInteger(slotId) || slotId <= 0) {
			return fail(400, { errors: { slotId: [t('booking.datum.errorSlot')] } });
		}
		// The slot must be one this booking type may use, inside the bookable window.
		const { all } = await bookableWindow(type, draft.id);
		const slot = all.find((s) => s.id === slotId);
		if (!slot || slot.remaining <= 0) {
			return fail(409, { full: true, errors: { slotId: [t('booking.datum.errorFull')] } });
		}
		const held = await holdSlot(slotId, draft.id);
		if (!held) {
			return fail(409, { full: true, errors: { slotId: [t('booking.datum.errorFull')] } });
		}
		await saveDraft(cookies, { slotId });
		redirect(303, stepPath('bevestigen', locals.locale));
	}
};
