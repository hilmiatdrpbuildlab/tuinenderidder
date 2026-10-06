/**
 * CMS content queries + mutations: services, projects, testimonials (pages → content-pages.ts,
 * media → content-media.ts) and the small form-parsing helpers the editors share.
 */
import { and, asc, desc, eq, inArray, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '$lib/server/db';
import {
	bookingServices,
	media,
	projectMedia,
	projectTranslations,
	projects,
	serviceTranslations,
	services,
	testimonials,
	type Locale,
	type MediaKind
} from '$lib/server/db/schema';
import { sanitizeHtml } from '$lib/server/sanitize';
import { getMediaItems, updateAltTexts } from './content-media';
import { slugify, type MediaItem } from '$lib/components/admin/content/shared';

export { slugify };

/* ============================================================ form helpers */

export type FieldErrors = Record<string, string>;
export type Intent = 'save' | 'publish' | 'unpublish';

export const str = (fd: FormData, name: string) => String(fd.get(name) ?? '').trim();
export const strs = (fd: FormData, name: string) => fd.getAll(name).map((v) => String(v).trim());
export const bool = (fd: FormData, name: string) => {
	const v = fd.get(name);
	return v === 'on' || v === 'true' || v === '1';
};
export const optInt = (fd: FormData, name: string) => {
	const v = str(fd, name);
	if (v === '') return null;
	const n = Number(v);
	return Number.isFinite(n) ? Math.round(n) : NaN;
};
export const intentOf = (fd: FormData): Intent => {
	const v = str(fd, 'intent');
	return v === 'publish' || v === 'unpublish' ? v : 'save';
};

/** zod issues → { 'nl.title': 'message' } (first message per path). */
export function zodErrors(err: z.ZodError): FieldErrors {
	const out: FieldErrors = {};
	for (const issue of err.issues) {
		const key = issue.path.join('.');
		if (!(key in out)) out[key] = issue.message;
	}
	return out;
}

/** Inline alt-text inputs named `alt.<id>.nl` / `alt.<id>.en` posted by editors. */
export function parseAltTexts(fd: FormData) {
	const map = new Map<number, { id: number; altNl: string; altEn: string }>();
	for (const [name, value] of fd.entries()) {
		const m = name.match(/^alt\.(\d+)\.(nl|en)$/);
		if (!m) continue;
		const id = Number(m[1]);
		const entry = map.get(id) ?? { id, altNl: '', altEn: '' };
		if (m[2] === 'nl') entry.altNl = String(value);
		else entry.altEn = String(value);
		map.set(id, entry);
	}
	return [...map.values()];
}

/** Persist inline alt texts, but only for ids that are actually part of the entity. */
export async function saveInlineAltTexts(fd: FormData, allowedIds: (number | null | undefined)[]) {
	const allowed = new Set(allowedIds.filter((x): x is number => typeof x === 'number'));
	const entries = parseAltTexts(fd).filter((e) => allowed.has(e.id));
	if (entries.length) await updateAltTexts(entries);
}

export async function missingAltIds(ids: (number | null | undefined)[]) {
	const unique = [...new Set(ids.filter((x): x is number => typeof x === 'number'))];
	if (!unique.length) return [];
	const rows = await db.select({ id: media.id, altNl: media.altNl }).from(media).where(inArray(media.id, unique));
	return rows.filter((r) => !r.altNl.trim()).map((r) => r.id);
}

const msg = {
	required: 'Dit veld is verplicht.',
	slug: 'Alleen kleine letters, cijfers en koppeltekens.',
	slugTaken: 'Deze slug is al in gebruik.'
};

const slugSchema = z
	.string()
	.trim()
	.min(2, msg.required)
	.max(80, 'Maximaal 80 tekens.')
	.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, msg.slug);

/* ================================================================== slugs */

export async function isSlugTaken(kind: 'service' | 'project', slug: string, excludeId?: number | null) {
	const table = kind === 'service' ? services : projects;
	const rows = await db
		.select({ id: table.id })
		.from(table)
		.where(excludeId ? and(eq(table.slug, slug), ne(table.id, excludeId)) : eq(table.slug, slug));
	return rows.length > 0;
}

