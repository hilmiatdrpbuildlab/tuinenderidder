import * as common from './messages/common';
import * as site from './messages/site';
import * as booking from './messages/booking';

export const locales = ['nl', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'nl';

/** BCP-47 tags used for Intl formatting and <html lang>. */
export const intlLocale: Record<Locale, string> = { nl: 'nl-BE', en: 'en-GB' };
/** Language names in their own language — never flags. */
export const localeNames: Record<Locale, string> = { nl: 'Nederlands', en: 'English' };

export function isLocale(v: unknown): v is Locale {
	return typeof v === 'string' && (locales as readonly string[]).includes(v);
}

/* ------------------------------------------------------------------ messages */

const nl = { ...common.nl, ...site.nl, ...booking.nl };
type Dict = typeof nl;
export type MessageKey = keyof Dict;

const en: Dict = { ...common.en, ...site.en, ...booking.en };
const dicts: Record<Locale, Dict> = { nl, en };

export type Translator = (key: MessageKey, params?: Record<string, string | number>) => string;

/** `t('booking.step', { n: 2 })` → replaces `{n}` placeholders. Falls back to NL, then the key. */
export function translator(locale: Locale): Translator {
	const dict = dicts[locale] ?? nl;
	return (key, params) => {
		let s: string = dict[key] ?? nl[key] ?? String(key);
		if (params) for (const [k, v] of Object.entries(params)) s = s.replaceAll(`{${k}}`, String(v));
		return s;
	};
}

/* ---------------------------------------------------------- localized paths */

/**
 * Routes live under their Dutch names. English URLs use translated segments,
 * mapped back to the Dutch route in `reroute` (src/hooks.ts).
 */
const segmentsNlToEn: Record<string, string> = {
	diensten: 'services',
	realisaties: 'projects',
	'over-ons': 'about',
	contact: 'contact',
	boeken: 'book',
	dienst: 'service',
	details: 'details',
	datum: 'date',
	bevestigen: 'confirm',
	bedankt: 'thanks',
	privacy: 'privacy',
	cookies: 'cookies',
	'algemene-voorwaarden': 'terms'
};
const segmentsEnToNl = Object.fromEntries(Object.entries(segmentsNlToEn).map(([a, b]) => [b, a]));

/** Canonical (Dutch, unprefixed) path → path for `locale`. Keeps query/hash. */
export function localizePath(path: string, locale: Locale): string {
	if (locale === 'nl') return path;
	const [pathname, rest = ''] = splitSuffix(path);
	const parts = pathname.split('/').map((seg, i) => (i <= 2 ? (segmentsNlToEn[seg] ?? seg) : seg));
	const joined = parts.join('/');
	return `/${locale}${joined === '/' ? '' : joined}${rest}`;
}

/** Any localized path → canonical Dutch path + its locale. */
export function delocalizePath(pathname: string): { path: string; locale: Locale } {
	const m = pathname.match(/^\/(en)(\/.*)?$/);
	if (!m) return { path: pathname, locale: 'nl' };
	const inner = m[2] ?? '/';
	const parts = inner.split('/').map((seg, i) => (i <= 2 ? (segmentsEnToNl[seg] ?? seg) : seg));
	return { path: parts.join('/') || '/', locale: m[1] as Locale };
}

/** Internal route path (`/en/diensten/x`) for an English URL (`/en/services/x`). */
export function rerouteEnglish(pathname: string): string | undefined {
	const { path, locale } = delocalizePath(pathname);
	if (locale === 'nl') return undefined;
	return path === '/' ? '/en' : `/en${path}`;
}

function splitSuffix(path: string): [string, string] {
	const i = path.search(/[?#]/);
	return i === -1 ? [path, ''] : [path.slice(0, i), path.slice(i)];
}

/* ---------------------------------------------------------------- formatting */

export function formatDate(
	value: string | Date,
	locale: Locale,
	opts: Intl.DateTimeFormatOptions = { day: '2-digit', month: '2-digit', year: 'numeric' }
) {
	const d = typeof value === 'string' ? parseISODate(value) : value;
	return new Intl.DateTimeFormat(intlLocale[locale], { timeZone: 'Europe/Brussels', ...opts }).format(d);
}

export function formatLongDate(value: string | Date, locale: Locale) {
	return formatDate(value, locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
}

export function formatPrice(euros: number, locale: Locale) {
	return new Intl.NumberFormat(intlLocale[locale], {
		style: 'currency',
		currency: 'EUR',
		maximumFractionDigits: euros % 1 === 0 ? 0 : 2
	}).format(euros);
}

/** 'YYYY-MM-DD' → Date at noon UTC (safe from TZ day shifts). */
export function parseISODate(s: string) {
	if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return new Date(`${s}T12:00:00Z`);
	return new Date(s);
}
