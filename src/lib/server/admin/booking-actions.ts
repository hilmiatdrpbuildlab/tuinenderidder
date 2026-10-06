/**
 * Form-action handlers shared by Boekingen, Kalender, Aanvragen and the dashboard.
 * Each returns `{ message }` or `fail(4xx, { message })` and checks the caller's area itself.
 */
import { fail, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod';
import { requireRole, type Area } from '$lib/server/permissions';
import { BOOKING_STATUSES, SLOT_KINDS, STATUS_META, type BookingStatus } from '$lib/domain';
import {
	assignBookings,
	changeStatus,
	findTargetSlot,
	notifyStatus,
	rescheduleBooking,
	saveInternalNotes
} from './bookings';

const id = z.coerce.number().int().positive();
const on = (v: FormDataEntryValue | null) => v === 'on' || v === 'true' || v === '1';

async function form(event: RequestEvent) {
	return event.request.formData();
}

export async function statusAction(event: RequestEvent, area: Area = 'bookings') {
	const user = requireRole(event.locals, area);
	const fd = await form(event);
	const parsed = z
		.object({ id, status: z.enum(BOOKING_STATUSES), note: z.string().max(1000).default('') })
		.safeParse({ id: fd.get('id'), status: fd.get('status'), note: fd.get('note') ?? '' });
	if (!parsed.success) return fail(400, { message: 'Ongeldige statuswijziging.' });
	const res = await changeStatus(parsed.data.id, parsed.data.status, user.id, parsed.data.note);
	if (!res.ok) return fail(409, { message: res.message });
	// Without JS the checkbox is only sent when ticked; the hidden "notify_present" tells us it existed.
	const notify = fd.has('notify_present') ? on(fd.get('notify')) : true;
	let mailed = false;
	if (notify) mailed = await notifyStatus(parsed.data.id, parsed.data.status);
	return {
		message: `${res.reference} → ${STATUS_META[parsed.data.status].nl}${mailed ? ' · klant verwittigd' : ''}`
	};
}

export async function bulkStatusAction(event: RequestEvent) {
	const user = requireRole(event.locals, 'bookings');
	const fd = await form(event);
	const ids = [...new Set(fd.getAll('ids').map(Number).filter((n) => Number.isInteger(n) && n > 0))];
	const status = z.enum(BOOKING_STATUSES).safeParse(fd.get('status'));
	if (!ids.length) return fail(400, { message: 'Selecteer eerst één of meer boekingen.' });
	if (!status.success) return fail(400, { message: 'Kies een nieuwe status.' });
	const notify = on(fd.get('notify'));
	let ok = 0;
	const skipped: string[] = [];
	for (const bid of ids) {
		const r = await changeStatus(bid, status.data, user.id, 'Bulkactie');
		if (r.ok) {
			ok++;
			if (notify) await notifyStatus(bid, status.data);
		} else skipped.push(r.message.split(':')[0]);
	}
	const label = STATUS_META[status.data as BookingStatus].nl;
	if (!ok) return fail(409, { message: `Geen enkele boeking kon naar “${label}”.` });
	return {
		message: `${ok} ${ok === 1 ? 'boeking' : 'boekingen'} → ${label}${skipped.length ? ` · ${skipped.length} overgeslagen (${skipped.slice(0, 3).join(', ')}${skipped.length > 3 ? '…' : ''})` : ''}`
	};
}

export async function assignAction(event: RequestEvent, area: Area = 'bookings') {
	const user = requireRole(event.locals, area);
	const fd = await form(event);
	const ids = fd.getAll('ids').length ? fd.getAll('ids').map(Number) : [Number(fd.get('id'))];
	const valid = [...new Set(ids.filter((n) => Number.isInteger(n) && n > 0))];
	if (!valid.length) return fail(400, { message: 'Selecteer eerst één of meer boekingen.' });
	const raw = String(fd.get('assignee') ?? '');
	const assignee = raw === '' || raw === 'geen' ? null : Number(raw);
	if (assignee !== null && !(assignee > 0)) return fail(400, { message: 'Kies een medewerker.' });
	const n = await assignBookings(valid, assignee, user.id);
	if (!n) return fail(404, { message: 'Toewijzen mislukt.' });
	return { message: assignee ? `${n === 1 ? 'Boeking' : `${n} boekingen`} toegewezen` : 'Toewijzing verwijderd' };
}

export async function notesAction(event: RequestEvent) {
	const user = requireRole(event.locals, 'bookings');
	const fd = await form(event);
	const parsed = z
		.object({ id, notes: z.string().max(5000, 'Maximaal 5000 tekens.') })
		.safeParse({ id: fd.get('id'), notes: String(fd.get('notes') ?? '').trim() });
	if (!parsed.success) return fail(400, { message: parsed.error.issues[0]?.message ?? 'Ongeldige notitie.' });
	const ok = await saveInternalNotes(parsed.data.id, parsed.data.notes, user.id);
	if (!ok) return fail(404, { message: 'Boeking niet gevonden.' });
	return { message: 'Interne notitie opgeslagen' };
}

/** Reschedule to an explicit slot id (drawer). */
export async function rescheduleAction(event: RequestEvent, area: Area = 'bookings') {
	const user = requireRole(event.locals, area);
	const fd = await form(event);
	const parsed = z.object({ id, slotId: id }).safeParse({ id: fd.get('id'), slotId: fd.get('slotId') });
	if (!parsed.success) return fail(400, { message: 'Kies een nieuw slot.' });
	return finishReschedule(parsed.data.id, parsed.data.slotId, user.id, fd);
}

/** Reschedule to a date + slot kind (calendar drag & drop / "Verplaatsen" dialog). */
export async function moveAction(event: RequestEvent) {
	const user = requireRole(event.locals, 'calendar');
	const fd = await form(event);
	const parsed = z
		.object({ id, date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), kind: z.enum(SLOT_KINDS) })
		.safeParse({ id: fd.get('id'), date: fd.get('date'), kind: fd.get('kind') });
	if (!parsed.success) return fail(400, { message: 'Kies een datum en een slot.' });
	const slot = await findTargetSlot(parsed.data.date, parsed.data.kind);
	if (!slot) return fail(404, { message: 'Op die dag is er geen slot van dit type. Pas de beschikbaarheid aan of kies een andere dag.' });
	return finishReschedule(parsed.data.id, slot.id, user.id, fd);
}

async function finishReschedule(bookingId: number, slotId: number, actorId: number, fd: FormData) {
	const res = await rescheduleBooking(bookingId, slotId, {
		actorId,
		force: on(fd.get('force')),
		note: String(fd.get('note') ?? '')
	});
	if (!res.ok) return fail(409, { message: res.message });
	const notify = fd.has('notify_present') ? on(fd.get('notify')) : true;
	const mailed = notify ? await notifyStatus(bookingId, 'rescheduled') : false;
	return { message: `${res.reference} verplaatst naar ${res.label}${mailed ? ' · klant verwittigd' : ''}` };
}
