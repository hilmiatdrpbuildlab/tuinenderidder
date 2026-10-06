import { randomUUID } from 'node:crypto';
import { inArray } from 'drizzle-orm';
import { db } from './db';
import { media } from './db/schema';
import { putObject } from './storage';
import { processImage } from './images';
import { toMediaRef, type MediaRef } from '$lib/media';
import type { Locale } from '$lib/i18n';

const EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };

export function newStorageKey(folder: string, mime: string) {
	const safeFolder = folder.replace(/[^a-z0-9/_-]/gi, '').replace(/^\/+|\/+$/g, '') || 'library';
	return `${safeFolder}/${randomUUID()}.${EXT[mime] ?? 'bin'}`;
}

/**
 * Register an object that is already in storage (after a presigned upload): process it into
 * derivatives and insert the `media` row. Returns the new row.
 */
export async function registerUploadedMedia(opts: {
	storageKey: string;
	mime: string;
	filename: string;
	folder: string;
	altNl?: string;
	altEn?: string;
	userId?: number | null;
}) {
	const processed = await processImage(opts.storageKey, opts.mime);
	const [row] = await db
		.insert(media)
		.values({
			storageKey: opts.storageKey,
			filename: opts.filename,
			mime: processed.mime,
			bytes: processed.bytes,
			width: processed.width,
			height: processed.height,
			lqip: processed.lqip,
			variants: processed.variants,
			altNl: opts.altNl ?? '',
			altEn: opts.altEn ?? '',
			folder: opts.folder,
			createdBy: opts.userId ?? null
		})
		.returning();
	return row;
}

/** Server-side upload of a buffer (seed, booking photo uploads through form actions). */
export async function createMediaFromBuffer(
	body: Uint8Array,
	opts: { mime: string; filename: string; folder: string; altNl?: string; altEn?: string; userId?: number | null }
) {
	const storageKey = newStorageKey(opts.folder, opts.mime);
	await putObject(storageKey, body);
	return registerUploadedMedia({ ...opts, storageKey });
}

/** Load several media rows as <Picture>-ready refs, keyed by id. */
export async function getMediaRefs(ids: (number | null | undefined)[], locale: Locale) {
	const unique = [...new Set(ids.filter((x): x is number => typeof x === 'number'))];
	const map = new Map<number, MediaRef>();
	if (unique.length === 0) return map;
	const rows = await db.select().from(media).where(inArray(media.id, unique));
	for (const row of rows) {
		const ref = toMediaRef(row, locale);
		if (ref) map.set(row.id, ref);
	}
	return map;
}
