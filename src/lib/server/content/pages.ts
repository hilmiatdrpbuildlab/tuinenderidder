import { and, eq, inArray } from 'drizzle-orm';
import { db } from '../db';
import { pageTranslations, pages } from '../db/schema';
import { isEmpty, withFallback } from './fallback';
import type { Locale } from '$lib/i18n';
import type { PageBlocks, PageKey } from '$lib/content/pages';

export type PublicPage<K extends PageKey> = {
	key: K;
	title: string;
	seoTitle: string;
	seoDesc: string;
	/** Partial: blocks may be missing fields when the CMS has not filled them in yet. */
	blocks: Partial<PageBlocks[K]>;
	updatedAt: Date | null;
};

/**
 * A CMS page by key with NL fallback: title/SEO fields and every individual block field that is
 * empty in the requested locale come from the Dutch version.
 */
export async function getPage<K extends PageKey>(key: K, locale: Locale): Promise<PublicPage<K>> {
	const [page] = await db.select().from(pages).where(eq(pages.key, key)).limit(1);
	if (!page) return { key, title: '', seoTitle: '', seoDesc: '', blocks: {}, updatedAt: null };

	const rows = await db
		.select()
		.from(pageTranslations)
		.where(and(eq(pageTranslations.pageId, page.id), inArray(pageTranslations.locale, ['nl', locale])));
	const nl = rows.find((r) => r.locale === 'nl');
	const loc = rows.find((r) => r.locale === locale);

	const blocks = withFallback(nl?.blocks ?? {}, loc?.blocks ?? {}) ?? {};
	const pick = (f: 'title' | 'seoTitle' | 'seoDesc') => (loc && !isEmpty(loc[f]) ? loc[f] : (nl?.[f] ?? ''));

	return {
		key,
		title: pick('title'),
		seoTitle: pick('seoTitle'),
		seoDesc: pick('seoDesc'),
		blocks: blocks as Partial<PageBlocks[K]>,
		updatedAt: page.updatedAt
	};
}
