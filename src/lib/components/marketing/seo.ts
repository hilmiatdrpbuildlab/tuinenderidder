import { env } from '$env/dynamic/public';
import { delocalizePath, intlLocale, localizePath, locales, type Locale } from '$lib/i18n';
import type { CompanySettings } from '$lib/server/settings';

/** Public origin without trailing slash: PUBLIC_SITE_URL when set, else the request origin. */
export function siteOrigin(fallback: string): string {
	const configured = (env.PUBLIC_SITE_URL ?? '').trim();
	return (configured || fallback).replace(/\/+$/, '');
}

export function absoluteUrl(path: string, origin: string): string {
	if (/^https?:\/\//i.test(path)) return path;
	return `${origin}${path.startsWith('/') ? '' : '/'}${path}`;
}

/** hreflang alternates for a canonical (Dutch) path: nl-BE, en and x-default (→ NL). */
export function alternatesFor(canonicalPath: string, origin: string) {
	const list = locales.map((l) => ({
		hreflang: l === 'nl' ? 'nl-BE' : l,
		href: absoluteUrl(localizePath(canonicalPath, l), origin)
	}));
	list.push({ hreflang: 'x-default', href: absoluteUrl(canonicalPath, origin) });
	return list;
}

export function alternatesForPathname(pathname: string, origin: string) {
	return alternatesFor(delocalizePath(pathname).path, origin);
}

/** og:locale value (nl_BE / en_GB). */
export const ogLocale = (l: Locale) => intlLocale[l].replace('-', '_');

/** Serialize JSON-LD safely for inline <script> (no `</script>` break-out). */
export function jsonLd(data: unknown): string {
	return `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;
}

/** LocalBusiness (LandscapingBusiness is not in schema.org; HomeAndConstructionBusiness is). */
export function localBusinessLd(company: CompanySettings, opts: { origin: string; locale: Locale; image?: string | null; description: string }) {
	const sameAs = [company.facebookUrl, company.instagramUrl, company.googleReviewsUrl].filter(Boolean);
	return {
		'@context': 'https://schema.org',
		'@type': ['HomeAndConstructionBusiness', 'LocalBusiness'],
		'@id': `${opts.origin}/#business`,
		name: company.name,
		description: opts.description,
		url: absoluteUrl(localizePath('/', opts.locale), opts.origin),
		telephone: company.phoneIntl,
		email: company.email,
		vatID: company.vat,
		image: opts.image ?? undefined,
		logo: absoluteUrl('/favicon.svg', opts.origin),
		priceRange: '€€',
		address: {
			'@type': 'PostalAddress',
			streetAddress: company.street,
			postalCode: company.postcode,
			addressLocality: company.town,
			addressRegion: 'Limburg',
			addressCountry: 'BE'
		},
		geo: geoFromMapUrl(company.mapsEmbedUrl),
		areaServed: ['Maaseik', 'Neeroeteren', 'Opoeteren', 'Kinrooi', 'Dilsen-Stokkem', 'Bree', 'As', 'Bocholt', 'Oudsbergen'].map(
			(name) => ({ '@type': 'City', name })
		),
		openingHoursSpecification: [
			{
				'@type': 'OpeningHoursSpecification',
				dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
				opens: '08:00',
				closes: '17:00'
			}
		],
		sameAs: sameAs.length ? sameAs : undefined
	};
}

/** Read `marker=lat,lon` from the OpenStreetMap embed URL stored in the company settings. */
function geoFromMapUrl(url: string) {
	try {
		const marker = new URL(url).searchParams.get('marker');
		const [lat, lon] = (marker ?? '').split(',').map(Number);
		if (Number.isFinite(lat) && Number.isFinite(lon)) return { '@type': 'GeoCoordinates', latitude: lat, longitude: lon };
	} catch {
		/* invalid URL: omit geo */
	}
	return undefined;
}
