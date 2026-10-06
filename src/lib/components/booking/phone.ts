/**
 * Phone helpers for <PhoneField> and the server-side validation (pure, client-safe).
 * Accepts Belgian national formats (0470 12 34 56, 089 12 34 56), 0032… and +32…, and
 * international numbers starting with + / 00. Returns null when it cannot be a valid number.
 */
export function normalizePhone(input: string): string | null {
	const raw = input.trim();
	if (!raw) return null;
	if (/[^\d\s+()./-]/.test(raw)) return null;
	let digits = raw.replace(/[^\d+]/g, '');
	if (digits.indexOf('+') > 0) return null;
	if (digits.startsWith('00')) digits = '+' + digits.slice(2);

	let national: string;
	if (digits.startsWith('+32')) {
		national = digits.slice(3).replace(/^0/, '');
	} else if (digits.startsWith('+')) {
		const rest = digits.slice(1);
		if (rest.length < 8 || rest.length > 15) return null;
		return '+' + rest;
	} else if (digits.startsWith('0')) {
		national = digits.slice(1);
	} else {
		return null;
	}

	// Belgian numbers: mobiles 4xx xx xx xx (9 digits), landlines 8 digits.
	if (/^4\d{8}$/.test(national)) {
		return `+32 ${national.slice(0, 3)} ${national.slice(3, 5)} ${national.slice(5, 7)} ${national.slice(7)}`;
	}
	if (/^[1-9]\d{7}$/.test(national)) {
		// Two-digit zones (e.g. 89 Genk, 11 Hasselt); one-digit zones (2 Brussels, 3 Antwerp, 4 Liège, 9 Ghent).
		if (/^[2349]/.test(national)) {
			return `+32 ${national.slice(0, 1)} ${national.slice(1, 4)} ${national.slice(4, 6)} ${national.slice(6)}`;
		}
		return `+32 ${national.slice(0, 2)} ${national.slice(2, 4)} ${national.slice(4, 6)} ${national.slice(6)}`;
	}
	return null;
}
