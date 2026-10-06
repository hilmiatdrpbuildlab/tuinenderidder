/**
 * Vitest setup: every test file gets a fresh in-memory PGlite (PGLITE_DIR=memory:// in vite.config),
 * migrated, with a placeholder user so the heavy first-boot demo seed (images) is skipped.
 *
 * Safety: the guard below checks the SAME env object the DB layer reads, before the DB module is
 * loaded, so tests can never open ./data/pglite (which the dev server owns — PGlite is single-process).
 */
import { beforeAll } from 'vitest';
import { env } from '$env/dynamic/private';

if (!String(env.PGLITE_DIR ?? '').startsWith('memory://') || env.DATABASE_URL) {
	throw new Error('Refusing to run tests: the DB layer would not use an in-memory database (PGLITE_DIR=memory://).');
}

beforeAll(async () => {
	const { resolve } = await import('node:path');
	const { migrate } = await import('drizzle-orm/pglite/migrator');
	const { sql } = await import('drizzle-orm');
	const { db, ensureDatabase } = await import('./db');
	const { users } = await import('./db/schema');
	await migrate(db, { migrationsFolder: resolve('drizzle') });
	const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(users);
	if (Number(n) === 0) {
		await db.insert(users).values({ email: 'test@example.test', name: 'Test', role: 'admin', passwordHash: 'x' });
	}
	await ensureDatabase();
});
