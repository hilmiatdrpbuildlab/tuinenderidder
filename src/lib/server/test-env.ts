/**
 * Vitest stand-in for `$env/dynamic/private` and `$env/dynamic/public` (aliased in vite.config `test.alias`).
 * Outside a running SvelteKit server those modules are empty, which would make the DB layer fall back
 * to ./data/pglite. Here they read process.env, which vitest fills from `test.env` (PGLITE_DIR=memory://).
 */
export const env: Record<string, string | undefined> = process.env;
