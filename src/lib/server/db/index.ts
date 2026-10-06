import { env } from '$env/dynamic/private';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { PGlite } from '@electric-sql/pglite';
import { drizzle as drizzlePglite, type PgliteDatabase } from 'drizzle-orm/pglite';
import { migrate as migratePglite } from 'drizzle-orm/pglite/migrator';
import { Pool } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import { migrate as migrateNeon } from 'drizzle-orm/neon-serverless/migrator';
import * as schema from './schema';

/**
 * One typed Drizzle client for both drivers. Both are node-postgres–compatible
 * PgDatabase instances, so query code is identical in demo (PGlite) and production (Neon).
 */
export type DB = PgliteDatabase<typeof schema>;
export type Tx = Parameters<Parameters<DB['transaction']>[0]>[0];

const MIGRATIONS = resolve('drizzle');
export const DATA_DIR = resolve('data');

type Cache = { db: DB; ready: Promise<void> | null; driver: 'pglite' | 'neon' };
const g = globalThis as unknown as { __tdrDb?: Cache };

function create(): Cache {
	if (env.DATABASE_URL) {
		const pool = new Pool({ connectionString: env.DATABASE_URL });
		const db = drizzleNeon(pool, { schema }) as unknown as DB;
		return { db, ready: null, driver: 'neon' };
	}
	// PGLITE_DIR=memory:// gives an isolated in-memory database (unit tests).
	const dir = env.PGLITE_DIR || resolve(DATA_DIR, 'pglite');
	if (!dir.startsWith('memory://')) mkdirSync(DATA_DIR, { recursive: true });
	const client = new PGlite(dir);
	const db = drizzlePglite(client, { schema });
	return { db, ready: null, driver: 'pglite' };
}

// Reuse across Vite HMR reloads so PGlite does not open the data dir twice.
const cache = (g.__tdrDb ??= create());
export const db = cache.db;
export const dbDriver = cache.driver;

/** Run migrations + first-boot seed exactly once per process. */
export function ensureDatabase(): Promise<void> {
	cache.ready ??= (async () => {
		if (cache.driver === 'neon') {
			await migrateNeon(db as never, { migrationsFolder: MIGRATIONS });
		} else {
			await migratePglite(db, { migrationsFolder: MIGRATIONS });
		}
		const { seedIfEmpty } = await import('./seed');
		await seedIfEmpty();
	})();
	return cache.ready;
}

export { schema };
