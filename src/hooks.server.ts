import type { Handle, HandleServerError, ServerInit } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { ensureDatabase } from '$lib/server/db';
import { validateSession } from '$lib/server/auth';
import { delocalizePath, intlLocale } from '$lib/i18n';

export const init: ServerInit = async () => {
	await ensureDatabase();
};

export const handle: Handle = async ({ event, resolve }) => {
	await ensureDatabase();

	const { pathname } = event.url;
	const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');
	const isApi = pathname.startsWith('/api/');

	event.locals.locale = isAdmin ? 'nl' : delocalizePath(pathname).locale;
	event.locals.user = isAdmin || isApi ? await validateSession(event.cookies) : null;

	// Remember the visitor's language choice (never forced by IP).
	if (!isAdmin && !isApi && event.request.method === 'GET' && event.cookies.get('tdr_lang') !== event.locals.locale) {
		event.cookies.set('tdr_lang', event.locals.locale, {
			path: '/',
			sameSite: 'lax',
			httpOnly: false,
			secure: !dev,
			maxAge: 60 * 60 * 24 * 365
		});
	}

	const response = await resolve(event, {
		transformPageChunk: ({ html }) => html.replace('%lang%', intlLocale[event.locals.locale])
	});

	response.headers.set('x-frame-options', 'DENY');
	response.headers.set('x-content-type-options', 'nosniff');
	response.headers.set('referrer-policy', 'strict-origin-when-cross-origin');
	response.headers.set('permissions-policy', 'camera=(), microphone=(), geolocation=(), interest-cohort=()');
	if (!dev) response.headers.set('strict-transport-security', 'max-age=63072000; includeSubDomains; preload');
	if (isAdmin) response.headers.set('x-robots-tag', 'noindex, nofollow');

	return response;
};

export const handleError: HandleServerError = ({ error, status }) => {
	if (status !== 404) console.error(error);
	return { message: status === 404 ? 'Not found' : 'Internal error' };
};
