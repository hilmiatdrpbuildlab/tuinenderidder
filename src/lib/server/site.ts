import { and, asc, eq } from 'drizzle-orm';
import { db } from './db';
import { serviceTranslations, services } from './db/schema';
import { getMediaRefs } from './media';
import type { Locale } from '$lib/i18n';
import type { MediaRef } from '$lib/media';

export type NavService = {
	id: number;
	slug: string;
	icon: string;
	title: string;
	summary: string;
	image: MediaRef | null;
};

/** Published services for header mega-menu, footer and booking step 1 (NL fallback per field). */
export async function getNavServices(locale: Locale): Promise<NavService[]> {
	const rows = await db
		.select({
			id: services.id,
			slug: services.slug,
			icon: services.icon,
			coverMediaId: services.coverMediaId,
			title: serviceTranslations.title,
			summary: serviceTranslations.summary,
			locale: serviceTranslations.locale
		})
		.from(services)
		.innerJoin(serviceTranslations, eq(serviceTranslations.serviceId, services.id))
		.where(and(eq(services.status, 'published')))
		.orderBy(asc(services.sort));

	const byId = new Map<number, (typeof rows)[number]>();
	for (const r of rows) {
		const prev = byId.get(r.id);
		if (!prev || (r.locale === locale && r.title)) byId.set(r.id, r);
	}
	const list = [...byId.values()];
	const media = await getMediaRefs(
		list.map((s) => s.coverMediaId),
		locale
	);
	return list.map((s) => ({
		id: s.id,
		slug: s.slug,
		icon: s.icon,
		title: s.title,
		summary: s.summary,
		image: s.coverMediaId ? (media.get(s.coverMediaId) ?? null) : null
	}));
}