/* =============================================================== services */

const serviceTr = z.object({
	title: z.string().trim().max(120, 'Maximaal 120 tekens.'),
	summary: z.string().trim().max(300, 'Maximaal 300 tekens.'),
	body: z.string().max(40_000),
	highlights: z.array(z.string().trim().max(140, 'Maximaal 140 tekens.')).max(12, 'Maximaal 12 punten.'),
	seoTitle: z.string().trim().max(70, 'Maximaal 70 tekens.'),
	seoDesc: z.string().trim().max(170, 'Maximaal 170 tekens.')
});

const serviceSchema = z
	.object({
		slug: slugSchema,
		icon: z.string().trim().min(1, msg.required).max(40),
		isBookable: z.boolean(),
		baseDurationMin: z.number({ error: 'Geef een getal in.' }).int().min(15, 'Minstens 15 minuten.').max(24 * 60, 'Maximaal 24 uur.'),
		priceMode: z.enum(['fixed', 'quote']),
		priceFrom: z.number({ error: 'Geef een bedrag in.' }).int().min(0).max(1_000_000).nullable(),
		coverMediaId: z.number().int().positive().nullable(),
		nl: serviceTr.extend({ title: z.string().trim().min(2, 'Geef een Nederlandse titel in.').max(120) }),
		en: serviceTr
	})
	.superRefine((v, ctx) => {
		if (v.priceMode === 'fixed' && v.priceFrom === null)
			ctx.addIssue({ code: 'custom', path: ['priceFrom'], message: 'Geef een vanafprijs in, of kies “Op offerte”.' });
	});

export type ServiceInput = z.input<typeof serviceSchema>;

function trFromForm(fd: FormData, l: Locale) {
	return {
		title: str(fd, `${l}.title`),
		summary: str(fd, `${l}.summary`),
		body: String(fd.get(`${l}.body`) ?? ''),
		highlights: strs(fd, `${l}.highlights`).filter(Boolean),
		seoTitle: str(fd, `${l}.seoTitle`),
		seoDesc: str(fd, `${l}.seoDesc`)
	};
}

export function serviceFromForm(fd: FormData) {
	const priceMode = str(fd, 'priceMode') === 'fixed' ? 'fixed' : 'quote';
	const cover = optInt(fd, 'coverMediaId');
	return {
		slug: slugify(str(fd, 'slug')),
		icon: str(fd, 'icon') || 'leaf',
		isBookable: bool(fd, 'isBookable'),
		baseDurationMin: optInt(fd, 'baseDurationMin') ?? NaN,
		priceMode,
		priceFrom: optInt(fd, 'priceFrom'),
		coverMediaId: cover && cover > 0 ? cover : null,
		nl: trFromForm(fd, 'nl'),
		en: trFromForm(fd, 'en')
	} satisfies ServiceInput;
}

export async function listServices() {
	const rows = await db
		.select({
			id: services.id,
			slug: services.slug,
			icon: services.icon,
			sort: services.sort,
			status: services.status,
			isBookable: services.isBookable,
			priceMode: services.priceMode,
			priceFrom: services.priceFrom,
			coverMediaId: services.coverMediaId,
			updatedAt: services.updatedAt,
			title: serviceTranslations.title,
			enTitle: sql<string | null>`(select st.title from service_translations st where st.service_id = ${services.id} and st.locale = 'en')`
		})
		.from(services)
		.leftJoin(serviceTranslations, and(eq(serviceTranslations.serviceId, services.id), eq(serviceTranslations.locale, 'nl')))
		.orderBy(asc(services.sort), asc(services.id));
	const covers = await getMediaItems(rows.map((r) => r.coverMediaId));
	return rows.map((r) => ({ ...r, title: r.title ?? r.slug, hasEn: !!r.enTitle, cover: r.coverMediaId ? (covers.get(r.coverMediaId) ?? null) : null }));
}

export async function serviceOptions() {
	const rows = await db
		.select({ id: services.id, title: serviceTranslations.title, slug: services.slug })
		.from(services)
		.leftJoin(serviceTranslations, and(eq(serviceTranslations.serviceId, services.id), eq(serviceTranslations.locale, 'nl')))
		.orderBy(asc(services.sort), asc(services.id));
	return rows.map((r) => ({ value: r.id, label: r.title ?? r.slug }));
}

