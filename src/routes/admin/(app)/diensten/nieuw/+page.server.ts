import { requireRole } from '$lib/server/permissions';
import { newServiceValues } from '$lib/server/admin/content';
import { saveServiceAction } from '../service-actions';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'content');
	return {
		title: 'Nieuwe dienst',
		crumbs: [{ href: '/admin/diensten', label: 'Diensten' }],
		service: { id: null, status: 'draft' as const, updatedAt: null, values: newServiceValues(), cover: null }
	};
};

export const actions: Actions = {
	default: (event) => saveServiceAction(event, null)
};
