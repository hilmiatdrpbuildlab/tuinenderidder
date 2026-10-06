import { fail } from '@sveltejs/kit';
import { z } from 'zod';
import { can, requireRole } from '$lib/server/permissions';
import { addDays, todayISO } from '$lib/server/availability';
import { getBookingSettings } from '$lib/server/settings';
import {
	WEEKDAYS,
	addBlackoutRange,
	addRule,
	closeSlotsOn,
	deleteBlackout,
	getSlot,
	isBlackoutDate,
	listRules,
	removeRule,
	rulesForWeekday,
	setSlotClosed,
	syncAndDescribe,
	upcomingBlackouts,
	upcomingClosedSlots,
	updateRules
} from '$lib/server/admin/availability';
import { SLOT_KINDS, SLOT_LABELS } from '$lib/domain';
import { formatLongDate } from '$lib/i18n';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireRole(locals, 'availability');
	const [rules, blackouts, closedSlots, booking] = await Promise.all([
		listRules(),
		upcomingBlackouts(),
		upcomingClosedSlots(),
		getBookingSettings()
	]);
	return {
		title: 'Beschikbaarheid',
		weekdays: WEEKDAYS.map((w) => ({ ...w, rules: rules.filter((r) => r.weekday === w.value) })),
		blackouts,
		closedSlots,
		booking: {
			leadTimeDays: booking.leadTimeDays,
			horizonWeeks: booking.horizonWeeks,
			holdMinutes: booking.holdMinutes,
			horizonUntil: addDays(todayISO(), booking.horizonWeeks * 7)
		},
		today: todayISO(),
		canEditSettings: can(user.role, 'settings')
	};
};

/* ---------------------------------------------------------------- schemas */

const time = z
	.string()
	.trim()
	.regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, 'Gebruik het formaat UU:MM.')
	.transform((v) => v.slice(0, 5));
const capacity = z.coerce
	.number({ error: 'Vul een getal in.' })
	.int('Vul een geheel getal in.')
	.min(1, 'Minimaal 1.')
	.max(20, 'Maximaal 20.');
const weekday = z.coerce.number().int().min(1).max(7);
const id = z.coerce.number().int().positive();
const isoDate = z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Kies een geldige datum.');

const ruleSchema = z
	.object({ start: time, end: time, capacity })
	.refine((r) => r.start < r.end, { path: ['end'], message: 'Het einde moet na het begin liggen.' });

const addRuleSchema = z
	.object({ weekday, slotKind: z.enum(SLOT_KINDS, 'Kies een soort.'), start: time, end: time, capacity })
	.refine((r) => r.start < r.end, { path: ['end'], message: 'Het einde moet na het begin liggen.' });

const blackoutSchema = z
	.object({
		from: isoDate,
		to: z.union([isoDate, z.literal('')]).optional(),
		reason: z.string().trim().max(120, 'Maximaal 120 tekens.').default('')
	})
	.transform((v) => ({ ...v, to: v.to || v.from }))
	.refine((v) => v.to >= v.from, { path: ['to'], message: 'De einddatum moet op of na de begindatum liggen.' })
	.refine((v) => addDays(v.from, 366) >= v.to, { path: ['to'], message: 'Kies maximaal één jaar per keer.' });

const closeSchema = z.object({
	date: isoDate,
	slotKind: z.union([z.enum(SLOT_KINDS), z.literal('')]).default('')
});

const dayName = (wd: number) => WEEKDAYS.find((w) => w.value === wd)?.label.toLowerCase() ?? '';
const strings = (fd: FormData) =>
	Object.fromEntries([...fd.entries()].filter(([, v]) => typeof v === 'string')) as Record<string, string>;

/* ---------------------------------------------------------------- actions */

