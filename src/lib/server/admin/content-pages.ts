/** CMS Pages: typed JSON blocks per page key (shapes in $lib/content/pages.ts). */
import { and, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { pageTranslations, pages, type Locale } from '$lib/server/db/schema';
import { sanitizeHtml } from '$lib/server/sanitize';
import { PAGE_KEYS, PAGE_LABELS, type PageKey } from '$lib/content/pages';
import { PAGE_SECTIONS, type Feature, type Stat } from '$lib/components/admin/content/page-fields';
import { getMediaItems } from './content-media';
import { str, strs, type FieldErrors } from './content';
import type { MediaItem } from '$lib/components/admin/content/shared';

export const isPageKey = (k: string): k is PageKey => (PAGE_KEYS as string[]).includes(k);

export type PageLangValues = { title: string; seoTitle: string; seoDesc: string; blocks: Record<string, unknown> };
export type PageValues = { nl: PageLangValues; en: PageLangValues; shared: Record<string, unknown> };

const fieldsOf = (key: PageKey) => PAGE_SECTIONS[key].flatMap((s) => s.fields);
const sharedOf = (key: PageKey) => PAGE_SECTIONS[key].flatMap((s) => s.shared ?? []);

export async function listPages() {
	const rows = await db
		.select({ key: pages.key, updatedAt: pages.updatedAt, locale: pageTranslations.locale, title: pageTranslations.title, blocks: pageTranslations.blocks })
		.from(pages)
		.leftJoin(pageTranslations, eq(pageTranslations.pageId, pages.id));
	return PAGE_KEYS.map((key) => {
		const nl = rows.find((r) => r.key === key && r.locale === 'nl');
		const en = rows.find((r) => r.key === key && r.locale === 'en');
		const any = rows.find((r) => r.key === key);
		return {
			key,
			label: PAGE_LABELS[key],
			titleNl: nl?.title ?? '',
			titleEn: en?.title ?? '',
			exists: !!any,
			enComplete: !!en && isComplete(key, { title: en.title ?? '', seoTitle: '', seoDesc: '', blocks: (en.blocks ?? {}) as Record<string, unknown> }),
			updatedAt: any?.updatedAt?.toISOString() ?? null
		};
	});
}

function isComplete(key: PageKey, v: PageLangValues) {
	if (!v.title.trim()) return false;
	return fieldsOf(key)
		.filter((f) => f.required)
		.every((f) => {
			const x = v.blocks[f.name];
			return typeof x === 'string' ? x.replace(/<[^>]*>/g, '').trim().length > 0 : Array.isArray(x) ? x.length > 0 : !!x;
		});
}

function emptyBlocks(key: PageKey) {
	const out: Record<string, unknown> = {};
	for (const f of fieldsOf(key)) out[f.name] = f.type === 'stats' || f.type === 'features' ? [] : '';
	return out;
}

export async function getPageForEdit(key: PageKey) {
	const [page] = await db.select().from(pages).where(eq(pages.key, key));
	const trs = page ? await db.select().from(pageTranslations).where(eq(pageTranslations.pageId, page.id)) : [];
	const lang = (l: Locale): PageLangValues => {
		const t = trs.find((x) => x.locale === l);
		return {
			title: t?.title ?? '',
			seoTitle: t?.seoTitle ?? '',
			seoDesc: t?.seoDesc ?? '',
			blocks: { ...emptyBlocks(key), ...((t?.blocks ?? {}) as Record<string, unknown>) }
		};
	};
	const nl = lang('nl');
	const en = lang('en');
	const shared: Record<string, unknown> = {};
	for (const f of sharedOf(key)) shared[f.name] = nl.blocks[f.name] ?? en.blocks[f.name] ?? (f.type === 'image' ? null : '');
	const imageIds = sharedOf(key)
		.filter((f) => f.type === 'image')
		.map((f) => shared[f.name])
		.filter((x): x is number => typeof x === 'number');
	const media = await getMediaItems(imageIds);
	return {
		key,
		label: PAGE_LABELS[key],
		updatedAt: page?.updatedAt.toISOString() ?? null,
		values: { nl, en, shared } satisfies PageValues,
		media: Object.fromEntries(media) as Record<number, MediaItem>
	};
}

/* ------------------------------------------------------------- parsing */

function zipStats(fd: FormData, prefix: string): Stat[] {
	const values = strs(fd, `${prefix}.value`);
	const labels = strs(fd, `${prefix}.label`);
	return values.map((value, i) => ({ value: value.slice(0, 20), label: (labels[i] ?? '').slice(0, 60) })).filter((s) => s.value || s.label);
}

function zipFeatures(fd: FormData, prefix: string): Feature[] {
	const icons = strs(fd, `${prefix}.icon`);
	const titles = strs(fd, `${prefix}.title`);
	const texts = strs(fd, `${prefix}.text`);
	return titles
		.map((title, i) => ({ icon: icons[i] || 'leaf', title: title.slice(0, 80), text: (texts[i] ?? '').slice(0, 300) }))
		.filter((f) => f.title || f.text);
}

export function pageFromForm(key: PageKey, fd: FormData): PageValues {
	const lang = (l: Locale): PageLangValues => {
		const blocks: Record<string, unknown> = {};
		for (const f of fieldsOf(key)) {
			const name = `${l}.b.${f.name}`;
			if (f.type === 'stats') blocks[f.name] = zipStats(fd, name);
			else if (f.type === 'features') blocks[f.name] = zipFeatures(fd, name);
			else if (f.type === 'rich') blocks[f.name] = String(fd.get(name) ?? '');
			else blocks[f.name] = str(fd, name);
		}
		return { title: str(fd, `${l}.title`), seoTitle: str(fd, `${l}.seoTitle`), seoDesc: str(fd, `${l}.seoDesc`), blocks };
	};
	const shared: Record<string, unknown> = {};
	for (const f of sharedOf(key)) {
		const raw = str(fd, `shared.${f.name}`);
		if (f.type === 'image') {
			const n = Number(raw);
			shared[f.name] = raw && Number.isInteger(n) && n > 0 ? n : null;
		} else shared[f.name] = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : '';
	}
	return { nl: lang('nl'), en: lang('en'), shared };
}

export function validatePage(key: PageKey, v: PageValues): FieldErrors {
	const errors: FieldErrors = {};
	for (const l of ['nl', 'en'] as const) {
		const t = v[l];
		if (l === 'nl' && !t.title) errors['nl.title'] = 'Geef een paginatitel in.';
		if (t.title.length > 120) errors[`${l}.title`] = 'Maximaal 120 tekens.';
		if (t.seoTitle.length > 70) errors[`${l}.seoTitle`] = 'Maximaal 70 tekens.';
		if (t.seoDesc.length > 170) errors[`${l}.seoDesc`] = 'Maximaal 170 tekens.';
		for (const f of fieldsOf(key)) {
			const val = t.blocks[f.name];
			if (typeof val !== 'string') continue;
			const plain = f.type === 'rich' ? val.replace(/<[^>]*>/g, '').trim() : val;
			if (l === 'nl' && f.required && !plain) errors[`nl.b.${f.name}`] = 'Dit veld is verplicht.';
			if (f.max && val.length > f.max) errors[`${l}.b.${f.name}`] = `Maximaal ${f.max} tekens.`;
		}
	}
	return errors;
}

/** Upsert both languages. Empty English fields fall back to the Dutch text. */
export async function savePage(key: PageKey, v: PageValues) {
	const [existing] = await db.select().from(pages).where(eq(pages.key, key));
	const pageId = existing?.id ?? (await db.insert(pages).values({ key }).returning({ id: pages.id }))[0].id;
	const current = await db.select().from(pageTranslations).where(eq(pageTranslations.pageId, pageId));

	const clean = (blocks: Record<string, unknown>) => {
		const out = { ...blocks };
		for (const f of fieldsOf(key)) if (f.type === 'rich' && typeof out[f.name] === 'string') out[f.name] = sanitizeHtml(out[f.name] as string);
		return out;
	};
	const nlBlocks = clean(v.nl.blocks);
	const enBlocks = clean(v.en.blocks);
	for (const [k, val] of Object.entries(enBlocks)) {
		const empty = (typeof val === 'string' && !val.replace(/<[^>]*>/g, '').trim()) || (Array.isArray(val) && val.length === 0);
		if (empty) enBlocks[k] = nlBlocks[k];
	}

	await db.transaction(async (tx) => {
		for (const l of ['nl', 'en'] as const) {
			const prev = (current.find((c) => c.locale === l)?.blocks ?? {}) as Record<string, unknown>;
			const t = v[l];
			const blocks = { ...prev, ...(l === 'nl' ? nlBlocks : enBlocks), ...v.shared };
			const title = l === 'en' ? t.title || v.nl.title : t.title;
			const values = { title, seoTitle: t.seoTitle, seoDesc: t.seoDesc, blocks };
			await tx
				.insert(pageTranslations)
				.values({ pageId, locale: l, ...values })
				.onConflictDoUpdate({ target: [pageTranslations.pageId, pageTranslations.locale], set: values });
		}
		await tx.update(pages).set({ updatedAt: new Date() }).where(and(eq(pages.id, pageId)));
	});
}
