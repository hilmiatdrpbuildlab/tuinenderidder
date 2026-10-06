import { requireRole } from '$lib/server/permissions';
import {
	assignableUsers,
	getBookingDetail,
	kindsForType,
	listBookings,
	parseBookingFilters,
	serviceTitles,
	slotOptions
} from '$lib/server/admin/bookings';
import { assignAction, bulkStatusAction, notesAction, rescheduleAction, statusAction } from '$lib/server/admin/booking-actions';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	requireRole(locals, 'bookings');
	const filters = parseBookingFilters(url);
	const openId = Number(url.searchParams.get('open'));

	const [list, services, assignees, detail] = await Promise.all([
		listBookings(filters),
		serviceTitles(),
		assignableUsers(),
		Number.isInteger(openId) && openId > 0 ? getBookingDetail(openId) : Promise.resolve(null)
	]);
	const slots = detail ? await slotOptions(kindsForType(detail.type)) : [];

	return {
		title: 'Boekingen',
		filters,
		...list,
		services: services.map((s) => ({ id: s.id, title: s.title, icon: s.icon })),
		assignees,
		detail,
		detailMissing: openId > 0 && !detail,
		slots
	};
};

export const actions: Actions = {
	status: (event) => statusAction(event),
	assign: (event) => assignAction(event),
	notes: (event) => notesAction(event),
	reschedule: (event) => rescheduleAction(event),
	bulkStatus: (event) => bulkStatusAction(event),
	bulkAssign: (event) => assignAction(event)
};
