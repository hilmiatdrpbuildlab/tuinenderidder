import { describe, expect, it } from 'vitest';
import { normalizePhone } from './phone';

describe('normalizePhone', () => {
	it('normalises Belgian mobiles to +32 format', () => {
		expect(normalizePhone('0470 12 34 56')).toBe('+32 470 12 34 56');
		expect(normalizePhone('0470/12.34.56')).toBe('+32 470 12 34 56');
		expect(normalizePhone('+32 470 12 34 56')).toBe('+32 470 12 34 56');
		expect(normalizePhone('+32470123456')).toBe('+32 470 12 34 56');
		expect(normalizePhone('0032 470 12 34 56')).toBe('+32 470 12 34 56');
		expect(normalizePhone('+32 (0)470 12 34 56')).toBe('+32 470 12 34 56');
	});

	it('normalises Belgian landlines', () => {
		expect(normalizePhone('089 12 34 56')).toBe('+32 89 12 34 56');
		expect(normalizePhone('02 123 45 67')).toBe('+32 2 123 45 67');
	});

	it('keeps international numbers', () => {
		expect(normalizePhone('+31 6 12345678')).toBe('+31612345678');
		expect(normalizePhone('0049 170 1234567')).toBe('+491701234567');
	});

	it('rejects nonsense', () => {
		for (const bad of ['', '123', 'abc', '0470 12', '+32 12', '04701234567890', '470123456', '+3+2470']) {
			expect(normalizePhone(bad)).toBeNull();
		}
	});
});
