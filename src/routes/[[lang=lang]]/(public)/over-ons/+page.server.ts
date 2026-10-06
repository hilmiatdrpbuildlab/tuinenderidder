import { getPage } from '$lib/server/content/pages';
import { getMediaRefs } from '$lib/server/media';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const about = await getPage('about', locals.locale);
	const media = await getMediaRefs([about.blocks.imageId], locals.locale);
	return { about, image: about.blocks.imageId ? (media.get(about.blocks.imageId) ?? null) : null };
};
