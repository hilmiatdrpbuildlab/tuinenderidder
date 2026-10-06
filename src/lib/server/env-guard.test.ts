import { describe, expect, it } from 'vitest';
import { env } from '$env/dynamic/private';
import { db } from './db';
import { sql } from 'drizzle-orm';

describe('test isolation', () => {
	it('runs against an in-memory database, never ./data', async () => {
		expect(env.PGLITE_DIR).toBe('memory://');
		// A fresh in-memory DB has only the placeholder user from test-setup.
		const [{ n }] = await db.execute<{ n: number }>(sql`select count(*)::int as n from users`).then((r) => r.rows);
		expect(Number(n)).toBe(1);
	});
});