const emptyTr = { title: '', summary: '', body: '', highlights: [] as string[], seoTitle: '', seoDesc: '' };

export async function getServiceForEdit(id: number) {
	const [row] = await db.select().from(services).where(eq(services.id, id));
	if (!row) return null;
	const trs = await db.select().from(serviceTranslations).where(eq(serviceTranslations.serviceId, id));
	const pick = (l: Locale) => {
		const t = trs.find((x) => x.locale === l);
		return t ? { title: t.title, summary: t.summary, body: t.body, highlights: t.highlights, seoTitle: t.seoTitle, seoDesc: t.seoDesc } : { ...emptyTr };
	};
	const cover = row.coverMediaId ? ((await getMediaItems([row.coverMediaId])).get(row.coverMediaId) ?? null) : null;
	return {
		id: row.id,
		status: row.status,
		updatedAt: row.updatedAt.toISOString(),
		values: {
			slug: row.slug,
			icon: row.icon,
			isBookable: row.isBookable,
			baseDurationMin: row.baseDurationMin,
			priceMode: row.priceMode,
			priceFrom: row.priceFrom,
			coverMediaId: row.coverMediaId,
			nl: pick('nl'),
			en: pick('en')
		},
		cover
	};
}

export function newServiceValues(): ServiceInput {
	return {
		slug: '',
		icon: 'leaf',
		isBookable: true,
		baseDurationMin: 240,
		priceMode: 'quote',
		priceFrom: null,
		coverMediaId: null,
		nl: { ...emptyTr, highlights: [] },
		en: { ...emptyTr, highlights: [] }
	};
}

type SaveResult = { ok: true; id: number; status: 'draft' | 'published' } | { ok: false; errors: FieldErrors };

export async function saveService(id: number | null, input: ServiceInput, intent: Intent): Promise<SaveResult> {
	const parsed = serviceSchema.safeParse(input);
	if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };
	const v = parsed.data;
	if (await isSlugTaken('service', v.slug, id)) return { ok: false, errors: { slug: msg.slugTaken } };
	if (intent === 'publish' && v.coverMediaId && (await missingAltIds([v.coverMediaId])).length)
		return { ok: false, errors: { coverMediaId: 'Geef de omslagfoto eerst een Nederlandse alt-tekst.' } };

	const base = {
		slug: v.slug,
		icon: v.icon,
		isBookable: v.isBookable,
		baseDurationMin: v.baseDurationMin,
		priceMode: v.priceMode,
		priceFrom: v.priceMode === 'fixed' ? v.priceFrom : (v.priceFrom ?? null),
		coverMediaId: v.coverMediaId,
		updatedAt: new Date()
	};

	return db.transaction(async (tx) => {
		let serviceId = id;
		let status: 'draft' | 'published';
		if (serviceId) {
			const [cur] = await tx.select({ status: services.status }).from(services).where(eq(services.id, serviceId));
			status = intent === 'publish' ? 'published' : intent === 'unpublish' ? 'draft' : cur.status;
			await tx.update(services).set({ ...base, status }).where(eq(services.id, serviceId));
		} else {
			status = intent === 'publish' ? 'published' : 'draft';
			const [{ max }] = await tx.select({ max: sql<number>`coalesce(max(${services.sort}), 0)::int` }).from(services);
			const [row] = await tx.insert(services).values({ ...base, status, sort: Number(max) + 1 }).returning({ id: services.id });
			serviceId = row.id;
		}
		for (const l of ['nl', 'en'] as const) {
			const t = v[l];
			if (l === 'en' && !t.title) {
				// No English title → no EN row; the public site falls back to Dutch.
				await tx.delete(serviceTranslations).where(and(eq(serviceTranslations.serviceId, serviceId), eq(serviceTranslations.locale, 'en')));
				continue;
			}
			const values = { ...t, body: sanitizeHtml(t.body) };
			await tx
				.insert(serviceTranslations)
				.values({ serviceId, locale: l, ...values })
				.onConflictDoUpdate({ target: [serviceTranslations.serviceId, serviceTranslations.locale], set: values });
		}
		return { ok: true as const, id: serviceId, status };
	});
}

