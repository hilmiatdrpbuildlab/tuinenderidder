import { requireRole } from '$lib/server/permissions';
import { listPages } from '$lib/server/admin/content-pages';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'content');
	return { title: "Pagina's", pages: await listPages() };
};
