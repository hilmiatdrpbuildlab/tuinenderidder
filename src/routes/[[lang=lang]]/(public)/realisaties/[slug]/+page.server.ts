import { error } from '@sveltejs/kit';
import { getProject, getProjects } from '$lib/server/content/projects';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
	const project = await getProject(params.slug, locals.locale);
	if (!project) error(404, 'Not found');

	let more = project.serviceId
		? await getProjects(locals.locale, { serviceId: project.serviceId, excludeId: project.id, limit: 3 })
		: [];
	if (more.length < 3) {
		const extra = await getProjects(locals.locale, { excludeId: project.id, limit: 6 });
		for (const p of extra) if (more.length < 3 && !more.some((m) => m.id === p.id)) more = [...more, p];
	}

	return { project, more };
};
