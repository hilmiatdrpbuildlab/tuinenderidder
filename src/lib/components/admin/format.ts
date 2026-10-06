/** Small client-safe formatting helpers for the CMS (Dutch UI). */
import { formatDate } from '$lib/i18n';

export function initials(name: string) {
	return (
		name
			.split(/\s+/)
			.filter(Boolean)
			.map((p) => p[0])
			.slice(0, 2)
			.join('')
			.toUpperCase() || '?'
	);
}

const rtf = new Intl.RelativeTimeFormat('nl-BE', { numeric: 'auto' });

/** "3 minuten geleden", "gisteren", falls back to a date after ~30 days. */
export function relativeTime(value: Date | string, now = new Date()) {
	const d = typeof value === 'string' ? new Date(value) : value;
	const diff = (d.getTime() - now.getTime()) / 1000;
	const abs = Math.abs(diff);
	if (abs < 45) return 'zonet';
	if (abs < 3600) return rtf.format(Math.round(diff / 60), 'minute');
	if (abs < 86400) return rtf.format(Math.round(diff / 3600), 'hour');
	if (abs < 86400 * 30) return rtf.format(Math.round(diff / 86400), 'day');
	return formatDate(d, 'nl', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Date + time in Brussels, e.g. "06/10/2026 14:05". */
export function formatDateTime(value: Date | string) {
	const d = typeof value === 'string' ? new Date(value) : value;
	return new Intl.DateTimeFormat('nl-BE', {
		timeZone: 'Europe/Brussels',
		day: '2-digit',
		month: '2-digit',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	}).format(d);
}

/** "di 6 okt" style short day label for a YYYY-MM-DD string. */
export function shortDay(iso: string) {
	return formatDate(iso, 'nl', { weekday: 'short', day: 'numeric', month: 'short' });
}
