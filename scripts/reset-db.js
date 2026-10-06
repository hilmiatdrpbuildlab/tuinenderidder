// Deletes the local demo database and uploaded files. The next `npm run dev` re-runs
// migrations and the seed (takes ~30 s for the placeholder images). Stop the dev server first.
import { rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const dir = resolve('data');
if (!existsSync(dir)) {
	console.log('Nothing to reset: ./data does not exist.');
} else {
	rmSync(dir, { recursive: true, force: true });
	console.log('Removed ./data (PGlite database + uploads). Start the app to re-seed.');
}
