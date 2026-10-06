import { requireRole } from '$lib/server/permissions';
import { newTestimonialValues, serviceOptions } from '$lib/server/admin/content';
import { saveTestimonialAction } from '../testimonial-actions';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireRole(locals, 'content');
	return {
		title: 'Nieuwe getuigenis',
		crumbs: [{ href: '/admin/getuigenissen', label: 'Getuigenissen' }],
		services: await serviceOptions(),
		testimonial: { id: null, updatedAt: null, values: newTestimonialValues() }
	};
};

export const actions: Actions = {
	default: (event) => saveTestimonialAction(event, null)
};
