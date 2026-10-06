import type { Locale } from '$lib/i18n';

/** A value counts as missing when it is null/undefined, an empty/whitespace string or an empty array. */
export function isEmpty(v: unknown): boolean {
	if (v == null) return true;
	if (typeof v === 'string') return v.trim() === '';
	if (Array.isArray(v)) return v.length === 0;
	return false;
}

/**
 * Merge a translation with its Dutch original field by field: every field that is missing or
 * empty in the requested locale falls back to the NL value.
 */
export function withFallback<T extends object>(nl: T | undefined, localized: T | undefined): T | undefined {
	if (!nl) return localized;
	if (!localized || localized === nl) return nl;
	const out = { ...nl } as Record<string, unknown>;
	for (const [k, v] of Object.entries(localized)) if (!isEmpty(v)) out[k] = v;
	return out as T;
}

/** Group translation rows by entity id and resolve each one with NL fallback. */
export function resolveTranslations<R extends { locale: Locale }>(
	rows: R[],
	idOf: (r: R) => number,
	locale: Locale
): Map<number, R> {
	const nl = new Map<number, R>();
	const loc = new Map<number, R>();
	for (const r of rows) {
		if (r.locale === 'nl') nl.set(idOf(r), r);
		if (r.locale === locale) loc.set(idOf(r), r);
	}
	const out = new Map<number, R>();
	for (const id of new Set([...nl.keys(), ...loc.keys()])) {
		const merged = withFallback(nl.get(id), loc.get(id));
		if (merged) out.set(id, merged);
	}
	return out;
}
