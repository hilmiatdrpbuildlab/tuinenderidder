import { requireRole } from '$lib/server/permissions';
import { quoteBoard } from '$lib/server/admin/bookings';
import { statusAction } from '$lib/server/admin/booking-actions';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'requests');
	const rows = await quoteBoard();
	return {
		title: 'Aanvragen & offertes',
		cards: rows.map((r) => ({
			id: r.id,
			reference: r.reference,
			status: r.status,
			customer: r.customer.name,
			town: r.customer.town,
			services: r.services.map((s) => s.title),
			createdAt: r.createdAt,
			slotDate: r.slot?.date ?? null,
			assignee: r.assignee?.name ?? null
		}))
	};
};

export const actions: Actions = {
	status: (event) => statusAction(event, 'requests')
};
