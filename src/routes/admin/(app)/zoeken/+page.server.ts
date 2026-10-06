import { can, requireRole } from '$lib/server/permissions';
import {
	searchBookings,
	searchCustomers,
	searchMessages,
	searchProjects,
	searchServices
} from '$lib/server/admin/search';
import type { PageServerLoad } from './$types';

const MIN_QUERY = 2;

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = requireRole(locals, 'dashboard');
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
	const access = {
		bookings: can(user.role, 'bookings'),
		messages: can(user.role, 'messages'),
		content: can(user.role, 'content')
	};
	const base = { title: 'Zoeken', q, access, minQuery: MIN_QUERY };
	if (q.length < MIN_QUERY) {
		return { ...base, searched: false, bookings: [], customers: [], messages: [], services: [], projects: [] };
	}
	const none = Promise.resolve([] as never[]);
	const [bookings, customers, messages, services, projects] = await Promise.all([
		access.bookings ? searchBookings(q) : none,
		access.bookings ? searchCustomers(q) : none,
		access.messages ? searchMessages(q) : none,
		access.content ? searchServices(q) : none,
		access.content ? searchProjects(q) : none
	]);
	return { ...base, searched: true, bookings, customers, messages, services, projects };
};
