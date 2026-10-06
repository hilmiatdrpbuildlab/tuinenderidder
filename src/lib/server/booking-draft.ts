/**
 * Booking wizard state, kept server-side in `booking_drafts` between steps so the wizard works
 * without JavaScript and nobody has to re-enter data (WCAG 3.3.7). The browser only holds an
 * opaque, unguessable id in the httpOnly `tdr_booking` cookie (24 h).
 */
import { randomBytes } from 'node:crypto';
import type { Cookies } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { and, asc, eq, inArray, lt } from 'drizzle-orm';
import { db } from './db';
import { bookingDrafts, media, serviceTranslations, services, slots } from './db/schema';
import { releaseHold } from './availability';
import { localizePath, type Locale } from '$lib/i18n';
import { mediaUrl, variantKey } from '$lib/media';
import type { BookingType, Frequency, GardenSize, SlotKind } from '$lib/domain';

export const DRAFT_COOKIE = 'tdr_booking';
/** Set after a successful booking: `<reference>.<hmac>`, proves this browser made it. */
export const DONE_COOKIE = 'tdr_booking_done';
const DRAFT_MAX_AGE = 60 * 60 * 24;

export type DraftData = {
	type?: BookingType;
	serviceIds?: number[];
	gardenSize?: GardenSize | null;
	frequency?: Frequency;
	street?: string;
	postcode?: string;
	municipality?: string;
	photoIds?: number[];
	notes?: string;
	slotId?: number | null;
	/** Contact details are remembered too, so going back a step never loses them. */
	name?: string;
	email?: string;
	phone?: string;
	marketingOptIn?: boolean;
};

export type Draft = { id: string; data: DraftData };

function setCookie(cookies: Cookies, id: string) {
	cookies.set(DRAFT_COOKIE, id, {
		path: '/',
		httpOnly: true,
		sameSite: 'lax',
		secure: !dev,
		maxAge: DRAFT_MAX_AGE
	});
}

/** The visitor's current draft, or null (no cookie / expired / unknown id). */
export async function getDraft(cookies: Cookies): Promise<Draft | null> {
	const id = cookies.get(DRAFT_COOKIE);
	if (!id || !/^[A-Za-z0-9_-]{20,64}$/.test(id)) return null;
	const [row] = await db.select().from(bookingDrafts).where(eq(bookingDrafts.id, id)).limit(1);
	if (!row) return null;
	if (Date.now() - row.updatedAt.getTime() > DRAFT_MAX_AGE * 1000) return null;
	return { id: row.id, data: row.data as DraftData };
}

export async function getOrCreateDraft(cookies: Cookies): Promise<Draft> {
	const existing = await getDraft(cookies);
	if (existing) return existing;
	const id = randomBytes(24).toString('base64url');
	await db.insert(bookingDrafts).values({ id, data: {} });
	setCookie(cookies, id);
	return { id, data: {} };
}

/** Merge `patch` into the draft (creating one when needed) and refresh the cookie. */
export async function saveDraft(cookies: Cookies, patch: Partial<DraftData>): Promise<Draft> {
	const draft = await getOrCreateDraft(cookies);
	const data: DraftData = { ...draft.data, ...patch };
	await db.update(bookingDrafts).set({ data, updatedAt: new Date() }).where(eq(bookingDrafts.id, draft.id));
	setCookie(cookies, draft.id);
	return { id: draft.id, data };
}

export async function clearDraft(cookies: Cookies, id: string) {
	await releaseHold(id);
	await db.delete(bookingDrafts).where(eq(bookingDrafts.id, id));
	cookies.delete(DRAFT_COOKIE, { path: '/' });
}

/** Cron: drop drafts nobody touched for N days. Returns the number removed. */
export async function purgeOldDrafts(days = 7) {
	const cutoff = new Date(Date.now() - days * 86_400_000);
	const rows = await db.delete(bookingDrafts).where(lt(bookingDrafts.updatedAt, cutoff)).returning({ id: bookingDrafts.id });
	return rows.length;
}

/* -------------------------------------------------------------------- steps */

export const STEP_KEYS = ['dienst', 'details', 'datum', 'bevestigen'] as const;
export type StepKey = (typeof STEP_KEYS)[number];

