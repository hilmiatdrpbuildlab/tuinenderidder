import { error } from '@sveltejs/kit';
import { can, type Area } from '$lib/server/permissions';
import type { SessionUser } from '$lib/server/auth';

/**
 * Guard for CMS JSON endpoints: JSON-friendly 401/403 instead of a login redirect, plus a
 * same-origin check on state-changing requests (SvelteKit's CSRF check only covers form posts).
 */
export function requireApiRole(event: { locals: App.Locals; request: Request; url: URL }, area: Area): SessionUser {
	const { locals, request, url } = event;
	if (!locals.user) error(401, 'Niet aangemeld.');
	if (!can(locals.user.role, area)) error(403, 'Je hebt geen toegang tot dit onderdeel.');
	if (request.method !== 'GET' && request.method !== 'HEAD') {
		const origin = request.headers.get('origin');
		if (origin && origin !== url.origin) error(403, 'Ongeldige herkomst.');
	}
	return locals.user;
}

export async function readJson(request: Request): Promise<unknown> {
	try {
		return await request.json();
	} catch {
		error(400, 'Ongeldige JSON.');
	}
}
