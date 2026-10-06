import { can, requireRole } from '$lib/server/permissions';
import { todayISO } from '$lib/server/availability';
import { bookingKpis, latestBookings, scheduleForDay } from '$lib/server/admin/bookings';
import { contentStats, unreadMessages } from '$lib/server/admin/dashboard';
import { statusAction } from '$lib/server/admin/booking-actions';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const user = requireRole(locals, 'dashboard');
	const today = todayISO();
	const ops = can(user.role, 'bookings');
	const content = can(user.role, 'content');

	const [kpis, schedule, latest, messages, stats] = await Promise.all([
		ops ? bookingKpis() : null,
		ops ? scheduleForDay(today) : [],
		ops ? latestBookings(8) : [],
		ops ? unreadMessages(3) : [],
		content ? contentStats() : null
	]);

	return {
		title: 'Dashboard',
		today,
		firstName: user.name.split(' ')[0],
		ops,
		kpis,
		schedule,
		latest,
		messages: messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })),
		stats
	};
};

export const actions: Actions = {
	status: (event) => statusAction(event, 'bookings')
};
