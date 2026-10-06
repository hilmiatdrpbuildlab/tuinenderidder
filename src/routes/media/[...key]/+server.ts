import { error } from '@sveltejs/kit';
import { getObject } from '$lib/server/storage';
import type { RequestHandler } from './$types';

const TYPES: Record<string, string> = {
	jpg: 'image/jpeg',
	jpeg: 'image/jpeg',
	png: 'image/png',
	webp: 'image/webp',
	svg: 'image/svg+xml'
};

export const GET: RequestHandler = async ({ params }) => {
	const body = await getObject(params.key);
	if (!body) error(404, 'Not found');
	const ext = params.key.split('.').pop()?.toLowerCase() ?? '';
	return new Response(new Uint8Array(body), {
		headers: {
			'content-type': TYPES[ext] ?? 'application/octet-stream',
			'cache-control': 'public, max-age=31536000, immutable',
			'x-content-type-options': 'nosniff'
		}
	});
};
