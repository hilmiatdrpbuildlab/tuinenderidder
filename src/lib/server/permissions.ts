import { error, redirect } from '@sveltejs/kit';
import type { Role } from './db/schema';
import type { SessionUser } from './auth';

/**
 * CMS areas and which roles may use them.
 *  - admin:   everything
 *  - planner: bookings, calendar, requests, availability, messages, emails
 *  - editor:  content (services, projects, testimonials, pages) and media
 */
export type Area =
	| 'dashboard'
	| 'bookings'
	| 'calendar'
	| 'requests'
	| 'availability'
	| 'content'
	| 'media'
	| 'messages'
	| 'emails'
	| 'users'
	| 'settings';

const matrix: Record<Area, Role[]> = {
	dashboard: ['admin', 'planner', 'editor'],
	bookings: ['admin', 'planner'],
	calendar: ['admin', 'planner'],
	requests: ['admin', 'planner'],
	availability: ['admin', 'planner'],
	messages: ['admin', 'planner'],
	emails: ['admin', 'planner'],
	content: ['admin', 'editor'],
	media: ['admin', 'editor'],
	users: ['admin'],
	settings: ['admin']
};

export function can(role: Role | undefined, area: Area) {
	return !!role && matrix[area].includes(role);
}

/** Call at the top of every admin load and action: `const user = requireRole(locals, 'bookings')`. */
export function requireRole(locals: App.Locals, area: Area): SessionUser {
	if (!locals.user) redirect(303, '/admin/login');
	if (!can(locals.user.role, area)) error(403, 'Je hebt geen toegang tot dit onderdeel.');
	return locals.user;
}
