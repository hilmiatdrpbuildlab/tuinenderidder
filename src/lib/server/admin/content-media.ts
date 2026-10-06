/**
 * CMS media library: listing, usage tracking ("gebruikt in N plaatsen"), metadata updates,
 * replace-file (same media.id) and delete (original + derivatives).
 */
import { desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	bookingAttachments,
	media,
	pageTranslations,
	pages,
	projectMedia,
	projectTranslations,
	projects,
	serviceTranslations,
	services
} from '$lib/server/db/schema';
import { ALLOWED_IMAGE_TYPES, deleteObject } from '$lib/server/storage';
import { processImage } from '$lib/server/images';
import { mediaUrl, toMediaRef, variantKey } from '$lib/media';
import type { MediaItem, MediaUsage } from '$lib/components/admin/content/shared';
import { PAGE_LABELS, type PageKey } from '$lib/content/pages';

type MediaRow = typeof media.$inferSelect;

/** Folders that hold customer uploads (booking photos) — never shown in the content library. */
export const PRIVATE_FOLDER_PREFIXES = ['bookings', 'booking', 'attachments'];
const isPrivateFolder = (folder: string) => PRIVATE_FOLDER_PREFIXES.some((p) => folder === p || folder.startsWith(p + '/'));

export function toMediaItem(row: MediaRow, usageCount = 0): MediaItem {
	const ref = toMediaRef(row, 'nl')!;
	const small = row.variants.find((w) => w >= 480) ?? row.variants[0];
	return {
		id: row.id,
		filename: row.filename,
		mime: row.mime,
		bytes: row.bytes,
		width: row.width,
		height: row.height,
		folder: row.folder,
		altNl: row.altNl,
		altEn: row.altEn,
		focalX: row.focalX,
		focalY: row.focalY,
		thumb: small ? mediaUrl(variantKey(row.storageKey, small)) : mediaUrl(row.storageKey),
		src: ref.src,
		lqip: row.lqip,
		ref,
		usageCount,
		createdAt: row.createdAt.toISOString()
	};
}

/* ------------------------------------------------------------------ usages */

const PAGE_IMAGE_FIELDS: Record<string, string> = {
	heroImageId: 'hero-afbeelding',
	whyImageId: 'afbeelding “Waarom”',
	imageId: 'afbeelding'
};

/** Every place a media id is used. Pass ids to limit the scan; omit for all. */
export async function getMediaUsages(ids?: number[]): Promise<Map<number, MediaUsage[]>> {
	const map = new Map<number, MediaUsage[]>();
	if (ids && ids.length === 0) return map;
	const add = (id: number | null | undefined, u: MediaUsage) => {
		if (typeof id !== 'number' || (ids && !ids.includes(id))) return;
		const list = map.get(id) ?? [];
		if (!list.some((x) => x.href === u.href && x.label === u.label)) list.push(u);
		map.set(id, list);
	};

	const svc = await db
		.select({ id: services.id, cover: services.coverMediaId, title: serviceTranslations.title })
		.from(services)
		.leftJoin(serviceTranslations, sql`${serviceTranslations.serviceId} = ${services.id} and ${serviceTranslations.locale} = 'nl'`)
		.where(ids ? inArray(services.coverMediaId, ids) : sql`${services.coverMediaId} is not null`);
	for (const s of svc) add(s.cover, { kind: 'Dienst', label: `${s.title ?? 'Dienst'} — omslag`, href: `/admin/diensten/${s.id}` });

	const prj = await db
		.select({ id: projects.id, cover: projects.coverMediaId, title: projectTranslations.title })
		.from(projects)
		.leftJoin(projectTranslations, sql`${projectTranslations.projectId} = ${projects.id} and ${projectTranslations.locale} = 'nl'`)
		.where(ids ? inArray(projects.coverMediaId, ids) : sql`${projects.coverMediaId} is not null`);
	for (const p of prj) add(p.cover, { kind: 'Realisatie', label: `${p.title ?? 'Realisatie'} — omslag`, href: `/admin/realisaties/${p.id}` });

	const gal = await db
		.select({ mediaId: projectMedia.mediaId, projectId: projectMedia.projectId, kind: projectMedia.kind, title: projectTranslations.title })
		.from(projectMedia)
		.leftJoin(projectTranslations, sql`${projectTranslations.projectId} = ${projectMedia.projectId} and ${projectTranslations.locale} = 'nl'`)
		.where(ids ? inArray(projectMedia.mediaId, ids) : undefined);
	for (const g of gal)
		add(g.mediaId, {
			kind: 'Realisatie',
			label: `${g.title ?? 'Realisatie'} — ${g.kind === 'gallery' ? 'galerij' : g.kind === 'before' ? 'voor-foto' : 'na-foto'}`,
			href: `/admin/realisaties/${g.projectId}`
		});

	const pg = await db.select({ key: pages.key, blocks: pageTranslations.blocks, locale: pageTranslations.locale }).from(pageTranslations).innerJoin(pages, eq(pages.id, pageTranslations.pageId));
	for (const p of pg) {
		for (const [field, label] of Object.entries(PAGE_IMAGE_FIELDS)) {
			const v = (p.blocks as Record<string, unknown>)[field];
			if (typeof v === 'number') add(v, { kind: 'Pagina', label: `${PAGE_LABELS[p.key as PageKey] ?? p.key} — ${label}`, href: `/admin/paginas/${p.key}` });
		}
	}

	const att = await db
		.select({ mediaId: bookingAttachments.mediaId, bookingId: bookingAttachments.bookingId })
		.from(bookingAttachments)
		.where(ids ? inArray(bookingAttachments.mediaId, ids) : undefined);
	for (const a of att) add(a.mediaId, { kind: 'Boeking', label: `Boeking #${a.bookingId} — klantfoto`, href: `/admin/boekingen/${a.bookingId}` });

	return map;
}

