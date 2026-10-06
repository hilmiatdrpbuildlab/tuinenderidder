import { localizePath } from '$lib/i18n';
import { siteOrigin } from '$lib/components/marketing/seo';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ url }) => {
	const origin = siteOrigin(url.origin);
	const body = [
		'User-agent: *',
		'Allow: /',
		'Disallow: /admin',
		'Disallow: /api/',
		`Disallow: ${localizePath('/boeken/bedankt', 'nl')}`,
		`Disallow: ${localizePath('/boeken/bedankt', 'en')}`,
		'',
		`Sitemap: ${origin}/sitemap.xml`,
		''
	].join('\n');
	return new Response(body, {
		headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600' }
	});
};
