import { requireRole } from '$lib/server/permissions';
import { listBookings, parseBookingFilters } from '$lib/server/admin/bookings';
import { todayISO } from '$lib/server/availability';
import { FREQUENCY_LABELS, SLOT_LABELS, SOURCE_LABELS, STATUS_META, TYPE_LABELS } from '$lib/domain';
import type { RequestHandler } from './$types';

/** CSV export of the bookings list, honouring the same filters/sort as the table (and ?ids= for a selection). */
export const GET: RequestHandler = async ({ locals, url }) => {
	requireRole(locals, 'bookings');
	const filters = parseBookingFilters(url);
	const { rows } = await listBookings(filters, { all: true });

	const header = [
		'Referentie',
		'Status',
		'Type',
		'Diensten',
		'Datum',
		'Slot',
		'Van',
		'Tot',
		'Klant',
		'E-mail',
		'Telefoon',
		'Straat',
		'Postcode',
		'Gemeente',
		'Frequentie',
		'Bron',
		'Toegewezen aan',
		'Aangemaakt'
	];
	const lines = rows.map((r) => [
		r.reference,
		STATUS_META[r.status].nl,
		TYPE_LABELS[r.type].nl,
		r.services.map((s) => s.title).join(', '),
		r.slot?.date ?? '',
		r.slot ? SLOT_LABELS[r.slot.kind].nl : '',
		r.slot?.start ?? '',
		r.slot?.end ?? '',
		r.customer.name,
		r.customer.email,
		r.customer.phone,
		r.customer.street,
		r.customer.postcode,
		r.customer.town,
		FREQUENCY_LABELS[r.frequency].nl,
		SOURCE_LABELS[r.source],
		r.assignee?.name ?? '',
		r.createdAt.slice(0, 16).replace('T', ' ')
	]);

	// Semicolons + BOM: opens correctly in Excel with Belgian/Dutch regional settings.
	const esc = (v: string) => {
		const safe = /^[=+\-@\t\r]/.test(v) ? `'${v}` : v; // neutralise spreadsheet formulas
		return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
	};
	const csv = '﻿' + [header, ...lines].map((l) => l.map((v) => esc(String(v))).join(';')).join('\r\n');

	return new Response(csv, {
		headers: {
			'content-type': 'text/csv; charset=utf-8',
			'content-disposition': `attachment; filename="boekingen-${todayISO()}.csv"`,
			'cache-control': 'no-store'
		}
	});
};
