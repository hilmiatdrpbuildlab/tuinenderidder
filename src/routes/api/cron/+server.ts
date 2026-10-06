import { error, json } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import { timingSafeEqual } from 'node:crypto';
import { runCron } from './cron';
import type { RequestHandler } from './$types';

function matches(given: string | null, expected: string) {
	if (!given) return false;
	const a = Buffer.from(given);
	const b = Buffer.from(expected);
	return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Scheduled maintenance (call hourly): `GET /api/cron` with `Authorization: Bearer $CRON_SECRET`.
 * In development `?secret=` is accepted too, and the secret defaults to "dev" when unset.
 */
export const GET: RequestHandler = async ({ request, url }) => {
	const secret = env.CRON_SECRET || (dev ? 'dev' : '');
	if (!secret) error(503, 'CRON_SECRET is not configured');
	const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? null;
	const ok = matches(bearer, secret) || (dev && matches(url.searchParams.get('secret'), secret));
	if (!ok) error(401, 'Unauthorized');

	const summary = await runCron();
	return json(summary, { headers: { 'cache-control': 'no-store' } });
};
