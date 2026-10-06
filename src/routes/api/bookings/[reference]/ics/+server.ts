import { error } from '@sveltejs/kit';
import { timingSafeEqual } from 'node:crypto';
import { findBookingByReference } from '$lib/server/bookings';
import { buildIcs, icsToken } from '$lib/server/booking-emails';
import type { RequestHandler } from './$types';

/** Public .ics download for a booking, authorised by the HMAC token from the confirmation email. */
export const GET: RequestHandler = async ({ params, url }) => {
	const reference = params.reference.toUpperCase();
	if (!/^TDR-\d{4}-\d{4,}$/.test(reference)) error(404, 'Not found');
	const given = Buffer.from(url.searchParams.get('token') ?? '');
	const expected = Buffer.from(icsToken(reference));
	if (given.length !== expected.length || !timingSafeEqual(given, expected)) error(404, 'Not found');

	const id = await findBookingByReference(reference);
	const ics = id ? await buildIcs(id) : null;
	if (!ics) error(404, 'Not found');

	return new Response(ics, {
		headers: {
			'content-type': 'text/calendar; charset=utf-8',
			'content-disposition': `attachment; filename="${reference.toLowerCase()}.ics"`,
			'cache-control': 'private, no-store',
			'x-robots-tag': 'noindex'
		}
	});
};
