import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	optimizeDeps: {
		exclude: ['@electric-sql/pglite']
	},
	ssr: {
		external: ['@electric-sql/pglite', 'sharp']
	},
	test: {
		include: ['src/**/*.test.ts'],
		environment: 'node',
		// Tests run on an isolated in-memory PGlite database — never ./data (dev server owns it).
		env: { PGLITE_DIR: 'memory://', APP_SECRET: 'test-secret', PUBLIC_SITE_URL: 'https://example.test' },
		alias: {
			'$env/dynamic/private': `${process.cwd()}/src/lib/server/test-env.ts`,
			'$env/dynamic/public': `${process.cwd()}/src/lib/server/test-env.ts`
		},
		setupFiles: ['src/lib/server/test-setup.ts'],
		testTimeout: 60_000,
		hookTimeout: 120_000
	}
});
