import { formatPrice, translator, type Locale } from '$lib/i18n';

/** "vanaf € 180" for fixed-price services, "Prijs op offerte" otherwise. */
export function priceLabel(s: { priceMode: 'fixed' | 'quote'; priceFrom: number | null }, locale: Locale): string {
	const t = translator(locale);
	return s.priceMode === 'fixed' && s.priceFrom != null
		? t('common.priceFrom', { price: formatPrice(s.priceFrom, locale) })
		: t('common.priceOnQuote');
}

/** Booking CTA for a service: maintenance-type services are planned, the rest start with a quote. */
export function serviceCta(s: { slug: string; priceMode: 'fixed' | 'quote' }, locale: Locale) {
	const t = translator(locale);
	return {
		label: s.priceMode === 'fixed' ? t('cta.planMaintenance') : t('cta.quote'),
		href: `/boeken/dienst?dienst=${encodeURIComponent(s.slug)}`
	};
}
