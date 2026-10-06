import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		// Demo runs on Node with a local PGlite database and local media storage.
		// For production on Vercel (fra1), swap to @sveltejs/adapter-vercel and set
		// DATABASE_URL (Neon) + object-storage credentials — see README.
		adapter: adapter(),
		csrf: { trustedOrigins: [] }
	}
};

export default config;
