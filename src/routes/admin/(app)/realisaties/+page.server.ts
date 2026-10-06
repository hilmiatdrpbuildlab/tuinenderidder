import { requireRole } from '$lib/server/permissions';
import { listProjects, parseId, serviceOptions } from '$lib/server/admin/content';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	requireRole(locals, 'content');
	const statusParam = url.searchParams.get('status');
	const status = statusParam === 'draft' || statusParam === 'published' ? statusParam : null;
	const serviceId = parseId(url.searchParams.get('dienst') ?? '');
	const q = (url.searchParams.get('q') ?? '').trim().slice(0, 80);
	const [projects, services, all] = await Promise.all([listProjects({ status, serviceId, q }), serviceOptions(), listProjects()]);
	return {
		title: 'Realisaties',
		projects,
		services,
		filters: { status, serviceId, q },
		counts: {
			all: all.length,
			published: all.filter((p) => p.status === 'published').length,
			draft: all.filter((p) => p.status === 'draft').length
		}
	};
};
