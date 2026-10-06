import { and, asc, desc, eq, inArray, ne, type SQL } from 'drizzle-orm';
import { db } from '../db';
import { projectMedia, projectTranslations, projects } from '../db/schema';
import { getMediaRefs } from '../media';
import { resolveTranslations } from './fallback';
import { getServices, type ServiceSummary } from './services';
import type { Locale } from '$lib/i18n';
import type { MediaRef } from '$lib/media';

export type ProjectSummary = {
	id: number;
	slug: string;
	title: string;
	summary: string;
	town: string;
	year: number;
	isFeatured: boolean;
	service: { slug: string; title: string; icon: string } | null;
	cover: MediaRef | null;
	/** Cover is taller than wide → 4:5 tile in the masonry, otherwise 1:1. */
	portrait: boolean;
	hasBeforeAfter: boolean;
	updatedAt: Date;
};

export type ProjectDetail = ProjectSummary & {
	/** Sanitized on save in the CMS — safe for {@html}. */
	story: string;
	serviceId: number | null;
	gallery: MediaRef[];
	before: MediaRef | null;
	after: MediaRef | null;
};

type Filter = { serviceSlug?: string | null; featured?: boolean; limit?: number; excludeId?: number; serviceId?: number | null };

type ProjectRow = typeof projects.$inferSelect;
type TrRow = typeof projectTranslations.$inferSelect;
type MediaLink = typeof projectMedia.$inferSelect;
type Ctx = {
	base: ProjectRow[];
	tr: Map<number, TrRow>;
	media: Map<number, MediaRef>;
	kinds: Map<number, MediaLink[]>;
	serviceById: Map<number, ServiceSummary>;
};

async function load(locale: Locale, where: SQL[], limit?: number, services?: ServiceSummary[]): Promise<Ctx> {
	const query = db
		.select()
		.from(projects)
		.where(and(eq(projects.status, 'published'), ...where))
		.orderBy(desc(projects.isFeatured), desc(projects.year), desc(projects.publishedAt), desc(projects.id));
	const base = limit ? await query.limit(limit) : await query;
	if (base.length === 0) return { base, tr: new Map(), media: new Map(), kinds: new Map(), serviceById: new Map() };

	const ids = base.map((p) => p.id);
	const [trRows, mediaRows, svc] = await Promise.all([
		db
			.select()
			.from(projectTranslations)
			.where(and(inArray(projectTranslations.projectId, ids), inArray(projectTranslations.locale, ['nl', locale]))),
		db.select().from(projectMedia).where(inArray(projectMedia.projectId, ids)).orderBy(asc(projectMedia.sort), asc(projectMedia.id)),
		services ? Promise.resolve(services) : getServices(locale)
	]);
	const tr = resolveTranslations(trRows, (r) => r.projectId, locale);
	const kinds = new Map<number, MediaLink[]>();
	for (const m of mediaRows) {
		const list = kinds.get(m.projectId) ?? [];
		list.push(m);
		kinds.set(m.projectId, list);
	}
	const media = await getMediaRefs([...base.map((p) => p.coverMediaId), ...mediaRows.map((m) => m.mediaId)], locale);
	const serviceById = new Map(svc.map((s) => [s.id, s]));
	return { base, tr, media, kinds, serviceById };
}

function toSummary(p: ProjectRow, ctx: Ctx): ProjectSummary | null {
	const t = ctx.tr.get(p.id);
	if (!t) return null;
	const cover = p.coverMediaId ? (ctx.media.get(p.coverMediaId) ?? null) : null;
	const items = ctx.kinds.get(p.id) ?? [];
	const svc = p.serviceId ? ctx.serviceById.get(p.serviceId) : undefined;
	return {
		id: p.id,
		slug: p.slug,
		title: t.title,
		summary: t.summary,
		town: p.town,
		year: p.year,
		isFeatured: p.isFeatured,
		service: svc ? { slug: svc.slug, title: svc.title, icon: svc.icon } : null,
		cover,
		portrait: cover ? cover.height > cover.width : false,
		hasBeforeAfter: items.some((m) => m.kind === 'before') && items.some((m) => m.kind === 'after'),
		updatedAt: p.updatedAt
	};
}

/** Published projects as cards, optionally filtered by service slug / featured flag. */
export async function getProjects(locale: Locale, filter: Filter = {}): Promise<ProjectSummary[]> {
	const services = await getServices(locale);
	const where: SQL[] = [];
	if (filter.serviceSlug) {
		const svc = services.find((s) => s.slug === filter.serviceSlug);
		if (!svc) return [];
		where.push(eq(projects.serviceId, svc.id));
	}
	if (filter.serviceId) where.push(eq(projects.serviceId, filter.serviceId));
	if (filter.featured) where.push(eq(projects.isFeatured, true));
	if (filter.excludeId) where.push(ne(projects.id, filter.excludeId));
	const ctx = await load(locale, where, filter.limit, services);
	return ctx.base.map((p) => toSummary(p, ctx)).filter((p): p is ProjectSummary => p !== null);
}

/** Featured projects for the home page; topped up with recent ones when fewer are featured. */
export async function getFeaturedProjects(locale: Locale, limit = 5): Promise<ProjectSummary[]> {
	return getProjects(locale, { limit });
}

/** One published project with its gallery and before/after pair, or null. */
export async function getProject(slug: string, locale: Locale): Promise<ProjectDetail | null> {
	const ctx = await load(locale, [eq(projects.slug, slug)], 1);
	const p = ctx.base[0];
	if (!p) return null;
	const summary = toSummary(p, ctx);
	if (!summary) return null;
	const story = ctx.tr.get(p.id)?.story ?? '';
	const items = ctx.kinds.get(p.id) ?? [];
	const ref = (id: number | undefined) => (id ? (ctx.media.get(id) ?? null) : null);
	const gallery = items
		.filter((m) => m.kind === 'gallery')
		.map((m) => ref(m.mediaId))
		.filter((m): m is MediaRef => m !== null);
	if (gallery.length === 0 && summary.cover) gallery.push(summary.cover);
	const before = ref(items.find((m) => m.kind === 'before')?.mediaId);
	const after = ref(items.find((m) => m.kind === 'after')?.mediaId);
	return {
		...summary,
		story,
		serviceId: p.serviceId,
		gallery,
		before: before && after ? before : null,
		after: before && after ? after : null
	};
}
