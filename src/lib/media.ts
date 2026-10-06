/** Media helpers shared by server loads and the <Picture> component. Pure module. */
import type { Locale } from '$lib/i18n';

export type MediaRef = {
	id: number;
	src: string;
	width: number;
	height: number;
	alt: string;
	lqip: string | null;
	/** srcset string built from WebP derivatives, '' when none */
	srcset: string;
	focalX: number;
	focalY: number;
};

type MediaRow = {
	id: number;
	storageKey: string;
	width: number;
	height: number;
	lqip: string | null;
	variants: number[];
	focalX: number;
	focalY: number;
	altNl: string;
	altEn: string;
};

export function variantKey(key: string, width: number) {
	return `${key.replace(/\.[a-z0-9]+$/i, '')}-${width}.webp`;
}

export function mediaUrl(key: string) {
	return `/media/${key}`;
}

/** Convert a `media` row to what <Picture> needs. Alt falls back to NL when EN is empty. */
export function toMediaRef(row: MediaRow | null | undefined, locale: Locale): MediaRef | null {
	if (!row) return null;
	const srcset = row.variants
		.map((w) => `${mediaUrl(variantKey(row.storageKey, w))} ${Math.min(w, row.width || w)}w`)
		.join(', ');
	const largest = row.variants.at(-1);
	return {
		id: row.id,
		src: largest ? mediaUrl(variantKey(row.storageKey, largest)) : mediaUrl(row.storageKey),
		width: row.width,
		height: row.height,
		alt: locale === 'en' ? row.altEn || row.altNl : row.altNl,
		lqip: row.lqip,
		srcset,
		focalX: row.focalX,
		focalY: row.focalY
	};
}

/** Columns to select for toMediaRef (spread into a drizzle select). */
export const mediaRefColumns = [
	'id',
	'storageKey',
	'width',
	'height',
	'lqip',
	'variants',
	'focalX',
	'focalY',
	'altNl',
	'altEn'
] as const;