/** Move one service up/down in the sort order (no-JS buttons). */
export async function moveService(id: number, dir: 'up' | 'down') {
	const rows = await db.select({ id: services.id }).from(services).orderBy(asc(services.sort), asc(services.id));
	const ids = rows.map((r) => r.id);
	const i = ids.indexOf(id);
	const j = dir === 'up' ? i - 1 : i + 1;
	if (i < 0 || j < 0 || j >= ids.length) return false;
	[ids[i], ids[j]] = [ids[j], ids[i]];
	await reorderServices(ids);
	return true;
}

export async function reorderServices(ids: number[]) {
	const existing = new Set((await db.select({ id: services.id }).from(services)).map((r) => r.id));
	const ordered = ids.filter((id) => existing.has(id));
	for (const id of existing) if (!ordered.includes(id)) ordered.push(id);
	await db.transaction(async (tx) => {
		for (const [i, id] of ordered.entries()) await tx.update(services).set({ sort: i + 1 }).where(eq(services.id, id));
	});
}

/** Delete a service unless bookings reference it (projects/testimonials lose their link). */
export async function deleteService(id: number): Promise<{ ok: true } | { ok: false; bookings: number }> {
	const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(bookingServices).where(eq(bookingServices.serviceId, id));
	if (Number(n) > 0) return { ok: false, bookings: Number(n) };
	await db.delete(services).where(eq(services.id, id));
	return { ok: true };
}

export async function setServiceStatus(id: number, status: 'draft' | 'published') {
	await db.update(services).set({ status, updatedAt: new Date() }).where(eq(services.id, id));
}

/* =============================================================== projects */

const projectTr = z.object({
	title: z.string().trim().max(140, 'Maximaal 140 tekens.'),
	summary: z.string().trim().max(400, 'Maximaal 400 tekens.'),
	story: z.string().max(40_000)
});

const currentYear = new Date().getFullYear();

const projectSchema = z
	.object({
		slug: slugSchema,
		serviceId: z.number().int().positive().nullable(),
		town: z.string().trim().max(80, 'Maximaal 80 tekens.'),
		year: z.number({ error: 'Geef een jaartal in.' }).int('Geef een jaartal in.').min(1990, 'Jaartal te vroeg.').max(currentYear + 1, 'Jaartal ligt te ver in de toekomst.'),
		isFeatured: z.boolean(),
		coverMediaId: z.number().int().positive().nullable(),
		gallery: z.array(z.object({ mediaId: z.number().int().positive(), kind: z.enum(['gallery', 'before', 'after']) })).max(60, 'Maximaal 60 foto’s.'),
		nl: projectTr.extend({ title: z.string().trim().min(2, 'Geef een Nederlandse titel in.').max(140) }),
		en: projectTr
	})
	.superRefine((v, ctx) => {
		const before = v.gallery.filter((g) => g.kind === 'before').length;
		const after = v.gallery.filter((g) => g.kind === 'after').length;
		if (before !== after)
			ctx.addIssue({ code: 'custom', path: ['gallery'], message: 'Elke “voor”-foto heeft een bijhorende “na”-foto nodig (en omgekeerd).' });
	});

export type ProjectInput = z.input<typeof projectSchema>;

export function projectFromForm(fd: FormData): ProjectInput {
	const ids = strs(fd, 'gallery.mediaId').map(Number);
	const kinds = strs(fd, 'gallery.kind');
	const seen = new Set<number>();
	const gallery: { mediaId: number; kind: MediaKind }[] = [];
	ids.forEach((mediaId, i) => {
		if (!Number.isInteger(mediaId) || mediaId <= 0 || seen.has(mediaId)) return;
		seen.add(mediaId);
		const k = kinds[i];
		gallery.push({ mediaId, kind: k === 'before' || k === 'after' ? k : 'gallery' });
	});
	const cover = optInt(fd, 'coverMediaId');
	const service = optInt(fd, 'serviceId');
	return {
		slug: slugify(str(fd, 'slug')),
		serviceId: service && service > 0 ? service : null,
		town: str(fd, 'town'),
		year: optInt(fd, 'year') ?? NaN,
		isFeatured: bool(fd, 'isFeatured'),
		coverMediaId: cover && cover > 0 ? cover : null,
		gallery,
		nl: { title: str(fd, 'nl.title'), summary: str(fd, 'nl.summary'), story: String(fd.get('nl.story') ?? '') },
		en: { title: str(fd, 'en.title'), summary: str(fd, 'en.summary'), story: String(fd.get('en.story') ?? '') }
	};
}

