import { error, redirect } from '@sveltejs/kit';
import { localizePath } from '$lib/i18n';
import type { PageServerLoad } from './$types';

/** 301s from the old site's URLs (canonical Dutch paths; the locale prefix is kept). */
const LEGACY: Record<string, string> = {
	'index.html': '/',
	'index.php': '/',
	home: '/',
	'diensten.html': '/diensten',
	'aanleg.html': '/diensten/aanleg',
	'onderhoud.html': '/diensten/onderhoud',
	'snoeiwerken.html': '/diensten/snoeiwerken',
	'bomen.html': '/diensten/bomen-snoeien-vellen',
	'gazon.html': '/diensten/gazon',
	aanleg: '/diensten/aanleg',
	onderhoud: '/diensten/onderhoud',
	snoeiwerken: '/diensten/snoeiwerken',
	gazon: '/diensten/gazon',
	'realisaties.html': '/realisaties',
	portfolio: '/realisaties',
	'over-ons.html': '/over-ons',
	'contact.html': '/contact',
	'privacy.html': '/privacy',
	afspraak: '/boeken/dienst',
	boeken: '/boeken/dienst'
};

export const load: PageServerLoad = async ({ params, locals, url }) => {
	const key = params.legacy.replace(/\/+$/, '').toLowerCase();
	const target = LEGACY[key];
	if (target) redirect(301, localizePath(target, locals.locale) + url.search);
	error(404, 'Not found');
};