/* ------------------------------------------------------------------- reads */

export async function listMediaItems(): Promise<MediaItem[]> {
	const rows = await db.select().from(media).orderBy(desc(media.createdAt), desc(media.id));
	const visible = rows.filter((r) => !isPrivateFolder(r.folder));
	const usages = await getMediaUsages();
	return visible.map((r) => toMediaItem(r, usages.get(r.id)?.length ?? 0));
}

export async function getMediaItems(ids: (number | null | undefined)[]): Promise<Map<number, MediaItem>> {
	const unique = [...new Set(ids.filter((x): x is number => typeof x === 'number'))];
	const out = new Map<number, MediaItem>();
	if (!unique.length) return out;
	const rows = await db.select().from(media).where(inArray(media.id, unique));
	for (const r of rows) out.set(r.id, toMediaItem(r));
	return out;
}

export async function getMediaDetail(id: number) {
	const [row] = await db.select().from(media).where(eq(media.id, id));
	if (!row || isPrivateFolder(row.folder)) return null;
	const usages = (await getMediaUsages([id])).get(id) ?? [];
	return { item: toMediaItem(row, usages.length), usages };
}

export async function listFolders(): Promise<string[]> {
	const rows = await db.selectDistinct({ folder: media.folder }).from(media).orderBy(media.folder);
	return rows.map((r) => r.folder).filter((f) => !isPrivateFolder(f));
}

/* ----------------------------------------------------------------- writes */

export function normalizeFolder(folder: string | null | undefined) {
	return (folder ?? '').trim().replace(/\s+/g, '-').replace(/[^a-z0-9/_-]/gi, '').replace(/\/{2,}/g, '/').replace(/^\/+|\/+$/g, '').toLowerCase() || 'library';
}

export async function updateMediaMeta(
	id: number,
	patch: { altNl?: string; altEn?: string; focalX?: number; focalY?: number; folder?: string }
) {
	const values: Partial<typeof media.$inferInsert> = { updatedAt: new Date() };
	if (patch.altNl !== undefined) values.altNl = patch.altNl.trim().slice(0, 250);
	if (patch.altEn !== undefined) values.altEn = patch.altEn.trim().slice(0, 250);
	if (patch.focalX !== undefined) values.focalX = clamp01(patch.focalX);
	if (patch.focalY !== undefined) values.focalY = clamp01(patch.focalY);
	if (patch.folder !== undefined) values.folder = normalizeFolder(patch.folder);
	const [row] = await db.update(media).set(values).where(eq(media.id, id)).returning();
	return row ?? null;
}