export type ProjectListFilter = { status?: 'draft' | 'published' | null; serviceId?: number | null; q?: string };

export async function listProjects(filter: ProjectListFilter = {}) {
	const conds = [];
	if (filter.status) conds.push(eq(projects.status, filter.status));
	if (filter.serviceId) conds.push(eq(projects.serviceId, filter.serviceId));
	if (filter.q) {
		const like = `%${filter.q.toLowerCase()}%`;
		conds.push(sql`(lower(${projectTranslations.title}) like ${like} or lower(${projects.town}) like ${like})`);
	}
	const rows = await db
		.select({
			id: projects.id,
			slug: projects.slug,
			town: projects.town,
			year: projects.year,
			status: projects.status,
			isFeatured: projects.isFeatured,
			coverMediaId: projects.coverMediaId,
			publishedAt: projects.publishedAt,
			updatedAt: projects.updatedAt,
			title: projectTranslations.title,
			serviceTitle: serviceTranslations.title,
			photoCount: sql<number>`(select count(*)::int from project_media pm where pm.project_id = ${projects.id})`
		})
		.from(projects)
		.leftJoin(projectTranslations, and(eq(projectTranslations.projectId, projects.id), eq(projectTranslations.locale, 'nl')))
		.leftJoin(serviceTranslations, and(eq(serviceTranslations.serviceId, projects.serviceId), eq(serviceTranslations.locale, 'nl')))
		.where(conds.length ? and(...conds) : undefined)
		.orderBy(desc(projects.year), desc(projects.updatedAt));
	const covers = await getMediaItems(rows.map((r) => r.coverMediaId));
	return rows.map((r) => ({
		...r,
		title: r.title ?? r.slug,
		photoCount: Number(r.photoCount),
		cover: r.coverMediaId ? (covers.get(r.coverMediaId) ?? null) : null
	}));
}

export async function getProjectForEdit(id: number) {
	const [row] = await db.select().from(projects).where(eq(projects.id, id));
	if (!row) return null;
	const trs = await db.select().from(projectTranslations).where(eq(projectTranslations.projectId, id));
	const pick = (l: Locale) => {
		const t = trs.find((x) => x.locale === l);
		return t ? { title: t.title, summary: t.summary, story: t.story } : { title: '', summary: '', story: '' };
	};
	const gal = await db.select().from(projectMedia).where(eq(projectMedia.projectId, id)).orderBy(asc(projectMedia.sort), asc(projectMedia.id));
	const items = await getMediaItems([row.coverMediaId, ...gal.map((g) => g.mediaId)]);
	return {
		id: row.id,
		status: row.status,
		publishedAt: row.publishedAt?.toISOString() ?? null,
		updatedAt: row.updatedAt.toISOString(),
		values: {
			slug: row.slug,
			serviceId: row.serviceId,
			town: row.town,
			year: row.year,
			isFeatured: row.isFeatured,
			coverMediaId: row.coverMediaId,
			gallery: gal.map((g) => ({ mediaId: g.mediaId, kind: g.kind })),
			nl: pick('nl'),
			en: pick('en')
		} satisfies ProjectInput,
		media: Object.fromEntries(items) as Record<number, MediaItem>
	};
}

export function newProjectValues(): ProjectInput {
	return {
		slug: '',
		serviceId: null,
		town: '',
		year: currentYear,
		isFeatured: false,
		coverMediaId: null,
		gallery: [],
		nl: { title: '', summary: '', story: '' },
		en: { title: '', summary: '', story: '' }
	};
}

