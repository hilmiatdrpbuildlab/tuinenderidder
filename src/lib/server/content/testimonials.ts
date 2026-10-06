import { asc, desc, eq } from 'drizzle-orm';
import { db } from '../db';
import { testimonials } from '../db/schema';
import { getServices } from './services';
import type { Locale } from '$lib/i18n';

export type PublicTestimonial = {
	id: number;
	authorName: string;
	town: string;
	rating: number;
	quote: string;
	source: 'google' | 'facebook' | 'direct';
	sourceUrl: string;
	reviewDate: string;
	serviceTitle: string | null;
};

/** Visible testimonials in CMS order; EN quote falls back to NL. */
export async function getTestimonials(locale: Locale, limit?: number): Promise<PublicTestimonial[]> {
	const query = db
		.select()
		.from(testimonials)
		.where(eq(testimonials.isVisible, true))
		.orderBy(asc(testimonials.sort), desc(testimonials.reviewDate));
	const [rows, services] = await Promise.all([limit ? query.limit(limit) : query, getServices(locale)]);
	const titles = new Map(services.map((s) => [s.id, s.title]));
	return rows.map((r) => ({
		id: r.id,
		authorName: r.authorName,
		town: r.town,
		rating: Math.max(0, Math.min(5, r.rating)),
		quote: locale === 'en' && r.quoteEn.trim() ? r.quoteEn : r.quoteNl,
		source: r.source,
		sourceUrl: r.sourceUrl,
		reviewDate: r.reviewDate,
		serviceTitle: r.serviceId ? (titles.get(r.serviceId) ?? null) : null
	}));
}