/** Save alt texts typed inline in an editor (project gallery, cover pickers). */
export async function updateAltTexts(entries: { id: number; altNl: string; altEn: string }[]) {
	for (const e of entries) {
		await db
			.update(media)
			.set({ altNl: e.altNl.trim().slice(0, 250), altEn: e.altEn.trim().slice(0, 250), updatedAt: new Date() })
			.where(eq(media.id, e.id));
	}
}

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0.5);

async function deleteStoredFiles(row: Pick<MediaRow, 'storageKey' | 'variants'>) {
	await deleteObject(row.storageKey).catch(() => {});
	for (const w of row.variants) await deleteObject(variantKey(row.storageKey, w)).catch(() => {});
}

/**
 * Swap the file behind an existing media row (keeps media.id, alt texts and every usage).
 * `newKey` must already be in storage (presigned PUT or putObject).
 */
export async function replaceMediaFile(id: number, newKey: string, mime: string, filename: string) {
	const [old] = await db.select().from(media).where(eq(media.id, id));
	if (!old) throw new Error('Media not found');
	if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(mime)) throw new Error('Unsupported type');
	const processed = await processImage(newKey, mime);
	const [row] = await db
		.update(media)
		.set({
			storageKey: newKey,
			filename: filename || old.filename,
			mime: processed.mime,
			bytes: processed.bytes,
			width: processed.width,
			height: processed.height,
			lqip: processed.lqip,
			variants: processed.variants,
			updatedAt: new Date()
		})
		.where(eq(media.id, id))
		.returning();
	if (old.storageKey !== newKey) await deleteStoredFiles(old);
	return row;
}

export type DeleteResult = { ok: true } | { ok: false; reason: 'not_found' | 'in_use' | 'booking'; usages: MediaUsage[] };

/**
 * Delete a media row + its stored files. Used images are blocked unless `force`; images attached
 * to bookings (customer photos) are never deleted from here. Page block references are cleared.
 */
export async function deleteMedia(id: number, force = false): Promise<DeleteResult> {
	const [row] = await db.select().from(media).where(eq(media.id, id));
	if (!row) return { ok: false, reason: 'not_found', usages: [] };
	const usages = (await getMediaUsages([id])).get(id) ?? [];
	if (usages.some((u) => u.kind === 'Boeking')) return { ok: false, reason: 'booking', usages };
	if (usages.length && !force) return { ok: false, reason: 'in_use', usages };

	await db.transaction(async (tx) => {
		// FKs: covers → set null, project_media → cascade. JSON page blocks need manual cleanup.
		const pts = await tx.select().from(pageTranslations);
		for (const pt of pts) {
			const blocks = { ...(pt.blocks as Record<string, unknown>) };
			let changed = false;
			for (const field of Object.keys(PAGE_IMAGE_FIELDS)) {
				if (blocks[field] === id) {
					blocks[field] = null;
					changed = true;
				}
			}
			if (changed)
				await tx
					.update(pageTranslations)
					.set({ blocks })
					.where(sql`${pageTranslations.pageId} = ${pt.pageId} and ${pageTranslations.locale} = ${pt.locale}`);
		}
		await tx.delete(media).where(eq(media.id, id));
	});
	await deleteStoredFiles(row);
	return { ok: true };
}

export async function getMediaRow(id: number) {
	const [row] = await db.select().from(media).where(eq(media.id, id));
	return row ?? null;
}

/** Detect JPEG / PNG / WebP from the file signature (never trust the declared type). */
export function sniffImageMime(buf: Uint8Array): (typeof ALLOWED_IMAGE_TYPES)[number] | null {
	if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
	if (buf.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((b, i) => buf[i] === b)) return 'image/png';
	if (
		buf.length >= 12 &&
		buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
		buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50
	)
		return 'image/webp';
	return null;
}

/** Storage keys issued by newStorageKey(): `<folder>/<uuid>.<ext>`. */
export function isIssuedKey(key: string) {
	return /^[a-z0-9_/-]+\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i.test(key) && !key.includes('..');
}

export async function isKeyRegistered(key: string) {
	const [row] = await db.select({ id: media.id }).from(media).where(eq(media.storageKey, key));
	return !!row;
}