/** Reasons a project can't be published yet (empty = ok). Shared by server check + UI tooltip. */
export async function projectPublishBlockers(v: ProjectInput) {
	const reasons: string[] = [];
	if (!v.nl.title.trim()) reasons.push('Nederlandse titel ontbreekt.');
	if (!v.coverMediaId) reasons.push('Kies een omslagfoto.');
	const missing = await missingAltIds([v.coverMediaId, ...v.gallery.map((g) => g.mediaId)]);
	if (missing.length) reasons.push(`${missing.length} foto('s) zonder Nederlandse alt-tekst.`);
	return reasons;
}

export async function saveProject(id: number | null, input: ProjectInput, intent: Intent): Promise<SaveResult> {
	const parsed = projectSchema.safeParse(input);
	if (!parsed.success) return { ok: false, errors: zodErrors(parsed.error) };
	const v = parsed.data;
	if (await isSlugTaken('project', v.slug, id)) return { ok: false, errors: { slug: msg.slugTaken } };

	const existingIds = new Set(
		(await db.select({ id: media.id }).from(media).where(inArray(media.id, [...v.gallery.map((g) => g.mediaId), v.coverMediaId ?? 0]))).map((r) => r.id)
	);
	const gallery = v.gallery.filter((g) => existingIds.has(g.mediaId));
	const coverMediaId = v.coverMediaId && existingIds.has(v.coverMediaId) ? v.coverMediaId : null;

	return db.transaction(async (tx) => {
		let projectId = id;
		let status: 'draft' | 'published';
		let publishedAt: Date | null = null;
		if (projectId) {
			const [cur] = await tx.select({ status: projects.status, publishedAt: projects.publishedAt }).from(projects).where(eq(projects.id, projectId));
			status = intent === 'publish' ? 'published' : intent === 'unpublish' ? 'draft' : cur.status;
			publishedAt = cur.publishedAt;
		} else {
			status = intent === 'publish' ? 'published' : 'draft';
		}
		if (status === 'published' && !publishedAt) publishedAt = new Date();
		const base = {
			slug: v.slug,
			serviceId: v.serviceId,
			town: v.town,
			year: v.year,
			isFeatured: v.isFeatured,
			coverMediaId,
			status,
			publishedAt,
			updatedAt: new Date()
		};
		if (projectId) await tx.update(projects).set(base).where(eq(projects.id, projectId));
		else projectId = (await tx.insert(projects).values(base).returning({ id: projects.id }))[0].id;

		for (const l of ['nl', 'en'] as const) {
			const t = v[l];
			if (l === 'en' && !t.title) {
				await tx.delete(projectTranslations).where(and(eq(projectTranslations.projectId, projectId), eq(projectTranslations.locale, 'en')));
				continue;
			}
			const values = { title: t.title, summary: t.summary, story: sanitizeHtml(t.story) };
			await tx
				.insert(projectTranslations)
				.values({ projectId, locale: l, ...values })
				.onConflictDoUpdate({ target: [projectTranslations.projectId, projectTranslations.locale], set: values });
		}

		await tx.delete(projectMedia).where(eq(projectMedia.projectId, projectId));
		if (gallery.length) {
			let pair = 0;
			const rows = gallery.map((g, i) => ({ projectId: projectId!, mediaId: g.mediaId, kind: g.kind, sort: i }));
			// keep before/after after the gallery, in the order chosen (sort 1000+)
			for (const r of rows) if (r.kind !== 'gallery') r.sort = 1000 + pair++;
			await tx.insert(projectMedia).values(rows);
		}
		return { ok: true as const, id: projectId, status };
	});
}

export async function deleteProject(id: number) {
	await db.delete(projects).where(eq(projects.id, id));
}

/* =========================================================== testimonials */

