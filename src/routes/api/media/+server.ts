import { json } from '@sveltejs/kit';
import { listFolders, listMediaItems } from '$lib/server/admin/content-media';
import { requireApiRole } from '$lib/server/admin/content-api';
import type { RequestHandler } from './$types';

/** Library listing for the MediaPicker (filtering happens client-side). */
export const GET: RequestHandler = async (event) => {
	requireApiRole(event, 'media');
	const [items, folders] = await Promise.all([listMediaItems(), listFolders()]);
	return json({ items, folders }, { headers: { 'cache-control': 'no-store' } });
};
