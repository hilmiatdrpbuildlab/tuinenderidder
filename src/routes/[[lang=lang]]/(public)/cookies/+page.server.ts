import { getPage } from '$lib/server/content/pages';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	return { legal: await getPage('cookies', locals.locale) };
};
