import { getServices } from '$lib/server/content/services';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	return { services: await getServices(locals.locale) };
};
