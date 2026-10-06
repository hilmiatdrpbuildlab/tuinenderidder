import { requireRole } from '$lib/server/permissions';
import { newProjectValues, serviceOptions } from '$lib/server/admin/content';
import { saveProjectAction } from '../project-actions';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'content');
	return {
		title: 'Nieuwe realisatie',
		crumbs: [{ href: '/admin/realisaties', label: 'Realisaties' }],
		services: await serviceOptions(),
		project: { id: null, status: 'draft' as const, publishedAt: null, updatedAt: null, values: newProjectValues(), media: {} }
	};
};

export const actions: Actions = {
	default: (event) => saveProjectAction(event, null)
};