/** Steps for this draft: quote requests skip the date step. */
export function stepsFor(data: DraftData): StepKey[] {
	return data.type === 'quote' ? ['dienst', 'details', 'bevestigen'] : [...STEP_KEYS];
}

export function isStepComplete(step: StepKey, data: DraftData): boolean {
	switch (step) {
		case 'dienst':
			return !!data.type && (data.serviceIds?.length ?? 0) > 0;
		case 'details':
			return !!data.gardenSize && !!data.street && /^\d{4}$/.test(data.postcode ?? '') && !!data.municipality;
		case 'datum':
			return data.type === 'quote' || !!data.slotId;
		case 'bevestigen':
			return false;
	}
}

export function firstIncompleteStep(data: DraftData): StepKey {
	for (const s of stepsFor(data)) if (!isStepComplete(s, data)) return s;
	return 'bevestigen';
}

export function stepPath(step: StepKey | 'bedankt', locale: Locale, query = '') {
	return localizePath(`/boeken/${step}${query}`, locale);
}

/**
 * Guard for a step's load: redirects to the first incomplete earlier step. Returns the draft
 * (possibly empty) when the visitor may be here.
 */
export async function guardStep(cookies: Cookies, step: StepKey, locale: Locale): Promise<Draft> {
	const draft = (await getDraft(cookies)) ?? { id: '', data: {} };
	const steps = stepsFor(draft.data);
	if (!steps.includes(step)) redirect(303, stepPath(firstIncompleteStep(draft.data), locale));
	for (const s of steps) {
		if (s === step) break;
		if (!isStepComplete(s, draft.data)) redirect(303, stepPath(s, locale));
	}
	return draft;
}

/* --------------------------------------------------------- lookup helpers */

export type WizardService = {
	id: number;
	slug: string;
	icon: string;
	title: string;
	summary: string;
	priceFrom: number | null;
	priceMode: 'fixed' | 'quote';
};

/** Published, bookable services with their translation (NL fallback). */
export async function getBookableServices(locale: Locale): Promise<WizardService[]> {
	const rows = await db
		.select({
			id: services.id,
			slug: services.slug,
			icon: services.icon,
			priceFrom: services.priceFrom,
			priceMode: services.priceMode,
			title: serviceTranslations.title,
			summary: serviceTranslations.summary,
			locale: serviceTranslations.locale
		})
		.from(services)
		.innerJoin(serviceTranslations, eq(serviceTranslations.serviceId, services.id))
		.where(and(eq(services.status, 'published'), eq(services.isBookable, true)))
		.orderBy(asc(services.sort), asc(services.id));
	const byId = new Map<number, WizardService & { locale: string }>();
	for (const r of rows) {
		const prev = byId.get(r.id);
		if (!prev || (r.locale === locale && r.title)) byId.set(r.id, r);
	}
	return [...byId.values()].map(({ locale: _l, ...s }) => s);
}

export type DraftSlot = { id: number; date: string; slotKind: SlotKind; start: string; end: string };

export async function getSlot(id: number | null | undefined): Promise<DraftSlot | null> {
	if (!id) return null;
	const [row] = await db
		.select({ id: slots.id, date: slots.date, slotKind: slots.slotKind, start: slots.start, end: slots.end })
		.from(slots)
		.where(eq(slots.id, id))
		.limit(1);
	return row ? { ...row, slotKind: row.slotKind as SlotKind } : null;
}

export type DraftPhoto = { id: number; src: string };

/** Small thumbnails for the photos attached to a draft. */
export async function getDraftPhotos(ids: number[] | undefined): Promise<DraftPhoto[]> {
	if (!ids?.length) return [];
	const rows = await db
		.select({ id: media.id, storageKey: media.storageKey, variants: media.variants })
		.from(media)
		.where(inArray(media.id, ids));
	const byId = new Map(rows.map((r) => [r.id, r]));
	return ids
		.map((id) => byId.get(id))
		.filter((r): r is NonNullable<typeof r> => !!r)
		.map((r) => ({
			id: r.id,
			src: r.variants.length ? mediaUrl(variantKey(r.storageKey, r.variants[0])) : mediaUrl(r.storageKey)
		}));
}
