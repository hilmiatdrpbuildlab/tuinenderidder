import { asc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { projects, services } from '$lib/server/db/schema';
import { localizePath, locales } from '$lib/i18n';
import { absoluteUrl, siteOrigin } from '$lib/components/marketing/seo';
import type { RequestHandler } from './$types';

type Entry = { path: string; lastmod?: Date; priority: number; changefreq: 'weekly' | 'monthly' | 'yearly' };

const STATIC: Entry[] = [
	{ path: '/', priority: 1, changefreq: 'weekly' },
	{ path: '/diensten', priority: 0.9, changefreq: 'monthly' },
	{ path: '/realisaties', priority: 0.8, changefreq: 'weekly' },
	{ path: '/over-ons', priority: 0.6, changefreq: 'yearly' },
	{ path: '/contact', priority: 0.7, changefreq: 'yearly' },
	{ path: '/boeken/dienst', priority: 0.8, changefreq: 'monthly' },
	{ path: '/privacy', priority: 0.2, changefreq: 'yearly' },
	{ path: '/cookies', priority: 0.2, changefreq: 'yearly' },
	{ path: '/algemene-voorwaarden', priority: 0.2, changefreq: 'yearly' }
];

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const GET: RequestHandler = async ({ url }) => {
	const origin = siteOrigin(url.origin);
	const [svc, prj] = await Promise.all([
		db.select({ slug: services.slug, updatedAt: services.updatedAt }).from(services).where(eq(services.status, 'published')).orderBy(asc(services.sort)),
		db.select({ slug: projects.slug, updatedAt: projects.updatedAt }).from(projects).where(eq(projects.status, 'published')).orderBy(asc(projects.id))
	]);

	const entries: Entry[] = [
		...STATIC,
		...svc.map((s) => ({ path: `/diensten/${s.slug}`, lastmod: s.updatedAt, priority: 0.8, changefreq: 'monthly' as const })),
		...prj.map((p) => ({ path: `/realisaties/${p.slug}`, lastmod: p.updatedAt, priority: 0.6, changefreq: 'yearly' as const }))
	];

	const urls = entries.flatMap((e) => {
		const alternates = [
			...locales.map((l) => `    <xhtml:link rel="alternate" hreflang="${l === 'nl' ? 'nl-BE' : l}" href="${esc(absoluteUrl(localizePath(e.path, l), origin))}"/>`),
			`    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(absoluteUrl(e.path, origin))}"/>`
		].join('\n');
		return locales.map(
			(l) => `  <url>
    <loc>${esc(absoluteUrl(localizePath(e.path, l), origin))}</loc>${e.lastmod ? `\n    <lastmod>${e.lastmod.toISOString()}</lastmod>` : ''}
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority.toFixed(1)}</priority>
${alternates}
  </url>`
		);
	});

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${urls.join('\n')}
</urlset>
`;
	return new Response(xml, {
		headers: { 'content-type': 'application/xml; charset=utf-8', 'cache-control': 'public, max-age=3600' }
	});
};
