/** Tiny client-safe date helpers for 'YYYY-MM-DD' strings (mirrors $lib/server/availability). */
export function addDaysISO(iso: string, n: number) {
	const d = new Date(`${iso}T12:00:00Z`);
	d.setUTCDate(d.getUTCDate() + n);
	return d.toISOString().slice(0, 10);
}

/** ISO weekday 1 (Mon) … 7 (Sun). */
export function weekdayISO(iso: string) {
	const d = new Date(`${iso}T12:00:00Z`).getUTCDay();
	return d === 0 ? 7 : d;
}

/** 'YYYY-MM' ± n months. */
export function addMonths(month: string, n: number) {
	const [y, m] = month.split('-').map(Number);
	const d = new Date(Date.UTC(y, m - 1 + n, 1));
	return d.toISOString().slice(0, 7);
}

export function daysInMonth(month: string) {
	const [y, m] = month.split('-').map(Number);
	return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function isMonth(v: string | null | undefined): v is string {
	return !!v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
}

export function isISODate(v: string | null | undefined): v is string {
	return !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T12:00:00Z`));
}
