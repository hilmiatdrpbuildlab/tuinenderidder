import { error } from '@sveltejs/kit';
import { getService, getServices } from '$lib/server/content/services';
import { getProjects } from '$lib/server/content/projects';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const service = await getService(params.slug, locals.locale);
	if (!service) error(404, 'Not found');

	const [projects, all] = await Promise.all([
		getProjects(locals.locale, { serviceId: service.id, limit: 3 }),
		getServices(locals.locale)
	]);

	return {
		service,
		projects,
		otherServices: all.filter((s) => s.id !== service.id)
	};
};
