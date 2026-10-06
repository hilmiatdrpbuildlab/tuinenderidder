import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '../db';
import { serviceTranslations, services, type PriceMode } from '../db/schema';
import { getMediaRefs } from '../media';
import { resolveTranslations } from './fallback';
import type { Locale } from '$lib/i18n';
import type { MediaRef } from '$lib/media';

export type ServiceSummary = {
	id: number;
	slug: string;
	icon: string;
	title: string;
	summary: string;
	highlights: string[];
	priceFrom: number | null;
	priceMode: PriceMode;
	isBookable: boolean;
	image: MediaRef | null;
};

export type ServiceDetail = ServiceSummary & {
	/** Sanitized on save in the CMS — safe for {@html}. */
	body: string;
	seoTitle: string;
	seoDesc: string;
};

async function load(locale: Locale, slug?: string): Promise<ServiceDetail[]> {
	const base = await db
		.select()
		.from(services)
		.where(slug ? and(eq(services.status, 'published'), eq(services.slug, slug)) : eq(services.status, 'published'))
		.orderBy(asc(services.sort), asc(services.id));
	if (base.length === 0) return [];

	const ids = base.map((s) => s.id);
	const trRows = await db
		.select()
		.from(serviceTranslations)
		.where(and(inArray(serviceTranslations.serviceId, ids), inArray(serviceTranslations.locale, ['nl', locale])));
	const tr = resolveTranslations(trRows, (r) => r.serviceId, locale);
	const media = await getMediaRefs(
		base.map((s) => s.coverMediaId),
		locale
	);

	return base.flatMap((s) => {
		const t = tr.get(s.id);
		if (!t) return [];
		return [
			{
				id: s.id,
				slug: s.slug,
				icon: s.icon,
				title: t.title,
				summary: t.summary,
				highlights: t.highlights ?? [],
				body: t.body,
				seoTitle: t.seoTitle,
				seoDesc: t.seoDesc,
				priceFrom: s.priceFrom,
				priceMode: s.priceMode,
				isBookable: s.isBookable,
				image: s.coverMediaId ? (media.get(s.coverMediaId) ?? null) : null
			}
		];
	});
}

/** Published services in display order (NL fallback per field). */
export async function getServices(locale: Locale): Promise<ServiceSummary[]> {
	const list = await load(locale);
	return list.map((s) => ({
		id: s.id,
		slug: s.slug,
		icon: s.icon,
		title: s.title,
		summary: s.summary,
		highlights: s.highlights,
		priceFrom: s.priceFrom,
		priceMode: s.priceMode,
		isBookable: s.isBookable,
		image: s.image
	}));
}

/** One published service by slug, or null. */
export async function getService(slug: string, locale: Locale): Promise<ServiceDetail | null> {
	const [s] = await load(locale, slug);
	return s ?? null;
}
