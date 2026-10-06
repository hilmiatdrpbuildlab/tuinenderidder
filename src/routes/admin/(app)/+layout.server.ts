import { redirect } from '@sveltejs/kit';
import { eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { bookings, contactMessages } from '$lib/server/db/schema';
import { can, type Area } from '$lib/server/permissions';
import type { LayoutServerLoad } from './$types';

const ALL_AREAS: Area[] = ['dashboard', 'bookings', 'calendar', 'requests', 'availability', 'content', 'media', 'messages', 'emails', 'users', 'settings'];

/** Route guard for every CMS page. Pages still call requireRole() for their own area. */
export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.user) redirect(303, `/admin/login?next=${encodeURIComponent(url.pathname + url.search)}`);
	const user = locals.user;
	const areas = ALL_AREAS.filter((a) => can(user.role, a));

	const counts: Record<string, number> = {};
	if (can(user.role, 'bookings')) {
		const [row] = await db
			.select({
				newBookings: sql<number>`count(*) filter (where ${bookings.type} <> 'quote')::int`,
				newQuotes: sql<number>`count(*) filter (where ${bookings.type} = 'quote')::int`
			})
			.from(bookings)
			.where(eq(bookings.status, 'new'));
		counts.newBookings = Number(row.newBookings);
		counts.newQuotes = Number(row.newQuotes);
		const [m] = await db
			.select({ n: sql<number>`count(*)::int` })
			.from(contactMessages)
			.where(eq(contactMessages.isRead, false));
		counts.unreadMessages = Number(m.n);
	}

	return { user, areas, counts };
};