const testimonialSchema = z.object({
	authorName: z.string().trim().min(2, 'Geef de naam van de klant in.').max(80, 'Maximaal 80 tekens.'),
	town: z.string().trim().max(80),
	serviceId: z.number().int().positive().nullable(),
	rating: z.number().int().min(1, 'Kies 1 tot 5 sterren.').max(5, 'Kies 1 tot 5 sterren.'),
	quoteNl: z.string().trim().min(10, 'Geef de getuigenis in (minstens 10 tekens).').max(300, 'Maximaal 300 tekens.'),
	quoteEn: z.string().trim().max(300, 'Maximaal 300 tekens.'),
	source: z.enum(['google', 'facebook', 'direct']),
	sourceUrl: z.union([z.literal(''), z.url({ message: 'Geef een geldige link in (https://…).', protocol: /^https?$/ })]),
	reviewDate: z.iso.date('Kies een geldige datum.'),
	isVisible: z.boolean(),
	sort: z.number().int().min(0).max(9999)
}).superRefine((v, ctx) => {
	if (v.reviewDate > new Date().toISOString().slice(0, 10))
		ctx.addIssue({ code: 'custom', path: ['reviewDate'], message: 'De datum ligt in de toekomst.' });
});

export type TestimonialInput = z.input<typeof testimonialSchema>;

export function testimonialFromForm(fd: FormData): TestimonialInput {
	const src = str(fd, 'source');
	const service = optInt(fd, 'serviceId');
	return {
		authorName: str(fd, 'authorName'),
		town: str(fd, 'town'),
		serviceId: service && service > 0 ? service : null,
		rating: optInt(fd, 'rating') ?? 0,
		quoteNl: str(fd, 'quoteNl'),
		quoteEn: str(fd, 'quoteEn'),
		source: src === 'facebook' || src === 'direct' ? src : 'google',
		sourceUrl: str(fd, 'sourceUrl'),
		reviewDate: str(fd, 'reviewDate'),
		isVisible: bool(fd, 'isVisible'),
		sort: optInt(fd, 'sort') ?? 0
	};
}

export function newTestimonialValues(): TestimonialInput {
	return {
		authorName: '',
		town: '',
		serviceId: null,
		rating: 5,
		quoteNl: '',
		quoteEn: '',
		source: 'google',
		sourceUrl: '',
		reviewDate: new Date().toISOString().slice(0, 10),
		isVisible: true,
		sort: 0
	};
}

export async function listTestimonials() {
	return db
		.select({
			id: testimonials.id,
			authorName: testimonials.authorName,
			town: testimonials.town,
			rating: testimonials.rating,
			quoteNl: testimonials.quoteNl,
			quoteEn: testimonials.quoteEn,
			source: testimonials.source,
			sourceUrl: testimonials.sourceUrl,
			reviewDate: testimonials.reviewDate,
			isVisible: testimonials.isVisible,
			sort: testimonials.sort,
			serviceTitle: serviceTranslations.title
		})
		.from(testimonials)
		.leftJoin(serviceTranslations, and(eq(serviceTranslations.serviceId, testimonials.serviceId), eq(serviceTranslations.locale, 'nl')))
		.orderBy(asc(testimonials.sort), desc(testimonials.reviewDate));
}

export async function getTestimonial(id: number) {
	const [row] = await db.select().from(testimonials).where(eq(testimonials.id, id));
	if (!row) return null;
	const { id: _id, createdAt: _c, updatedAt, ...values } = row;
	return { id: row.id, updatedAt: updatedAt.toISOString(), values: values satisfies TestimonialInput };
}

export async function saveTestimonial(id: number | null, input: TestimonialInput) {
	const parsed = testimonialSchema.safeParse(input);
	if (!parsed.success) return { ok: false as const, errors: zodErrors(parsed.error) };
	const values = { ...parsed.data, updatedAt: new Date() };
	if (id) {
		await db.update(testimonials).set(values).where(eq(testimonials.id, id));
		return { ok: true as const, id };
	}
	const [row] = await db.insert(testimonials).values(values).returning({ id: testimonials.id });
	return { ok: true as const, id: row.id };
}

export async function setTestimonialVisible(id: number, isVisible: boolean) {
	await db.update(testimonials).set({ isVisible, updatedAt: new Date() }).where(eq(testimonials.id, id));
}

export async function deleteTestimonial(id: number) {
	await db.delete(testimonials).where(eq(testimonials.id, id));
}

/* ================================================================ misc */

export function parseId(raw: string): number | null {
	const n = Number(raw);
	return Number.isInteger(n) && n > 0 ? n : null;
}
