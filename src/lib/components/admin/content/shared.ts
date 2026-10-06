/** Client-safe helpers + types shared by the CMS content editors and media components. */
import type { MediaRef } from '$lib/media';

export type Lang = 'nl' | 'en';

/** A media row as the CMS library/picker needs it. */
export type MediaItem = {
	id: number;
	filename: string;
	mime: string;
	bytes: number;
	width: number;
	height: number;
	folder: string;
	altNl: string;
	altEn: string;
	focalX: number;
	focalY: number;
	/** Small derivative for thumbnails */
	thumb: string;
	/** Largest derivative / original for previews */
	src: string;
	lqip: string | null;
	ref: MediaRef;
	usageCount: number;
	createdAt: string;
};

export type MediaUsage = { label: string; href: string; kind: string };

export const ACCEPTED_MIME = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_BYTES = 25 * 1024 * 1024;
export const MAX_BATCH = 30;

/** "Tuinaanleg in Ophoven — 2025" → "tuinaanleg-in-ophoven-2025" (Dutch accents removed). */
export function slugify(input: string): string {
	return input
		.normalize('NFKD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/ß/g, 'ss')
		.replace(/æ/gi, 'ae')
		.replace(/ø/gi, 'o')
		.replace(/&/g, ' en ')
		.toLowerCase()
		.replace(/['’]/g, '')
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 80)
		.replace(/-+$/g, '');
}

export function formatBytes(n: number): string {
	if (n < 1024) return `${n} B`;
	if (n < 1024 * 1024) return `${Math.round(n / 1024)} kB`;
	return `${(n / 1024 / 1024).toFixed(1).replace('.', ',')} MB`;
}

export function formatDateTime(iso: string | Date | null | undefined): string {
	if (!iso) return '—';
	const d = typeof iso === 'string' ? new Date(iso) : iso;
	return new Intl.DateTimeFormat('nl-BE', {
		timeZone: 'Europe/Brussels',
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	}).format(d);
}

export function formatDay(iso: string | Date | null | undefined): string {
	if (!iso) return '—';
	const d = typeof iso === 'string' ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(iso) ? `${iso}T12:00:00Z` : iso) : iso;
	return new Intl.DateTimeFormat('nl-BE', { timeZone: 'Europe/Brussels', day: '2-digit', month: '2-digit', year: 'numeric' }).format(d);
}

/** Strip tags for length checks / previews of rich text. */
export function plainText(html: string): string {
	return html
		.replace(/<[^>]*>/g, ' ')
		.replace(/&nbsp;/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

export const STATUS_OPTIONS = [
	{ value: 'draft', label: 'Concept' },
	{ value: 'published', label: 'Gepubliceerd' }
];

export const SOURCE_LABELS: Record<'google' | 'facebook' | 'direct', string> = {
	google: 'Google',
	facebook: 'Facebook',
	direct: 'Rechtstreeks'
};

export const MEDIA_KIND_LABELS: Record<'gallery' | 'before' | 'after', string> = {
	gallery: 'Galerij',
	before: 'Voor',
	after: 'Na'
};