export const actions: Actions = {
	/** Save all rules of one weekday (start, end, capacity, active). */
	saveDay: async ({ locals, request }) => {
		requireRole(locals, 'availability');
		const fd = await request.formData();
		const values = strings(fd);
		const wd = weekday.safeParse(fd.get('weekday'));
		if (!wd.success) return fail(400, { message: 'Ongeldige weekdag.' });
		const form = `day-${wd.data}`;
		const existing = await rulesForWeekday(wd.data);

		const errors: Record<string, string> = {};
		const rows: { id: number; start: string; end: string; capacity: number; isActive: boolean }[] = [];
		for (const rule of existing) {
			const parsed = ruleSchema.safeParse({
				start: fd.get(`start-${rule.id}`) ?? '',
				end: fd.get(`end-${rule.id}`) ?? '',
				capacity: fd.get(`capacity-${rule.id}`) ?? ''
			});
			if (!parsed.success) {
				for (const issue of parsed.error.issues) errors[`${String(issue.path[0])}-${rule.id}`] ??= issue.message;
				continue;
			}
			rows.push({ id: rule.id, ...parsed.data, isActive: fd.get(`active-${rule.id}`) === 'on' });
		}
		// Two rules of the same kind may not start at the same time on one day.
		const seen = new Map<string, number>();
		for (const r of rows) {
			const kind = existing.find((e) => e.id === r.id)!.slotKind;
			const key = `${kind}|${r.start}`;
			if (seen.has(key)) errors[`start-${r.id}`] ??= `Er is al een ${SLOT_LABELS[kind].nl.toLowerCase()} om ${r.start}.`;
			seen.set(key, r.id);
		}
		if (Object.keys(errors).length > 0) {
			return fail(400, { form, message: 'Controleer de gemarkeerde velden.', errors, values });
		}
		await updateRules(rows);
		return { form, message: await syncAndDescribe(`${WEEKDAYS[wd.data - 1].label} opgeslagen`) };
	},

	addRule: async ({ locals, request }) => {
		requireRole(locals, 'availability');
		const values = strings(await request.formData());
		const wd = weekday.safeParse(values.weekday);
		const form = `add-${wd.success ? wd.data : 0}`;
		const parsed = addRuleSchema.safeParse(values);
		if (!parsed.success) {
			const errors: Record<string, string> = {};
			for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
			return fail(400, { form, message: 'Controleer de gemarkeerde velden.', errors, values });
		}
		const dup = (await rulesForWeekday(parsed.data.weekday)).some(
			(r) => r.slotKind === parsed.data.slotKind && r.start === parsed.data.start
		);
		if (dup) {
			return fail(400, {
				form,
				message: 'Dit dagdeel bestaat al op deze dag.',
				errors: { start: `Er is al een ${SLOT_LABELS[parsed.data.slotKind].nl.toLowerCase()} om ${parsed.data.start}.` },
				values
			});
		}
		await addRule(parsed.data);
		return {
			form,
			message: await syncAndDescribe(
				`${SLOT_LABELS[parsed.data.slotKind].nl} ${parsed.data.start} toegevoegd op ${dayName(parsed.data.weekday)}`
			)
		};
	},

	removeRule: async ({ locals, request }) => {
		requireRole(locals, 'availability');
		const parsed = id.safeParse((await request.formData()).get('ruleId'));
		if (!parsed.success) return fail(400, { message: 'Ongeldige regel.' });
		if (!(await removeRule(parsed.data))) return fail(404, { message: 'Regel niet gevonden.' });
		return { message: await syncAndDescribe('Dagdeel verwijderd') };
	},

	addBlackout: async ({ locals, request }) => {
		requireRole(locals, 'availability');
		const values = strings(await request.formData());
		const parsed = blackoutSchema.safeParse(values);
		if (!parsed.success) {
			const errors: Record<string, string> = {};
			for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
			return fail(400, { form: 'blackout', message: 'Controleer de gemarkeerde velden.', errors, values });
		}
		const { from, to, reason } = parsed.data;
		if (to < todayISO()) {
			return fail(400, {
				form: 'blackout',
				message: 'Deze periode ligt in het verleden.',
				errors: { from: 'Kies een datum vanaf vandaag.' },
				values
			});
		}
		const added = await addBlackoutRange(from, to, reason);
		const prefix =
			added === 0
				? 'Geen nieuwe sluitingsdagen (al ingesteld)'
				: added === 1
					? '1 sluitingsdag toegevoegd'
					: `${added} sluitingsdagen toegevoegd`;
		return { form: 'blackout', message: await syncAndDescribe(prefix) };
	},

	deleteBlackout: async ({ locals, request }) => {
		requireRole(locals, 'availability');
		const parsed = id.safeParse((await request.formData()).get('id'));
		if (!parsed.success) return fail(400, { message: 'Ongeldige sluitingsdag.' });
		const date = await deleteBlackout(parsed.data);
		if (!date) return fail(404, { message: 'Sluitingsdag niet gevonden.' });
		return { message: await syncAndDescribe(`Sluitingsdag ${formatLongDate(date, 'nl')} verwijderd`) };
	},

	reopen: async ({ locals, request }) => {
		requireRole(locals, 'availability');
		const parsed = id.safeParse((await request.formData()).get('slotId'));
		if (!parsed.success) return fail(400, { message: 'Ongeldig dagdeel.' });
		const slot = await getSlot(parsed.data);
		if (!slot) return fail(404, { message: 'Dagdeel niet gevonden.' });
		if (await isBlackoutDate(slot.date)) {
			return fail(400, { message: 'Dit is een sluitingsdag. Verwijder eerst de sluitingsdag om dit dagdeel te heropenen.' });
		}
		await setSlotClosed(slot.id, false);
		return { message: await syncAndDescribe('Dagdeel heropend') };
	},

	closeSlots: async ({ locals, request }) => {
		requireRole(locals, 'availability');
		const values = strings(await request.formData());
		const parsed = closeSchema.safeParse(values);
		if (!parsed.success) {
			const errors: Record<string, string> = {};
			for (const issue of parsed.error.issues) errors[String(issue.path[0])] ??= issue.message;
			return fail(400, { form: 'close', message: 'Controleer de gemarkeerde velden.', errors, values });
		}
		if (parsed.data.date < todayISO()) {
			return fail(400, { form: 'close', message: 'Kies een datum vanaf vandaag.', errors: { date: 'Kies een datum vanaf vandaag.' }, values });
		}
		const n = await closeSlotsOn(parsed.data.date, parsed.data.slotKind || null);
		if (n === 0) {
			return fail(400, {
				form: 'close',
				message: 'Geen open dagdelen gevonden op die dag.',
				errors: { date: 'Er zijn geen open dagdelen op deze dag.' },
				values
			});
		}
		return {
			form: 'close',
			message: await syncAndDescribe(n === 1 ? '1 dagdeel gesloten' : `${n} dagdelen gesloten`)
		};
	}
};
