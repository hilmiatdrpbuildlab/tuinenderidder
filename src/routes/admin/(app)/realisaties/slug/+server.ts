import { json } from '@sveltejs/kit';
import { isSlugTaken, parseId, slugify } from '$lib/server/admin/content';
import { requireApiRole } from '$lib/server/admin/content-api';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async (event) => {
	requireApiRole(event, 'content');
	const slug = slugify(event.url.searchParams.get('slug') ?? '');
	const exclude = parseId(event.url.searchParams.get('exclude') ?? '');
	return json({ slug, available: slug.length >= 2 && !(await isSlugTaken('project', slug, exclude)) });
};
